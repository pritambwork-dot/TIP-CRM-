import { parseCsvText } from './dataProfiler';
import { RelationshipType } from '../types';

export interface ParsedContactRow {
  name: string;
  email: string;
  org: string;
  role: string;
  phone: string;
  type: RelationshipType;
  city?: string;
  notes?: string;
}

export const SAMPLE_CSV_CONTENT = `First Name,Last Name,Email,Organization,Role,Phone,Relationship Type,City,Notes
Amara,Okafor,amara.okafor@vanequity.ca,Vancouver Equity Alliance,Policy Director,+1 (604) 555-0782,Partner,Vancouver,Municipal policy advocate
Dr. Tariq,Mansoor,tmansoor@globaldialogue.org,Centre for Global Dialogue,Executive Director,+1 (416) 555-0812,Partner,Toronto,Collaborating on civic dialogue workshops
Chloe,Bergeron,chloe.b@montrealinclusion.ca,Montreal Inclusion Collective,Lead Researcher,+1 (514) 555-0994,Advisor,Montreal,Advising on bilingual youth equity research
Maya,Lin,maya.lin@innovateyouth.org,Youth Innovation Lab,Program Director,+1 (416) 555-0142,Partner,Toronto,Co-delivering innovation cohort
Kiran,Sharma,kiran.s@calgarycivic.org,Calgary Civic Action,Youth Liaison,+1 (403) 555-0321,Participant,Calgary,Youth leadership delegate
Jean-Luc,Tremblay,jltremblay@quebeccommunity.ca,Quebec Community Health Foundation,Regional Coordinator,+1 (418) 555-0331,Stakeholder,Quebec City,Eastern region community liaison`;

export const GOOGLE_DRIVE_PRESETS = [
  {
    id: 'gdrive-folder-partners',
    name: 'TIP Community Partners (Google Drive Folder)',
    type: 'folder' as const,
    url: 'https://drive.google.com/drive/folders/1TIP-Community-Partners-2026-Org',
    fileName: '2026_EDI_Community_Partners.csv',
    size: '14.2 KB',
    description: 'Shared Google Drive folder with community stakeholder rosters',
    contactsCount: 6,
    csvData: SAMPLE_CSV_CONTENT
  },
  {
    id: 'gdrive-sheets-youth',
    name: 'Youth Leadership Advisory Cohort (Google Sheets)',
    type: 'sheet' as const,
    url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    fileName: 'Youth_Advisory_Council_Roster.csv',
    size: '8.7 KB',
    description: 'Live collaborative Google Sheet for youth leadership participants',
    contactsCount: 4,
    csvData: `Full Name,Email Address,Organization Name,Job Title,Phone Number,Category,Location
Zainab Al-Mansoor,zainab.m@youthcouncil.ca,National Youth Leadership Council,Youth Delegate,+1 (613) 555-0919,Participant,Ottawa
Devon Campbell,devon.c@bcskills.org,BC Youth Tech Initiative,Cohort Lead,+1 (778) 555-0488,Participant,Victoria
Fatima Zahra,fatima.z@edmontondiversity.ca,Edmonton Diversity Network,Student Ambassador,+1 (780) 555-0164,Participant,Edmonton
Marcus Thorne,mthorne@prairievoices.ca,Prairie Voices Society,Youth Facilitator,+1 (204) 555-0872,Facilitator,Winnipeg`
  },
  {
    id: 'gdrive-folder-funders',
    name: 'Philanthropy & Foundation Sponsors (Google Drive Folder)',
    type: 'folder' as const,
    url: 'https://drive.google.com/drive/folders/1TIP-Foundation-Sponsors-Ledger',
    fileName: 'Foundation_Funders_Directory.csv',
    size: '11.5 KB',
    description: 'Grantmakers and philanthropic foundation representatives',
    contactsCount: 3,
    csvData: `Contact Name,Email,Organization,Title,Phone,Relationship Type,City
Eleanor Vance,evance@rbc-foundation-community.ca,RBC Foundation Canada,VP Community Investment,+1 (416) 555-0901,Funder / Donor,Toronto
David Sterling,david.s@bc-hydro-social.ca,BC Hydro Community Fund,Grants Officer,+1 (604) 555-0419,Funder / Donor,Vancouver
Priya Patel,priya.patel@sunlife-giving.ca,Sun Life Community Programs,Senior Social Impact Manager,+1 (514) 555-0713,Funder / Donor,Montreal`
  }
];

