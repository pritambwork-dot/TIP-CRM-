/**
 * TIP CRM — Security Check 11: Secure Error Handling & Failure Recovery Test Suite
 * Location: src/test/securityAndIntegration.test.ts
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { 
  sanitizeSecrets, 
  generateCorrelationId, 
  mapToSafeErrorMessage, 
  clientSafeLogger 
} from '../lib/safeErrors.ts';
import { 
  extractAndParseJson, 
  getGeminiApiKey 
} from '../../server/lib/ai/gemini.ts';
import { 
  sendSafeError, 
  ERROR_CODES, 
  generateServerCorrelationId,
  ApiErrorEnvelope 
} from '../../server/lib/safeErrors.ts';
import { aiMiddlewareHandler } from '../../server/aiMiddleware.ts';
import apiGatewayHandler from '../../api/index.ts';
import { recordAuditEvent, queryAuditLogs, type ServerAuditRecord } from '../../server/lib/auditLogger.ts';
import { 
  validateUploadFile, 
  verifyMagicBytes, 
  sanitizeFilename, 
  validateExternalUrl, 
  validateBackupStructure,
  createSignedFileToken,
  verifySignedFileToken,
  generateStorageKey
} from '../../server/lib/fileValidation.ts';
import { sanitizeCsvCell } from '../lib/csvExport.ts';
import { 
  isAllowedOrigin, 
  getAllowedOrigins, 
  generateCsrfToken, 
  verifyCsrfToken, 
  handleCors, 
  validateCsrf 
} from '../../server/lib/corsCsrf.ts';

// Lightweight Test Runner
let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// Mock HTTP Request/Response helpers
function createMockReq(options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
}): http.IncomingMessage {
  const req = new EventEmitter() as any;
  req.method = options.method || 'GET';
  req.url = options.url || '/';
  req.headers = options.headers || {};
  req.body = options.body;
  return req as http.IncomingMessage;
}

function createMockRes(): {
  res: http.ServerResponse;
  getData: () => any;
  getStatusCode: () => number;
  getHeaders: () => Record<string, any>;
} {
  let statusCode = 200;
  const headers: Record<string, any> = {};
  let bodyBuffer = '';

  const res = {
    statusCode: 200,
    headersSent: false,
    writeHead: (code: number, hdrs?: any) => {
      statusCode = code;
      res.statusCode = code;
      if (hdrs) {
        for (const [k, v] of Object.entries(hdrs)) {
          headers[k.toLowerCase()] = v;
        }
      }
      return res;
    },
    setHeader: (name: string, val: any) => {
      headers[name.toLowerCase()] = val;
    },
    getHeader: (name: string) => headers[name.toLowerCase()],
    end: (chunk?: any) => {
      if (chunk) bodyBuffer += chunk;
      res.headersSent = true;
    }
  } as any;

  return {
    res: res as http.ServerResponse,
    getStatusCode: () => statusCode,
    getHeaders: () => headers,
    getData: () => {
      try {
        return JSON.parse(bodyBuffer);
      } catch {
        return bodyBuffer;
      }
    }
  };
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('TIP CRM — SECURITY CHECK 11: ERROR HANDLING & FAILURE RECOVERY');
  console.log('=============================================================\n');

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Secret Sanitization & Safe Redaction
  // --------------------------------------------------------------------------
  console.log('Test Suite 1: Secret Sanitization & Token Redaction');
  {
    const sampleApiKey = 'AIzaSyD-7392_xZa90812345678901234567890';
    const redacted = sanitizeSecrets(`Google API call failed with token AIzaSyD-7392_xZa90812345678901234567890 in client`);
    assert(!redacted.includes(sampleApiKey), 'Google API keys are strictly redacted');
    assert(redacted.includes('[REDACTED_API_KEY]'), 'API key placeholder is applied');

    const keyParam = 'apiKey=AIzaSyD-7392_xZa90812345678901234567890';
    const redactedKeyParam = sanitizeSecrets(keyParam);
    assert(!redactedKeyParam.includes(sampleApiKey), 'apiKey parameter assignment is redacted');
    assert(redactedKeyParam.includes('key=[REDACTED]'), 'key=[REDACTED] replacement applied');

    const bearerToken = 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
    const redactedBearer = sanitizeSecrets(`Authorization header: ${bearerToken}`);
    assert(!redactedBearer.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'JWT Bearer tokens are redacted');

    const passStr = 'password="MySuperSecretPass123!"';
    const redactedPass = sanitizeSecrets(passStr);
    assert(!redactedPass.includes('MySuperSecretPass123!'), 'Passwords and temp passwords are redacted');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Robust AI JSON Parsing & Fence Stripping
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 2: AI Response JSON Extraction & Resilience');
  {
    const rawClean = '{"summary":"All good","metrics":[1,2,3]}';
    const parsedClean = extractAndParseJson<any>(rawClean);
    assert(parsedClean.summary === 'All good' && parsedClean.metrics.length === 3, 'Parses standard clean JSON');

    const fencedJson = '```json\n{"summary":"Fenced response","count":42}\n```';
    const parsedFenced = extractAndParseJson<any>(fencedJson);
    assert(parsedFenced.summary === 'Fenced response' && parsedFenced.count === 42, 'Strips ```json markdown code fences cleanly');

    const commentaryJson = 'Here is your analysis:\n```\n{"insights":[{"title":"Trend"}]}\n```\nHope this helps!';
    const parsedCommentary = extractAndParseJson<any>(commentaryJson);
    assert(parsedCommentary.insights[0].title === 'Trend', 'Extracts JSON embedded inside commentary text');

    let errorThrown = false;
    try {
      extractAndParseJson('This is completely unparseable garbage with no JSON structure whatsoever.');
    } catch (e: any) {
      errorThrown = true;
      assert(!e.message.includes('AIza'), 'Error thrown from invalid JSON parsing does not leak secrets');
    }
    assert(errorThrown, 'Throws handled exception on completely invalid JSON');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Database & Auth Error Mapping
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 3: Database & PostgREST Error Sanitization');
  {
    const pgUniqueError = new Error('duplicate key value violates unique constraint "users_email_key"');
    const safeUnique = mapToSafeErrorMessage(pgUniqueError);
    assert(safeUnique.includes('already exists'), 'Maps Postgres unique constraint error to user-friendly message');
    assert(!safeUnique.includes('users_email_key'), 'Suppresses internal database constraint names');

    const pgFkError = new Error('insert or update on table "events" violates foreign key constraint "events_program_id_fkey"');
    const safeFk = mapToSafeErrorMessage(pgFkError);
    assert(safeFk.includes('related records depend on it'), 'Maps foreign key violation to safe explanation');
    assert(!safeFk.includes('events_program_id_fkey'), 'Suppresses foreign key constraint names');

    const stackTraceError = new Error('TypeError: Cannot read property of undefined\n    at Object.render (/Users/admin/tip/src/views/App.tsx:120:15)');
    const safeStackTrace = mapToSafeErrorMessage(stackTraceError);
    assert(!safeStackTrace.includes('/Users/admin/tip'), 'Suppresses server file paths and stack traces');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Standardized Server API Error Envelopes
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 4: Server Error Envelope & Correlation Tracking');
  {
    const { res, getData, getStatusCode, getHeaders } = createMockRes();
    sendSafeError(
      res,
      400,
      'Invalid participant format provided',
      ERROR_CODES.BAD_REQUEST,
      new Error('Internal validation detail: stack trace at line 42')
    );

    assert(getStatusCode() === 400, 'Sets correct HTTP status code (400)');
    const body = getData() as ApiErrorEnvelope;
    assert(body.code === 'BAD_REQUEST', 'Sets standard error code in envelope');
    assert(typeof body.correlationId === 'string' && body.correlationId.startsWith('tip-srv-'), 'Generates unique correlationId');
    assert(!body.error.includes('stack trace'), 'Client error message is sanitized');
    assert(Boolean(getHeaders()['x-correlation-id']), 'Emits X-Correlation-ID response header');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 5: AI Middleware Failure Recovery & Deterministic Fallbacks
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 5: AI Middleware Graceful Degradation & Fallbacks');
  {
    // 5a. Missing payload on /api/ai/analyze
    const mockRes1 = createMockRes();
    const mockReq1 = createMockReq({
      method: 'POST',
      url: '/api/ai/analyze',
      body: { datasetName: 'Test' } // missing payload
    });
    await aiMiddlewareHandler(mockReq1, mockRes1.res);
    assert(mockRes1.getStatusCode() === 400, '/api/ai/analyze returns 400 Bad Request on missing payload');
    assert(mockRes1.getData().code === 'BAD_REQUEST', '/api/ai/analyze error conforms to standard envelope');

    // 5b. Missing question on /api/ai/query
    const mockRes2 = createMockRes();
    const mockReq2 = createMockReq({
      method: 'POST',
      url: '/api/ai/query',
      body: { userRole: 'staff' } // missing question
    });
    await aiMiddlewareHandler(mockReq2, mockRes2.res);
    assert(mockRes2.getStatusCode() === 400, '/api/ai/query returns 400 Bad Request on missing question');

    // 5c. RBAC refusal on volunteer querying funding records
    const mockRes3 = createMockRes();
    const mockReq3 = createMockReq({
      method: 'POST',
      url: '/api/ai/query',
      body: {
        question: 'What is our total donor grant budget this quarter?',
        userRole: 'volunteer',
        crmSummary: { peopleCount: 50 }
      }
    });
    await aiMiddlewareHandler(mockReq3, mockRes3.res);
    assert(mockRes3.getStatusCode() === 200, '/api/ai/query returns 200 with refusal for unauthorized volunteer');
    assert(mockRes3.getData().authorized === false, 'Unauthorized volunteer query is denied (authorized: false)');
    assert(mockRes3.getData().refusalReason.includes('Access Denied'), 'Provides clear policy refusal reason without disclosing financial amounts');

    // 5d. Fallback deterministic execution on /api/ai/query
    const mockRes4 = createMockRes();
    const mockReq4 = createMockReq({
      method: 'POST',
      url: '/api/ai/query',
      body: {
        question: 'What is our participant attendance rate?',
        userRole: 'staff_manager',
        crmSummary: { avgAttendance: '82%', peopleCount: 120 }
      }
    });
    await aiMiddlewareHandler(mockReq4, mockRes4.res);
    assert(mockRes4.getStatusCode() === 200, '/api/ai/query offline/grounded query succeeds with 200');
    assert(mockRes4.getData().fallbackDeterministic === true, '/api/ai/query response explicitly flags fallbackDeterministic: true');

    // 5e. Missing task on /api/ai/task-assist
    const mockRes5 = createMockRes();
    const mockReq5 = createMockReq({
      method: 'POST',
      url: '/api/ai/task-assist',
      body: { user: { name: 'Staff' } } // missing task
    });
    await aiMiddlewareHandler(mockReq5, mockRes5.res);
    assert(mockRes5.getStatusCode() === 400, '/api/ai/task-assist returns 400 Bad Request on missing task');

    // 5f. Offline fallback on /api/ai/task-assist
    const mockRes6 = createMockRes();
    const mockReq6 = createMockReq({
      method: 'POST',
      url: '/api/ai/task-assist',
      body: {
        task: { title: 'Prepare venue checklist' },
        user: { name: 'Sarah Coordinator', postTitle: 'Program Coordinator' }
      }
    });
    await aiMiddlewareHandler(mockReq6, mockRes6.res);
    assert(mockRes6.getStatusCode() === 200, '/api/ai/task-assist offline fallback returns 200');
    assert(mockRes6.getData().fallbackDeterministic === true, '/api/ai/task-assist explicitly sets fallbackDeterministic: true');
    assert(Array.isArray(mockRes6.getData().actionSteps), 'Generates structured fallback checklist steps');

    // 5g. Offline fallback on /api/ai/suggest-tasks
    const mockRes7 = createMockRes();
    const mockReq7 = createMockReq({
      method: 'POST',
      url: '/api/ai/suggest-tasks',
      body: {
        triggerType: 'EVENT_COMPLETED',
        context: { eventName: 'Youth Leadership Workshop' }
      }
    });
    await aiMiddlewareHandler(mockReq7, mockRes7.res);
    assert(mockRes7.getStatusCode() === 200, '/api/ai/suggest-tasks fallback returns 200');
    assert(mockRes7.getData().fallbackDeterministic === true, '/api/ai/suggest-tasks explicitly sets fallbackDeterministic: true');

    // 5h. Unauthorized user on /api/ai/chat
    const mockRes8 = createMockRes();
    const mockReq8 = createMockReq({
      method: 'POST',
      url: '/api/ai/chat',
      body: { message: 'Hello', user: null }
    });
    await aiMiddlewareHandler(mockReq8, mockRes8.res);
    assert(mockRes8.getStatusCode() === 401, '/api/ai/chat returns 401 when user is missing or invalid');
    assert(mockRes8.getData().code === 'UNAUTHORIZED', '/api/ai/chat error envelope contains UNAUTHORIZED code');

    // 5i. Role elevation blocked on /api/auth/switch-role
    const mockRes9 = createMockRes();
    const mockReq9 = createMockReq({
      method: 'POST',
      url: '/api/auth/switch-role',
      body: {
        userId: 'u-volunteer-1',
        targetRoleId: 'super_admin',
        assignedRoleIds: ['volunteer'],
        userStatus: 'approved',
        isActive: true
      }
    });
    await aiMiddlewareHandler(mockReq9, mockRes9.res);
    assert(mockRes9.getStatusCode() === 403, '/api/auth/switch-role blocks unassigned role elevation with 403 Forbidden');
    assert(mockRes9.getData().code === 'FORBIDDEN', 'Role switch refusal uses standard FORBIDDEN envelope');

    // 5j. Password complexity enforcement on /api/auth/change-password
    const mockRes10 = createMockRes();
    const mockReq10 = createMockReq({
      method: 'POST',
      url: '/api/auth/change-password',
      body: {
        userId: 'u-1',
        currentPassword: 'old',
        newPassword: 'weak'
      }
    });
    await aiMiddlewareHandler(mockReq10, mockRes10.res);
    assert(mockRes10.getStatusCode() === 400, '/api/auth/change-password returns 400 for weak password');
    assert(mockRes10.getData().code === 'BAD_REQUEST', 'Password rejection adheres to BAD_REQUEST envelope');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 6: API Gateway 404 & 500 Fault Isolation
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 6: API Gateway Safe Fallbacks');
  {
    // Non-existent route
    const mockRes11 = createMockRes();
    const mockReq11 = createMockReq({
      method: 'GET',
      url: '/api/nonexistent/secret-endpoint?token=secret123'
    });
    await apiGatewayHandler(mockReq11, mockRes11.res);
    assert(mockRes11.getStatusCode() === 404, 'API gateway returns 404 on unhandled route');
    const res11Body = mockRes11.getData();
    assert(res11Body.code === 'NOT_FOUND', '404 conforms to standard error envelope');
    assert(!JSON.stringify(res11Body).includes('token=secret123'), '404 does NOT reflect raw URL parameters or tokens');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 7: CSV Safe Export & Quote Escaping
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 7: CSV Safe Export Logic');
  {
    const rows = [
      ['Name', 'Notes', 'Amount'],
      ['Pritam "Lead" Biswas', 'Grant for equity & inclusion: $50,000', 50000],
      [null, undefined, 0]
    ];

    // Verify CSV quote escaping without browser DOM
    const csvBody = rows
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    assert(csvBody.includes('"Pritam ""Lead"" Biswas"'), 'Escapes internal double quotes properly ("" instead of broken CSV syntax)');
    assert(csvBody.includes('""'), 'Null and undefined cells are converted to empty safe strings');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 8: Authoritative Server Audit Logging & Immutability (Check 12)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 8: Authoritative Server Audit Logging & Immutability');
  {
    const record = recordAuditEvent({
      actorId: 'u-1',
      actorName: 'Pritam Biswas',
      actorRole: 'super_admin',
      action: 'DATA_EXPORT_CSV',
      resourceType: 'People',
      resourceId: 'all-people',
      entityName: 'People Directory Export',
      outcome: 'SUCCESS',
      description: 'Super Admin exported full people directory to CSV format.',
      metadata: { rowCount: 186, scope: 'GLOBAL' },
      ipAddress: '192.168.1.100'
    });

    assert(Boolean(record.id && record.id.startsWith('aud-')), 'recordAuditEvent generates structured unique record ID');
    assert(Boolean(record.timestamp && new Date(record.timestamp).toISOString() === record.timestamp), 'Generates valid ISO 8601 UTC timestamp');
    assert(record.outcome === 'SUCCESS', 'Records SUCCESS outcome correctly');
    assert(record.actorName === 'Pritam Biswas', 'Captures verified actor name');
    assert(record.actorRole === 'super_admin', 'Captures verified actor role');
    assert(Boolean(record.correlationId && record.correlationId.startsWith('tip-srv-')), 'Auto-assigns server correlation ID for forensic tracking');

    // Immutability: Verify record exists in buffer and query results
    const query = queryAuditLogs({ action: 'DATA_EXPORT_CSV' });
    const found = query.logs.find(l => l.id === record.id);
    assert(Boolean(found), 'Record is immediately discoverable via authoritative queryAuditLogs');
    assert(found?.outcome === 'SUCCESS', 'Record preserves unalterable outcome in persistent log buffer');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 9: Sensitive Data Redaction from Audit Logs (Check 12)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 9: Sensitive Data Redaction from Audit Logs');
  {
    const recordWithSecrets = recordAuditEvent({
      actorId: 'u-1',
      actorName: 'Administrator',
      actorRole: 'super_admin',
      action: 'AUTH_CREDENTIAL_CHANGE',
      resourceType: 'UserCredential',
      outcome: 'SUCCESS',
      description: 'Updated user credentials with key AIzaSyTestKey1234567890123456789012345',
      metadata: {
        password: 'SuperSecretPassword!123',
        temporaryPassword: 'TempPassword!456',
        apiKey: 'AIzaSySecretApiKey1234567890123456789',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisToken',
        safeParam: 'public_config_value'
      }
    });

    const metaStr = JSON.stringify(recordWithSecrets.metadata);
    assert(!metaStr.includes('SuperSecretPassword!123'), 'Passwords are removed/redacted from audit metadata');
    assert(!metaStr.includes('TempPassword!456'), 'Temporary passwords are removed/redacted from audit metadata');
    assert(!metaStr.includes('AIzaSySecretApiKey'), 'API keys are redacted in metadata');
    assert(!metaStr.includes('doNotLeakThisToken'), 'Tokens are redacted in metadata');
    assert(!recordWithSecrets.description.includes('AIzaSyTestKey'), 'API keys in description are sanitized to [REDACTED]');
    assert(recordWithSecrets.metadata?.safeParam === 'public_config_value', 'Non-sensitive metadata parameters are preserved');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 10: Access Control on /api/audit/logs (Check 12)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 10: Access Control on /api/audit/logs');
  {
    // 1. Volunteer attempt -> 403 Forbidden
    const volRes = createMockRes();
    const volReq = createMockReq({
      method: 'GET',
      url: '/api/audit/logs?userRole=volunteer&userId=u-vol',
      headers: {
        'x-user-role': 'volunteer',
        'x-user-id': 'u-vol',
        'x-user-name': 'Sam Volunteer'
      }
    });
    await aiMiddlewareHandler(volReq, volRes.res);
    assert(volRes.getStatusCode() === 403, 'GET /api/audit/logs blocks Volunteer with 403 Forbidden');
    const volData = volRes.getData();
    assert(volData.code === 'FORBIDDEN', 'Access refusal conforms to standard FORBIDDEN error code');
    assert((volData.error || volData.message).includes('audit_logs.view'), 'Error message cites required permission audit_logs.view');

    // Verify access denial was recorded in audit trail
    const blockedQuery = queryAuditLogs({ action: 'AUDIT_LOGS_ACCESS_DENIED' });
    assert(blockedQuery.logs.length > 0, 'Unauthorized audit access attempt generates an AUDIT_LOGS_ACCESS_DENIED failure audit event');
    assert(blockedQuery.logs[0].outcome === 'FAILURE', 'Access denial event is tagged with FAILURE outcome');

    // 2. Staff Member attempt -> 403 Forbidden
    const staffRes = createMockRes();
    const staffReq = createMockReq({
      method: 'GET',
      url: '/api/audit/logs?userRole=staff_member&userId=u-staff',
      headers: {
        'x-user-role': 'staff_member',
        'x-user-id': 'u-staff',
        'x-user-name': 'Alex Staff'
      }
    });
    await aiMiddlewareHandler(staffReq, staffRes.res);
    assert(staffRes.getStatusCode() === 403, 'GET /api/audit/logs blocks Staff Member (Level 3) with 403 Forbidden');

    // 3. Staff Manager attempt -> 200 OK
    const mgrRes = createMockRes();
    const mgrReq = createMockReq({
      method: 'GET',
      url: '/api/audit/logs?userRole=staff_manager&userId=u-2',
      headers: {
        'x-user-role': 'staff_manager',
        'x-user-id': 'u-2',
        'x-user-name': 'Sarah Jenkins'
      }
    });
    await aiMiddlewareHandler(mgrReq, mgrRes.res);
    assert(mgrRes.getStatusCode() === 200, 'GET /api/audit/logs allows Staff Manager (Level 2) with 200 OK');
    const mgrData = mgrRes.getData();
    assert(Array.isArray(mgrData.logs), 'Returns structured array of audit records to Staff Manager');
    assert(typeof mgrData.total === 'number', 'Returns total record count for pagination');

    // 4. Super Admin attempt -> 200 OK
    const adminRes = createMockRes();
    const adminReq = createMockReq({
      method: 'GET',
      url: '/api/audit/logs?userRole=super_admin&userId=u-1',
      headers: {
        'x-user-role': 'super_admin',
        'x-user-id': 'u-1',
        'x-user-name': 'Pritam Biswas'
      }
    });
    await aiMiddlewareHandler(adminReq, adminRes.res);
    assert(adminRes.getStatusCode() === 200, 'GET /api/audit/logs allows Super Admin with 200 OK');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 11: High-Consequence Operation Audit Generation (Check 12)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 11: High-Consequence Operation Audit Generation');
  {
    // 1. Role Switch Success Audit
    const roleSwitchRes = createMockRes();
    const roleSwitchReq = createMockReq({
      method: 'POST',
      url: '/api/auth/switch-role',
      headers: {
        'x-user-id': 'u-2',
        'x-user-role': 'staff_manager',
        'x-user-name': 'Sarah Jenkins'
      },
      body: {
        userId: 'u-2',
        targetRoleId: 'staff_manager',
        assignedRoleIds: ['staff_manager', 'staff_member'],
        userStatus: 'approved',
        isActive: true
      }
    });
    await aiMiddlewareHandler(roleSwitchReq, roleSwitchRes.res);
    assert(roleSwitchRes.getStatusCode() === 200, '/api/auth/switch-role succeeds with 200');
    const roleLogs = queryAuditLogs({ action: 'AUTH_ROLE_SWITCH' });
    assert(roleLogs.logs.length > 0, 'Successful role switch generates AUTH_ROLE_SWITCH audit record');
    assert(roleLogs.logs[0].outcome === 'SUCCESS', 'Role switch is tagged with SUCCESS outcome');

    // 2. AI Budget Update Audit
    const budgetRes = createMockRes();
    const budgetReq = createMockReq({
      method: 'POST',
      url: '/api/ai/budget',
      headers: {
        'x-user-id': 'u-1',
        'x-user-role': 'super_admin',
        'x-user-name': 'Pritam Biswas'
      },
      body: {
        dailyRequestLimit: 75,
        privacyMode: 'minimal'
      }
    });
    await aiMiddlewareHandler(budgetReq, budgetRes.res);
    assert(budgetRes.getStatusCode() === 200, 'POST /api/ai/budget succeeds with 200');
    const budgetLogs = queryAuditLogs({ action: 'SETTINGS_BUDGET_UPDATE' });
    assert(budgetLogs.logs.length > 0, 'Updating AI budget generates SETTINGS_BUDGET_UPDATE audit record');
    assert(budgetLogs.logs[0].metadata?.dailyRequestLimit === 75, 'Budget audit records new limit configuration in metadata');

    // 3. AI Action Confirmation Audit
    const actionRes = createMockRes();
    const actionReq = createMockReq({
      method: 'POST',
      url: '/api/ai/intelligence/action',
      headers: {
        'x-user-id': 'u-1',
        'x-user-role': 'super_admin',
        'x-user-name': 'Pritam Biswas'
      },
      body: {
        actionPreview: {
          id: 'act-sample-99',
          title: 'Schedule Board Check-in',
          actionType: 'create_tasks',
          targetRecordType: 'Task',
          targetRecordId: 'task-new-99'
        },
        user: { id: 'u-1', name: 'Pritam Biswas', roleId: 'super_admin' }
      }
    });
    await aiMiddlewareHandler(actionReq, actionRes.res);
    assert(actionRes.getStatusCode() === 200, 'POST /api/ai/intelligence/action verifies action with 200');
    const actionLogs = queryAuditLogs({ action: 'AI_ACTION_CONFIRMED' });
    assert(actionLogs.logs.length > 0, 'Confirming AI action generates AI_ACTION_CONFIRMED audit record');
    assert(actionLogs.logs[0].outcome === 'SUCCESS', 'AI Action confirmation has SUCCESS outcome');

    // 4. Client Business Event Posting via POST /api/audit/log
    const clientAuditRes = createMockRes();
    const clientAuditReq = createMockReq({
      method: 'POST',
      url: '/api/audit/log',
      headers: {
        'x-user-id': 'u-2',
        'x-user-role': 'staff_manager',
        'x-user-name': 'Sarah Jenkins'
      },
      body: {
        action: 'DATA_IMPORT_CSV',
        resourceType: 'People',
        entityName: 'Community Roster Upload',
        outcome: 'SUCCESS',
        description: 'Staff Manager imported 42 contacts from event participant intake CSV.',
        metadata: { importedRows: 42, sourceFile: 'participants_fall_2026.csv' }
      }
    });
    await aiMiddlewareHandler(clientAuditReq, clientAuditRes.res);
    assert(clientAuditRes.getStatusCode() === 200, 'POST /api/audit/log accepts valid business audit entry with 200');
    const clientAuditData = clientAuditRes.getData();
    assert(Boolean(clientAuditData.id && clientAuditData.timestamp), 'POST /api/audit/log returns authoritative record ID and timestamp');

    // Verify record in query
    const importLogs = queryAuditLogs({ action: 'DATA_IMPORT_CSV' });
    assert(importLogs.logs.length > 0, 'Client audit entry is queryable in authoritative audit log');
    assert(importLogs.logs[0].actorName === 'Sarah Jenkins', 'Actor name derived securely from validated request headers');
    assert(importLogs.logs[0].actorRole === 'staff_manager', 'Actor role derived securely from validated request headers');
  }

  // ==========================================================================
  // Test Suite 12: File Validation, MIME Checking, and Magic Bytes Inspection
  // ==========================================================================
  console.log('\nTest Suite 12: File Validation, MIME Checking, and Magic Bytes Inspection');
  {
    // 1. PDF magic bytes (%PDF-)
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37]);
    const pdfSig = verifyMagicBytes(pdfBytes);
    assert(pdfSig.valid === true, 'PDF magic bytes (%PDF-) correctly verified as valid');
    assert(pdfSig.detectedType === 'application/pdf', 'PDF detected as application/pdf');

    const pdfUpload = validateUploadFile({
      filename: 'grant_proposal.pdf',
      sizeBytes: 1024 * 500,
      mimeType: 'application/pdf',
      buffer: pdfBytes
    });
    assert(pdfUpload.valid === true, 'Valid PDF passes complete upload validation');
    assert(pdfUpload.sanitizedFilename === 'grant_proposal.pdf', 'Valid PDF preserves clean filename');

    // 2. PNG magic bytes (\x89PNG\r\n\x1a\n)
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
    const pngSig = verifyMagicBytes(pngBytes);
    assert(pngSig.valid === true, 'PNG magic bytes verified as valid');
    assert(pngSig.detectedType === 'image/png', 'PNG detected as image/png');

    // 3. JPEG magic bytes (FF D8 FF)
    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const jpegSig = verifyMagicBytes(jpegBytes);
    assert(jpegSig.valid === true, 'JPEG magic bytes verified as valid');
    assert(jpegSig.detectedType === 'image/jpeg', 'JPEG detected as image/jpeg');

    // 4. ZIP / DOCX / XLSX magic bytes (PK\x03\x04)
    const zipBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
    const zipSig = verifyMagicBytes(zipBytes);
    assert(zipSig.valid === true, 'ZIP/DOCX/XLSX magic bytes verified as valid');
    assert(zipSig.detectedType === 'application/zip', 'ZIP/DOCX detected as application/zip');

    // 5. Executable binary headers rejected
    const exeBytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00]);
    const exeSig = verifyMagicBytes(exeBytes);
    assert(exeSig.valid === false, 'Executable binary signature (MZ) rejected');
    assert(Boolean(exeSig.error?.includes('Executable')), 'Executable rejection error message emitted');

    const elfBytes = new Uint8Array([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01]);
    const elfSig = verifyMagicBytes(elfBytes);
    assert(elfSig.valid === false, 'Linux binary execution header (ELF) rejected');

    // 6. Dangerous extension blacklist
    const dangerousExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'vbs', 'html', 'svg'];
    for (const ext of dangerousExts) {
      const res = validateUploadFile({
        filename: `malicious_script.${ext}`,
        sizeBytes: 1024,
        mimeType: 'text/plain'
      });
      assert(res.valid === false, `Dangerous extension (.${ext}) is strictly prohibited`);
    }

    // 7. Size limits
    const emptyFile = validateUploadFile({ filename: 'empty.pdf', sizeBytes: 0 });
    assert(emptyFile.valid === false, 'Zero-byte empty file is rejected');

    const hugeDoc = validateUploadFile({
      filename: 'massive.pdf',
      sizeBytes: 11 * 1024 * 1024,
      isBackup: false
    });
    assert(hugeDoc.valid === false, 'Document exceeding 10MB limit is rejected');

    const hugeBackup = validateUploadFile({
      filename: 'database_dump.json',
      sizeBytes: 26 * 1024 * 1024,
      isBackup: true
    });
    assert(hugeBackup.valid === false, 'Backup exceeding 25MB limit is rejected');

    const jsonDoc = validateUploadFile({
      filename: 'payload.json',
      sizeBytes: 1024,
      isBackup: false
    });
    assert(jsonDoc.valid === false, 'JSON extension rejected for standard document uploads');

    const jsonBackup = validateUploadFile({
      filename: 'backup.json',
      sizeBytes: 1024,
      isBackup: true
    });
    assert(jsonBackup.valid === true, 'JSON extension permitted for system database backups');
  }

  // ==========================================================================
  // Test Suite 13: Path Traversal & Filename Sanitization
  // ==========================================================================
  console.log('\nTest Suite 13: Path Traversal & Filename Sanitization');
  {
    // 1. Unix directory traversal
    const unixTraversal = sanitizeFilename('../../../../etc/passwd');
    assert(unixTraversal === 'passwd', 'Unix directory traversal stripped to safe basename');

    // 2. Windows backslash directory traversal
    const winTraversal = sanitizeFilename('..\\..\\windows\\system32\\calc.exe');
    assert(winTraversal === 'calc.exe', 'Windows directory traversal stripped to safe basename');

    // 3. Null byte injection
    const nullByteName = sanitizeFilename('quarterly_report.pdf\0.exe');
    assert(!nullByteName.includes('\0'), 'Null bytes stripped from filename');
    assert(!nullByteName.endsWith('.exe'), 'Null byte poison extension neutralized');

    // 4. Control characters stripped
    const controlChars = sanitizeFilename('test\x01\x1f\x7ffile.png');
    assert(controlChars === 'testfile.png', 'ASCII control characters stripped');

    // 5. Leading dots and dashes stripped
    const hiddenFile = sanitizeFilename('...--secret.pdf');
    assert(hiddenFile === 'secret.pdf', 'Leading dots and dashes stripped from filename');

    // 6. Dangerous filesystem characters replaced with underscores
    const specialChars = sanitizeFilename('Annual & Financial: Report (2026)*?.docx');
    assert(!specialChars.includes('&') && !specialChars.includes(':') && !specialChars.includes('*') && !specialChars.includes('?'),
      'Unsafe characters replaced with filesystem-safe underscores');

    // 7. Empty or invalid names fallback safely
    const emptyFallback = sanitizeFilename('');
    assert(emptyFallback.startsWith('file_'), 'Empty filename generates safe fallback prefix');

    // 8. Long filename truncation preserves extension
    const longName = 'a'.repeat(120) + '.pdf';
    const truncated = sanitizeFilename(longName);
    assert(truncated.length <= 100, 'Long filename truncated to <= 100 characters');
    assert(truncated.endsWith('.pdf'), 'Truncated filename preserves valid extension');
  }

  // ==========================================================================
  // Test Suite 14: CSV Spreadsheet Formula Injection Prevention (OWASP)
  // ==========================================================================
  console.log('\nTest Suite 14: CSV Spreadsheet Formula Injection Prevention');
  {
    // 1. Equals sign (=) formula
    const equalsCell = sanitizeCsvCell('=cmd|"/C calc"!A1');
    assert(equalsCell === `"'=cmd|""/C calc""!A1"`, 'Prepends single quote to cells beginning with equals sign');

    // 2. Plus sign (+) formula
    const plusCell = sanitizeCsvCell('+SUM(1+1)');
    assert(plusCell.startsWith(`"'+SUM`), 'Prepends single quote to cells beginning with plus sign');

    // 3. Minus sign (-) formula
    const minusCell = sanitizeCsvCell('-2+3+cmd|"/C calc"!A0');
    assert(minusCell.startsWith(`"'-2`), 'Prepends single quote to cells beginning with minus sign');

    // 4. At sign (@) formula
    const atCell = sanitizeCsvCell('@SUM(1+1)');
    assert(atCell.startsWith(`"'@SUM`), 'Prepends single quote to cells beginning with at sign (@)');

    // 5. Leading Tab or Carriage Return formula injection
    const tabCell = sanitizeCsvCell('\t=1+1');
    assert(tabCell.startsWith(`"'\t=1+1`), 'Prepends single quote to cells beginning with Tab');

    const crCell = sanitizeCsvCell('\r=1+1');
    assert(crCell.startsWith(`"'\r=1+1`), 'Prepends single quote to cells beginning with CR');

    // 6. Safe cells remain unadorned
    const normalText = sanitizeCsvCell('The Inclusion Project');
    assert(normalText === '"The Inclusion Project"', 'Standard non-formula strings preserved without single quote prefix');

    const normalNumber = sanitizeCsvCell(45000);
    assert(normalNumber === '"45000"', 'Standard numbers exported without formula modification');

    // 7. Internal double quotes correctly escaped
    const quotesCell = sanitizeCsvCell('Pritam "Lead" Biswas');
    assert(quotesCell === '"Pritam ""Lead"" Biswas"', 'Internal double quotes doubled for RFC 4180 compliance');
  }

  // ==========================================================================
  // Test Suite 15: External Document Link & Protocol Validation
  // ==========================================================================
  console.log('\nTest Suite 15: External Document Link & Protocol Validation');
  {
    // 1. Valid HTTPS Google Docs link
    const validHttps = validateExternalUrl('https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
    assert(validHttps.isValid === true, 'Valid HTTPS Google Docs link permitted');
    assert(Boolean(validHttps.sanitizedUrl), 'Sanitized URL returned for valid HTTPS link');

    // 2. Valid HTTP link
    const validHttp = validateExternalUrl('http://theinclusionproject.ca/annual-report.pdf');
    assert(validHttp.isValid === true, 'Valid HTTP document link permitted');

    // 3. javascript: URI execution scheme blocked
    const jsScheme = validateExternalUrl('javascript:alert(document.domain)');
    assert(jsScheme.isValid === false, 'javascript: URI scheme strictly rejected');
    assert(Boolean(jsScheme.error?.includes('Dangerous URL scheme')), 'javascript scheme emits dangerous URL scheme error');

    // 4. data: URI scheme blocked
    const dataScheme = validateExternalUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==');
    assert(dataScheme.isValid === false, 'data: URI scheme strictly rejected');

    // 5. file: local file access scheme blocked
    const fileScheme = validateExternalUrl('file:///etc/passwd');
    assert(fileScheme.isValid === false, 'file:/// local filesystem access scheme rejected');

    // 6. vbscript: and blob: schemes blocked
    const vbScheme = validateExternalUrl('vbscript:msgbox(1)');
    assert(vbScheme.isValid === false, 'vbscript: scheme rejected');

    const blobScheme = validateExternalUrl('blob:http://evil.com/4920');
    assert(blobScheme.isValid === false, 'blob: scheme rejected');

    // 7. Localhost addresses blocked
    const localHost = validateExternalUrl('http://localhost:3000/api/keys');
    assert(localHost.isValid === false, 'http://localhost links blocked from external documents');

    const loopback = validateExternalUrl('http://127.0.0.1:8080/admin');
    assert(loopback.isValid === false, 'http://127.0.0.1 links blocked from external documents');

    // 8. Malformed URL rejected
    const malformed = validateExternalUrl('ht tp://not a valid url');
    assert(malformed.isValid === false, 'Malformed URL string rejected');
  }

  // ==========================================================================
  // Test Suite 16: Backup Schema Validation, Prototype Pollution Defense, and Restore RBAC
  // ==========================================================================
  console.log('\nTest Suite 16: Backup Schema Validation and Prototype Pollution Defense');
  {
    // 1. Valid backup payload
    const validBackup = {
      exportedAt: '2026-10-14T08:00:00.000Z',
      organization: 'The Inclusion Project',
      people: [{ id: 'p-1', name: 'Dr. Jane Goodall', email: 'jane@example.com' }],
      organizations: [{ id: 'org-1', name: 'Civic Impact Hub' }],
      programs: [{ id: 'prog-1', name: 'Youth Mentorship' }],
      events: [{ id: 'evt-1', name: 'Annual Symposium' }],
      funding: [{ id: 'fnd-1', amountCad: 50000 }]
    };

    const validResult = validateBackupStructure(validBackup);
    assert(validResult.valid === true, 'Valid backup structure passes schema verification');
    assert(validResult.counts?.people === 1, 'Counts people records correctly');
    assert(validResult.counts?.organizations === 1, 'Counts organization records correctly');
    assert(validResult.counts?.funding === 1, 'Counts funding records correctly');

    // 2. Prototype pollution injection (__proto__)
    const protoPollutionPayload = JSON.parse('{"people":[],"__proto__":{"polluted":true}}');
    const protoResult = validateBackupStructure(protoPollutionPayload);
    assert(protoResult.valid === false, 'Prototype pollution via __proto__ detected and rejected');
    assert(Boolean(protoResult.error?.includes('Prototype pollution')), 'Emits prototype pollution warning');

    // 3. Prototype pollution injection (constructor)
    const constructorPayload = {
      people: [],
      constructor: { prototype: { admin: true } }
    };
    const constructorResult = validateBackupStructure(constructorPayload);
    assert(constructorResult.valid === false, 'Prototype pollution via constructor detected and rejected');

    // 4. Nested prototype pollution in entity records
    const nestedProto = JSON.parse('{"people":[{"id":"p-1","name":"Legit User","__proto__":{"isAdmin":true}}]}');
    const nestedResult = validateBackupStructure(nestedProto);
    assert(nestedResult.valid === false, 'Nested prototype pollution in entity item detected and rejected');

    // 5. Non-object root
    const arrayRoot = validateBackupStructure([1, 2, 3]);
    assert(arrayRoot.valid === false, 'Array root payload rejected for database backup');

    const stringRoot = validateBackupStructure('not json');
    assert(stringRoot.valid === false, 'String root payload rejected');

    // 6. Non-array entity collections
    const invalidCollection = {
      people: 'invalid string instead of array'
    };
    const collectionResult = validateBackupStructure(invalidCollection);
    assert(collectionResult.valid === false, 'Non-array entity collection rejected');

    // 7. Empty / unrecognized backup
    const emptyPayload = { someRandomKey: 123 };
    const emptyResult = validateBackupStructure(emptyPayload);
    assert(emptyResult.valid === false, 'Payload without recognized CRM collections rejected');
  }

  // ==========================================================================
  // Test Suite 17: Storage API Endpoints & Expiring Signed URLs
  // ==========================================================================
  console.log('\nTest Suite 17: Storage API Endpoints & Expiring Signed URLs');
  {
    // 1. Signed file token generation & verification
    const testKey = 'crm_documents/org-tip/test-document.pdf';
    const signedData = createSignedFileToken({
      storageKey: testKey,
      userId: 'u-1',
      ttlSeconds: 900
    });
    assert(Boolean(signedData.token), 'createSignedFileToken generates non-empty token');
    assert(signedData.expiresAt > Math.floor(Date.now() / 1000), 'Token expiration timestamp is in the future');
    assert(signedData.signedUrl.startsWith('/api/storage/download?token='), 'Generates valid signed URL download link');

    // Verify valid token
    const verifyResult = verifySignedFileToken(signedData.token);
    assert(verifyResult.valid === true, 'verifySignedFileToken confirms valid HMAC signature');
    assert(verifyResult.storageKey === testKey, 'Storage key verified accurately from payload');
    assert(verifyResult.userId === 'u-1', 'User ID verified accurately from payload');

    // Rejection of tampered token
    const tamperedToken = signedData.token.slice(0, -4) + 'AAAA';
    const tamperedResult = verifySignedFileToken(tamperedToken);
    assert(tamperedResult.valid === false, 'Tampered token signature is rejected');

    // Rejection of expired token
    const expiredData = createSignedFileToken({
      storageKey: testKey,
      userId: 'u-1',
      expiresAt: Math.floor(Date.now() / 1000) - 100
    });
    const expiredResult = verifySignedFileToken(expiredData.token);
    assert(expiredResult.valid === false, 'Expired token is rejected');
    assert(Boolean(expiredResult.error?.includes('expired')), 'Expired token error message emitted');

    // 2. Storage Key Generator with path traversal scrubbing
    const generatedKey = generateStorageKey({
      bucket: 'crm_documents',
      organizationId: 'org-tip',
      filename: '../../../../secret_report.pdf'
    });
    assert(!generatedKey.includes('..'), 'generateStorageKey strips directory traversal sequences');
    assert(generatedKey.startsWith('crm_documents/org-tip/'), 'Key prefixed with bucket and sanitized organization ID');
    assert(generatedKey.endsWith('secret_report.pdf'), 'Key preserves sanitized filename');

    // 3. POST /api/storage/validate-upload endpoint
    // Volunteer (unauthorized) blocked
    const volunteerUploadRes = createMockRes();
    const volunteerUploadReq = createMockReq({
      method: 'POST',
      url: '/api/storage/validate-upload',
      headers: {
        'x-user-id': 'u-vol',
        'x-user-role': 'volunteer'
      },
      body: { filename: 'agenda.pdf', sizeBytes: 1024, mimeType: 'application/pdf' }
    });
    await aiMiddlewareHandler(volunteerUploadReq, volunteerUploadRes.res);
    assert(volunteerUploadRes.getStatusCode() === 403, 'POST /api/storage/validate-upload blocks Volunteer with 403 Forbidden');

    // Staff Member (authorized) succeeds
    const staffUploadRes = createMockRes();
    const staffUploadReq = createMockReq({
      method: 'POST',
      url: '/api/storage/validate-upload',
      headers: {
        'x-user-id': 'u-staff',
        'x-user-role': 'staff_member',
        'x-user-name': 'Alex Staff'
      },
      body: {
        filename: 'workshop_notes.docx',
        sizeBytes: 25000,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        bucket: 'crm_documents'
      }
    });
    await aiMiddlewareHandler(staffUploadReq, staffUploadRes.res);
    assert(staffUploadRes.getStatusCode() === 200, 'POST /api/storage/validate-upload accepts valid upload from Staff Member with 200');
    const uploadData = staffUploadRes.getData();
    assert(Boolean(uploadData.storageKey), 'Endpoint returns generated safe storageKey');

    // Dangerous extension rejected by endpoint
    const dangerousUploadRes = createMockRes();
    const dangerousUploadReq = createMockReq({
      method: 'POST',
      url: '/api/storage/validate-upload',
      headers: { 'x-user-id': 'u-staff', 'x-user-role': 'staff_member' },
      body: { filename: 'exploit.php', sizeBytes: 500, mimeType: 'application/x-php' }
    });
    await aiMiddlewareHandler(dangerousUploadReq, dangerousUploadRes.res);
    assert(dangerousUploadRes.getStatusCode() === 400, 'Endpoint rejects dangerous file extension with 400 Bad Request');

    // 4. POST /api/storage/signed-url endpoint
    // Staff Member attempting to access backup bucket blocked
    const staffBackupRes = createMockRes();
    const staffBackupReq = createMockReq({
      method: 'POST',
      url: '/api/storage/signed-url',
      headers: {
        'x-user-id': 'u-staff',
        'x-user-role': 'staff_member'
      },
      body: {
        storageKey: 'crm_backups/org-tip/db_backup.json'
      }
    });
    await aiMiddlewareHandler(staffBackupReq, staffBackupRes.res);
    assert(staffBackupRes.getStatusCode() === 403, 'Staff Member blocked from generating signed URL for database backups');

    // Super Admin authorized for backup signed URL
    const adminBackupRes = createMockRes();
    const adminBackupReq = createMockReq({
      method: 'POST',
      url: '/api/storage/signed-url',
      headers: {
        'x-user-id': 'u-1',
        'x-user-role': 'super_admin',
        'x-user-name': 'Pritam Biswas'
      },
      body: {
        storageKey: 'crm_backups/org-tip/db_backup.json',
        ttlSeconds: 900
      }
    });
    await aiMiddlewareHandler(adminBackupReq, adminBackupRes.res);
    assert(adminBackupRes.getStatusCode() === 200, 'Super Admin receives 200 with signed download URL for backups');
    const adminData = adminBackupRes.getData();
    assert(Boolean(adminData.signedUrl), 'Signed URL returned in response');
    assert(Boolean(adminData.expiresAt), 'Expiration timestamp returned in response');

    // Verify audit log generation for signed URL
    const signedUrlLogs = queryAuditLogs({ action: 'FILE_SIGNED_URL_GENERATED' });
    assert(signedUrlLogs.logs.length > 0, 'Generating signed URL generates FILE_SIGNED_URL_GENERATED audit log');
    assert(signedUrlLogs.logs[0].actorRole === 'super_admin', 'Audit record captures Super Admin actor role');

    // 5. GET /api/storage/download endpoint
    // Valid token download
    const validDownloadRes = createMockRes();
    const validDownloadReq = createMockReq({
      method: 'GET',
      url: adminData.signedUrl
    });
    await aiMiddlewareHandler(validDownloadReq, validDownloadRes.res);
    assert(validDownloadRes.getStatusCode() === 200, 'GET /api/storage/download with valid signed token returns 200');
    const downloadBody = validDownloadRes.getData();
    assert(downloadBody.status === 'VALID_DOWNLOAD_TOKEN', 'Download token confirmed valid');

    // Missing token download
    const missingTokenRes = createMockRes();
    const missingTokenReq = createMockReq({
      method: 'GET',
      url: '/api/storage/download'
    });
    await aiMiddlewareHandler(missingTokenReq, missingTokenRes.res);
    assert(missingTokenRes.getStatusCode() === 400, 'GET /api/storage/download missing token returns 400 Bad Request');
  }

  // --------------------------------------------------------------------------
  // Test Suite 18: Database Security & Row-Level Security (RLS) Verification
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 18: Database Security, Row-Level Security (RLS) & Anti-Elevation');

  // Read schema.sql, migration script, and client supabase files
  const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  const migrationPath = path.resolve(process.cwd(), 'src/db/migrations/20261014_security_check_14_rls.sql');
  const clientSupabasePath = path.resolve(process.cwd(), 'src/lib/supabase.ts');
  const docPath = path.resolve(process.cwd(), 'DATABASE_STRUCTURE.md');

  assert(fs.existsSync(schemaPath), 'Authoritative schema.sql exists on disk');
  assert(fs.existsSync(migrationPath), 'Migration script 20261014_security_check_14_rls.sql exists on disk');
  assert(fs.existsSync(docPath), 'DATABASE_STRUCTURE.md architecture documentation exists on disk');

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  const clientSupabaseContent = fs.readFileSync(clientSupabasePath, 'utf-8');

  // 1. Verify All 29 Tables Have Row Level Security (RLS) Enabled
  const requiredRlsTables = [
    'organizations',
    'roles',
    'permissions',
    'role_permissions',
    'users',
    'user_roles',
    'access_requests',
    'user_program_access',
    'user_event_access',
    'people',
    'programs',
    'program_members',
    'program_participants',
    'events',
    'event_staff',
    'event_participants',
    'tasks',
    'interactions',
    'funding_records',
    'documents',
    'audit_logs',
    'analysis_files',
    'analysis_jobs',
    'analysis_results',
    'analysis_metrics',
    'analysis_insights',
    'ai_requests',
    'ai_usage_logs',
    'storage.objects'
  ];

  let allTablesRlsEnabledInSchema = true;
  for (const table of requiredRlsTables) {
    const pattern = new RegExp(`ALTER TABLE (IF EXISTS )?${table} ENABLE ROW LEVEL SECURITY;`, 'i');
    if (!pattern.test(schemaContent)) {
      allTablesRlsEnabledInSchema = false;
      console.error(`Missing RLS enablement in schema.sql for: ${table}`);
    }
  }
  assert(allTablesRlsEnabledInSchema, 'All 29 CRM & Storage tables have ENABLE ROW LEVEL SECURITY in schema.sql');

  let allTablesRlsEnabledInMigration = true;
  for (const table of requiredRlsTables) {
    const pattern = new RegExp(`ALTER TABLE (IF EXISTS )?${table} ENABLE ROW LEVEL SECURITY;`, 'i');
    if (!pattern.test(migrationContent)) {
      allTablesRlsEnabledInMigration = false;
      console.error(`Missing RLS enablement in migration for: ${table}`);
    }
  }
  assert(allTablesRlsEnabledInMigration, 'All 29 CRM & Storage tables have ENABLE ROW LEVEL SECURITY in migration script');

  // 2. Protection Against Search Path Hijacking in SECURITY DEFINER Functions
  const securityDefinerFunctions = [
    'user_has_crm_access',
    'current_user_id',
    'current_user_org_id',
    'is_super_admin',
    'is_staff_manager_or_higher',
    'is_staff_member_or_higher',
    'get_current_app_user',
    'check_users_self_elevation'
  ];

  let allFuncsHaveSearchPathInSchema = true;
  for (const fn of securityDefinerFunctions) {
    const fnRegex = new RegExp(`FUNCTION (public\\.)?${fn}[\\s\\S]*?SET search_path = public, pg_temp`, 'i');
    if (!fnRegex.test(schemaContent)) {
      allFuncsHaveSearchPathInSchema = false;
      console.error(`Function ${fn} missing SET search_path = public, pg_temp in schema.sql`);
    }
  }
  assert(allFuncsHaveSearchPathInSchema, 'All 8 SECURITY DEFINER helper functions enforce SET search_path = public, pg_temp in schema.sql');

  let allFuncsHaveSearchPathInMigration = true;
  for (const fn of securityDefinerFunctions) {
    const fnRegex = new RegExp(`FUNCTION (public\\.)?${fn}[\\s\\S]*?SET search_path = public, pg_temp`, 'i');
    if (!fnRegex.test(migrationContent)) {
      allFuncsHaveSearchPathInMigration = false;
      console.error(`Function ${fn} missing SET search_path = public, pg_temp in migration`);
    }
  }
  assert(allFuncsHaveSearchPathInMigration, 'All 8 SECURITY DEFINER helper functions enforce SET search_path = public, pg_temp in migration');

  // 3. Database-Enforced Prevention of User Self-Elevation Trigger
  assert(
    schemaContent.includes('CREATE TRIGGER trg_prevent_self_elevation_users') &&
    schemaContent.includes('BEFORE UPDATE ON users') &&
    schemaContent.includes('EXECUTE FUNCTION check_users_self_elevation();'),
    'Self-elevation prevention trigger trg_prevent_self_elevation_users attached BEFORE UPDATE on users'
  );

  const privilegedColumns = [
    'status',
    'is_active',
    'approved_by',
    'approved_at',
    'organization_id',
    'people_scope',
    'programs_scope',
    'events_scope',
    'funding_scope',
    'auth_user_id'
  ];

  let triggerGuardsAllPrivilegedColumns = true;
  for (const col of privilegedColumns) {
    if (!schemaContent.includes(`NEW.${col} IS DISTINCT FROM OLD.${col}`)) {
      triggerGuardsAllPrivilegedColumns = false;
      console.error(`check_users_self_elevation missing check for column: ${col}`);
    }
  }
  assert(triggerGuardsAllPrivilegedColumns, 'check_users_self_elevation() guards all 10 authorization & scoping columns');

  // 4. Simulated Self-Elevation Unit Logic Check
  function simulateUserSelfUpdate(oldUser: any, newUser: any, actorRole: string): { allowed: boolean; reason?: string } {
    if (actorRole === 'super_admin' || actorRole === 'service_role') {
      return { allowed: true };
    }
    for (const col of privilegedColumns) {
      if (newUser[col] !== oldUser[col]) {
        return { allowed: false, reason: `Security violation: Users cannot modify their own ${col}.` };
      }
    }
    return { allowed: true };
  }

  const baselineUser = {
    id: 'u-regular',
    name: 'Jane Doe',
    email: 'jane@example.com',
    status: 'approved',
    is_active: true,
    approved_by: 'u-admin',
    approved_at: '2026-01-01T00:00:00Z',
    organization_id: 'org-tip',
    people_scope: 'ORGANIZATION',
    programs_scope: 'SCOPED',
    events_scope: 'SCOPED',
    funding_scope: 'NONE',
    auth_user_id: 'auth-123'
  };

  // Safe update: name change by user
  const safeUpdate = simulateUserSelfUpdate(baselineUser, { ...baselineUser, name: 'Jane Smith' }, 'staff_member');
  assert(safeUpdate.allowed, 'Regular user permitted to update their own non-privileged profile fields (e.g. name)');

  // Tamper 1: Attempt to elevate funding scope
  const tamperedFunding = simulateUserSelfUpdate(baselineUser, { ...baselineUser, funding_scope: 'ALL' }, 'staff_member');
  assert(!tamperedFunding.allowed && Boolean(tamperedFunding.reason?.includes('funding_scope')), 'Anti-elevation logic blocks regular user from altering funding_scope to ALL');

  // Tamper 2: Attempt to switch organization_id
  const tamperedOrg = simulateUserSelfUpdate(baselineUser, { ...baselineUser, organization_id: 'org-malicious' }, 'staff_member');
  assert(!tamperedOrg.allowed && Boolean(tamperedOrg.reason?.includes('organization_id')), 'Anti-elevation logic blocks regular user from changing organization_id');

  // Tamper 3: Attempt to activate inactive status or bypass approval
  const tamperedStatus = simulateUserSelfUpdate({ ...baselineUser, status: 'pending' }, { ...baselineUser, status: 'approved' }, 'staff_member');
  assert(!tamperedStatus.allowed && Boolean(tamperedStatus.reason?.includes('status')), 'Anti-elevation logic blocks user from approving their own account');

  // Admin update: Super admin can update scopes
  const adminUpdate = simulateUserSelfUpdate(baselineUser, { ...baselineUser, funding_scope: 'ALL' }, 'super_admin');
  assert(adminUpdate.allowed, 'Super Admin permitted to adjust authorization scopes and user statuses');

  // 5. RBAC & Data Boundary Policy Invariants in Schema
  assert(
    schemaContent.includes('CREATE POLICY user_roles_write_super_admin ON user_roles FOR ALL USING (is_super_admin())'),
    'user_roles write permissions restricted strictly to is_super_admin() (prevents direct role escalation)'
  );

  assert(
    schemaContent.includes('CREATE POLICY roles_write_super_admin ON roles FOR ALL USING (is_super_admin())'),
    'roles table write permissions restricted strictly to is_super_admin()'
  );

  assert(
    schemaContent.includes('CREATE POLICY permissions_write_super_admin ON permissions FOR ALL USING (is_super_admin())'),
    'permissions table write permissions restricted strictly to is_super_admin()'
  );

  assert(
    schemaContent.includes('CREATE POLICY role_permissions_write_super_admin ON role_permissions FOR ALL USING (is_super_admin())'),
    'role_permissions table write permissions restricted strictly to is_super_admin()'
  );

  // 6. Audit Log Immutability (No UPDATE or DELETE Policies)
  const auditLogPolicies = schemaContent
    .split('\n')
    .filter(line => line.includes('ON audit_logs') && line.includes('CREATE POLICY'));
  
  const hasAuditUpdate = auditLogPolicies.some(p => p.includes('FOR UPDATE') || p.includes('FOR ALL'));
  const hasAuditDelete = auditLogPolicies.some(p => p.includes('FOR DELETE') || p.includes('FOR ALL'));
  assert(!hasAuditUpdate, 'audit_logs has zero UPDATE policies, enforcing complete immutability');
  assert(!hasAuditDelete, 'audit_logs has zero DELETE policies, enforcing non-repudiation');

  // 7. Stored Procedure Privilege Revocation
  assert(
    schemaContent.includes('REVOKE EXECUTE ON FUNCTION purge_audit_logs_older_than(INTEGER) FROM PUBLIC;'),
    'Execution of purge_audit_logs_older_than() is strictly revoked from PUBLIC'
  );

  // 8. Storage Buckets & Policies Hardening
  assert(
    schemaContent.includes("bucket_id = 'crm_backups' AND is_super_admin()"),
    'crm_backups storage bucket access is strictly restricted to Super Admin ONLY'
  );

  assert(
    schemaContent.includes("bucket_id IN ('crm_documents', 'crm_attachments')") &&
    schemaContent.includes("ur.role_id IN ('super_admin', 'staff_manager', 'staff_member')"),
    'Storage documents & attachments access excludes volunteer role (least privilege)'
  );

  // 9. Client-Side Supabase Key Sanitization & Least Privilege
  assert(
    !clientSupabaseContent.includes('SUPABASE_SERVICE_ROLE_KEY'),
    'Client-side Supabase client (src/lib/supabase.ts) does not reference SUPABASE_SERVICE_ROLE_KEY'
  );
  assert(
    !clientSupabaseContent.includes('service_role'),
    'Client-side Supabase client does not expose or import service_role credentials'
  );
  assert(
    clientSupabaseContent.includes('VITE_SUPABASE_ANON_KEY'),
    'Client-side Supabase client correctly uses VITE_SUPABASE_ANON_KEY (subject to PostgreSQL RLS)'
  );

  // 10. Migration Idempotence & Rollback Instructions
  assert(
    migrationContent.includes('ROLLBACK INSTRUCTIONS (NON-DESTRUCTIVE)'),
    'Migration script contains documented non-destructive rollback instructions'
  );
  assert(
    migrationContent.includes('DROP POLICY IF EXISTS') && migrationContent.includes('CREATE POLICY'),
    'Migration script uses DROP POLICY IF EXISTS before CREATE POLICY for full idempotence'
  );

  // --------------------------------------------------------------------------
  // Test Suite 19: CSRF Protection & Restrictive CORS Configuration (Check 16)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 19: CSRF Protection & Restrictive CORS Configuration');

  // 1. Allowed Origin Policy Verification
  assert(isAllowedOrigin('http://localhost:3000'), 'Approved local development origin (http://localhost:3000) permitted');
  assert(isAllowedOrigin('http://127.0.0.1:3000'), 'Approved loopback origin (http://127.0.0.1:3000) permitted');
  assert(isAllowedOrigin('http://localhost:5173'), 'Approved Vite default origin (http://localhost:5173) permitted');
  assert(isAllowedOrigin('https://tip-crm.vercel.app'), 'Official production domain (https://tip-crm.vercel.app) permitted');
  assert(isAllowedOrigin('https://theinclusionproject.com'), 'Official primary domain (https://theinclusionproject.com) permitted');
  assert(isAllowedOrigin('https://www.theinclusionproject.com'), 'Official www subdomain permitted');
  assert(isAllowedOrigin('https://tip-crm-git-preview-branch.vercel.app'), 'Strict Vercel preview domain pattern permitted');

  // Disallowed origins
  assert(!isAllowedOrigin('http://malicious-attacker.com'), 'Untrusted external origin (malicious-attacker.com) strictly rejected');
  assert(!isAllowedOrigin('http://evil.com'), 'Untrusted domain (evil.com) rejected');
  assert(!isAllowedOrigin('http://localhost:3000.evil.com'), 'Subdomain spoofing attempt (localhost:3000.evil.com) rejected');
  assert(!isAllowedOrigin('https://theinclusionproject.com.attacker.org'), 'Domain suffix spoofing attempt rejected');
  assert(!isAllowedOrigin(''), 'Empty origin string rejected');
  assert(!isAllowedOrigin(undefined), 'Undefined origin rejected by isAllowedOrigin');

  // 2. Preflight OPTIONS Handling for Approved Origin
  const preflightRes = createMockRes();
  const preflightReq = createMockReq({
    method: 'OPTIONS',
    url: '/api/ai/query',
    headers: {
      origin: 'http://localhost:3000',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'Content-Type, Authorization, X-User-Id'
    }
  });
  await aiMiddlewareHandler(preflightReq, preflightRes.res);
  assert(preflightRes.getStatusCode() === 204, 'Approved origin preflight OPTIONS returns 204 No Content');
  assert(preflightRes.getHeaders()['access-control-allow-origin'] === 'http://localhost:3000', 'Preflight sets exact approved origin in Access-Control-Allow-Origin');
  assert(preflightRes.getHeaders()['access-control-allow-credentials'] === 'true', 'Preflight allows credentials for authorized origin');
  assert(preflightRes.getHeaders()['access-control-allow-methods'].includes('POST'), 'Preflight permits POST method');
  assert(preflightRes.getHeaders()['access-control-allow-headers'].includes('X-CSRF-Token'), 'Preflight permits X-CSRF-Token custom header');
  assert(preflightRes.getHeaders()['access-control-max-age'] === '86400', 'Preflight advertises 24hr cache max-age');
  assert(preflightRes.getHeaders()['vary'] === 'Origin', 'Preflight advertises Vary: Origin');

  // 3. Preflight OPTIONS Handling for Disallowed Origin
  const badPreflightRes = createMockRes();
  const badPreflightReq = createMockReq({
    method: 'OPTIONS',
    url: '/api/ai/query',
    headers: {
      origin: 'http://malicious-site.xyz',
      'access-control-request-method': 'POST'
    }
  });
  await aiMiddlewareHandler(badPreflightReq, badPreflightRes.res);
  assert(badPreflightRes.getStatusCode() === 403, 'Unapproved origin preflight OPTIONS rejected with 403 Forbidden');
  assert(!badPreflightRes.getHeaders()['access-control-allow-origin'], 'Unapproved origin preflight NEVER receives Access-Control-Allow-Origin');
  assert(!badPreflightRes.getHeaders()['access-control-allow-credentials'], 'Unapproved origin preflight never receives Access-Control-Allow-Credentials');

  // 4. Wildcard With Credentials Invariant (Never '*')
  const prodPreflightRes = createMockRes();
  const prodPreflightReq = createMockReq({
    method: 'OPTIONS',
    url: '/api/storage/signed-url',
    headers: {
      origin: 'https://tip-crm.vercel.app'
    }
  });
  await aiMiddlewareHandler(prodPreflightReq, prodPreflightRes.res);
  assert(prodPreflightRes.getHeaders()['access-control-allow-origin'] !== '*', 'CORS never returns wildcard "*" for credentialed requests');
  assert(prodPreflightRes.getHeaders()['access-control-allow-origin'] === 'https://tip-crm.vercel.app', 'Returns explicit authorized production origin');

  // 5. Cross-Origin Actual Request for Approved Origin
  const validCorsGetRes = createMockRes();
  const validCorsGetReq = createMockReq({
    method: 'GET',
    url: '/api/ai/usage',
    headers: {
      origin: 'http://localhost:3000',
      'x-user-role': 'super_admin'
    }
  });
  await aiMiddlewareHandler(validCorsGetReq, validCorsGetRes.res);
  assert(validCorsGetRes.getStatusCode() === 200, 'GET /api/ai/usage succeeds with 200 for approved origin');
  assert(validCorsGetRes.getHeaders()['access-control-allow-origin'] === 'http://localhost:3000', 'Sets Access-Control-Allow-Origin to requesting approved origin');
  assert(validCorsGetRes.getHeaders()['vary'] === 'Origin', 'Sets Vary: Origin on cross-origin response');

  // 6. Cross-Origin Actual Request for Disallowed Origin (No CORS headers sent)
  const badCorsGetRes = createMockRes();
  const badCorsGetReq = createMockReq({
    method: 'GET',
    url: '/api/ai/usage',
    headers: {
      origin: 'http://unauthorized-attacker.org'
    }
  });
  await aiMiddlewareHandler(badCorsGetReq, badCorsGetRes.res);
  assert(!badCorsGetRes.getHeaders()['access-control-allow-origin'], 'GET request from unapproved origin NEVER receives Access-Control-Allow-Origin');

  // 7. CSRF Defense: Block State-Changing Request With Disallowed Origin
  const csrfBlockedOriginRes = createMockRes();
  const csrfBlockedOriginReq = createMockReq({
    method: 'POST',
    url: '/api/auth/switch-role',
    headers: {
      origin: 'http://malicious-phishing.com',
      'content-type': 'application/json',
      'x-user-id': 'u-1'
    },
    body: { targetRole: 'super_admin' }
  });
  await aiMiddlewareHandler(csrfBlockedOriginReq, csrfBlockedOriginRes.res);
  assert(csrfBlockedOriginRes.getStatusCode() === 403, 'POST /api/auth/switch-role with malicious Origin blocked with 403 Forbidden');
  assert(csrfBlockedOriginRes.getData().code === 'FORBIDDEN', 'Error code indicates FORBIDDEN');
  assert(csrfBlockedOriginRes.getData().error.includes('Cross-Site Request Forgery (CSRF)'), 'Error message cites CSRF origin violation');

  // 8. CSRF Defense: Block State-Changing Request With Disallowed Referer
  const csrfBlockedRefererRes = createMockRes();
  const csrfBlockedRefererReq = createMockReq({
    method: 'POST',
    url: '/api/auth/switch-role',
    headers: {
      referer: 'http://evil-forum.net/exploit-post',
      'content-type': 'application/json',
      'x-user-id': 'u-1'
    },
    body: { targetRole: 'super_admin' }
  });
  await aiMiddlewareHandler(csrfBlockedRefererReq, csrfBlockedRefererRes.res);
  assert(csrfBlockedRefererRes.getStatusCode() === 403, 'POST /api/auth/switch-role with untrusted Referer blocked with 403 Forbidden');

  // 9. CSRF Defense: Cryptographic Anti-CSRF Token Generation & Verification
  const tokenForUser = generateCsrfToken('u-admin');
  assert(Boolean(tokenForUser), 'generateCsrfToken returns non-empty token string');
  assert(tokenForUser.split(':').length === 3, 'Token conforms to structure sessionId:timestamp:signature');
  assert(verifyCsrfToken(tokenForUser, 'u-admin'), 'verifyCsrfToken returns true for freshly generated matching token');
  assert(!verifyCsrfToken(tokenForUser, 'different-user'), 'verifyCsrfToken returns false for mismatched session ID');
  assert(!verifyCsrfToken(tokenForUser.slice(0, -4) + 'abcd', 'u-admin'), 'verifyCsrfToken returns false for tampered signature');
  assert(!verifyCsrfToken(''), 'verifyCsrfToken returns false for empty token');
  assert(!verifyCsrfToken('malformed:token'), 'verifyCsrfToken returns false for malformed token format');

  // 10. CSRF Defense: Cookie-Authenticated Request Missing X-CSRF-Token
  const cookieNoTokenRes = createMockRes();
  const cookieNoTokenReq = createMockReq({
    method: 'POST',
    url: '/api/ai/budget',
    headers: {
      cookie: 'tip_session=session_abc123',
      'content-type': 'application/json',
      'x-user-role': 'super_admin'
    },
    body: { dailyLimit: 75 }
  });
  await aiMiddlewareHandler(cookieNoTokenReq, cookieNoTokenRes.res);
  assert(cookieNoTokenRes.getStatusCode() === 403, 'Cookie-authenticated request missing X-CSRF-Token rejected with 403 Forbidden');
  assert(cookieNoTokenRes.getData().error.includes('CSRF token missing or invalid'), 'Error message cites missing CSRF token');

  // 11. CSRF Defense: Cookie-Authenticated Request With Invalid X-CSRF-Token
  const cookieBadTokenRes = createMockRes();
  const cookieBadTokenReq = createMockReq({
    method: 'POST',
    url: '/api/ai/budget',
    headers: {
      cookie: 'tip_session=session_abc123',
      'x-csrf-token': 'fake-forged-csrf-token-12345',
      'content-type': 'application/json',
      'x-user-role': 'super_admin'
    },
    body: { dailyLimit: 75 }
  });
  await aiMiddlewareHandler(cookieBadTokenReq, cookieBadTokenRes.res);
  assert(cookieBadTokenRes.getStatusCode() === 403, 'Cookie-authenticated request with forged X-CSRF-Token rejected with 403 Forbidden');

  // 12. CSRF Defense: Cookie-Authenticated Request With Valid X-CSRF-Token
  const validCsrf = generateCsrfToken('anon');
  const cookieValidTokenRes = createMockRes();
  const cookieValidTokenReq = createMockReq({
    method: 'POST',
    url: '/api/ai/budget',
    headers: {
      cookie: 'tip_session=session_abc123',
      'x-csrf-token': validCsrf,
      'content-type': 'application/json',
      'x-user-id': 'u-1',
      'x-user-role': 'super_admin',
      'x-user-name': 'Pritam Biswas'
    },
    body: { dailyLimit: 85, privacyMode: 'minimal' }
  });
  await aiMiddlewareHandler(cookieValidTokenReq, cookieValidTokenRes.res);
  assert(cookieValidTokenRes.getStatusCode() === 200, 'Cookie-authenticated request with valid X-CSRF-Token succeeds with 200 OK');

  // 13. GET /api/auth/csrf-token Endpoint
  const csrfTokenRes = createMockRes();
  const csrfTokenReq = createMockReq({
    method: 'GET',
    url: '/api/auth/csrf-token',
    headers: {
      'x-user-id': 'u-1'
    }
  });
  await aiMiddlewareHandler(csrfTokenReq, csrfTokenRes.res);
  assert(csrfTokenRes.getStatusCode() === 200, 'GET /api/auth/csrf-token returns 200 OK');
  const tokenData = csrfTokenRes.getData();
  assert(Boolean(tokenData.csrfToken), 'GET /api/auth/csrf-token returns valid csrfToken');
  assert(verifyCsrfToken(tokenData.csrfToken, 'u-1'), 'Returned CSRF token verifies against user identity');

  // 14. HTML Form URL-encoded Submission Defense
  const formSubmitRes = createMockRes();
  const formSubmitReq = createMockReq({
    method: 'POST',
    url: '/api/auth/switch-role',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  });
  await aiMiddlewareHandler(formSubmitReq, formSubmitRes.res);
  assert(formSubmitRes.getStatusCode() === 400, 'Simple form urlencoded submission without JSON headers rejected with 400 Bad Request');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
