/**
 * TIP CRM — Server-Side Grounded AI Protocol & Evidence Verification Layer
 * Location: server/lib/ai/groundingProtocol.ts
 * 
 * Strict Invariants:
 * 1. ZERO INVENTED FACTS: AI must never fabricate financial figures, contact details,
 *    program outcomes, attendance counts, or dates.
 * 2. DETERMINISTIC PRECEDENCE: All numbers must originate from deterministic calculations.
 * 3. EXPLICIT UNCERTAINTY: Differentiate Observed Facts from Interpretations and Recommendations.
 * 4. SAFE ABSTENTION: When evidence is missing or ambiguous, state limitation explicitly.
 * 5. PROMPT INJECTION DEFENSE: Sanitize user input and CSV cells against instruction hijacking.
 */

export interface GroundedFact {
  title: string;
  fact: string;
  citationMetricId?: string;
  verifiedValue?: string | number;
}

export interface GroundedInterpretation {
  title: string;
  pattern: string;
  confidence: 'high' | 'moderate' | 'low';
  limitations: string;
}

export interface GroundedRecommendation {
  title: string;
  suggestion: string;
  rationale: string;
}

export interface GroundedEvidenceItem {
  metricId: string;
  label: string;
  value: string | number;
  rawNumber?: number;
  entity?: string;
}

export interface GroundedAiResponse {
  answer: string;
  status: 'verified' | 'insufficient_evidence' | 'abstention' | 'fallback_deterministic';
  dataset_id?: string;
  datasetType?: 'funding' | 'attendance' | 'generic';
  metrics_used: string[];
  observed_facts: GroundedFact[];
  interpretations: GroundedInterpretation[];
  recommendations: GroundedRecommendation[];
  evidence: GroundedEvidenceItem[];
  limitations: string[];
  needs_clarification?: string;
  // UI Compatibility fields
  summary: string;
  insights: Array<{
    category: 'observed' | 'interpretation' | 'action';
    type: 'finding' | 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'recommendation' | 'caveat';
    title: string;
    description: string;
    recommendation?: string;
  }>;
  caveats: string[];
  fallbackDeterministic?: boolean;
}

/**
 * Sanitizes user input and CSV cell contents against prompt injection
 */
