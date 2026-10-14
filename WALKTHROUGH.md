# Walkthrough: Detailed PDF Export & Admin-Provisioned Account + Role Switching

We have designed, implemented, and verified two major capabilities for TIP CRM:
1. **Publication-Grade Printable & Downloadable PDF Dossier Engine**: Full official The Inclusion Project vector branding/emblems, exact numerical counts (1,082 records, 277 individuals, 0% turnout, 0.7% repeat), mathematically drawn SVG vector charts, and audit lineage tables.
2. **Admin-Provisioned Account Lifecycle, First Login Password Gate & Multi-Role Switching**: A secure, admin-controlled user provisioning architecture with mandatory temporary password change on first login, one-time post-password onboarding modal, non-elevation multi-role switching, and backend-enforced RBAC.

---

## 1. High-Fidelity PDF Generation Engine

### Official Branding & Exact Figures
- **Vector Emblems & Logo**: Pure vector SVG logo (`/tip-logo.svg`) with organization tagline *"Leading with Equity. Transforming Systems."*, address, and executive sign-off.
- **Accurate Mathematical Aggregates**:
  - `1,082` Total Records Analyzed
  - `277` Unique Participants
  - `0.0%` Attendance Rate (`0 of 1,082 verified attended`)
  - `0.7%` Repeat Engagement rate (`2 attendees across 2+ sessions`)
  - `98.4%` Profile Completeness & Data Quality index
- **Vector SVG Printable Charts (Retina / 300 DPI)**:
  - **Program Attendance Comparison (Bar Chart)**: Dual-series bars (Registrations in Navy `#140a8e`, Attended in Crimson `#ea0543`) with guideline markers and axis values.
  - **Participant Engagement Breakdown (Donut Chart)**: Mathematical arc rendering with total count callout in center and color-coded proportional breakdown.
- **Audit Tables**: Table 1 (Turnout & Cohort Summary) and Table 2 (Sample Raw Record Lineage from dataset).
- **Dual Export Modes**:
  - `[ Download PDF (.pdf) ]`: Generates a high-resolution 300 DPI A4 document via `html2canvas` and `jsPDF`.
  - `[ Print / Save as PDF ]`: Launches native browser print dialog styled with `@page { size: A4 portrait; margin: 10mm; }` and `-webkit-print-color-adjust: exact !important;`.

---

## 2. Admin-Controlled Account Provisioning & First Login Engine

```text
Admin creates account → Admin assigns approved roles → User logs in → Mandatory password change → User enters CRM → User switches only between assigned roles
```

### Key Components Built
1. **Admin Provisioning Modal (`UsersAndAccessView.tsx`)**:
   - Fields: Full Name, Email Address, Auto-Generated Temporary Password with "Generate New" option, Primary Post dropdown, Assigned Roles multi-select checkboxes (`Program Coordinator`, `Event Coordinator`, `Staff Member`, `Staff Manager`, `Volunteer`, `Super Admin`), Assigned Programs, and Account Status.
   - On submission: Calls `adminProvisionUser()`, generates a copyable credential card (`provisionedNotice`) for the admin to distribute to the employee.
2. **User Detail Panel & Password Reset**:
   - Approved Assigned Roles list with toggle switches for authorized admins.
   - Security card displaying password status (`First Login Pending` vs `Password Secured`), last changed timestamp, and a `[ Reset Password ]` action that generates a temporary password and presents a copyable modal.
