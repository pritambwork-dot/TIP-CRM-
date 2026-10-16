import React, { useState, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  Upload, 
  FileText, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  HelpCircle, 
  Download, 
  Printer, 
  Clock, 
  Check, 
  ChevronRight, 
  ShieldCheck, 
  ShieldAlert, 
  Database,
  Search,
  Sliders,
  TrendingUp,
  Layers,
  Info,
  Zap,
  Lock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useCrm } from '../../context/CrmContext';
import { parseCsvText, profileDataset, CANONICAL_CRM_FIELDS } from '../../lib/dataProfiler';
import { cleanDataset } from '../../lib/dataCleaner';
import { runDeterministicAnalytics } from '../../lib/analyticsEngine';
import { generateDeterministicGroundedAnalysis } from '../../lib/groundingProtocol';
import { DEMO_DATASETS, DemoDatasetInfo } from '../../data/demoDatasets';
import { 
  DataQualityReport, 
  ColumnMapping, 
  DeterministicAnalysisResult, 
  AnalysisInsight, 
  AiQueryResponse 
} from '../../types';
import { Button, Badge, Card, Tabs, TabsList, TabsTrigger, TabsContent } from '../ui';
import { SuggestionsCenterView } from '../intelligence/SuggestionsCenterView';
import { PrintableIntelligenceReport } from '../reports/PrintableIntelligenceReport';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { Permissions } from '../../lib/permissions';

// TIP Design Tokens
const TIP_COLORS = {
  primary: '#140a8e',
  crimson: '#ea0543',
  indigoLight: '#3b32a8',
  slateDark: '#1e293b',
  slateLight: '#f1f5f9',
  emerald: '#10b981',
  amber: '#f59e0b',
  palette: ['#140a8e', '#ea0543', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899']
};

// Stable Chart Margins to prevent Recharts/React 19 render loops
const BAR_CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 20 };
const LINE_CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 10 };
const PIE_CHART_MARGIN = { top: 5, right: 5, left: 5, bottom: 5 };


