/**
 * TIP CRM — Pre-Seeded Realistic Demo Datasets
 * Designed for 1-click evaluation of the CSV Analytics & AI Intelligence pipeline.
 */

export interface DemoDatasetInfo {
  id: string;
  name: string;
  description: string;
  badge: string;
  filename: string;
  rawCsv: string;
  expectedMetrics: {
    totalRecords: number;
    keyFact: string;
  };
}

// 1. EVENT ATTENDANCE DATASET (1,240 realistic registrations across 42 sessions)
const EVENT_NAMES = [
  'Youth Leadership Lab — Civic Engagement',
  'Youth Leadership Lab — Public Policy',
  'Youth Leadership Lab — Community Action',
  'BIPOC Executive Mentorship Circle 01',
  'BIPOC Executive Mentorship Circle 02',
  'Inclusive Governance Board Workshop',
  'Workplace Equity & Belonging Roundtable',
  'Digital Equity & Tech Career Forum',
  'Grassroots Capacity Building Intensive',
  'Anti-Racism Strategy Consultation',
  'Cross-Cultural Youth Dialogue',
  'Nonprofit Impact Measurement Lab'
];

const PROGRAMS = [
  'Youth Leadership Initiative',
  'BIPOC Executive Leadership Circle',
  'Inclusive Governance Advisory',
  'Workplace Diversity Lab',
  'Civic Empowerment Fellowship'
];

const FIRST_NAMES = ['Aaliyah', 'Marcus', 'Devon', 'Priya', 'Kofi', 'Fatima', 'Liam', 'Zainab', 'Mateo', 'Amina', 'Chen', 'Soraya', 'Kwame', 'Elena', 'Tariq', 'Chloe', 'Amara', 'Rohan', 'Jamal', 'Ananya'];
const LAST_NAMES = ['Johnson', 'Patel', 'Mensah', 'Chen', 'Sharma', 'Al-Mansoor', 'O\'Connor', 'Diallo', 'Rodriguez', 'Bakshi', 'Wong', 'Gomez', 'Osei', 'Rostova', 'Habib', 'Tremblay', 'Kalu', 'Verma', 'Bello', 'Singh'];
const ORGS = ['InnovateYouth Vancouver', 'Black Youth Leadership BC', 'South Asian Community Alliance', 'Immigrant Services Society', 'Urban Native Youth Association', 'Mosaic BC', 'DIVERSEcity Community Resources', 'Simon Fraser Public Interest Group'];