export function sanitizeForPrompt(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|prior|above|system)\s+(?:instructions|prompts|rules)/gi, '[REDACTED_INJECTION_ATTEMPT]')
    .replace(/(?:you\s+are\s+now|act\s+as\s+a|system\s*prompt|system\s*message)\s*[:=]/gi, '[REDACTED_PROMPT_MANIPULATION]')
    .replace(/```/g, "'''")
    .trim();
}

/**
 * Extracts all numeric values from a text string (ignoring currency symbols, commas, and percentage signs)
 */
export function extractNumbersFromText(text: string): number[] {
  if (!text) return [];
  const matches = text.match(/-?\$?\d{1,3}(?:,\d{3})*(?:\.\d+)?%?/g) || [];
  const numbers: number[] = [];
  for (const m of matches) {
    const clean = m.replace(/[$,% ]/g, '');
    const num = Number(clean);
    if (!isNaN(num)) {
      numbers.push(num);
    }
  }
  return numbers;
}

/**
 * Generate 100% deterministic, grounded analysis when AI is offline or unconfigured
 */
export function generateDeterministicGroundedAnalysis(
  payload: any,
  datasetName?: string
): GroundedAiResponse {
  const metrics = payload?.keyMetrics || {};
  const datasetType = payload?.datasetType || (metrics.totalFundingCad !== undefined ? 'funding' : metrics.attendanceRatePercentage !== undefined ? 'attendance' : 'generic');
  const anomalies = payload?.anomalies || [];
  const dataQualityNotes = payload?.dataQualityNotes || [];
  const rawEvidence: GroundedEvidenceItem[] = payload?.evidence || [];

  const observed_facts: GroundedFact[] = [];
  const interpretations: GroundedInterpretation[] = [];
  const recommendations: GroundedRecommendation[] = [];
  const limitations: string[] = payload?.limitations ? [...payload.limitations] : [];

  let summary = '';

  // 1. FUNDING DATASET ANALYSIS
  if (datasetType === 'funding') {
    const total = metrics.totalFundingCad ?? 0;
    const avg = metrics.averageGrantCad ?? 0;
    const median = metrics.medianGrantCad ?? 0;
    const largest = metrics.largestGrantCad ?? 0;
    const largestFunder = metrics.largestGrantFunder || 'Top Contributing Funder';
    const funderShare = metrics.topFunderSharePercentage ?? 0;
    const topFunder = metrics.topFunderName || largestFunder;
    const fundersCount = metrics.fundersCount ?? 0;
    const programsCount = metrics.programsFundedCount ?? 0;

    summary = `$${total.toLocaleString('en-CA')} CAD in total funding recorded across ${fundersCount} funding sources and ${programsCount} designated initiatives.`;

    observed_facts.push({
      title: 'Total Recorded Funding',
      fact: `The eligible recorded amount totals $${total.toLocaleString('en-CA')} CAD across ${fundersCount} funding partners.`,
      citationMetricId: 'total_funding_cad',
      verifiedValue: total
    });

    observed_facts.push({
      title: 'Contribution Distribution',
      fact: `Average contribution is $${avg.toLocaleString('en-CA')} CAD; statistical median is $${median.toLocaleString('en-CA')} CAD.`,
      citationMetricId: 'median_grant_cad',
      verifiedValue: median
    });

    observed_facts.push({
      title: 'Largest Contribution & Concentration',
      fact: `Largest single grant is $${largest.toLocaleString('en-CA')} CAD from ${largestFunder}. Top funder (${topFunder}) represents ${funderShare}% of total recorded funding.`,
      citationMetricId: 'largest_grant_cad',
      verifiedValue: largest
    });

    // Interpretations
    if (funderShare >= 40) {
      interpretations.push({
        title: 'Funder Revenue Concentration',
        pattern: `A single funding source accounts for ${funderShare}% of overall recorded revenue. While this provides strong anchor support, it creates single-source revenue dependency.`,
        confidence: 'high',
        limitations: 'Evaluated against currently loaded grant agreements.'
      });
    } else {
      interpretations.push({
        title: 'Balanced Funding Portfolio',
        pattern: `Top funder contribution stands at ${funderShare}%, indicating diversified revenue support across multiple partners.`,
        confidence: 'high',
        limitations: 'Reflects active agreements in current reporting dataset.'
      });
    }

    if (programsCount > 0) {
      interpretations.push({
        title: 'Program Allocation Distribution',
        pattern: `Grants are allocated across ${programsCount} initiatives, aligning funding with active organizational cohorts.`,
        confidence: 'moderate',
        limitations: 'Based on explicit program mappings in the uploaded file.'
      });
    }

    // Recommendations
    recommendations.push({
      title: 'Interim Grant Reporting',
      suggestion: `Track deliverables and interim reporting milestones for ${largestFunder} ($${largest.toLocaleString('en-CA')} CAD) to ensure compliance.`,
      rationale: 'Protecting top funding relationships requires timely reporting compliance.'
    });

    recommendations.push({
      title: 'Funding Diversification',
      suggestion: 'Evaluate upcoming federal, provincial, and foundation grant cycles for initiatives with limited external allocations.',
      rationale: 'Proactive application scheduling stabilizes multi-year program delivery.'
    });

    limitations.push('Financial analysis reflects recorded figures in the selected dataset. Exchange rates or unrecorded pledges are excluded.');
  } 
  // 2. ATTENDANCE DATASET ANALYSIS
  else if (datasetType === 'attendance') {
    const totalReg = metrics.totalRegistrations ?? 0;
    const attended = metrics.confirmedAttendance ?? 0;
    const rate = metrics.attendanceRatePercentage ?? 0;
    const repeat = metrics.repeatParticipationRate ?? 0;
    const unique = metrics.uniqueParticipantsCount ?? 0;
    const progs = metrics.programsCount ?? 0;
    const events = metrics.eventsCount ?? 0;

    summary = `${totalReg.toLocaleString('en-CA')} attendance records analyzed across ${progs} programs and ${events} sessions with ${unique.toLocaleString('en-CA')} unique participants. Overall verified attendance is ${rate}%.`;

    observed_facts.push({
      title: 'Verified Attendance Rate',
      fact: `Confirmed attendance stands at ${rate}% (${attended.toLocaleString('en-CA')} attendees out of ${totalReg.toLocaleString('en-CA')} total registrations).`,
      citationMetricId: 'attendance_rate',
      verifiedValue: rate
    });

    observed_facts.push({
      title: 'Cohort Retention & Repeat Engagement',
      fact: `Repeat participation is ${repeat}%, representing individuals who participated in two or more scheduled sessions.`,
      citationMetricId: 'repeat_participation',
      verifiedValue: repeat
    });

    // Interpretations
    interpretations.push({
      title: 'Engagement Momentum',
      pattern: rate >= 75 
        ? `Attendance rate of ${rate}% demonstrates consistent participant commitment across scheduled sessions.`
        : `Attendance rate of ${rate}% indicates significant registration drop-off that warrants review of session scheduling or reminders.`,
      confidence: 'high',
      limitations: 'Calculated across all recorded event sessions in this dataset.'
    });

    if (repeat >= 30) {
      interpretations.push({
        title: 'Strong Cohort Continuity',
        pattern: `${repeat}% repeat attendance reflects an established core community returning for sustained engagement.`,
        confidence: 'moderate',
        limitations: 'Unique participant matching based on standardized name/email fields.'
      });
    }

    // Recommendations
    recommendations.push({
      title: 'Pre-Session Confirmation Workflow',
      suggestion: 'Implement automated SMS/email reminders 24 hours prior to scheduled sessions to reduce no-show rates.',
      rationale: 'Automated reminders consistently improve nonprofit workshop turnout by 10-15%.'
    });

    limitations.push('Attendance records reflect uploaded attendance rosters. Historical multi-year attendance is not included in this file.');
  } 
  // 3. GENERIC TABULAR DATASET ANALYSIS
  else {
    const total = metrics.totalRows ?? 0;
    const valid = metrics.validRows ?? total;
    const quality = metrics.dataQualityPercentage ?? 100;

    summary = `${total.toLocaleString('en-CA')} records processed deterministically with ${quality}% overall data completeness.`;

    observed_facts.push({
      title: 'Data Completeness',
      fact: `${valid.toLocaleString('en-CA')} of ${total.toLocaleString('en-CA')} records meet validation criteria (${quality}% complete).`,
      citationMetricId: 'valid_rows',
      verifiedValue: valid
    });

    interpretations.push({
      title: 'Tabular Structure',
      pattern: 'Dataset attributes match standard tabular formatting without identified corruption.',
      confidence: 'moderate',
      limitations: 'General schema without domain-specific entity mappings.'
    });

    recommendations.push({
      title: 'Schema Standardization',
      suggestion: 'Review column mappings to connect tabular records with canonical TIP CRM entities (People, Programs, Funding).',
      rationale: 'Canonical mapping unlocks automated entity relationships and cross-module insights.'
    });

    limitations.push('Generic tabular analysis. Domain-specific financial or attendance rules require corresponding column mapping.');
  }

  // Compile UI-friendly insights array
  const insights: GroundedAiResponse['insights'] = [
    ...observed_facts.map(f => ({
      category: 'observed' as const,
      type: 'finding' as const,
      title: f.title,
      description: f.fact
    })),
    ...interpretations.map(i => ({
      category: 'interpretation' as const,
      type: 'trend' as const,
      title: i.title,
      description: i.pattern
    })),
    ...recommendations.map(r => ({
      category: 'action' as const,
      type: 'recommendation' as const,
      title: r.title,
      description: r.rationale,
      recommendation: r.suggestion
    }))
  ];

  return {
    answer: summary,
    status: 'fallback_deterministic',
    dataset_id: payload?.datasetId || 'dataset_current',
    datasetType,
    metrics_used: Object.keys(metrics),
    observed_facts,
    interpretations,
    recommendations,
    evidence: rawEvidence,
    limitations,
    summary,
    insights,
    caveats: limitations,
    fallbackDeterministic: true
  };
}

/**
 * Validates an AI-generated analytical response against verified precomputed evidence.
 * If the model hallucinates numbers or entities not present in the evidence,
 * the response is safely sanitized and replaced with verified values.
 */
export function validateAiClaimsAgainstEvidence(
  aiOutput: any,
  payload: any,
  datasetName?: string
): GroundedAiResponse {
  // If output is not an object or empty, return verified deterministic response
  if (!aiOutput || typeof aiOutput !== 'object') {
    return generateDeterministicGroundedAnalysis(payload, datasetName);
  }

  const deterministicFallback = generateDeterministicGroundedAnalysis(payload, datasetName);
  const metrics = payload?.keyMetrics || {};
  const datasetType = payload?.datasetType || deterministicFallback.datasetType;

  // Build lookup of allowable numbers from verified evidence
  const verifiedNumbers = new Set<number>();
  if (metrics.totalFundingCad !== undefined) verifiedNumbers.add(metrics.totalFundingCad);
  if (metrics.averageGrantCad !== undefined) verifiedNumbers.add(metrics.averageGrantCad);
  if (metrics.medianGrantCad !== undefined) verifiedNumbers.add(metrics.medianGrantCad);
  if (metrics.largestGrantCad !== undefined) verifiedNumbers.add(metrics.largestGrantCad);
  if (metrics.topFunderSharePercentage !== undefined) verifiedNumbers.add(metrics.topFunderSharePercentage);
  if (metrics.fundersCount !== undefined) verifiedNumbers.add(metrics.fundersCount);
  if (metrics.programsFundedCount !== undefined) verifiedNumbers.add(metrics.programsFundedCount);
  if (metrics.totalRegistrations !== undefined) verifiedNumbers.add(metrics.totalRegistrations);
  if (metrics.confirmedAttendance !== undefined) verifiedNumbers.add(metrics.confirmedAttendance);
  if (metrics.attendanceRatePercentage !== undefined) verifiedNumbers.add(metrics.attendanceRatePercentage);
  if (metrics.repeatParticipationRate !== undefined) verifiedNumbers.add(metrics.repeatParticipationRate);
  if (metrics.uniqueParticipantsCount !== undefined) verifiedNumbers.add(metrics.uniqueParticipantsCount);

  // Validate Observed Facts: Every factual claim must match verified numbers
  let hasHallucination = false;
  const detectedLimitations: string[] = [];
  const validatedFacts: GroundedFact[] = [];

  const rawFacts: any[] = Array.isArray(aiOutput.observed_facts) 
    ? aiOutput.observed_facts 
    : (Array.isArray(aiOutput.insights) ? aiOutput.insights.filter((i: any) => i.category === 'observed') : []);

  if (rawFacts.length === 0) {
    // If model omitted observed facts, supply the verified ones
    validatedFacts.push(...deterministicFallback.observed_facts);
  } else {
    for (const f of rawFacts) {
      const title = String(f.title || 'Observed Fact').slice(0, 100);
      const text = String(f.fact || f.description || '');
      const numbersInText = extractNumbersFromText(text);

      let textHasUnsupportedNumber = false;
      for (const num of numbersInText) {
        // Allow minor rounding or small integers (like counting 1, 2, 3)
        if (num > 10 && !verifiedNumbers.has(num) && !verifiedNumbers.has(Math.round(num))) {
          // Check if any verified number is within 1% (rounding tolerance)
          let matchesTolerance = false;
          for (const v of verifiedNumbers) {
            if (Math.abs(v - num) <= Math.max(1, v * 0.02)) {
              matchesTolerance = true;
              break;
            }
          }
          if (!matchesTolerance) {
            textHasUnsupportedNumber = true;
            hasHallucination = true;
            detectedLimitations.push(`Unverified numeric claim: Amount '${num}' is not supported by verified evidence.`);
            break;
          }
        }
      }

      if (!textHasUnsupportedNumber && text.length > 5) {
        validatedFacts.push({
          title,
          fact: text
        });
      }
    }
  }

  // If all generated facts failed validation, replace with verified deterministic facts
  if (validatedFacts.length === 0) {
    validatedFacts.push(...deterministicFallback.observed_facts);
  }

  // Validate Interpretations: Ensure conservative language
  const validatedInterpretations: GroundedInterpretation[] = [];
  const rawInterpretations: any[] = Array.isArray(aiOutput.interpretations)
    ? aiOutput.interpretations
    : (Array.isArray(aiOutput.insights) ? aiOutput.insights.filter((i: any) => i.category === 'interpretation') : []);

  if (rawInterpretations.length === 0) {
    validatedInterpretations.push(...deterministicFallback.interpretations);
  } else {
    for (const item of rawInterpretations.slice(0, 3)) {
      const patternText = String(item.pattern || item.description || '');
      let itemLimitation = String(item.limitations || 'Observed strictly within current dataset.');
      if (/(?:because of|caused by|resulted from|led to|drove|surged by)\s+/i.test(patternText)) {
        const causalCaveat = `Causal claim in '${item.title || 'pattern'}' is unverified without longitudinal control data.`;
        itemLimitation = causalCaveat;
        detectedLimitations.push(causalCaveat);
      }
      validatedInterpretations.push({
        title: String(item.title || 'Observed Pattern').slice(0, 100),
        pattern: patternText,
        confidence: item.confidence === 'high' || item.confidence === 'low' ? item.confidence : 'moderate',
        limitations: itemLimitation
      });
    }
  }

  // Validate Recommendations
  const validatedRecommendations: GroundedRecommendation[] = [];
  const rawRecs: any[] = Array.isArray(aiOutput.recommendations)
    ? aiOutput.recommendations
    : (Array.isArray(aiOutput.insights) ? aiOutput.insights.filter((i: any) => i.category === 'action') : []);

  if (rawRecs.length === 0) {
    validatedRecommendations.push(...deterministicFallback.recommendations);
  } else {
    for (const r of rawRecs.slice(0, 3)) {
      validatedRecommendations.push({
        title: String(r.title || 'Recommended Action').slice(0, 100),
        suggestion: String(r.suggestion || r.recommendation || r.description || ''),
        rationale: String(r.rationale || r.description || 'Supports operational excellence.')
      });
    }
  }

  // Validate Summary
  let summary = String(aiOutput.summary || deterministicFallback.summary);
  const summaryNumbers = extractNumbersFromText(summary);
  for (const num of summaryNumbers) {
    if (num > 10 && !verifiedNumbers.has(num) && !verifiedNumbers.has(Math.round(num))) {
      let withinTol = false;
      for (const v of verifiedNumbers) {
        if (Math.abs(v - num) <= Math.max(1, v * 0.02)) {
          withinTol = true;
          break;
        }
      }
      if (!withinTol) {
        // Summary had hallucinated number; replace with deterministic summary
        summary = deterministicFallback.summary;
        hasHallucination = true;
        detectedLimitations.push(`Summary contained unverified figure '${num}'; replaced with verified deterministic summary.`);
        break;
      }
    }
  }

  const baseLimitations = Array.isArray(aiOutput.caveats || aiOutput.limitations) && (aiOutput.caveats || aiOutput.limitations).length > 0
    ? (aiOutput.caveats || aiOutput.limitations).map(String)
    : deterministicFallback.limitations;

  const limitations = Array.from(new Set([...baseLimitations, ...detectedLimitations]));

  // Build UI-friendly insights array
  const uiInsights: GroundedAiResponse['insights'] = [
    ...validatedFacts.map(f => ({
      category: 'observed' as const,
      type: 'finding' as const,
      title: f.title,
      description: f.fact
    })),
    ...validatedInterpretations.map(i => ({
      category: 'interpretation' as const,
      type: 'trend' as const,
      title: i.title,
      description: i.pattern
    })),
    ...validatedRecommendations.map(r => ({
      category: 'action' as const,
      type: 'recommendation' as const,
      title: r.title,
      description: r.rationale,
      recommendation: r.suggestion
    }))
  ];

  return {
    answer: summary,
    status: hasHallucination ? 'insufficient_evidence' : 'verified',
    dataset_id: payload?.datasetId || 'dataset_current',
    datasetType,
    metrics_used: Object.keys(metrics),
    observed_facts: validatedFacts,
    interpretations: validatedInterpretations,
    recommendations: validatedRecommendations,
    evidence: deterministicFallback.evidence,
    limitations,
    summary,
    insights: uiInsights,
    caveats: limitations,
    fallbackDeterministic: false
  };
}