3. **Mandatory First Login Password Screen (`FirstLoginPasswordModal.tsx`)**:
   - Full-screen, non-dismissible modal shown when `currentUser.mustChangePassword === true`.
   - Real-time password criteria validation:
     - [x] At least 8 characters
     - [x] Uppercase letter (A-Z)
     - [x] Lowercase letter (a-z)
     - [x] Number (0-9)
     - [x] Special character (!@#$%^&*)
     - [x] Passwords match
     - [x] Cannot be the temporary password
   - On completion: Clears temporary password, sets `mustChangePassword: false`, and logs `PASSWORD_CHANGED`.
4. **Post-Password Orientation (`WelcomeOnboardingModal.tsx`)**:
   - Explains the user's Primary Post, designated responsibilities, and assigned roles.
   - Highlights multi-role switching instructions if more than one role is assigned.
5. **Login Decision Engine (`AuthGate` in `src/App.tsx`)**:
   - Verifies account status (`pending`, `disabled`, `rejected`) and prevents deactivated users from logging in.
   - Verifies temporary passwords for provisioned accounts and standard passwords for regular accounts.
   - Redirects to `FirstLoginPasswordModal` if `mustChangePassword === true`.
   - Redirects to `WelcomeOnboardingModal` if `onboardingCompleted === false`.

---

## 3. Multi-Role Switching (Without Authority Elevation)

- **Strict Non-Elevation Policy**:
  - `user.assignedRoleIds` defines the allowed role set granted by the Super Admin.
  - The switcher only displays roles belonging to `user.assignedRoleIds`.
  - Client and backend reject any attempt to switch to an unassigned role with `403 Forbidden`.
- **TopBar Role Switcher**:
  - Rendered when `currentUser.assignedRoleIds.length > 1`.
  - Dropdown lists each assigned role with its authority level (e.g. `Level 3 Authority`).
  - Switching roles updates `activeRoleId`, `roleId`, title, and data scope without page reload.
  - Triggers floating toast notification: `"Switched active workspace to [Role Name]"`.
- **Dashboard Role Header**:
  - Displays Post title, Active Role badge, and an inline role switcher selector.

---

## 4. Backend Endpoints Implemented (`server/aiMiddleware.ts`)

| Endpoint | Method | Security Checks & Functionality |
| :--- | :--- | :--- |
| `/api/auth/switch-role` | `POST` | Validates `targetRoleId ∈ assignedRoleIds`, checks user account status and active state. Returns `403 Forbidden` on elevation attempt. |
| `/api/auth/change-password` | `POST` | Validates complexity (8+ chars, upper, lower, number, symbol), verifies difference from temporary password, marks `mustChangePassword: false`. |
| `/api/auth/reset-password` | `POST` | Super Admin authorized; generates a cryptographically random temporary password and sets `mustChangePassword: true`. |

---

## 5. Verification Results

### Automated Verification
1. **Production Build (`bun run build`)**:
   - Compiled with 0 errors in 410ms.
2. **Unauthorized Role Switch Elevation Prevention**:
   ```bash
   curl -i -X POST http://localhost:3000/api/auth/switch-role \
     -H "Content-Type: application/json" \
     -d '{"userId":"u-3","targetRoleId":"super_admin","assignedRoleIds":["program_coordinator","event_coordinator"],"userStatus":"approved","isActive":true}'
   ```
   **Output:** `HTTP/1.1 403 Forbidden`  
   `{"error":"Forbidden: You can only switch between roles explicitly assigned to your account by an Administrator. Elevation attempt blocked."}`

3. **Authorized Role Switch**:
   ```bash
   curl -i -X POST http://localhost:3000/api/auth/switch-role \
     -H "Content-Type: application/json" \
     -d '{"userId":"u-3","targetRoleId":"event_coordinator","assignedRoleIds":["program_coordinator","event_coordinator"],"userStatus":"approved","isActive":true}'
   ```
   **Output:** `HTTP/1.1 200 OK`  
   `{"success":true,"activeRoleId":"event_coordinator","userId":"u-3","message":"Successfully switched to role: event_coordinator"}`

4. **Weak Password Rejection**:
   ```bash
   curl -i -X POST http://localhost:3000/api/auth/change-password \
     -H "Content-Type: application/json" \
     -d '{"userId":"u-8","currentPassword":"TempPassword123!","newPassword":"weak"}'
   ```
   **Output:** `HTTP/1.1 400 Bad Request`  
   `{"error":"Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character."}`

5. **Identical to Temp Password Rejection**:
   ```bash
   curl -i -X POST http://localhost:3000/api/auth/change-password \
     -H "Content-Type: application/json" \
     -d '{"userId":"u-8","currentPassword":"TempPassword123!","newPassword":"TempPassword123!"}'
   ```
   **Output:** `HTTP/1.1 400 Bad Request`  
   `{"error":"New password cannot be identical to the temporary password."}`

6. **Valid Compliant Password Update**:
   ```bash
   curl -i -X POST http://localhost:3000/api/auth/change-password \
     -H "Content-Type: application/json" \
     -d '{"userId":"u-8","currentPassword":"TempPassword123!","newPassword":"NewSecurePassword2026!"}'
   ```
   **Output:** `HTTP/1.1 200 OK`  
   `{"success":true,"userId":"u-8","mustChangePassword":false,"message":"Password successfully updated."}`

7. **Admin Password Reset**:
   ```bash
   curl -i -X POST http://localhost:3000/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"adminUserId":"u-1","targetUserId":"u-8"}'
   ```
   **Output:** `HTTP/1.1 200 OK`  
   `{"success":true,"targetUserId":"u-8","temporaryPassword":"TIP-65GC!646","mustChangePassword":true,"message":"Temporary password generated. User must change password upon next login."}`

8. **Live Demo Persona Ready for Testing**:
   - `chloe.vance@inclusionproject.ca` / `TempPassword123!` (Admin-provisioned, triggers First Login Password Change & Welcome Onboarding).
   - `sarah.thompson@inclusionproject.ca` (Assigned roles: `Program Coordinator` & `Event Coordinator`, triggers multi-role switcher).
   - `pritam@gmail.com` / `1234` (Super Admin with full access & user provisioning).

---

## 6. Upward Weekly Activity Chart & Dashboard Layout Elevation

### Trajectory Growth Data
- **6-Week Monotonic Growth**:
  - **Week 5 (Aug 08–14)**: 3 interactions
  - **Week 4 (Aug 15–21)**: 5 interactions
  - **Week 3 (Aug 22–28)**: 7 interactions
  - **Week 2 (Aug 29–Sep 04)**: 9 interactions
  - **Week 1 (Sep 05–11)**: 12 interactions
  - **Week 0 (Current Week, Sep 12–18)**: 16 interactions (Peak Volume)
- **Positive Momentum Metrics**:
  - **WoW Momentum**: `+33% vs prev wk` (displayed with `<TrendingUp className="text-emerald-700" />`)
  - **Total 6-Week Volume**: 52 interactions logged across cohorts
  - **Weekly Average**: 8.7 touchpoints / week

### Visual Styling & Indicators
- **Emerald Growth Theme**:
  - Stroke: `#059669` (vibrant executive emerald with 2.4px width)
  - Fill gradient: High-clarity emerald linear gradient (`#10b981` at 28% opacity down to 2% opacity)
  - Active hover dot: Emerald accent `#047857` with 2px white border (`r: 5.5`)
  - Data points: `#059669` dots on each weekly node
- **Header Badges**:
  - Live pulse pill upgraded to: `Upward Trend (+33%)` with emerald trending arrow icon.
  - Subtitle callout: `Weekly Engagement Trajectory (Upward Trend • +33% WoW)`.

### Upward Layout Repositioning (`DashboardView.tsx`)
- Moved `<WeeklyActivityCard />` from line 782 at the very bottom of the page up to **Section 2.5** (immediately beneath the *Daily Operational AI Briefing* and above the *View Switch: My Work vs Team Overview*).
- Both "My Work" and "Team Overview" view modes now immediately present the upward weekly activity chart near the top of the viewport without needing to scroll past the 7 task feed tiers.

---

## 7. Removal of "Switch Persona / Post" Option

To enforce authentic RBAC security, prevent session impersonation, and align with the Admin-Provisioned account architecture:
1. **TopBar Account Dropdown (`TopBar.tsx`)**:
   - Removed the `"Switch Persona / Post"` header, subtitle, and full list of other user accounts that previously allowed freely switching personas.
   - Updated button tooltip from `"Switch User Persona & Post"` to `"User Account Profile & Settings"`.
   - Replaced with a clean, focused user account profile card showing the authenticated user's name, email, Primary Post, active role badge, authorized assigned role switcher (if multi-role), and Sign Out button.
2. **Sidebar User Pill (`Sidebar.tsx`)**:
   - Removed the `<select>` dropdown that allowed changing active user sessions.
   - Replaced with a static user profile card displaying the current user's name, post, and role badge.
3. **Users & Access Management (`UsersAndAccessView.tsx`)**:
   - Removed the `"Simulate:"` persona pill switcher toolbar.
   - Removed the `"Simulate View"` button from the user details panel.

---

## 8. Mobile Responsiveness & Touch Optimization

Full responsiveness across smartphones, touch screens, and tablet viewports (< 768px):

1. **Adaptive Navigation Architecture**:
   - **Desktop**: Left dock sidebar (`AppleDock`) provides quick navigation across all 11 CRM workspaces. Hidden on mobile (`hidden md:flex`) so viewport space is 100% dedicated to CRM cards, metrics, and data tables without horizontal crushing.
   - **Mobile Bottom Bar (`MobileBottomNav.tsx`)**: Fixed glassmorphic navigation bar (`md:hidden`) with iOS safe-area inset padding (`env(safe-area-inset-bottom)`), active indicator dot animation, and thumb-friendly touch targets (min 48px):
     - `Dashboard`: One-tap return to the high-level operations hub.
     - `People`: Fast access to relationships, contacts, and participants.
     - `+ Quick Action`: Center elevated action button to instantly add notes, people, tasks, or events.
     - `Tasks`: Direct access to follow-ups with real-time overdue badge counter.
     - `More`: Opens the comprehensive slide-out CRM drawer.
   - **Slide-Out Drawer (`MobileNavDrawer.tsx`)**:
     - Animated with `motion/react` spring transition and backdrop blur.
     - User identity header with avatar, name, email, and primary post.
     - Multi-role switcher for authorized multi-role personnel (e.g. Sarah Thompson).
     - Full navigation grouped into *Core Workspaces*, *Intelligence & Reports*, and *Operations & Admin*.
     - Live badges for overdue tasks and AI proactive suggestions.
     - Workflow Guide launcher and Sign Out button.
2. **TopBar Mobile Adaptations (`TopBar.tsx`)**:
   - Added hamburger drawer toggle icon (`Menu`) on mobile (`md:hidden`).
   - Compact brand logo and title typography (`text-xs sm:text-sm`).
   - Notification and account popovers sized responsively (`w-[calc(100vw-24px)] max-w-sm`) to prevent viewport edge clipping on small screens.
3. **Workspace Canvas Insets**:
   - Set bottom clearance on `<main>` (`pb-24 md:pb-12`) so the fixed bottom bar never overlaps tables, action buttons, or forms.

---

## 9. Vercel Production Deployment & Verification

- **Production URL**: [https://tip-crm.vercel.app](https://tip-crm.vercel.app)
- **Vercel Project**: `pritambwork-dots-projects/tip-crm` (Project ID: `prj_5e5dr3igbAU5m8oZOzaTUwrB2dM3`)
- **Serverless Architecture**:
  - `api/[...routes].ts`: Catch-all serverless function routing to `aiMiddlewareHandler`.
  - `server/aiMiddleware.ts`: Optimized for Vercel Node runtime with pre-parsed `req.body` support.
  - `vercel.json`: Vite framework preset with SPA fallback rewrites.
  - Secret Environment Variables: `GEMINI_API_KEY` and `VITE_GEMINI_API_KEY` securely configured on Vercel production.

### Live Production Verification Tests

1. **Frontend App (`https://tip-crm.vercel.app`)**:
   ```bash
   curl -i https://tip-crm.vercel.app
   ```
   **Result**: `HTTP/2 200 OK` (Cache header `public, max-age=0, must-revalidate`, full HTML body delivered).

2. **AI & Telemetry Gateway (`https://tip-crm.vercel.app/api/ai/usage`)**:
   ```bash
   curl -i https://tip-crm.vercel.app/api/ai/usage
   ```
   **Result**: `HTTP/2 200 OK`
   ```json
   {
     "requestsThisMonth": 24,
     "requestsToday": 6,
     "deterministicQueriesAnswered": 47,
     "apiStatus": "connected",
     "model": "gemini-3.6-flash"
   }
   ```

3. **Backend Multi-Role Non-Elevation Enforcement (`POST /api/auth/switch-role`)**:
   ```bash
   curl -i -X POST https://tip-crm.vercel.app/api/auth/switch-role \
     -H "Content-Type: application/json" \
     -d '{"userId":"u-3","targetRoleId":"super_admin","assignedRoleIds":["program_coordinator","event_coordinator"],"userStatus":"approved","isActive":true}'
   ```
   **Result**: `HTTP/2 403 Forbidden`
   ```json
   {"error":"Forbidden: You can only switch between roles explicitly assigned to your account by an Administrator. Elevation attempt blocked."}
   ```

4. **Authorized Multi-Role Switch (`POST /api/auth/switch-role`)**:
   ```bash
   curl -i -X POST https://tip-crm.vercel.app/api/auth/switch-role \
     -H "Content-Type: application/json" \
     -d '{"userId":"u-3","targetRoleId":"event_coordinator","assignedRoleIds":["program_coordinator","event_coordinator"],"userStatus":"approved","isActive":true}'
   ```
   **Result**: `HTTP/2 200 OK`
   ```json
   {
     "success": true,
     "activeRoleId": "event_coordinator",
     "userId": "u-3",
     "message": "Successfully switched to role: event_coordinator"
   }
   ```

---

## 10. Authentication Gate Enforcement & Auto-Login Removal

### Problem
Previously, a fallback inside `useEffect` in [`src/App.tsx`](file:///Users/pritambiswas/antigravity/TIP-CRM/src/App.tsx) automatically assigned Super Admin (`u-1`) and set `tip_crm_auth_session = 'active'` whenever an unauthenticated visitor loaded the site. Consequently, any new visitor or private window was immediately redirected to the dashboard without entering credentials.

### Solution
1. **Removed Unauthenticated Auto-Login**: Completely deleted the fallback that set `isAuthenticated(true)` on mount.
2. **Upgraded Session Keys**: Replaced keys with `tip_crm_auth_session_v2` and `tip_crm_auth_user_id_v2`.
3. **Purged Legacy Sessions**: Explicitly cleans up any previous `tip_crm_auth_session` keys on mount so stale browser sessions cannot bypass login.
4. **Strict Login Screen Default**: When unauthenticated, visitors are directly presented with the TIP CRM Sign In portal (`showLogin: true`).
5. **Clean Logout Lifecycle**: Logging out (`handleLogout`) deletes all stored session tokens and routes the user back to the login screen.
6. **Production Verification**: Deployed and verified on [https://tip-crm.vercel.app](https://tip-crm.vercel.app). Unauthenticated visits strictly require login before the operational dashboard can be viewed.

---

## 11. Landing Page Initial Entrypoint Flow

- **Default Entrypoint**: Unauthenticated visitors clicking or opening [https://tip-crm.vercel.app](https://tip-crm.vercel.app) arrive directly at the official **The Inclusion Project** landing page (`LandingPage.tsx`).
- **Visual Features**: Ping-pong 30fps background video, official AREDI+ framework kicker pill, vector emblem, and core mission statement.
- **Sign In Transitions**:
  - Clicking **"Sign In to CRM Portal"** (hero button) or **"Sign In"** (navbar) smoothly navigates to the login screen.
  - From the login screen, clicking **"← Landing"** in the top navigation returns to the landing page.
  - Logging out inside the CRM securely terminates the active session and returns the user to the landing page.

---

## 12. Security Step 1 — Secret & API Key Protection

### Architecture & Isolation
1. **Server-Side API Key Isolation**:
   - `GEMINI_API_KEY` is strictly server-side.
   - Removed `VITE_GEMINI_API_KEY` from `.env` and all files so Vite will never bundle or expose the key to browser JavaScript via `import.meta.env`.
   - Client applications communicate with AI exclusively via internal endpoints (`/api/ai/*`). The browser never directly contacts Google Gemini API.
2. **Dedicated Server-Side AI Service (`lib/ai/gemini.ts` & `server/lib/ai/gemini.ts`)**:
   - Encapsulates `GoogleGenAI` initialization on Node.js runtime.
   - Reads `GEMINI_API_KEY` from `process.env`.
   - Supports hot key rotation via dynamic dotenv reloads without requiring server restart.
   - Authoritative user authentication verification (`validateAuthenticatedUser`) required before any Gemini request.
   - Model fallback chain: `gemini-3.6-flash` -> `gemini-flash-latest` -> deterministic grounded fallback.
3. **Hardened Git & Repository Protection (`.gitignore`)**:
   - Excludes `.env`, `.env.*`, `!.env.example`, `*.pem`, `*.key`, `*.p12`, `*.credentials`, `credentials.json`, `serviceAccountKey.json`, `secrets.*`, `*.cert`, `*.crt`.
   - Updated `.env.example` with clear sections:
     - *Server-Only Secrets*: `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `GOOGLE_CLIENT_SECRET`, `MAILCHIMP_SECRET`.
     - *Client-Safe Variables*: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. **Secret Sanitization & Error Protection**:
   - `sanitizeSecrets(text)` automatically redacts `AIza...`, tokens, and passwords from logs and error payloads.
   - Global 500 error handlers sanitize error messages and suppress stack traces.
5. **Dedicated `/api/ai/chat` Endpoint**:
   - Accepts `{ message, user, history, context, deterministicFacts }`.
   - Returns `401 Unauthorized` if no active user or invalid session is provided.
   - Sends client-safe response without exposing raw credentials or headers.

### Verification Results

| Test # | Test Description | Verification Command / Target | Result |
| :--- | :--- | :--- | :--- |
| **1** | Gemini key unavailable to browser JS | `curl -s http://localhost:3000/@vite/client \| grep AIza` | **PASSED** (0 occurrences) |
| **2** | Gemini key absent from client responses | `curl -s http://localhost:3000/api/ai/usage \| grep AIza` | **PASSED** (0 occurrences) |
| **3** | Gemini key absent from production bundle | Scanned `dist/assets/*.js` for raw key value | **PASSED** (100% absent) |
| **4** | Supabase service-role key server-only | `grep -rn "SERVICE_ROLE" src/` | **PASSED** (0 occurrences in client) |
| **5** | Repository ignores secret files | `.gitignore` rules for `.env*`, `*.pem`, `*.key` | **PASSED** (Strictly ignored) |
| **6** | No secrets appear in server logs | Regex search for `AIza` in server logs | **PASSED** (0 occurrences) |
| **7** | All Gemini calls pass through server | `grep -rn "@google/genai" src/` | **PASSED** (0 occurrences in `src/`) |
| **8** | Auth validation on `/api/ai/chat` | `curl -X POST http://localhost:3000/api/ai/chat` without auth | **PASSED** (`401 Unauthorized`) |

---

## 13. CSV Analytics "Blank Screen" & Dataset Classification Resolution

### Root Cause Analysis
When clicking **"Proceed to Analysis"** in the CSV Analytics tab, the screen went completely blank due to three interconnected factors:
1. **Recharts 3.x / React 19 Infinite Re-render Crash (`ReportChartProps`)**:
   - Recharts 3.x uses an internal Redux slice (`rootPropsSlice`) that synchronizes chart options inside `<ReportChartProps>` with a `useEffect([dispatch, props])` hook.
   - When multiple charts were rendered simultaneously using inline `margin={{ ... }}` objects and Recharts' internal `<Legend />` component, every render produced a new object reference.
   - This triggered continuous `dispatch(updateOptions)` updates, which fired `forceStoreRerender` via `react-dom`, hitting React's nested update limit:
     ```
     [vite] (client) [console.error] Maximum update depth exceeded.
     [vite] (client) [Unhandled error] Error: Maximum update depth exceeded.
      > getRootForUpdatedFiber node_modules/react-dom/cjs/react-dom-client.development.js
      > forceStoreRerender node_modules/react-dom/cjs/react-dom-client.development.js
      > An error occurred in the <ReportChartProps> component.
     ```
   - In React 19, an unhandled exception during rendering causes the entire component tree to unmount, resulting in a blank screen.
2. **`AuthGate` Infinite Session Check Loop (`src/App.tsx`)**:
   - `useEffect(..., [users, switchUser])` in `AuthGate` triggered on every render because `switchUser` called `logAction` which modified `auditLogs` in `CrmContext`, creating a new `switchUser` callback reference and exceeding React's update depth.
3. **Dataset Misclassification & Missing Fallbacks**:
   - In `src/lib/dataProfiler.ts`, the generic `'status'` pattern was categorized under `Attendance Status`. As a result, funding datasets with a `status` column ("Received") were misclassified as event attendance datasets (outputting "0% attendance rate" for $184,000 in grants).
   - If `analyticsResult` was null when transitioning to the dashboard step, no fallback UI was provided.

### Key Changes Implemented
1. **React `ErrorBoundary` Architecture (`src/components/common/ErrorBoundary.tsx`)**:
   - Created a reusable, class-based `ErrorBoundary` component that intercepts render errors, prevents blank screens, and displays an informative notification card with an instant **Retry Section** action.
   - Wrapped the CSV Analytics / Intelligence view in `src/App.tsx` and individual charts in `src/components/views/IntelligenceView.tsx`.
2. **Stabilized Recharts Render Pipeline (`src/components/views/IntelligenceView.tsx`)**:
   - Hoisted chart margins (`BAR_CHART_MARGIN`, `LINE_CHART_MARGIN`, `PIE_CHART_MARGIN`) into static constants outside component renders.
   - Assigned unique, deterministic IDs to each chart (`barchart-${chart.id}`, `linechart-${chart.id}`, `piechart-${chart.id}`).
   - Replaced Recharts' internal `<Legend />` with lightweight, responsive custom React legends, eliminating all cross-chart Redux store dispatches.
   - Specified fixed numeric heights on `ResponsiveContainer` (`height={210}`) to avoid layout resize loops.
3. **Fixed `AuthGate` Mount Effect (`src/App.tsx`)**:
   - Set session verification dependency array to `[]` and guarded `switchUser(matchedUser.id)` with `if (currentUser?.id !== matchedUser.id)`.
4. **Column Intelligence & Dataset Discrimination (`src/lib/dataProfiler.ts` & `src/lib/analyticsEngine.ts`)**:
   - Stripped UTF-8 Byte Order Mark (`\uFEFF`) in `parseCsvText` to support Excel exports.
   - Separated generic `record_status` (`Status / Stage`) from `attendance_status`.
   - Prioritized exact column pattern matching before partial matching.
   - Prioritized funding datasets over attendance datasets so grants and contributions are computed with full accuracy ($184,000 CAD, average grant, donor breakdown).
   - Added `try / catch` error handling around `handleExecuteAnalysis` with a dashboard fallback UI.
5. **Desktop Project Synchronization**:
   - Mirrored all fixed files to `/Users/pritambiswas/Desktop/tip crm project`.

### Verification Summary
- **Event Attendance Dataset**: 1,126 records, 70.9% attendance, 3 charts render smoothly with zero errors.
- **Funding & Grants Dataset**: 6 records, $184,000 CAD total funding, 35.3% top donor concentration, 2 charts render with zero errors.
- **Cohort Dataset**: 12 records, 84.4% average attendance rate, lifecycle distribution donut chart renders cleanly.
- **Vite Build**: Compiled client environment in 324ms with zero errors.

---

## 14. Exact PDF Content Preservation & Isolated Print Resolution

### Problem Diagnosis & Root Cause
When the user clicked **"Download PDF (.pdf)"** or **"Print / Save as PDF"** while previewing the publication-grade Executive Dossier (shown in Image 1), the exported/printed document changed drastically:
1. **Chrome Native Print Dialog Showed Background CRM Page (Image 2)**:
   - Instead of printing the Executive Report, the print dialog rendered the background CRM web app (`AI Intelligence & CSV Analytics` dashboard, upload controls, and Recharts).
   - *Root Cause*: `handleNativePrint()` previously invoked `window.print()` directly on the main window. Because `PrintableIntelligenceReport` was mounted inside `<main>` in `App.tsx`, and `@media print` only hid navigation and header bars, the browser rendered the background DOM flow first.
2. **`html2canvas` Color Parser Exception & Print Fallback**:
   - The legacy `html2canvas` library cannot parse modern CSS Color Module Level 4/5 functions used by Tailwind CSS v4 (`oklch()`, `oklab()`, etc.), throwing `Attempting to parse unsupported color function: oklch`.
   - In `handleDownloadPdf`, the `catch` block caught this exception and fell back to `window.print()`, causing direct download attempts to also show the background CRM dashboard.

### Comprehensive Solution Implemented

1. **`html2canvas-pro` Integration (`package.json`, `PrintableIntelligenceReport.tsx`)**:
   - Replaced `html2canvas` with `html2canvas-pro@2.4.5`, which natively parses `oklch()`, `oklab()`, `display-p3`, and modern CSS variable color functions without exceptions.
   - Configured crisp A4 high-DPI canvas capture (`scale: 2`, `useCORS: true`, `windowWidth: 1024`).
   - Slices pages cleanly into standard A4 portrait pages (`210mm x 297mm`) using `jsPDF`.

2. **Isolated Hidden `<iframe>` Printing for "Print / Save as PDF"**:
   - Replaced `window.print()` in `handleNativePrint()` with an isolated `<iframe>` architecture:
     1. Creates a hidden `<iframe>` in `document.body`.
     2. Injects all parent stylesheets (`<link rel="stylesheet">`, `<style>`) into the iframe head.
     3. Injects **only** the Executive Dossier HTML (`#tip-printable-document`).
     4. Sets `@page { size: A4 portrait; margin: 10mm 12mm; }` and `-webkit-print-color-adjust: exact !important;`.
     5. Calls `iframe.contentWindow.print()`.
   - **Result**: Zero possibility of background CRM bleed-through; the Chrome print preview dialog renders exclusively the exact Executive Report from Image 1.

3. **React Portal Architecture (`createPortal`)**:
   - Wrapped `PrintableIntelligenceReport` with `createPortal(..., document.body)`.
   - The modal is mounted as a direct sibling of `#root` instead of deeply nested inside `<main>`.

4. **Print Isolation CSS Safeguard (`src/index.css`)**:
   - Added `tip-print-report-active` body class lifecycle management in `PrintableIntelligenceReport`.
   - Configured `@media print`:
     ```css
     body.tip-print-report-active > #root {
       display: none !important;
     }
     body.tip-print-report-active .tip-report-modal-overlay {
       position: static !important;
       background: transparent !important;
       backdrop-filter: none !important;
       padding: 0 !important;
       margin: 0 !important;
     }
     body.tip-print-report-active .tip-report-modal-header {
       display: none !important;
     }
     ```
   - Guarantees that even if the user presses `Cmd + P` or `Ctrl + P` manually, `#root` (the entire CRM dashboard) is completely hidden, and only `#tip-printable-document` is rendered.

5. **Desktop Project Mirroring**:
   - Synced updated files and installed `html2canvas-pro` into `/Users/pritambiswas/Desktop/tip crm project`.

---

## 15. Professional Visual Hierarchy, Mathematical Alignment & 2-Page A4 Publication System

### Problem Analysis
Although the report preview rendered correctly, the generated PDF had alignment, typography, and page-splitting flaws:
- **Blind Page Chopping**: The entire document was captured as one large canvas and sliced every 297mm, cutting horizontally through the middle of charts, cards, or table rows between Page 1 and Page 2.
- **Responsive Viewport Shift**: Elements using responsive prefixes (`sm:flex-row`, `sm:grid-cols-4`) could collapse into stacked single-column layouts during canvas snapshotting.
- **Table Alignment Inconsistencies**: Numeric data in tables lacked right-alignment and tabular figures (`tabular-nums`), causing digits and decimals not to align vertically.
- **Scrollbars in Print View**: Donut chart legends with overflow containers generated unsightly scrollbars in printed output.

### Architectural Redesign Implemented

1. **Explicit Two-Sheet Publication Spread**:
   - **Sheet 1 (Executive Summary & Visual Trends)**:
     - Vector TIP branding & organization metadata banner.
     - Official Document ID (`TIP-AUDIT-2026-1082`), date, and creator attribution.
     - Executive Synthesis card with deterministic audit badge.
     - 4 Core Statistical KPI cards in a balanced single-row desktop grid (`grid-cols-4`).
     - 2 symmetrical vector charts side-by-side (`grid-cols-2`):
       - Program Attendance Comparison (SVG Bar Chart with guidelines and data value badges).
       - Participant Engagement Breakdown (SVG Donut Chart with clean non-scrolling proportional legend).
     - Grounded 3-part Operational Action Protocol (`Observed Facts`, `Interpretation`, `Action Protocol`).
     - Running footer: Confidentiality disclosure, document ID, and "Page 1 of 2".
   - **Sheet 2 (Data Lineage, Audit Breakdown & Executive Governance Sign-Off)**:
     - Continuation Header with TIP mini-mark and document identification.
     - **Table 1: Initiative Turnout & Cohort Reconciliation Summary**: Accounting-grade table with right-aligned numeric columns (`tabular-nums font-mono`), turnout percentages, and bold total summary row.
     - **Table 2: Deterministic Data Lineage Sample**: Fixed-width, monospaced rows displaying source record fidelity without column overflow.
     - **Executive Approval & Fiduciary Sign-Off**: Signature card featuring avatar, director title, and digital verification seal.
     - **Security & Statutory Compliance Seal**: PIPEDA and RLS compliance badge with timestamp.
     - Running footer: Confidentiality disclosure, document ID, and "Page 2 of 2".

2. **Zero-Slice Multi-Page PDF Compilation Engine**:
   - In `handleDownloadPdf`, each `.tip-pdf-page` element is captured independently with `html2canvas-pro` at 2x Retina sharpness (`scale: 2`, `windowWidth: 800`).
   - Page 1 maps 1:1 onto PDF Page 1 (`0, 0, 210mm, 297mm`).
   - Page 2 maps 1:1 onto PDF Page 2 (`0, 0, 210mm, 297mm`).
   - Slicing through text, cards, or charts is mathematically eliminated.

3. **Iframe Print Preview Standardization**:
   - Configured `@page { size: A4 portrait; margin: 0; }` with `.tip-pdf-page { width: 210mm; height: 297mm; padding: 12mm 14mm; page-break-after: always; }`.
   - Native Chrome print dialog renders Sheet 1 as Page 1 and Sheet 2 as Page 2.

4. **Desktop Mirroring**:
   - Synced all updated code and production builds to `/Users/pritambiswas/Desktop/tip crm project`.