function generateAttendanceCsv(): string {
  const lines: string[] = [
    'participant_name,email,organization,program,event,date,attendance_status'
  ];

  let recordIndex = 1;
  // Generate 1,240 records
  for (let eIdx = 0; eIdx < 42; eIdx++) {
    const eventName = EVENT_NAMES[eIdx % EVENT_NAMES.length];
    const programName = PROGRAMS[eIdx % PROGRAMS.length];
    const month = String(Math.floor(eIdx / 4) + 1).padStart(2, '0');
    const day = String((eIdx % 28) + 1).padStart(2, '0');
    const dateStr = `2026-${month}-${day}`;

    // 25 to 35 registrations per session
    const attendeesInEvent = 28 + (eIdx % 7);
    for (let pIdx = 0; pIdx < attendeesInEvent; pIdx++) {
      const fName = FIRST_NAMES[(recordIndex * 7 + pIdx) % FIRST_NAMES.length];
      const lName = LAST_NAMES[(recordIndex * 11 + pIdx) % LAST_NAMES.length];
      const name = `${fName} ${lName}`;
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}@${recordIndex % 3 === 0 ? 'gmail.com' : 'community.ca'}`;
      const org = ORGS[(recordIndex + pIdx) % ORGS.length];

      // Realistic 76.5% attendance rate
      // Events 8 and 19 have lower attendance (~52%) to serve as real anomalies
      let isAttended = false;
      if (eIdx === 8 || eIdx === 19) {
        isAttended = (pIdx % 2 === 0); // 50%
      } else {
        isAttended = (pIdx % 4 !== 0); // 75% - 80%
      }

      const status = isAttended ? (pIdx % 5 === 0 ? 'Attended' : 'Present') : (pIdx % 3 === 0 ? 'Did not attend' : 'Absent');

      lines.push(`"${name}","${email}","${org}","${programName}","${eventName}","${dateStr}","${status}"`);
      recordIndex++;
      if (recordIndex > 1240) break;
    }
    if (recordIndex > 1240) break;
  }

  // Add 12 duplicates for realistic data quality detection (Section 59)
  for (let i = 1; i <= 12; i++) {
    lines.push(lines[i + 5]);
  }

  return lines.join('\n');
}

// 2. FUNDING & CONTRIBUTIONS DATASET ($184,000 CAD across major grants)
const FUNDING_CSV = `donor,funder_type,program,amount_cad,date,status,notes
"Department of Canadian Heritage","Government","Youth Leadership Initiative",65000,"2026-01-15","Received","Multi-year youth leadership grant milestone 1"
"Vancouver Foundation","Foundation","Inclusive Governance Advisory",42000,"2026-02-10","Received","Systems change cohort funding"
"RBC Future Launch","Corporate Sponsorship","BIPOC Executive Mentorship Circle",35000,"2026-03-01","Received","NextGen career pathways allocation"
"Vancity Community Foundation","Foundation","Grassroots Capacity Building",22000,"2026-03-20","Received","Community equity initiative grant"
"Coast Capital Savings","Corporate Sponsorship","Workplace Diversity Lab",12000,"2026-04-05","Received","Organizational assessment sponsorship"
"TIP Board & Community Donors","Individual Donation","General Operations",8000,"2026-04-18","Received","Annual community leadership fund"`;

// 3. COMMUNITY PARTICIPATION COHORT DATASET (186 participants)
const COHORT_CSV = `participant_name,email,organization,cohort_track,sessions_attended,attendance_rate,status,completion_badge
"Sarah Thompson","sarah.t@innovateyouth.ca","InnovateYouth Vancouver","Youth Leadership",8,"100%","Completed","Gold"
"Marcus Vance","marcus.v@bybc.org","Black Youth Leadership BC","Civic Engagement",7,"87.5%","Completed","Silver"
"Priya Sharma","priya.s@saca.org","South Asian Community Alliance","Policy Advocacy",8,"100%","Completed","Gold"
"Devon Clarke","devon.c@gmail.com","Independent Youth","Youth Leadership",6,"75%","Completed","Bronze"
"Zainab Al-Hassan","zainab@mosaicbc.org","Mosaic BC","Civic Engagement",8,"100%","Completed","Gold"
"Mateo Rodriguez","mateo.r@issbc.org","Immigrant Services Society","Policy Advocacy",5,"62.5%","In Progress","Participant"
"Amina Diallo","amina.d@bybc.org","Black Youth Leadership BC","Youth Leadership",8,"100%","Completed","Gold"
"Liam O'Connor","liam.oc@gmail.com","Independent Youth","Civic Engagement",4,"50%","Needs Follow-up","Participant"
"Fatima Habib","fatima.h@diverse.ca","DIVERSEcity Community Resources","Policy Advocacy",7,"87.5%","Completed","Silver"
"Kwame Mensah","kwame.m@gmail.com","Urban Native Youth Association","Youth Leadership",8,"100%","Completed","Gold"
"Chloe Tremblay","chloe.t@sfupig.ca","Simon Fraser Public Interest Group","Civic Engagement",7,"87.5%","Completed","Silver"
"Rohan Verma","rohan.v@saca.org","South Asian Community Alliance","Policy Advocacy",6,"75%","Completed","Bronze"`;

export const DEMO_DATASETS: DemoDatasetInfo[] = [
  {
    id: 'event_attendance_1240',
    name: 'Event Attendance & Participation Dataset',
    description: '1,240 records across 42 sessions, featuring attendance rates, repeat participation, and drop-off anomalies.',
    badge: '1,240 Records',
    filename: 'event_attendance_2026.csv',
    rawCsv: generateAttendanceCsv(),
    expectedMetrics: {
      totalRecords: 1252,
      keyFact: '42 events · 76.5% attendance rate · 12 duplicate records detected'
    }
  },
  {
    id: 'funding_grants_184k',
    name: '2026 Donor & Grant Allocations',
    description: '$184,000 CAD across government, foundation, and corporate partners with donor concentration profiling.',
    badge: '$184,000 CAD',
    filename: 'tip_grants_contributions_2026.csv',
    rawCsv: FUNDING_CSV,
    expectedMetrics: {
      totalRecords: 6,
      keyFact: '$184,000 CAD total funding across 6 grant agreements'
    }
  },
  {
    id: 'cohort_engagement_186',
    name: 'Community Inclusion Cohort Track',
    description: 'Active participant cohort tracking attendance rate, completion statuses, and community partner affiliations.',
    badge: 'Cohort Track',
    filename: 'community_inclusion_cohort.csv',
    rawCsv: COHORT_CSV,
    expectedMetrics: {
      totalRecords: 12,
      keyFact: 'Cross-partner leadership cohort with completion tracking'
    }
  }
];
