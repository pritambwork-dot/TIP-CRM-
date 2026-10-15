/**
 * TIP CRM — Deterministic Analytics & Statistical Engine
 * CRITICAL RULE: Gemini does NOT do the core arithmetic.
 * This engine executes 100% deterministic mathematical calculations:
 * Count, Sum, Average, Median, Min, Max, Rates, Distributions, Trends, Outliers.
 */

import { DeterministicAnalysisResult, DataQualityReport, ColumnMapping } from '../types';

/**
 * Calculates the exact statistical median of an array of numbers
 */
export function calculateMedian(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
}

export function runDeterministicAnalytics(
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
  qualityReport: DataQualityReport
): DeterministicAnalysisResult {
  const rowCount = rows.length;
  const mappingMap: Record<string, string> = {};
  mappings.forEach(m => {
    mappingMap[m.crmField] = m.csvColumn;
  });

  const participantCol = mappingMap['Person Name'];
  const programCol = mappingMap['Program Name'];
  const eventCol = mappingMap['Event / Session'];
  const dateCol = mappingMap['Event Date'];
  const attendanceCol = mappingMap['Attendance Status'];
  const statusCol = mappingMap['Status / Stage'];
  const amountCol = mappingMap['Funding Amount ($ CAD)'];
  const donorCol = mappingMap['Donor / Funder'];

  // Determine dataset type
  // Funding data takes priority when financial amounts or dedicated donor columns are present without individual participant tracking
  const isFundingData = Boolean(amountCol || (donorCol && !participantCol));
  const isAttendanceData = Boolean(!isFundingData && (attendanceCol || (programCol && participantCol) || (participantCol && eventCol)));

  const kpis: DeterministicAnalysisResult['kpis'] = [];
  const charts: DeterministicAnalysisResult['charts'] = [];
  const anomalies: string[] = [];
  const dataQualityNotes: string[] = [];

  if (qualityReport.duplicateRows > 0) {
    dataQualityNotes.push(`${qualityReport.duplicateRows} duplicate rows identified and handled during ingestion.`);
  }
  if (qualityReport.validPercentage < 90) {
    dataQualityNotes.push(`Data completeness is ${qualityReport.validPercentage}%. Calculations note missing fields.`);
  }

  // ============================================================================
  // SCENARIO A: FUNDING & CONTRIBUTIONS DATASET
  // ============================================================================
  if (isFundingData) {
    let totalFunding = 0;
    let receivedFunding = 0;
    let pipelineFunding = 0;
    const amounts: number[] = [];
    const validAmountRecords: Array<{ amount: number; donor: string; program: string; status: string }> = [];
    const donorFundingMap: Record<string, number> = {};
    const programFundingMap: Record<string, number> = {};
    const statusFundingMap: Record<string, number> = {};
    let largestGrantAmount = 0;
    let largestGrantFunder = 'Anonymous Donor';

    rows.forEach(r => {
      const rawAmt = amountCol ? r[amountCol] : '0';
      // Accounting format: (5000) -> -5000
      let numVal = rawAmt;
      if (/^\s*\((.+)\)\s*$/.test(numVal)) {
        numVal = '-' + numVal.replace(/^\s*\((.+)\)\s*$/, '$1');
      }
      const cleanNum = Number(numVal.replace(/[^0-9.-]/g, ''));
      const amt = !isNaN(cleanNum) ? cleanNum : 0;
      const statusRaw = statusCol && r[statusCol] ? r[statusCol].trim() : 'Received';
      const statusNorm = statusRaw.toLowerCase();

      // Track all non-negative valid amounts
      if (amt >= 0) {
        totalFunding += amt;
        amounts.push(amt);

        const donor = donorCol && r[donorCol] ? r[donorCol].trim() : 'Anonymous Donor';
        donorFundingMap[donor] = (donorFundingMap[donor] || 0) + amt;

        const prog = programCol && r[programCol] ? r[programCol].trim() : 'General Operations';
        programFundingMap[prog] = (programFundingMap[prog] || 0) + amt;

        // Group by status
        statusFundingMap[statusRaw] = (statusFundingMap[statusRaw] || 0) + amt;

        if (['received', 'deposited', 'cleared'].includes(statusNorm)) {
          receivedFunding += amt;
        } else {
          pipelineFunding += amt;
        }

        validAmountRecords.push({ amount: amt, donor, program: prog, status: statusRaw });

        if (amt > largestGrantAmount) {
          largestGrantAmount = amt;
          largestGrantFunder = donor;
        }
      }
    });

    // Statistical Median Calculation (Even vs Odd Lengths)
    amounts.sort((a, b) => a - b);
    const avgFunding = amounts.length > 0 ? Math.round(totalFunding / amounts.length) : 0;
    const medianFunding = calculateMedian(amounts);
    const maxFunding = largestGrantAmount;

    // Top donor concentration calculation
    const donorRankings = Object.entries(donorFundingMap).sort(([, a], [, b]) => b - a);
    const topDonorAmount = donorRankings.length > 0 ? donorRankings[0][1] : 0;
    const topDonorName = donorRankings.length > 0 ? donorRankings[0][0] : 'None';
    const topDonorConcentration = totalFunding > 0 ? Math.round((topDonorAmount / totalFunding) * 1000) / 10 : 0;

    if (topDonorConcentration >= 40 && donorRankings.length > 0) {
      anomalies.push(`Funding concentration risk: ${topDonorName} accounts for ${topDonorConcentration}% of total recorded funding.`);
    }

    kpis.push(
      { label: 'Total Recorded Funding', value: `$${totalFunding.toLocaleString('en-CA')} CAD`, subtext: `${amounts.length} contributions recorded` },
      { label: 'Average Contribution', value: `$${avgFunding.toLocaleString('en-CA')}`, subtext: `Median: $${medianFunding.toLocaleString('en-CA')}` },
      { label: 'Largest Single Grant', value: `$${maxFunding.toLocaleString('en-CA')}`, subtext: largestGrantFunder },
      { label: 'Top Donor Concentration', value: `${topDonorConcentration}%`, subtext: `${donorRankings.length} total funding sources` }
    );

    // Chart: Funding by Program
    charts.push({
      id: 'funding_by_program',
      type: 'bar',
      title: 'Funding Allocation by Program',
      subtitle: 'Distribution of grants and contributions across initiatives',
      data: Object.entries(programFundingMap).map(([name, amount]) => ({
        name: name.length > 22 ? name.slice(0, 20) + '…' : name,
        fullName: name,
        FundingCAD: amount
      })),
      dataKeys: ['FundingCAD']
    });

    // Chart: Donor Share (Donut)
    charts.push({
      id: 'donor_share',
      type: 'donut',
      title: 'Funder Contribution Share',
      subtitle: 'Proportional contribution breakdown by funding partner',
      data: donorRankings.slice(0, 7).map(([donor, amt]) => ({
        name: donor,
        value: amt
      })),
      dataKeys: ['value']
    });

    return {
      rowCount,
      qualityReport,
      mappings,
      kpis,
      charts,
      structuredPayloadForAi: {
        datasetType: 'funding',
        summary: `$${totalFunding.toLocaleString('en-CA')} CAD total funding recorded across ${donorRankings.length} funding sources and ${Object.keys(programFundingMap).length} programs.`,
        keyMetrics: {
          totalFundingCad: totalFunding,
          receivedFundingCad: receivedFunding,
          pipelineFundingCad: pipelineFunding,
          averageGrantCad: avgFunding,
          medianGrantCad: medianFunding,
          largestGrantCad: maxFunding,
          largestGrantFunder: largestGrantFunder,
          topFunderSharePercentage: topDonorConcentration,
          topFunderName: topDonorName,
          fundersCount: donorRankings.length,
          programsFundedCount: Object.keys(programFundingMap).length,
          fundingByStatus: statusFundingMap
        },
        groupings: {
          topFunders: donorRankings.slice(0, 5).map(([d, a]) => ({ donor: d, amount: a })),
          programsAllocation: programFundingMap
        },
        anomalies,
        dataQualityNotes,
        evidence: [
          { metricId: 'total_funding_cad', label: 'Total Recorded Funding', value: `$${totalFunding.toLocaleString('en-CA')} CAD`, rawNumber: totalFunding },
          { metricId: 'average_grant_cad', label: 'Average Contribution', value: `$${avgFunding.toLocaleString('en-CA')} CAD`, rawNumber: avgFunding },
          { metricId: 'median_grant_cad', label: 'Median Contribution', value: `$${medianFunding.toLocaleString('en-CA')} CAD`, rawNumber: medianFunding },
          { metricId: 'largest_grant_cad', label: 'Largest Single Grant', value: `$${maxFunding.toLocaleString('en-CA')} CAD`, rawNumber: maxFunding, entity: largestGrantFunder },
          { metricId: 'top_funder_share', label: 'Top Funder Concentration', value: `${topDonorConcentration}%`, rawNumber: topDonorConcentration, entity: topDonorName },
          { metricId: 'funders_count', label: 'Funding Sources Count', value: `${donorRankings.length} sources`, rawNumber: donorRankings.length },
          { metricId: 'programs_funded_count', label: 'Programs Funded Count', value: `${Object.keys(programFundingMap).length} programs`, rawNumber: Object.keys(programFundingMap).length }
        ],
        limitations: [
          `Analysis is strictly confined to the ${rowCount} recorded entries in this dataset.`,
          `No multi-year comparative historical records were loaded in this dataset session.`
        ]
      }
    };
  }

  // ============================================================================
  // SCENARIO B: PROGRAM PARTICIPATION & EVENT ATTENDANCE DATASET
  // ============================================================================
  if (isAttendanceData) {

    const participantsList = participantCol ? rows.map(r => r[participantCol]).filter(Boolean) : [];
    const uniqueParticipants = new Set(participantsList.map(p => p.toLowerCase().trim()));
    const totalRecords = rows.length;

    // Attendance rates
    let attendedCount = 0;
    let registeredCount = totalRecords;
    if (attendanceCol) {
      rows.forEach(r => {
        const status = (r[attendanceCol] || '').toLowerCase().trim();
        if (['attended', 'present', 'yes', 'completed'].includes(status)) {
          attendedCount++;
        }
      });
    } else {
      // If no explicit attendance column, assume all rows are attendances
      attendedCount = totalRecords;
    }

    const attendanceRate = totalRecords > 0 ? Math.round((attendedCount / totalRecords) * 1000) / 10 : 0;

    // Events and Programs unique counts
    const programsSet = new Set<string>();
    const eventsSet = new Set<string>();
    const programAttendanceMap: Record<string, { total: number; attended: number; uniquePeople: Set<string> }> = {};
    const eventAttendanceMap: Record<string, { total: number; attended: number; program: string; date: string }> = {};

    // Participant frequency (for repeat participation calculation)
    const personFrequency: Record<string, number> = {};

    rows.forEach(r => {
      const prog = programCol && r[programCol] ? r[programCol].trim() : 'General Initiative';
      const evt = eventCol && r[eventCol] ? r[eventCol].trim() : 'All Sessions';
      const person = participantCol && r[participantCol] ? r[participantCol].trim().toLowerCase() : '';
      const d = dateCol && r[dateCol] ? r[dateCol].trim() : '';
      const isAttended = attendanceCol
        ? ['attended', 'present', 'yes', 'completed'].includes((r[attendanceCol] || '').toLowerCase().trim())
        : true;

      programsSet.add(prog);
      eventsSet.add(evt);

      if (person) {
        personFrequency[person] = (personFrequency[person] || 0) + 1;
      }

      // Group by program
      if (!programAttendanceMap[prog]) {
        programAttendanceMap[prog] = { total: 0, attended: 0, uniquePeople: new Set() };
      }
      programAttendanceMap[prog].total++;
      if (isAttended) programAttendanceMap[prog].attended++;
      if (person) programAttendanceMap[prog].uniquePeople.add(person);

      // Group by event
      if (!eventAttendanceMap[evt]) {
        eventAttendanceMap[evt] = { total: 0, attended: 0, program: prog, date: d };
      }
      eventAttendanceMap[evt].total++;
      if (isAttended) eventAttendanceMap[evt].attended++;
    });

    // Repeat participation: participants with > 1 attendance / session
    const repeatCount = Object.values(personFrequency).filter(c => c > 1).length;
    const repeatRate = uniqueParticipants.size > 0 ? Math.round((repeatCount / uniqueParticipants.size) * 1000) / 10 : 0;

    // Highest and lowest attendance programs
    const programStats = Object.entries(programAttendanceMap).map(([name, data]) => {
      const rate = data.total > 0 ? Math.round((data.attended / data.total) * 1000) / 10 : 0;
      return { name, total: data.total, attended: data.attended, rate, uniqueCount: data.uniquePeople.size };
    }).sort((a, b) => b.rate - a.rate);

    const highestProgram = programStats[0];
    const lowestProgram = programStats[programStats.length - 1];

    // Outlier / Anomaly detection: Events with attendance > 20% below average
    Object.entries(eventAttendanceMap).forEach(([eventName, eData]) => {
      const eventRate = eData.total > 0 ? (eData.attended / eData.total) * 100 : 0;
      if (attendanceRate > 0 && eData.total >= 5 && eventRate < attendanceRate - 20) {
        anomalies.push(`Event "${eventName}" attendance (${Math.round(eventRate)}%) is over 20% below average (${attendanceRate}%).`);
      }
    });

    // Build KPI Cards
    kpis.push(
      { label: 'Total Records Analyzed', value: totalRecords.toLocaleString('en-CA'), subtext: `${uniqueParticipants.size} unique participants` },
      { label: 'Average Attendance Rate', value: `${attendanceRate}%`, subtext: `${attendedCount.toLocaleString('en-CA')} of ${totalRecords.toLocaleString('en-CA')} attended`, trend: attendanceRate >= 75 ? 'up' : 'down', trendValue: `${attendanceRate}%` },
      { label: 'Repeat Participation', value: `${repeatRate}%`, subtext: `${repeatCount} attendees in 2+ sessions`, trend: repeatRate >= 40 ? 'up' : 'neutral', trendValue: `${repeatRate}%` },
      { label: 'Active Programs & Cohorts', value: programsSet.size, subtext: `${eventsSet.size} sessions tracked` }
    );

    // Build Recharts Data: Program Attendance Comparison (Bar Chart)
    charts.push({
      id: 'program_attendance_comparison',
      type: 'bar',
      title: 'Program Attendance Comparison',
      subtitle: 'Total registrations vs confirmed attendance by initiative',
      data: programStats.slice(0, 8).map(p => ({
        name: p.name.length > 22 ? p.name.slice(0, 20) + '…' : p.name,
        fullName: p.name,
        Registered: p.total,
        Attended: p.attended,
        Rate: `${p.rate}%`
      })),
      dataKeys: ['Registered', 'Attended']
    });

    // Build Time-Series / Monthly Attendance Trend (Line Chart)
    const monthMap: Record<string, { total: number; attended: number }> = {};
    rows.forEach(r => {
      const d = dateCol && r[dateCol] ? r[dateCol] : '';
      if (d) {
        const month = d.slice(0, 7); // YYYY-MM
        if (month.length === 7 && month.startsWith('20')) {
          if (!monthMap[month]) monthMap[month] = { total: 0, attended: 0 };
          monthMap[month].total++;
          const isAtt = attendanceCol
            ? ['attended', 'present', 'yes', 'completed'].includes((r[attendanceCol] || '').toLowerCase().trim())
            : true;
          if (isAtt) monthMap[month].attended++;
        }
      }
    });

    const monthEntries = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b));
    if (monthEntries.length >= 2) {
      charts.push({
        id: 'attendance_timeline',
        type: 'line',
        title: 'Attendance Momentum Over Time',
        subtitle: 'Monthly registrations and attendance trends across all sessions',
        data: monthEntries.map(([m, val]) => ({
          date: m,
          Registrations: val.total,
          Attendance: val.attended,
          AttendanceRate: Math.round((val.attended / val.total) * 100)
        })),
        dataKeys: ['Registrations', 'Attendance']
      });
    }

    // Build Attendance or Status Composition (Donut Chart)
    const statusColToUse = attendanceCol || statusCol;
    if (statusColToUse) {
      const statusCounts: Record<string, number> = {};
      rows.forEach(r => {
        const s = r[statusColToUse] || 'Other';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });

      charts.push({
        id: 'attendance_composition',
        type: 'donut',
        title: attendanceCol ? 'Participant Engagement Breakdown' : 'Status & Lifecycle Distribution',
        subtitle: attendanceCol
          ? 'Distribution of participant attendance and drop-off statuses'
          : 'Distribution of participant status categories',
        data: Object.entries(statusCounts).map(([status, count]) => ({
          name: status,
          value: count
        })),
        dataKeys: ['value']
      });
    }

    return {
      rowCount,
      qualityReport,
      mappings,
      kpis,
      charts,
      structuredPayloadForAi: {
        datasetType: 'attendance',
        summary: `${rowCount} attendance records analyzed across ${programsSet.size} programs and ${eventsSet.size} events with ${uniqueParticipants.size} unique participants.`,
        keyMetrics: {
          totalRegistrations: totalRecords,
          confirmedAttendance: attendedCount,
          attendanceRatePercentage: attendanceRate,
          repeatParticipationRate: repeatRate,
          uniqueParticipantsCount: uniqueParticipants.size,
          programsCount: programsSet.size,
          eventsCount: eventsSet.size,
          highestPerformingProgram: highestProgram ? { name: highestProgram.name, rate: `${highestProgram.rate}%` } : null,
          lowestPerformingProgram: lowestProgram ? { name: lowestProgram.name, rate: `${lowestProgram.rate}%` } : null
        },
        groupings: {
          programs: programStats.slice(0, 6)
        },
        anomalies,
        dataQualityNotes,
        evidence: [
          { metricId: 'total_registrations', label: 'Total Registrations', value: `${totalRecords} registrations`, rawNumber: totalRecords },
          { metricId: 'confirmed_attendance', label: 'Confirmed Attendance', value: `${attendedCount} attendees`, rawNumber: attendedCount },
          { metricId: 'attendance_rate', label: 'Attendance Rate', value: `${attendanceRate}%`, rawNumber: attendanceRate },
          { metricId: 'repeat_participation', label: 'Repeat Participation', value: `${repeatRate}%`, rawNumber: repeatRate },
          { metricId: 'unique_participants', label: 'Unique Participants', value: `${uniqueParticipants.size} participants`, rawNumber: uniqueParticipants.size },
          { metricId: 'programs_count', label: 'Active Programs Count', value: `${programsSet.size} programs`, rawNumber: programsSet.size }
        ],
        limitations: [
          `Attendance calculations are strictly based on the ${totalRecords} uploaded records.`,
          `No historical multi-year records were provided in this dataset.`
        ]
      }
    };
  }


  // ============================================================================
  // SCENARIO C: GENERIC TABULAR DATASET
  // ============================================================================
  kpis.push(
    { label: 'Total Rows Analyzed', value: rowCount.toLocaleString('en-CA'), subtext: `${mappings.length} columns identified` },
    { label: 'Data Quality Rating', value: qualityReport.qualityRating, subtext: `${qualityReport.validPercentage}% complete records` },
    { label: 'Valid Records', value: qualityReport.validRows.toLocaleString('en-CA'), subtext: `${qualityReport.duplicateRows} duplicates filtered` },
    { label: 'Audit Warnings', value: qualityReport.warningsCount, subtext: qualityReport.warningsCount === 0 ? 'Zero issues found' : 'Review recommended' }
  );

  return {
    rowCount,
    qualityReport,
    mappings,
    kpis,
    charts,
    structuredPayloadForAi: {
      datasetType: 'generic',
      summary: `${rowCount} records processed across ${mappings.length} attributes.`,
      keyMetrics: {
        totalRows: rowCount,
        validRows: qualityReport.validRows,
        dataQualityPercentage: qualityReport.validPercentage
      },
      groupings: {},
      anomalies,
      dataQualityNotes,
      evidence: [
        { metricId: 'total_rows', label: 'Total Rows', value: `${rowCount} rows`, rawNumber: rowCount },
        { metricId: 'valid_rows', label: 'Valid Rows', value: `${qualityReport.validRows} rows`, rawNumber: qualityReport.validRows },
        { metricId: 'quality_pct', label: 'Quality Percentage', value: `${qualityReport.validPercentage}%`, rawNumber: qualityReport.validPercentage }
      ],
      limitations: [
        `Generic dataset without designated financial or attendance schema. Analysis is strictly statistical.`
      ]
    }
  };
}
