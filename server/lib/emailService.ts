/**
 * TIP CRM — Official Email Transmission & Onboarding Service
 *
 * Dispatches branded welcome emails with secure activation links and login credentials
 * using The Inclusion Project official email template.
 *
 * Multi-provider support:
 * 1. Dedicated Gmail SMTP / Custom SMTP (smtp.gmail.com:587 STARTTLS or 465 SSL)
 * 2. Resend API
 * 3. SendGrid API
 * 4. Simulated Local Outbox (server/sent_emails.jsonl) with authoritative audit logging
 */

import fs from 'fs';
import path from 'path';
import net from 'net';
import tls from 'tls';
import { recordAuditEvent } from './auditLogger.ts';
import { safeLogger } from './ai/gemini.ts';
import { isProduction } from './environment.ts';

export interface WelcomeEmailParams {
  name: string;
  email: string;
  tempPassword?: string;
  activationUrl?: string;
  activationToken?: string;
  postTitle?: string;
  roles?: string[];
  appUrl?: string;
  accountStatus?: string;
  actorId?: string;
  actorRole?: string;
  correlationId?: string;
}

export interface SentEmailRecord {
  id: string;
  timestamp: string;
  sentFrom: string;
  recipient: string;
  subject: string;
  template: string;
  status: 'SENT' | 'SIMULATED_LOCAL' | 'FAILED';
  provider: 'smtp' | 'resend' | 'sendgrid' | 'local_outbox';
  messageId: string;
  metadata: {
    userName: string;
    userIdEmail: string;
    roles: string[];
    postTitle?: string;
    appUrl: string;
    activationUrl?: string;
    accountStatus?: string;
  };
  html: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure?: boolean;
  from?: string;
  fromName?: string;
}

const SENT_EMAILS_PATH = path.resolve(process.cwd(), 'server', 'sent_emails.jsonl');

export const CRM_SENDER_EMAIL = process.env.CRM_SENDER_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'crm@theinclusionproject.ca';
export const CRM_SENDER_NAME = process.env.SMTP_FROM_NAME || 'The Inclusion Project CRM';
export const DEFAULT_APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Mask an email address or username for safe logging
 * e.g. "tipcrm090@theinclusionproject.ca" -> "ti***090@theinclusionproject.ca"
 */
export function maskEmail(email?: string): string {
  if (!email) return 'not_configured';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 3) {
    return `${name[0]}***@${domain}`;
  }
  return `${name.slice(0, 2)}***${name.slice(-2)}@${domain}`;
}

/**
 * Read current SMTP configuration from environment variables
 */
export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (!user || !pass) {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const from = process.env.SMTP_FROM_EMAIL || user || CRM_SENDER_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || 'TIP CRM';

  return { host, port, user, pass, secure, from, fromName };
}

/**
 * Detect whether an SMTP multiline or single-line reply is complete (RFC 5321)
 */
export function isSmtpReplyComplete(buffer: string): boolean {
  const lines = buffer.trimEnd().split('\r\n');
  if (lines.length === 0) return false;
  const lastLine = lines[lines.length - 1];
  return /^\d{3} /.test(lastLine);
}

/**
 * Extract 3-digit reply code from SMTP buffer
 */
export function getSmtpReplyCode(buffer: string): number {
  const lines = buffer.trimEnd().split('\r\n');
  const lastLine = lines[lines.length - 1] || '';
  return parseInt(lastLine.slice(0, 3), 10) || 0;
}

/**
 * Native Node.js SMTP Transport Client (Supports Gmail STARTTLS & Port 465 SSL)
 */