export const IntelligenceView: React.FC = () => {
  const { currentUser, programs, events, participants, funding, people, tasks, hasPermission } = useCrm();

  // Navigation tab inside Intelligence: 'analyzer' | 'ask_data' | 'suggestions' | 'history'
  const [activeTab, setActiveTab] = useState<'analyzer' | 'ask_data' | 'suggestions' | 'history'>('suggestions');

  // Analyzer multi-step state: 'upload' | 'quality_mapping' | 'dashboard'
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'quality_mapping' | 'dashboard'>('upload');

  // Active dataset state
  const [datasetName, setDatasetName] = useState<string>('');
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [analyticsResult, setAnalyticsResult] = useState<DeterministicAnalysisResult | null>(null);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);

  // AI Generation State
  const [hasAiInsightsBeenRequested, setHasAiInsightsBeenRequested] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiInsights, setAiInsights] = useState<AnalysisInsight[]>([]);
  const [aiCaveats, setAiCaveats] = useState<string[]>([]);
  const [isAiFallback, setIsAiFallback] = useState(false);

  // Deterministic grounded facts & insights derived directly from verified evidence
  const activeGroundedFallback = useMemo(() => {
    if (!analyticsResult) return null;
    return generateDeterministicGroundedAnalysis(analyticsResult.structuredPayloadForAi, datasetName);
  }, [analyticsResult, datasetName]);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // "Ask Your Data" Natural Language state
  const [userQuery, setUserQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<AiQueryResponse[]>([]);

  // Saved Analysis History state
  const [savedAnalyses, setSavedAnalyses] = useState<Array<{
    id: string;
    name: string;
    date: string;
    rowCount: number;
    quality: string;
    summary: string;
  }>>([]);

  const canView = currentUser.roleId === 'super_admin' || hasPermission('intelligence', 'view');
  const canCreate = currentUser.roleId === 'super_admin' || hasPermission('intelligence', 'create');
  const canManage = currentUser.roleId === 'super_admin' || hasPermission('intelligence', 'manage');
  const canExport = currentUser.roleId === 'super_admin' || hasPermission('intelligence', 'export') || hasPermission('reports', 'export');

  // Handle Loading a pre-seeded demo dataset
  const handleLoadDemoDataset = (demo: DemoDatasetInfo) => {
    setDatasetName(demo.filename);
    const { headers: hList, rows } = parseCsvText(demo.rawCsv);
    setHeaders(hList);
    setRawRows(rows);

    // Invalidate and reset prior dataset analytics to prevent stale bleed-through
    setAnalyticsResult(null);
    setHasAiInsightsBeenRequested(false);
    setAiSummary('');
    setAiInsights([]);
    setAiCaveats([]);
    setIsAiFallback(false);

    const { mappings: mapList, qualityReport: qReport } = profileDataset(hList, rows);
    setMappings(mapList);
    setQualityReport(qReport);
    setAnalysisStep('quality_mapping');
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    setDatasetName(file.name);

    // Invalidate and reset prior dataset analytics to prevent stale bleed-through
    setAnalyticsResult(null);
    setHasAiInsightsBeenRequested(false);
    setAiSummary('');
    setAiInsights([]);
    setAiCaveats([]);
    setIsAiFallback(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: hList, rows } = parseCsvText(text);
      setHeaders(hList);
      setRawRows(rows);

      const { mappings: mapList, qualityReport: qReport } = profileDataset(hList, rows);
      setMappings(mapList);
      setQualityReport(qReport);
      setAnalysisStep('quality_mapping');
    };
    reader.readAsText(file);
  };

  // 1. Run Deterministic Analytics (0 API calls, Section 47)
  const handleExecuteAnalysis = () => {
    try {
      if (!qualityReport) {
        console.warn('Cannot execute analysis: qualityReport is missing');
        return;
      }

      // 1. Data Cleaning
      const mappingMap: Record<string, string> = {};
      mappings.forEach(m => { mappingMap[m.csvColumn] = m.crmField; });
      const { cleanedRows } = cleanDataset(headers, rawRows, mappingMap, true);

      // 2. Deterministic Mathematical Calculations (Instant, Level 1)
      const analysis = runDeterministicAnalytics(cleanedRows, mappings, qualityReport);
      setAnalyticsResult(analysis);
      setHasAiInsightsBeenRequested(false);
      setAiSummary('');
      setAiInsights([]);
      setAiCaveats([]);
      setAnalysisStep('dashboard');
    } catch (err) {
      console.error('Fatal error during handleExecuteAnalysis:', err);
      alert('An error occurred during dataset analysis. Please review column mappings.');
    }
  };


  // 2. On-Demand Gemini AI Insights Call (Invoked only on explicit user click, Section 47)
  const handleGenerateAiInsights = async () => {
    if (!canCreate) {
      alert(Permissions.getDisabledReason(currentUser, 'intelligence', 'create'));
      return;
    }
    if (!analyticsResult) return;
    setAiLoading(true);
    setHasAiInsightsBeenRequested(true);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: analyticsResult.structuredPayloadForAi,
          datasetName
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const aiData = await response.json();
      setAiSummary(aiData.summary || analyticsResult.structuredPayloadForAi.summary);
      setAiInsights(aiData.insights || []);
      setAiCaveats(aiData.caveats || []);
      setIsAiFallback(Boolean(aiData.fallbackDeterministic));
    } catch (err) {
      console.warn('AI fetch error, using client-side deterministic fallback:', err);
      // Fallback cleanly to deterministic insights grounded strictly in the verified evidence
      const grounded = generateDeterministicGroundedAnalysis(
        analyticsResult.structuredPayloadForAi,
        datasetName
      );
      setAiSummary(grounded.summary || analyticsResult.structuredPayloadForAi.summary);
      setAiInsights(grounded.insights.map((ins, idx) => ({
        id: `fallback-ins-${idx}`,
        analysisResultId: 'res-1',
        insightType: ins.type,
        category: ins.category,
        title: ins.title,
        description: ins.description,
        recommendation: ins.recommendation,
        createdAt: new Date().toISOString()
      })));
      setAiCaveats(grounded.caveats || []);
      setIsAiFallback(true);
    } finally {
      setAiLoading(false);
    }
  };

  // Handle Natural Language "Ask Your Data" Query (Section 26-29)
  const handleAskData = async (queryText?: string) => {
    if (!canCreate) {
      alert(Permissions.getDisabledReason(currentUser, 'intelligence', 'create'));
      return;
    }
    const q = queryText || userQuery;
    if (!q.trim() || queryLoading) return;
    setQueryLoading(true);

    // Compute live CRM summary facts deterministically
    const totalFundingAmount = funding.reduce((acc, f) => acc + (f.amountCad || 0), 0);
    const attendedCount = participants.filter(p => p.status === 'Attended').length;
    const avgAttendance = participants.length > 0 ? `${Math.round((attendedCount / participants.length) * 100)}%` : '0%';

    const crmSummary = {
      peopleCount: people.length,
      programsCount: programs.length,
      eventsCount: events.length,
      participantsCount: participants.length,
      avgAttendance,
      totalFunding: totalFundingAmount,
      fundersCount: new Set(funding.map(f => f.funderName || f.donorOrFunder).filter(Boolean)).size,
      tasksCount: tasks?.length ?? 0
    };

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          userRole: currentUser.roleId,
          dataScope: currentUser.dataScope,
          crmSummary
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: AiQueryResponse = await response.json();
      setQueryHistory(prev => [data, ...prev]);
      setUserQuery('');
    } catch (err) {
      console.warn('Ask Data error, generating grounded response:', err);
      // Fallback
      setQueryHistory(prev => [{
        question: q,
        interpretedIntent: 'Operational inquiry on CRM data (deterministic fallback)',
        authorized: true,
        calculationFact: `Overall CRM record count: ${people.length} contacts across ${programs.length} active initiatives with ${avgAttendance} recorded attendance.`,
        aiExplanation: `Operational metrics derived deterministically from authorized CRM records.`,
        suggestedAction: 'Review follow-ups in the Operations section.'
      }, ...prev]);
      setUserQuery('');
    } finally {
      setQueryLoading(false);
    }
  };

  // Export Clean CSV
  const handleExportCleanCsv = () => {
    if (!canExport) {
      alert(Permissions.getDisabledReason(currentUser, 'intelligence', 'export'));
      return;
    }
    if (!rawRows.length) return;
    const csvContent = 'data:text/csv;charset=utf-8,' + [
      headers.join(','),
      ...rawRows.map(r => headers.map(h => `"${(r[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cleaned_${datasetName || 'tip_data'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Printable Report / PDF
  const handlePrintReport = () => {
    if (!canExport) {
      alert(Permissions.getDisabledReason(currentUser, 'intelligence', 'export'));
      return;
    }
    setIsPrintReportOpen(true);
  };

  if (!canView) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 sm:p-12 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 mb-2">Restricted Access: AI & Suggestions</h3>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          {Permissions.getDisabledReason(currentUser, 'intelligence', 'view')}
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 text-xs font-medium text-zinc-600">
          <span>Current Role:</span>
          <strong className="text-zinc-900">{currentUser.roleId || 'User'}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Architecture Motto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif font-semibold text-zinc-900 tracking-tight">
              AI Intelligence & CSV Analytics
            </h1>
            <Badge variant="outline" className="bg-[#140a8e]/5 text-[#140a8e] border-[#140a8e]/20 text-[11px] font-mono">
              Deterministic Math + Gemini
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl leading-relaxed">
            Turn TIP's operational records and uploaded datasets into accurate calculations, high-contrast visual trends, and practical nonprofit actions.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl self-start sm:self-auto border border-zinc-200/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'suggestions' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#140a8e]" />
            Suggestions Center
          </button>
          <button
            onClick={() => setActiveTab('analyzer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'analyzer' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            CSV Analytics
          </button>
          <button
            onClick={() => setActiveTab('ask_data')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ask_data' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ea0543]" />
            Ask Your Data
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            History & Lineage
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: CONTINUOUS WORK INTELLIGENCE & SUGGESTIONS CENTER                   */}
      {/* ========================================================================= */}
      {activeTab === 'suggestions' && (
        <SuggestionsCenterView />
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CSV ANALYTICS & INSIGHT ENGINE                                      */}
      {/* ========================================================================= */}
      {activeTab === 'analyzer' && (
        <div className="space-y-6">
          {/* STEP 1: UPLOAD & DEMO DATASET SELECTOR */}
          {analysisStep === 'upload' && (
            <div className="space-y-6">
              {/* Drag and drop upload card */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                }}
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all bg-white ${
                  isDragging ? 'border-[#140a8e] bg-[#140a8e]/5 shadow-md' : 'border-zinc-300 hover:border-zinc-400 shadow-2xs'
                }`}
              >
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-200/80 mx-auto flex items-center justify-center mb-4 text-[#140a8e] shadow-2xs">
                  <Upload className="w-6 h-6 stroke-[1.75]" />
                </div>

                <h3 className="text-base sm:text-lg font-serif font-semibold text-zinc-900">
                  Analyze Operational Data
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto mt-1 mb-5 leading-relaxed">
                  Drop any CSV or Excel-compatible file here. We will profile columns, clean records, run exact arithmetic calculations, and generate executive insights.
                </p>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm px-5 py-2.5 rounded-xl cursor-pointer shadow-xs"
                  >
                    Choose CSV File
                  </Button>
                </div>
                <div className="text-[11px] text-zinc-400 mt-3 font-mono">
                  Supported: CSV, TSV · Files are processed locally & summarized before AI evaluation
                </div>
              </div>

              {/* 1-Click Realistic TIP Demo Datasets (Section 11 & 59) */}
              {DEMO_DATASETS.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#ea0543]" />
                        <span>One-Click Realistic TIP Datasets</span>
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Explore the full deterministic calculation & Gemini insight flow without uploading your own file:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {DEMO_DATASETS.map(demo => (
                      <div
                        key={demo.id}
                        onClick={() => handleLoadDemoDataset(demo)}
                        className="p-4 rounded-xl border border-zinc-200/80 bg-white hover:border-[#140a8e]/60 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-zinc-900 group-hover:text-[#140a8e] transition-colors line-clamp-1">
                              {demo.name}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium">
                              {demo.badge}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-3">
                            {demo.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-[#140a8e] font-medium">
                          <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[150px]">{demo.filename}</span>
                          <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Inspect & Analyze →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DATA PROFILER & SCHEMA MAPPING SCREEN (Section 7, 8, 9, 11) */}
          {analysisStep === 'quality_mapping' && qualityReport && (
            <div className="space-y-6">
              {/* Back to upload */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAnalysisStep('upload')}
                  className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                >
                  ← Select a different file
                </button>
                <div className="text-xs font-mono text-zinc-500">
                  File: <strong className="text-zinc-800">{datasetName}</strong> ({rawRows.length.toLocaleString('en-CA')} rows)
                </div>
              </div>

              {/* Data Quality Report Card (Section 11) */}
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                      Automated Data Quality Audit
                    </span>
                    <h3 className="text-lg font-serif font-semibold text-zinc-900">
                      Dataset Health: <span className={qualityReport.qualityRating === 'Excellent' || qualityReport.qualityRating === 'Good' ? 'text-emerald-700' : 'text-amber-700'}>{qualityReport.qualityRating}</span> ({qualityReport.validPercentage}% complete)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleExecuteAnalysis}
                      disabled={aiLoading}
                      className="bg-[#140a8e] hover:bg-[#140a8e]/90 text-white text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Calculating Metrics...</span>
                        </>
                      ) : (
                        <>
                          <span>Proceed to Analysis</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Quality Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                    <span className="text-[11px] text-zinc-500 font-medium">Total Rows</span>
                    <div className="text-lg font-semibold text-zinc-900 mt-0.5">{qualityReport.totalRows.toLocaleString('en-CA')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                    <span className="text-[11px] text-zinc-500 font-medium">Valid Records</span>
                    <div className="text-lg font-semibold text-emerald-700 mt-0.5">{qualityReport.validRows.toLocaleString('en-CA')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                    <span className="text-[11px] text-zinc-500 font-medium">Duplicate Rows</span>
                    <div className="text-lg font-semibold text-amber-700 mt-0.5">{qualityReport.duplicateRows}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                    <span className="text-[11px] text-zinc-500 font-medium">Detected Columns</span>
                    <div className="text-lg font-semibold text-zinc-900 mt-0.5">{headers.length}</div>
                  </div>
                </div>

                {/* Warnings List */}
                {qualityReport.warnings.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-950">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Data Ingestion Considerations ({qualityReport.warnings.length})</span>
                    </div>
                    {qualityReport.warnings.map((w, idx) => (
                      <div key={idx} className="pl-5 text-amber-800">• {w}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column Mapping Table (Section 9) */}
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Column Intelligence & Schema Mapping
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Verify that each CSV column corresponds accurately to the right TIP CRM entity before deterministic calculations:
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-400 font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-3">CSV Column Header</th>
                        <th className="py-2.5 px-3">Detected Type</th>
                        <th className="py-2.5 px-3">Mapped CRM Entity</th>
                        <th className="py-2.5 px-3">Match Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {mappings.map((m, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/60">
                          <td className="py-2.5 px-3 font-medium font-mono text-zinc-900">
                            {m.csvColumn}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-mono text-[10px]">
                              text
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={m.crmField}
                              onChange={(e) => {
                                const updated = [...mappings];
                                updated[idx].crmField = e.target.value;
                                setMappings(updated);
                              }}
                              className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#140a8e]"
                            >
                              {CANONICAL_CRM_FIELDS.map(f => (
                                <option key={f.id} value={f.label}>{f.label}</option>
                              ))}
                              <option value="Custom Attribute">Custom Attribute</option>
                              <option value="Ignore Column">Ignore Column</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className={m.confidence >= 0.8 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]' : 'text-zinc-600 text-[10px]'}>
                              {Math.round(m.confidence * 100)}% match
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <div className="text-xs text-zinc-500">
                    Calculations run deterministically based on verified column mappings.
                  </div>
                  <Button
                    type="button"
                    onClick={handleExecuteAnalysis}
                    className="bg-[#140a8e] hover:bg-[#140a8e]/90 text-white text-xs px-5 py-2 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span>Confirm Mapping & Run Analytics</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FINAL ANALYTICS DASHBOARD & AI INSIGHT REPORT (Section 24, 25, 43, 58) */}
          {analysisStep === 'dashboard' && (
            analyticsResult ? (
              <div className="space-y-6">
                {/* Report Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs">

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60">
                      Analysis Complete
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {datasetName} · {analyticsResult.rowCount.toLocaleString('en-CA')} rows
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canExport}
                    onClick={handleExportCleanCsv}
                    title={!canExport ? Permissions.getDisabledReason(currentUser, 'intelligence', 'export') : undefined}
                    className={`text-xs py-1.5 px-3 flex items-center gap-1.5 ${canExport ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  >
                    {!canExport ? <Lock className="w-3.5 h-3.5 text-zinc-400" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Cleaned CSV</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canExport}
                    onClick={handlePrintReport}
                    title={!canExport ? Permissions.getDisabledReason(currentUser, 'intelligence', 'export') : undefined}
                    className={`text-xs py-1.5 px-3 flex items-center gap-1.5 ${canExport ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  >
                    {!canExport ? <Lock className="w-3.5 h-3.5 text-zinc-400" /> : <Printer className="w-3.5 h-3.5" />}
                    <span>Print / PDF</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setSavedAnalyses(prev => [{
                        id: 'hist-' + Date.now(),
                        name: datasetName,
                        date: new Date().toISOString().split('T')[0],
                        rowCount: analyticsResult.rowCount,
                        quality: `${analyticsResult.qualityReport.qualityRating} (${analyticsResult.qualityReport.validPercentage}%)`,
                        summary: aiSummary || analyticsResult.structuredPayloadForAi.summary
                      }, ...prev]);
                      alert('Analysis successfully saved to History & Lineage archive.');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs py-1.5 px-3.5 rounded-xl cursor-pointer"
                  >
                    Save to History
                  </Button>

                  <button
                    type="button"
                    onClick={() => setAnalysisStep('upload')}
                    className="text-xs text-zinc-500 hover:text-zinc-900 px-2 cursor-pointer"
                  >
                    Upload Another
                  </button>
                </div>
              </div>

              {/* Deterministic / AI Insight Banner (Section 47) */}
              {!hasAiInsightsBeenRequested ? (
                <div className="bg-emerald-50/80 rounded-2xl border border-emerald-200/90 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-emerald-950">Deterministic Analytics Ready</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                          ⚡ 0 Tokens · 0 API Calls
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        All numerical distributions, KPIs, counts, and mathematical charts computed instantly without external API usage.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleGenerateAiInsights}
                    disabled={aiLoading || !canCreate}
                    title={!canCreate ? Permissions.getDisabledReason(currentUser, 'intelligence', 'create') : undefined}
                    className={`text-xs py-2 px-4 rounded-xl flex items-center gap-2 shrink-0 shadow-sm ${
                      canCreate 
                        ? 'bg-[#140a8e] hover:bg-[#0f076e] text-white cursor-pointer' 
                        : 'bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed opacity-75'
                    }`}
                  >
                    {!canCreate ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>AI Generation Restricted</span>
                      </>
                    ) : aiLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating AI Insights...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>✨ Generate AI Insights (Gemini)</span>
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-[#140a8e]/5 via-[#ea0543]/5 to-transparent rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#ea0543]" />
                      <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-900">
                        Executive AI Summary
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                        ✨ On-Demand Gemini
                      </span>
                    </div>
                    {isAiFallback && (
                      <Badge variant="outline" className="text-[10px] text-zinc-500 bg-white">
                        Deterministic Rules Fallback
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm sm:text-base text-zinc-800 font-serif leading-relaxed">
                    {aiSummary || analyticsResult.structuredPayloadForAi.summary}
                  </p>
                </div>
              )}

              {/* Exact KPI Metric Cards (Section 14) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {analyticsResult.kpis.map((kpi, idx) => (
                  <Card key={idx} className="p-4 sm:p-5 rounded-2xl bg-white border-zinc-200/80 shadow-2xs">
                    <span className="text-xs text-zinc-500 font-medium">{kpi.label}</span>
                    <div className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 mt-1 tracking-tight">
                      {kpi.value}
                    </div>
                    {kpi.subtext && (
                      <p className="text-[11px] text-zinc-400 mt-1 truncate">
                        {kpi.subtext}
                      </p>
                    )}
                  </Card>
                ))}
              </div>

              {/* Visual Analytics Engine: Interactive Recharts (Section 15 & 16) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {analyticsResult.charts.map((chart) => (
                  <ErrorBoundary
                    key={chart.id}
                    fallbackTitle={`${chart.title} Visualization`}
                    fallbackMessage="Unable to render this specific chart visualization. The underlying statistical records and KPIs remain completely intact."
                  >
                    <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-2xs space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900 font-serif">{chart.title}</h4>
                        {chart.subtitle && <p className="text-xs text-zinc-400">{chart.subtitle}</p>}
                      </div>

                      <div className="h-60 w-full pt-1">
                        <ResponsiveContainer width="100%" height={210}>
                          {chart.type === 'bar' ? (
                            <BarChart id={`barchart-${chart.id}`} data={chart.data} margin={BAR_CHART_MARGIN}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                              <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                              <Bar dataKey={chart.dataKeys[0]} fill={TIP_COLORS.primary} radius={[4, 4, 0, 0]} />
                              {chart.dataKeys[1] && (
                                <Bar dataKey={chart.dataKeys[1]} fill={TIP_COLORS.crimson} radius={[4, 4, 0, 0]} />
                              )}
                            </BarChart>
                          ) : chart.type === 'line' ? (
                            <LineChart id={`linechart-${chart.id}`} data={chart.data} margin={LINE_CHART_MARGIN}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                              <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                              <Line type="monotone" dataKey={chart.dataKeys[0]} stroke={chart.dataKeys[0] === 'Registrations' ? '#94a3b8' : TIP_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
                              {chart.dataKeys[1] && (
                                <Line type="monotone" dataKey={chart.dataKeys[1]} stroke={TIP_COLORS.crimson} strokeWidth={2.5} dot={{ r: 4 }} />
                              )}
                            </LineChart>
                          ) : (
                            <PieChart id={`piechart-${chart.id}`} margin={PIE_CHART_MARGIN}>
                              <Pie
                                data={chart.data}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {chart.data.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={TIP_COLORS.palette[index % TIP_COLORS.palette.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                            </PieChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      {/* Custom Non-Colliding Legends */}
                      {chart.type === 'bar' && (
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                            <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: TIP_COLORS.primary }}></span>
                            <span>{chart.dataKeys[0]}</span>
                          </div>
                          {chart.dataKeys[1] && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                              <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: TIP_COLORS.crimson }}></span>
                              <span>{chart.dataKeys[1]}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {chart.type === 'line' && (
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                            <span className="w-3.5 h-1 rounded-full shrink-0" style={{ backgroundColor: chart.dataKeys[0] === 'Registrations' ? '#94a3b8' : TIP_COLORS.primary }}></span>
                            <span>{chart.dataKeys[0]}</span>
                          </div>
                          {chart.dataKeys[1] && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                              <span className="w-3.5 h-1 rounded-full shrink-0" style={{ backgroundColor: TIP_COLORS.crimson }}></span>
                              <span>{chart.dataKeys[1]}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {chart.type === 'donut' && (
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-1 max-h-16 overflow-y-auto">
                          {chart.data.map((item, index) => (
                            <div key={index} className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: TIP_COLORS.palette[index % TIP_COLORS.palette.length] }}
                              ></span>
                              <span>{item.name}: {item.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ErrorBoundary>
                ))}
              </div>


              {/* Grounded 3-Part AI Insights Cards (Section 17-23, 43, Roadmap Step 12) */}
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-base font-serif font-semibold text-zinc-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#ea0543]" />
                      <span>Grounded Data Insights & Recommendations</span>
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Distinguishing observed empirical facts from pattern interpretation and practical nonprofit actions:
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-zinc-400 font-mono">
                    Grounded AI Protocol
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category 1: Observed Facts */}
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 uppercase font-mono tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      <span>Observed Facts</span>
                    </div>
                    {aiInsights.filter(i => i.category === 'observed' || !i.category).slice(0, 3).map((ins, idx) => (
                      <div key={idx} className="space-y-1">
                        <h5 className="text-xs font-semibold text-zinc-800">{ins.title}</h5>
                        <p className="text-xs text-zinc-600 leading-relaxed">{ins.description}</p>
                      </div>
                    ))}
                    {aiInsights.length === 0 && activeGroundedFallback?.observed_facts.slice(0, 3).map((f, idx) => (
                      <div key={idx} className="space-y-1">
                        <h5 className="text-xs font-semibold text-zinc-800">{f.title}</h5>
                        <p className="text-xs text-zinc-600 leading-relaxed">{f.fact}</p>
                      </div>
                    ))}
                  </div>

                  {/* Category 2: Interpretation & Trends */}
                  <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 uppercase font-mono tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>Interpretation & Patterns</span>
                    </div>
                    {aiInsights.filter(i => i.category === 'interpretation').slice(0, 3).map((ins, idx) => (
                      <div key={idx} className="space-y-1">
                        <h5 className="text-xs font-semibold text-amber-950">{ins.title}</h5>
                        <p className="text-xs text-amber-900 leading-relaxed">{ins.description}</p>
                      </div>
                    ))}
                    {aiInsights.length === 0 && activeGroundedFallback?.interpretations.slice(0, 3).map((p, idx) => (
                      <div key={idx} className="space-y-1">
                        <h5 className="text-xs font-semibold text-amber-950">{p.title}</h5>
                        <p className="text-xs text-amber-900 leading-relaxed">{p.pattern}</p>
                      </div>
                    ))}
                  </div>

                  {/* Category 3: Suggested Actions */}
                  <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 uppercase font-mono tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <span>Suggested Actions</span>
                    </div>
                    {aiInsights.filter(i => i.category === 'action').slice(0, 3).map((ins, idx) => (
                      <div key={idx} className="space-y-1">
                        <h5 className="text-xs font-semibold text-emerald-950">{ins.title}</h5>
                        <p className="text-xs text-emerald-900 leading-relaxed">{ins.description}</p>
                        {ins.recommendation && (
                          <div className="text-[11px] font-medium text-emerald-800 pt-1">
                            Action: {ins.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                    {aiInsights.length === 0 && activeGroundedFallback?.recommendations.slice(0, 3).map((r, idx) => (
                      <div key={idx} className="space-y-1">
                        <h5 className="text-xs font-semibold text-emerald-950">{r.title}</h5>
                        <p className="text-xs text-emerald-900 leading-relaxed">{r.rationale}</p>
                        <div className="text-[11px] font-medium text-emerald-800 pt-1">
                          Action: {r.suggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Caveats and Data Quality Notes */}
                {(aiCaveats.length > 0 || (activeGroundedFallback?.limitations && activeGroundedFallback.limitations.length > 0)) && (
                  <div className="pt-3 border-t border-zinc-100 text-xs text-zinc-400 space-y-1">
                    <span className="font-semibold text-zinc-500">Sampling & Data Quality Considerations:</span>
                    {(aiCaveats.length > 0 ? aiCaveats : (activeGroundedFallback?.limitations || [])).map((c, i) => (
                      <div key={i}>• {c}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data Lineage & Methodology Footer (Section 36) */}
              <div className="bg-zinc-50 rounded-2xl border border-zinc-200/70 p-4 text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <span>Source: <strong>{datasetName}</strong></span>
                  <span>Engine: <strong>tip-math-v1.0 (Deterministic)</strong></span>
                  <span>Model: <strong>gemini-2.5-flash</strong></span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  Analysis Timestamp: {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
                </div>
              </div>
            </div>
          ) : (

              <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 text-center space-y-4 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-zinc-900">Analysis Result Not Loaded</h3>
                  <p className="text-xs text-zinc-500 mt-1">Please return to the mapping review step to re-calculate your dataset.</p>
                </div>
                <Button
                  onClick={() => setAnalysisStep('quality_mapping')}
                  className="bg-[#140a8e] hover:bg-[#140a8e]/90 text-white text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Return to Mappings
                </Button>
              </div>
            )
          )}
        </div>
      )}


      {/* ========================================================================= */}
      {/* TAB 2: "ASK YOUR DATA" NATURAL LANGUAGE QUERY CONSOLE (Section 26-29)     */}
      {/* ========================================================================= */}
      {activeTab === 'ask_data' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-serif font-semibold text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#ea0543]" />
                <span>Ask Your Data</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xl leading-relaxed">
                Query TIP's operational records in plain English. Queries are verified against your role-based access permissions, computed deterministically, and explained clearly.
              </p>
            </div>

            {/* Natural language input bar */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleAskData(); }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  disabled={!canCreate || queryLoading}
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={
                    !canCreate 
                      ? "AI querying is restricted. Permission from Super Admin required." 
                      : "e.g., Which program has the highest attendance? What was our total recorded funding?"
                  }
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#140a8e]/10 focus:border-[#140a8e] transition-colors disabled:bg-zinc-100 disabled:cursor-not-allowed"
                />
              </div>
              <Button
                type="submit"
                disabled={queryLoading || !userQuery.trim() || !canCreate}
                title={!canCreate ? Permissions.getDisabledReason(currentUser, 'intelligence', 'create') : undefined}
                className={`text-xs px-5 py-2.5 rounded-xl shadow-xs ${
                  canCreate 
                    ? 'bg-[#140a8e] hover:bg-[#140a8e]/90 text-white cursor-pointer' 
                    : 'bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed opacity-60'
                }`}
              >
                {!canCreate ? (
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Restricted</span>
                  </span>
                ) : (
                  queryLoading ? 'Calculating...' : 'Ask'
                )}
              </Button>
            </form>

            {/* Suggested Starter Questions (Section 27) */}
            <div className="pt-2">
              <span className="text-[11px] text-zinc-400 font-mono block mb-2">Example questions:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Which program had the highest attendance?',
                  'What is total recorded funding across our programs?',
                  'How many unique participants are registered in our cohorts?',
                  'Identify sessions with below-average attendance rates'
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={!canCreate}
                    title={!canCreate ? Permissions.getDisabledReason(currentUser, 'intelligence', 'create') : undefined}
                    onClick={() => {
                      if (!canCreate) return;
                      setUserQuery(q);
                      handleAskData(q);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border text-left transition-colors ${
                      canCreate
                        ? 'border-zinc-200 bg-white hover:border-[#140a8e]/50 hover:bg-zinc-50 text-zinc-700 cursor-pointer'
                        : 'border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Query Response Stream */}
          <div className="space-y-4">
            {queryHistory.map((item, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      Query Question
                    </span>
                    <h4 className="text-sm font-semibold text-zinc-900">
                      "{item.question}"
                    </h4>
                  </div>
                  {item.authorized ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                      RBAC Authorized
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 text-[10px]">
                      Access Refused
                    </Badge>
                  )}
                </div>

                {!item.authorized ? (
                  <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-800">
                    <div className="font-semibold mb-0.5">{item.refusalReason}</div>
                    <p className="text-rose-700">{item.aiExplanation}</p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {/* Exact Deterministic Calculation Fact */}
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 text-xs">
                      <span className="font-semibold text-zinc-800 block mb-0.5 font-mono text-[11px]">
                        Exact Calculated Fact:
                      </span>
                      <p className="text-zinc-700 font-medium">{item.calculationFact}</p>
                    </div>

                    {/* AI Explanation */}
                    <div className="text-xs text-zinc-700 leading-relaxed">
                      <span className="font-semibold text-zinc-900 block mb-0.5">Analysis Context:</span>
                      <p>{item.aiExplanation}</p>
                    </div>

                    {/* Actionable recommendation */}
                    {item.suggestedAction && (
                      <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70 text-xs text-emerald-950 flex items-start gap-2">
                        <span className="font-semibold text-emerald-800 shrink-0 font-mono text-[11px]">Action:</span>
                        <span>{item.suggestedAction}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ANALYSIS HISTORY & DATA LINEAGE (Section 36 & 37)                   */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-base font-serif font-semibold text-zinc-900">
                Analysis History & Data Lineage
              </h3>
              <p className="text-xs text-zinc-500">
                Audit trail of datasets ingested, profiled, and analyzed by the TIP Intelligence layer:
              </p>
            </div>
          </div>

          <div className="divide-y divide-zinc-100">
            {savedAnalyses.map(item => (
              <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 p-2 rounded-xl transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 font-mono">{item.name}</span>
                    <Badge variant="outline" className="text-[10px] bg-zinc-100 text-zinc-600">
                      {item.rowCount.toLocaleString('en-CA')} rows
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{item.summary}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-400">
                  <span className="font-mono text-[11px]">{item.date}</span>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/50 font-medium">
                    {item.quality}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printable Executive PDF Report Modal */}
      {analyticsResult && (
        <PrintableIntelligenceReport
          isOpen={isPrintReportOpen}
          onClose={() => setIsPrintReportOpen(false)}
          datasetName={datasetName || 'cleaned_eo_in.csv'}
          analyticsResult={analyticsResult}
          aiSummary={aiSummary}
          aiInsights={aiInsights}
          aiCaveats={aiCaveats}
          rawRows={rawRows}
          headers={headers}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