/**
 * Parses raw CSV/TSV data and normalizes contact fields into structured CRM format.
 */
export function parseRawContactsCsv(csvText: string): ParsedContactRow[] {
  if (!csvText || !csvText.trim()) return [];
  const { rows } = parseCsvText(csvText);
  if (!rows || rows.length === 0) return [];

  const getCol = (row: Record<string, string>, candidates: string[]): string => {
    for (const c of candidates) {
      if (row[c] !== undefined && row[c].trim() !== '') return row[c].trim();
      const lower = c.toLowerCase();
      const matchKey = Object.keys(row).find(k => k.trim().toLowerCase() === lower);
      if (matchKey && row[matchKey] && row[matchKey].trim() !== '') {
        return row[matchKey].trim();
      }
    }
    return '';
  };

  const results: ParsedContactRow[] = [];

  for (const row of rows) {
    const firstName = getCol(row, ['First Name', 'FirstName', 'Given Name', 'first_name']);
    const lastName = getCol(row, ['Last Name', 'LastName', 'Family Name', 'Surname', 'last_name']);
    let name = getCol(row, ['Name', 'Full Name', 'FullName', 'Contact Name', 'Contact', 'Person', 'name']);
    if (!name && (firstName || lastName)) {
      name = `${firstName} ${lastName}`.trim();
    }

    const email = getCol(row, ['Email', 'Email Address', 'Contact Email', 'Work Email', 'email', 'E-mail']);
    const org = getCol(row, ['Organization', 'Organization Name', 'Org', 'Company', 'Employer', 'Affiliation', 'Agency']);
    const role = getCol(row, ['Role', 'Job Title', 'Title', 'Position', 'Designation']);
    const phone = getCol(row, ['Phone', 'Phone Number', 'Mobile', 'Telephone', 'Tel', 'Contact Number']);
    const rawType = getCol(row, ['Relationship', 'Relationship Type', 'Type', 'Category', 'Contact Type']);
    const city = getCol(row, ['City', 'Location', 'Municipality', 'Town']);
    const notes = getCol(row, ['Notes', 'Comments', 'Description', 'Bio']);

    if (!name && !email) {
      continue;
    }

    let type: RelationshipType = 'Partner';
    const lowerType = rawType.toLowerCase();
    if (lowerType.includes('funder') || lowerType.includes('donor')) type = 'Funder / Donor';
    else if (lowerType.includes('participant') || lowerType.includes('youth') || lowerType.includes('student')) type = 'Participant';
    else if (lowerType.includes('volunteer')) type = 'Volunteer';
    else if (lowerType.includes('advisor') || lowerType.includes('council')) type = 'Advisor';
    else if (lowerType.includes('facilitator') || lowerType.includes('trainer')) type = 'Facilitator';
    else if (lowerType.includes('stakeholder')) type = 'Stakeholder';
    else if (lowerType.includes('government') || lowerType.includes('public')) type = 'Stakeholder';
    else if (lowerType.includes('board')) type = 'Advisor';
    else if (lowerType.includes('corporate') || lowerType.includes('business')) type = 'Partner';
    else if (lowerType.includes('academic') || lowerType.includes('university') || lowerType.includes('college')) type = 'Partner';
    else if (lowerType.includes('community')) type = 'Stakeholder';

    results.push({
      name: name || (email ? email.split('@')[0] : 'Unknown Contact'),
      email: (email || '').toLowerCase().trim(),
      org: org || 'Community Partner',
      role: role || 'Contact',
      phone: phone || '',
      type,
      city: city || undefined,
      notes: notes || undefined
    });
  }

  return results;
}