async function executeSingleSmtpAttempt(options: {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure?: boolean;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  timeoutMs?: number;
}): Promise<{ messageId: string; response: string }> {
  const timeoutMs = options.timeoutMs || 15000;
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  return new Promise((resolve, reject) => {
    let currentSocket: net.Socket;
    let timer: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(timer);
      if (currentSocket) {
        currentSocket.removeAllListeners();
        currentSocket.destroy();
      }
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`SMTP connection to ${options.host}:${options.port} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    let responseBuffer = '';
    let state: 
      | 'BANNER' 
      | 'EHLO_INIT' 
      | 'STARTTLS_SENT' 
      | 'EHLO_POST_TLS' 
      | 'AUTH_LOGIN' 
      | 'AUTH_USER' 
      | 'AUTH_PASS' 
      | 'MAIL_FROM' 
      | 'RCPT_TO' 
      | 'DATA_CMD' 
      | 'DATA_BODY' 
      | 'QUIT' = 'BANNER';

    const sendLine = (line: string) => {
      currentSocket.write(line + '\r\n');
    };

    const attachListeners = (s: net.Socket) => {
      s.on('error', (err) => {
        cleanup();
        reject(new Error(`SMTP socket error (${options.host}:${options.port}): ${err.message}`));
      });

      s.on('data', (chunk) => {
        responseBuffer += chunk.toString('utf-8');
        if (!isSmtpReplyComplete(responseBuffer)) {
          return;
        }

        const code = getSmtpReplyCode(responseBuffer);
        const fullResponse = responseBuffer;
        responseBuffer = '';

        if (code >= 400) {
          cleanup();
          const cleanErr = fullResponse.trim();
          if (code === 535) {
            return reject(new Error(`SMTP Authentication failed (535): Invalid username or Google App Password. Please check 2-Step Verification.`));
          }
          if (code === 550 || code === 551 || code === 553) {
            return reject(new Error(`SMTP Recipient rejected (${code}): Mailbox unavailable or rejected by host.`));
          }
          return reject(new Error(`SMTP server rejected command (${code}): ${cleanErr}`));
        }

        switch (state) {
          case 'BANNER':
            if (code === 220) {
              state = 'EHLO_INIT';
              sendLine('EHLO tip-crm.local');
            }
            break;

          case 'EHLO_INIT':
            if (code === 250) {
              if (!options.secure && (options.port === 587 || options.port === 25)) {
                state = 'STARTTLS_SENT';
                sendLine('STARTTLS');
              } else if (options.user && options.pass) {
                state = 'AUTH_LOGIN';
                sendLine('AUTH LOGIN');
              } else {
                state = 'MAIL_FROM';
                sendLine(`MAIL FROM:<${options.from}>`);
              }
            }
            break;

          case 'STARTTLS_SENT':
            if (code === 220) {
              // Upgrade plain socket to TLS
              const raw = currentSocket;
              raw.removeAllListeners('data');
              raw.removeAllListeners('error');

              const secureSocket = tls.connect({
                socket: raw,
                host: options.host,
                minVersion: 'TLSv1.2',
                servername: options.host
              }, () => {
                state = 'EHLO_POST_TLS';
                sendLine('EHLO tip-crm.local');
              });

              currentSocket = secureSocket;
              attachListeners(secureSocket);
            }
            break;

          case 'EHLO_POST_TLS':
            if (code === 250) {
              if (options.user && options.pass) {
                state = 'AUTH_LOGIN';
                sendLine('AUTH LOGIN');
              } else {
                state = 'MAIL_FROM';
                sendLine(`MAIL FROM:<${options.from}>`);
              }
            }
            break;

          case 'AUTH_LOGIN':
            if (code === 334) {
              state = 'AUTH_USER';
              sendLine(Buffer.from(options.user || '').toString('base64'));
            }
            break;

          case 'AUTH_USER':
            if (code === 334) {
              state = 'AUTH_PASS';
              sendLine(Buffer.from(options.pass || '').toString('base64'));
            }
            break;

          case 'AUTH_PASS':
            if (code === 235) {
              state = 'MAIL_FROM';
              sendLine(`MAIL FROM:<${options.from}>`);
            } else {
              cleanup();
              return reject(new Error(`SMTP Authentication failed: ${fullResponse.trim()}`));
            }
            break;

          case 'MAIL_FROM':
            if (code === 250) {
              state = 'RCPT_TO';
              sendLine(`RCPT TO:<${options.to}>`);
            }
            break;

          case 'RCPT_TO':
            if (code === 250) {
              state = 'DATA_CMD';
              sendLine('DATA');
            }
            break;

          case 'DATA_CMD':
            if (code === 354) {
              state = 'DATA_BODY';
              const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
              const senderHeader = options.fromName ? `"${options.fromName}" <${options.from}>` : options.from;
              const subjectEncoded = `=?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`;

              const emailLines: string[] = [
                `Date: ${new Date().toUTCString()}`,
                `From: ${senderHeader}`,
                `To: ${options.to}`,
                `Subject: ${subjectEncoded}`,
                `Message-ID: <${messageId}@tipcrm>`,
                'MIME-Version: 1.0',
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/plain; charset=utf-8',
                'Content-Transfer-Encoding: base64',
                '',
                Buffer.from(options.text || '').toString('base64'),
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset=utf-8',
                'Content-Transfer-Encoding: base64',
                '',
                Buffer.from(options.html || '').toString('base64'),
                '',
                `--${boundary}--`,
                '.'
              ];
              currentSocket.write(emailLines.join('\r\n') + '\r\n');
            }
            break;

          case 'DATA_BODY':
            if (code === 250) {
              state = 'QUIT';
              sendLine('QUIT');
              cleanup();
              resolve({ messageId, response: fullResponse.trim() });
            }
            break;

          case 'QUIT':
            cleanup();
            break;
        }
      });
    };

    if (options.secure) {
      currentSocket = tls.connect({
        host: options.host,
        port: options.port,
        minVersion: 'TLSv1.2',
        servername: options.host
      });
    } else {
      currentSocket = net.createConnection({ host: options.host, port: options.port });
    }

    attachListeners(currentSocket);
  });
}

/**
 * Robust SMTP delivery with automated Port 465 direct SSL fallback for Gmail
 */
export async function sendViaSmtp(options: {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure?: boolean;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  timeoutMs?: number;
}): Promise<{ messageId: string; response: string }> {
  try {
    return await executeSingleSmtpAttempt(options);
  } catch (err: any) {
    if (!options.secure && options.port !== 465 && (options.host.includes('gmail') || options.host.includes('google'))) {
      safeLogger.warn(`SMTP 587 delivery attempt failed (${err?.message || 'Connection error'}). Retrying via direct SMTPS on port 465...`);
      return await executeSingleSmtpAttempt({ ...options, port: 465, secure: true });
    }
    throw err;
  }
}

/**
 * Verify SMTP connectivity and credentials without sending an email
 */
async function executeVerifySmtpAttempt(overrideConfig?: Partial<SmtpConfig>): Promise<{
  configured: boolean;
  connected: boolean;
  host?: string;
  port?: number;
  user?: string;
  error?: string;
  code?: string;
}> {
  const config = overrideConfig ? { ...getSmtpConfig(), ...overrideConfig } : getSmtpConfig();

  if (!config || !config.host || !config.user || !config.pass) {
    return {
      configured: false,
      connected: false,
      error: 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured.'
    };
  }

  const timeoutMs = 8000;

  return new Promise((resolve) => {
    let currentSocket: net.Socket;
    let timer: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(timer);
      if (currentSocket) {
        currentSocket.removeAllListeners();
        currentSocket.destroy();
      }
    };

    timer = setTimeout(() => {
      cleanup();
      resolve({
        configured: true,
        connected: false,
        host: config.host,
        port: config.port,
        user: maskEmail(config.user),
        error: `Connection to SMTP server ${config.host}:${config.port} timed out after ${timeoutMs}ms.`,
        code: 'SMTP_TIMEOUT'
      });
    }, timeoutMs);

    let responseBuffer = '';
    let state: 'BANNER' | 'EHLO_INIT' | 'STARTTLS_SENT' | 'EHLO_POST_TLS' | 'AUTH_LOGIN' | 'AUTH_USER' | 'AUTH_PASS' | 'QUIT' = 'BANNER';

    const sendLine = (line: string) => {
      currentSocket.write(line + '\r\n');
    };

    const attachListeners = (s: net.Socket) => {
      s.on('error', (err) => {
        cleanup();
        resolve({
          configured: true,
          connected: false,
          host: config.host,
          port: config.port,
          user: maskEmail(config.user),
          error: `SMTP connection error: ${err.message}`,
          code: 'SMTP_SOCKET_ERROR'
        });
      });

      s.on('data', (chunk) => {
        responseBuffer += chunk.toString('utf-8');
        if (!isSmtpReplyComplete(responseBuffer)) return;

        const code = getSmtpReplyCode(responseBuffer);
        const fullResponse = responseBuffer;
        responseBuffer = '';

        if (code >= 400) {
          cleanup();
          return resolve({
            configured: true,
            connected: false,
            host: config.host,
            port: config.port,
            user: maskEmail(config.user),
            error: code === 535
              ? 'SMTP Authentication Failed (535): Invalid username or Google App Password.'
              : `SMTP server error (${code}): ${fullResponse.trim()}`,
            code: code === 535 ? 'SMTP_AUTH_FAILED' : 'SMTP_SERVER_ERROR'
          });
        }

        switch (state) {
          case 'BANNER':
            if (code === 220) {
              state = 'EHLO_INIT';
              sendLine('EHLO tip-crm.local');
            }
            break;

          case 'EHLO_INIT':
            if (code === 250) {
              if (!config.secure && (config.port === 587 || config.port === 25)) {
                state = 'STARTTLS_SENT';
                sendLine('STARTTLS');
              } else {
                state = 'AUTH_LOGIN';
                sendLine('AUTH LOGIN');
              }
            }
            break;

          case 'STARTTLS_SENT':
            if (code === 220) {
              const raw = currentSocket;
              raw.removeAllListeners('data');
              raw.removeAllListeners('error');

              const secureSocket = tls.connect({
                socket: raw,
                host: config.host,
                minVersion: 'TLSv1.2',
                servername: config.host
              }, () => {
                state = 'EHLO_POST_TLS';
                sendLine('EHLO tip-crm.local');
              });

              currentSocket = secureSocket;
              attachListeners(secureSocket);
            }
            break;

          case 'EHLO_POST_TLS':
            if (code === 250) {
              state = 'AUTH_LOGIN';
              sendLine('AUTH LOGIN');
            }
            break;

          case 'AUTH_LOGIN':
            if (code === 334) {
              state = 'AUTH_USER';
              sendLine(Buffer.from(config.user || '').toString('base64'));
            }
            break;

          case 'AUTH_USER':
            if (code === 334) {
              state = 'AUTH_PASS';
              sendLine(Buffer.from(config.pass || '').toString('base64'));
            }
            break;

          case 'AUTH_PASS':
            if (code === 235) {
              state = 'QUIT';
              sendLine('QUIT');
              cleanup();
              resolve({
                configured: true,
                connected: true,
                host: config.host,
                port: config.port,
                user: maskEmail(config.user)
              });
            } else {
              cleanup();
              resolve({
                configured: true,
                connected: false,
                host: config.host,
                port: config.port,
                user: maskEmail(config.user),
                error: `Authentication failed: ${fullResponse.trim()}`,
                code: 'SMTP_AUTH_FAILED'
              });
            }
            break;

          case 'QUIT':
            cleanup();
            break;
        }
      });
    };

    const targetHost = config.host || 'smtp.gmail.com';
    const targetPort = config.port || (config.secure ? 465 : 587);

    if (config.secure) {
      currentSocket = tls.connect({
        host: targetHost,
        port: targetPort,
        minVersion: 'TLSv1.2',
        servername: targetHost
      });
    } else {
      currentSocket = net.createConnection({ host: targetHost, port: targetPort });
    }

    attachListeners(currentSocket);
  });
}

/**
 * Robust SMTP connection verification with automated Port 465 direct SSL fallback
 */
export async function verifySmtpConnection(overrideConfig?: Partial<SmtpConfig>): Promise<{
  configured: boolean;
  connected: boolean;
  host?: string;
  port?: number;
  user?: string;
  error?: string;
  code?: string;
}> {
  const primaryResult = await executeVerifySmtpAttempt(overrideConfig);
  if (!primaryResult.connected) {
    const config = overrideConfig ? { ...getSmtpConfig(), ...overrideConfig } : getSmtpConfig();
    if (config && !config.secure && config.port !== 465 && (config.host?.includes('gmail') || config.host?.includes('google'))) {
      const fallbackResult = await executeVerifySmtpAttempt({ ...config, port: 465, secure: true });
      if (fallbackResult.connected) {
        return fallbackResult;
      }
    }
  }
  return primaryResult;
}

/**
 * Generate The Inclusion Project Official HTML Email Template
 */
export function generateInclusionProjectWelcomeEmailHtml(params: {
  name: string;
  email: string;
  tempPassword?: string;
  activationUrl?: string;
  activationToken?: string;
  postTitle?: string;
  roles?: string[];
  appUrl?: string;
  accountStatus?: string;
}): string {
  const appUrl = params.appUrl || DEFAULT_APP_URL;
  const rolesText = (params.roles && params.roles.length > 0) ? params.roles.join(', ') : 'Staff Member';
  const postText = params.postTitle || 'Designated Operational Post';
  const isPending = params.accountStatus === 'pending' || params.accountStatus === 'Inactive';
  const activationUrl = params.activationUrl || (
    params.activationToken 
      ? `${appUrl}/?action=activate&email=${encodeURIComponent(params.email)}&token=${params.activationToken}`
      : `${appUrl}/?action=activate&email=${encodeURIComponent(params.email)}`
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TIP CRM Account Invitation — The Inclusion Project</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 16px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
    }
    .header-bar {
      height: 6px;
      background: linear-gradient(90deg, #ea0543 0%, #8b5cf6 50%, #140a8e 100%);
    }
    .header {
      background-color: #090b14;
      padding: 32px 36px;
      text-align: left;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      gap: 14px;
    }
    .logo-badge {
      display: inline-block;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ea0543 0%, #140a8e 100%);
      color: #ffffff;
      font-weight: 800;
      font-size: 18px;
      text-align: center;
      line-height: 44px;
      box-shadow: 0 4px 12px rgba(234, 5, 67, 0.35);
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .brand-subtitle {
      font-size: 12px;
      color: #94a3b8;
      margin: 2px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .body-content {
      padding: 36px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 14px 0;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 16px 0;
      font-size: 15px;
      color: #334155;
    }
    .credentials-card {
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .credential-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    .credential-row:last-child {
      border-bottom: none;
    }
    .credential-label {
      color: #64748b;
      font-weight: 600;
    }
    .credential-value {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      color: #0f172a;
    }
    .password-badge {
      background-color: #fef08a;
      color: #854d0e;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #fde047;
      letter-spacing: 0.05em;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #ea0543 0%, #140a8e 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 32px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(234, 5, 67, 0.3);
    }
    .security-notice {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 14px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: #1e40af;
      margin: 24px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 36px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    .footer a {
      color: #64748b;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header-bar"></div>
      <div class="header">
        <div class="logo-container">
          <div class="logo-badge">TIP</div>
          <div>
            <h2 class="brand-title">The Inclusion Project</h2>
            <div class="brand-subtitle">Community & Operations Engine</div>
          </div>
        </div>
      </div>

      <div class="body-content">
        <h1>Welcome to the Team, ${escapeHtml(params.name)}!</h1>
        <p>Hello ${escapeHtml(params.name)},</p>
        <p>You have been invited to use <strong>The Inclusion Project's CRM platform</strong>.</p>
        <p>Your account details are:</p>

        <div class="credentials-card">
          <div class="credential-row">
            <span class="credential-label">Portal URL</span>
            <span class="credential-value"><a href="${appUrl}" style="color: #140a8e; text-decoration: none;">${appUrl}</a></span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Login Email</span>
            <span class="credential-value">${escapeHtml(params.email)}</span>
          </div>
          ${params.tempPassword ? `
          <div class="credential-row">
            <span class="credential-label">Temporary Password</span>
            <span class="credential-value"><span class="password-badge">${escapeHtml(params.tempPassword)}</span></span>
          </div>
          ` : ''}
          <div class="credential-row">
            <span class="credential-label">Primary Post</span>
            <span class="credential-value">${escapeHtml(postText)}</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Assigned Roles</span>
            <span class="credential-value">${escapeHtml(rolesText)}</span>
          </div>
        </div>

        <p>To activate your account and set your password, please use the secure link below.</p>

        <div class="btn-container">
          <a href="${activationUrl}" class="btn-primary" target="_blank">Activate Your TIP CRM Account →</a>
        </div>

        <div style="text-align: center; margin-bottom: 24px; font-size: 13px; color: #64748b; word-break: break-all;">
          Or use this direct secure link:<br/>
          <a href="${activationUrl}" style="color: #140a8e; font-weight: 600;">${activationUrl}</a>
        </div>

        <p>After completing account setup, you can sign in using your registered email address.</p>

        ${isPending ? `
        <div class="security-notice" style="background-color: #fef3c7; border-color: #f59e0b; color: #92400e;">
          <strong>⏳ Administrator Approval Notice:</strong>
          If your account requires administrator approval, access will remain restricted until the required approval is completed.
        </div>
        ` : `
        <div class="security-notice">
          <strong>🔒 Security & Password Requirement:</strong>
          ${params.tempPassword ? 'For your security, you will be required to change this temporary password immediately upon your first sign in.' : 'Please establish your private password upon initial account activation.'} Never share your credentials with anyone.
        </div>
        `}

        <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
          If you were not expecting this invitation, please contact the TIP CRM administrator at <a href="mailto:${CRM_SENDER_EMAIL}" style="color: #ea0543;">${CRM_SENDER_EMAIL}</a>.
        </p>

        <p style="font-size: 14px; color: #334155; margin-top: 20px;">
          Kind regards,<br/>
          <strong>TIP CRM Team</strong><br/>
          The Inclusion Project
        </p>
      </div>

      <div class="footer">
        <p style="margin: 0 0 6px 0;"><strong>The Inclusion Project</strong> • Building Equitable, Inclusive, and Resilient Communities</p>
        <p style="margin: 0;">Sent automatically by TIP CRM Gateway • Sender: <a href="mailto:${CRM_SENDER_EMAIL}">${CRM_SENDER_EMAIL}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate plain-text fallback version
 */
export function generateInclusionProjectWelcomeEmailText(params: {
  name: string;
  email: string;
  tempPassword?: string;
  activationUrl?: string;
  activationToken?: string;
  postTitle?: string;
  roles?: string[];
  appUrl?: string;
  accountStatus?: string;
}): string {
  const appUrl = params.appUrl || DEFAULT_APP_URL;
  const rolesText = (params.roles && params.roles.length > 0) ? params.roles.join(', ') : 'Staff Member';
  const postText = params.postTitle || 'Designated Operational Post';
  const isPending = params.accountStatus === 'pending' || params.accountStatus === 'Inactive';
  const activationUrl = params.activationUrl || (
    params.activationToken 
      ? `${appUrl}/?action=activate&email=${encodeURIComponent(params.email)}&token=${params.activationToken}`
      : `${appUrl}/?action=activate&email=${encodeURIComponent(params.email)}`
  );

  return `===============================================================
THE INCLUSION PROJECT CRM — YOUR ACCOUNT INVITATION
===============================================================

Hello ${params.name},

You have been invited to use The Inclusion Project's CRM platform.

Your account details are:
- Login email:   ${params.email}
- Assigned role: ${rolesText}
- Primary post:  ${postText}
- Portal URL:    ${appUrl}

To activate your account and set your password, please use the secure link below:
${activationUrl}

${params.tempPassword ? `Temporary Password: ${params.tempPassword}
For your security, you will be required to change this temporary password immediately upon your first sign-in. Never share your credentials.\n` : ''}
After completing account setup, you can sign in using your registered email address.

${isPending 
  ? 'If your account requires administrator approval, access will remain restricted until the required approval is completed.\n'
  : (!params.tempPassword ? 'For your security, you will be required to set your private password upon initial account activation.\n' : '')}

If you were not expecting this invitation, please contact the TIP CRM administrator at ${CRM_SENDER_EMAIL}.

Kind regards,
TIP CRM Team
The Inclusion Project
Support & Inquiries: ${CRM_SENDER_EMAIL}
`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Dispatches the welcome email and logs it to server/sent_emails.jsonl and audit logs.
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{
  success: boolean;
  messageId: string;
  sentFrom: string;
  recipient: string;
  provider: 'smtp' | 'resend' | 'sendgrid' | 'local_outbox';
  status: 'SENT' | 'SIMULATED_LOCAL' | 'FAILED';
  deliveryStatus: 'SENT' | 'SIMULATED_LOCAL' | 'FAILED';
  timestamp: string;
  activationUrl: string;
  previewHtml: string;
}> {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();
  const subject = 'Your TIP CRM Account Invitation — The Inclusion Project';
  const appUrl = params.appUrl || DEFAULT_APP_URL;
  const activationUrl = params.activationUrl || (
    params.activationToken 
      ? `${appUrl}/?action=activate&email=${encodeURIComponent(params.email)}&token=${params.activationToken}`
      : `${appUrl}/?action=activate&email=${encodeURIComponent(params.email)}`
  );

  const htmlContent = generateInclusionProjectWelcomeEmailHtml({ ...params, activationUrl });
  const textContent = generateInclusionProjectWelcomeEmailText({ ...params, activationUrl });

  let provider: 'smtp' | 'resend' | 'sendgrid' | 'local_outbox' = 'local_outbox';
  let deliveryStatus: 'SENT' | 'SIMULATED_LOCAL' | 'FAILED' = 'SIMULATED_LOCAL';

  // 1. Try SMTP (Gmail or custom SMTP) if configured
  const smtpConfig = getSmtpConfig();
  if (smtpConfig) {
    try {
      await sendViaSmtp({
        host: smtpConfig.host,
        port: smtpConfig.port,
        user: smtpConfig.user,
        pass: smtpConfig.pass,
        secure: smtpConfig.secure,
        from: smtpConfig.from || CRM_SENDER_EMAIL,
        fromName: smtpConfig.fromName || CRM_SENDER_NAME,
        to: params.email,
        subject,
        html: htmlContent,
        text: textContent
      });
      provider = 'smtp';
      deliveryStatus = 'SENT';
      safeLogger.info('Welcome email delivered via SMTP', {
        recipient: params.email,
        host: smtpConfig.host,
        port: smtpConfig.port
      });
    } catch (smtpErr: any) {
      safeLogger.warn('SMTP delivery attempt failed; checking fallback providers:', {
        error: smtpErr?.message
      });
    }
  }

  // 2. Try Resend if configured and SMTP was not used
  if (deliveryStatus !== 'SENT' && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${CRM_SENDER_NAME} <${CRM_SENDER_EMAIL}>`,
          to: [params.email],
          subject,
          html: htmlContent,
          text: textContent
        })
      });
      if (res.ok) {
        provider = 'resend';
        deliveryStatus = 'SENT';
      } else {
        safeLogger.warn('Resend email delivery returned non-200 status', { status: res.status });
      }
    } catch (err) {
      safeLogger.warn('Resend email dispatch error', { error: (err as any)?.message });
    }
  }

  // 3. Try SendGrid if configured and not yet sent
  if (deliveryStatus !== 'SENT' && process.env.SENDGRID_API_KEY) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: params.email }] }],
          from: { email: CRM_SENDER_EMAIL, name: CRM_SENDER_NAME },
          subject,
          content: [
            { type: 'text/plain', value: textContent },
            { type: 'text/html', value: htmlContent }
          ]
        })
      });
      if (res.ok) {
        provider = 'sendgrid';
        deliveryStatus = 'SENT';
      }
    } catch (err) {
      safeLogger.warn('SendGrid email dispatch error', { error: (err as any)?.message });
    }
  }

  // If no live provider succeeded
  if (deliveryStatus !== 'SENT') {
    if (isProduction()) {
      // Production Invariant: Local outbox simulation is strictly disallowed in production
      deliveryStatus = 'FAILED';
      provider = smtpConfig ? 'smtp' : 'local_outbox';
      safeLogger.error('Transactional email delivery failed in production; SMTP or provider delivery unconfirmed', {
        recipient: params.email,
        attemptedProvider: provider
      });
    } else {
      // Development mode: capture in local outbox for testing with explicit simulated status
      provider = 'local_outbox';
      deliveryStatus = 'SIMULATED_LOCAL';
    }
  }

  const isSuccess = deliveryStatus === 'SENT' || (!isProduction() && deliveryStatus === 'SIMULATED_LOCAL');
  const auditAction = deliveryStatus === 'SENT' 
    ? 'AUTH_WELCOME_EMAIL_SENT' 
    : (deliveryStatus === 'SIMULATED_LOCAL' ? 'AUTH_WELCOME_EMAIL_SIMULATED' : 'AUTH_WELCOME_EMAIL_FAILED');
  const auditOutcome = isSuccess ? 'SUCCESS' : 'FAILURE';

  // 4. Record email transmission in authoritative sent_emails.jsonl
  const record: SentEmailRecord = {
    id: messageId,
    timestamp,
    sentFrom: `${CRM_SENDER_NAME} <${CRM_SENDER_EMAIL}>`,
    recipient: params.email,
    subject,
    template: 'inclusion_project_welcome_v1',
    status: deliveryStatus,
    provider,
    messageId,
    metadata: {
      userName: params.name,
      userIdEmail: params.email,
      roles: params.roles || ['staff_member'],
      postTitle: params.postTitle,
      appUrl: params.appUrl || DEFAULT_APP_URL,
      activationUrl,
      accountStatus: params.accountStatus
    },
    html: htmlContent
  };

  try {
    fs.appendFileSync(SENT_EMAILS_PATH, JSON.stringify(record) + '\n', 'utf-8');
  } catch (fsErr) {
    safeLogger.error('Failed to append to sent_emails.jsonl', { error: (fsErr as any)?.message });
  }

  // 5. Record authoritative security audit event
  recordAuditEvent({
    actorId: params.actorId || 'u-admin-090',
    actorName: 'Super Admin',
    actorRole: (params.actorRole as any) || 'super_admin',
    action: auditAction,
    resourceType: 'UserCredential',
    resourceId: params.email,
    outcome: auditOutcome,
    description: deliveryStatus === 'SENT'
      ? `Dispatched account invitation email with secure activation link to ${params.email} from ${CRM_SENDER_EMAIL} using The Inclusion Project template (provider: ${provider}, status: SENT).`
      : (deliveryStatus === 'SIMULATED_LOCAL'
          ? `Simulated account invitation email for ${params.email} recorded in local outbox (development only).`
          : `Failed to deliver account invitation email to ${params.email} via ${provider}.`),
    correlationId: params.correlationId,
    metadata: {
      messageId,
      sentFrom: CRM_SENDER_EMAIL,
      recipient: params.email,
      provider,
      deliveryStatus,
      activationUrl
    }
  });

  return {
    success: isSuccess,
    messageId,
    sentFrom: CRM_SENDER_EMAIL,
    recipient: params.email,
    provider,
    status: deliveryStatus,
    deliveryStatus,
    timestamp,
    activationUrl,
    previewHtml: htmlContent
  };
}

/**
 * Retrieve recently sent emails from sent_emails.jsonl
 */
export function getSentEmails(limit = 50): SentEmailRecord[] {
  if (!fs.existsSync(SENT_EMAILS_PATH)) return [];
  try {
    const raw = fs.readFileSync(SENT_EMAILS_PATH, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const records: SentEmailRecord[] = [];
    for (let i = lines.length - 1; i >= 0 && records.length < limit; i--) {
      try {
        records.push(JSON.parse(lines[i]));
      } catch {}
    }
    return records;
  } catch {
    return [];
  }
}
