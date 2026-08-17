# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## EXORA — Premium Exhibition Management & Secure Access Platform
### Version 4.0 — Enterprise System Specification & Architecture Reference

---

### Document Control Info
* **Project Name:** EXORA
* **Document Title:** Software Requirements Specification (SRS) & Enterprise Architecture Reference
* **Version:** 4.0 (Upgraded from SRS 3.0 / Version 1.0 + L2.0 + Updates U001–U008)
* **Date:** August 11, 2026
* **Prepared By:** Srujan S, Soham Reddy, Srusti Dayanand Kencharaddiyavar, AntiGravity Engineering Architecture Team
* **Status:** Approved / Single Source of Truth (SSOT)
* **Purpose:** This document serves as the single source of truth (SSOT) detailing the functional, non-functional, business, security, and software architecture specifications of the EXORA platform. It incorporates all system updates up to Release 4.0—including TOTP Multi-Factor Authentication, server-side device session tracking and remote revocation, resource-level exhibition-scoped access control, approval-based ticket cancellation workflows, dynamic time-based exhibition lifecycle management, and dynamic copyright branding.

---

## 1. Executive Summary

EXORA is an enterprise-grade, multi-tenant Exhibition Management and Secure Access Platform engineered to digitize, secure, and automate the operational lifecycle of public exhibitions, trade fairs, conventions, and amusement fairgrounds. 

### Real-World Issues Solved
Traditional ticketing operations are plagued by operational leakages: ticket counterfeiting, cashier cash siphoning, unauthorized ticket voiding, double-scanning (pass sharing), gate collusion, untracked attraction access, stolen session credentials, and unauthorized cross-event administrative access. EXORA eliminates these vulnerabilities by integrating cryptographically signed QR code passes, real-time client-side scanning and server-side verification, dual-entry accounting, cashier-to-gate reconciliation, TOTP multi-factor authentication, server-side session tracking with remote device revocation, resource-level exhibition scoping, and an approval-based ticket cancellation workflow.

### Operational Superiority (Release 4.0)
Unlike basic ticketing systems or legacy CRUD applications, EXORA enforces multi-layered security before processing operational queries:
1. **Cryptographic Validation:** Validates HMAC-SHA256 signatures embedded directly in QR payloads.
2. **Approval-Based Ticket Cancellation:** Counter staff cannot directly void tickets. Requests must be submitted within a 30-second post-sale window and approved by an assigned administrator. Tickets pending cancellation are immediately blocked at entry gates and rides.
3. **Exhibition Lifecycle Enforcement:** Automatically terminates ticket sales and QR scanning once an exhibition's end time passes, protecting event boundaries.
4. **TOTP Multi-Factor Authentication:** Safeguards Super Admin accounts with AES-256-GCM encrypted secrets, 2-step verification, rate limiting, and hashed single-use recovery codes.
5. **Server-Side Device & Session Management:** Tracks active user sessions in MongoDB, parses device metadata (OS, browser, IP, location label), supports immediate remote session revocation, bulk "Logout Other Devices", and enforces 10-second active background polling.
6. **Resource-Level Access Scoping:** Dynamically restricts Admin users to assigned exhibitions (`GENERAL` vs `SELECTED` access mode), ensuring complete data isolation across events.
7. **Immutable System Audits:** Captures all operations, status toggles, security violations, and administrative actions in structured audit trails.

---

## 2. Business Problem Statement

Operational leakages in high-volume public exhibitions cost event organizers up to 15–30% of top-line revenues. EXORA 4.0 systematically targets and neutralizes all leakage vectors:

### A. Counterfeit & Fake Tickets
Basic exhibition systems print sequential IDs as QR codes, enabling malicious visitors to guess IDs or duplicate QR images. EXORA requires HMAC-SHA256 signature verification on every scan payload, rendering offline-generated passes invalid.

### B. "Black Ticket" & Pass Reselling
Passes are frequently passed back across fences to admit secondary visitors. EXORA enforces single-scan ticket states and a 2-second scan suppression cooldown to ignore rapid duplicate triggers.

### C. Unauthorized Ticket Voiding & Cash Siphoning at Counters
Cashiers often void valid tickets post-sale to pocket cash while visitors enter the event. EXORA 4.0 eliminates direct cancellation. Counter staff can only request cancellation within 30 seconds of sale. Pending tickets are immediately blocked at scanner terminals until an authorized admin approves or rejects the request via a dedicated queue.

### D. Gate Guard Collusion & Unsanctioned Entry
Gate guards may admit visitors without scanning tickets. EXORA correlates tickets issued against admitted scan logs in real time, calculating cashier-to-gate discrepancies and profiling operator risk scores.

### E. Secondary Attraction Leakage (Rides & Games)
Visitors attempt to reuse entry passes at secondary rides. EXORA maintains decoupled ride collections (`ridetickets`), scopes ride operators strictly to assigned attractions, and blocks invalid ride scans (`rejected_wrong_ride`).

### F. Session Hijacking & Credential Exposure
Stolen or leaked JWT tokens traditionally remain valid until expiration. EXORA 4.0 introduces server-side session tracking in MongoDB, embedding session IDs (`sid`) in tokens. Revoking a session instantly invalidates access across all endpoints, while background client polling detects revoked sessions within 10 seconds.

### G. Cross-Event Administrative Data Exposure
In multi-event venues, administrators assigned to one exhibition should not see financial stats, staff records, or ticket lists for another event. EXORA 4.0 introduces Exhibition-Scoped Access Control (`GENERAL` mode vs `SELECTED` mode), enforcing database-level query filtering based on assigned exhibitions.

### H. Post-Event Operational Leakage
Exhibitions left active past their scheduled end time permit illegal late ticket sales or post-event gate admissions. EXORA 4.0 implements automatic time-based lifecycle checks (`isOperational()`), rejecting sales and scans as soon as an exhibition's `endDate` expires.

---

## 3. Goals and Objectives

### Primary Goals
* **Cryptographic Enclosure:** Seal QR passes with HMAC-SHA256 signatures to render forgery impossible.
* **Financial Integrity:** Eliminate direct ticket voiding by introducing a 30-second cancellation request window and approval workflow.
* **Granular Resource Isolation:** Enforce exhibition-level authorization (`Effective Access = Role + Permission + Exhibition Scope`).
* **Session Security:** Implement server-side session revocation, TOTP MFA, and real-time client sync.
* **Operational Automation:** Automatically end ticket sales and scanner validation upon exhibition expiry.

### Security & Operational Guardrails
* **Forbid Ticket Forgery:** Require HMAC-SHA256 verification on all entry and ride scan payloads.
* **Block Pending & Used Passes:** Block tickets in `pending` cancellation status or `used` state from passing gates/rides.
* **Enforce Cashier Accountability:** Track cash change calculations, record UPI references, and restrict post-sale cancellation requests to 30 seconds.
* **Enforce Operator & Scope Boundaries:** Lock ride staff to assigned rides and restrict standard Admins in `SELECTED` mode to assigned exhibitions.
* **Audit System Events:** Log all administrative changes, session revocations, lifecycle toggles, and security violations.

### Performance & Scalability Targets
* **Gate Validation Throughput:** Process gate and ride validation scans in under 200ms.
* **Database Efficiency:** Maintain cached singleton connections and index primary lookup keys (`qrHash`, `sessionId`, `exhibitionId`).
* **Client Synchronization:** Poll session status every 10 seconds without flickering UI components.

---

## 4. Stakeholders and Users

```mermaid
flowchart TD
    SuperAdmin[Super Admin] -->|Configures Global System & MFA| System[System Settings / Sessions / Staff]
    SuperAdmin -->|Assigns Exhibition Scopes| Admin[Admin Users]
    
    Admin -->|Manages Assigned Exhibitions| Exhibition[Exhibitions / Lifecycle]
    Admin -->|Reviews Requests| CancelQueue[Cancellation Requests Queue]
    Admin -->|Audits Operations| Reports[Reconciliation / Risk Profiles / Audits]
    
    Counter[Counter Staff] -->|Executes Sales| Sales[Ticket / Ride POS]
    Counter -->|Initiates within 30s| CancelReq[Cancellation Request]
    Counter -->|Prints| Ticket[Thermal Receipt QR]
    
    Gate[Gate Staff] -->|Scans| GateScan[Main Entrance Check-in]
    RideStaff[Ride Staff] -->|Scans| RideScan[Attraction Gate Check-in]
    
    Visitor[Customer] -->|Pays Cash/UPI| Ticket
    Ticket -->|Scanned By| GateScan
    Ticket -->|Scanned By| RideScan
```

### A. Super Administrator (`super_admin`)
* **Role Level:** 10 (Highest Privilege).
* **Responsibilities:** Complete system oversight, initial bootstrap setup, managing admin profiles, granting exhibition scopes, configuring global system settings, managing active device sessions, approving password resets, and auditing security alerts.
* **Security Controls:** Protected by mandatory TOTP Multi-Factor Authentication (MFA). Super Admin passwords cannot be reset via the standard reset flow, and Super Admin sessions cannot be revoked by standard admins.

### B. Exhibition Administrator (`admin`)
* **Role Level:** 5.
* **Responsibilities:** Configures assigned exhibitions, manages assigned staff, reviews and approves/rejects ticket cancellation requests, monitors fraud metrics, and manages exhibition lifecycles.
* **Access Modes:**
  * `GENERAL`: Global visibility across all system exhibitions.
  * `SELECTED`: Restricted strictly to assigned exhibition IDs (`assignedExhibitions`).
* **Permission Flags:** Controlled via fine-grained permission flags:
  * `canCreateUsers`, `canCreateAdmins`, `canManageStaff`, `canResetPasswords`, `canViewAuditLogs`, `canCreateExhibitions`, `canApproveTicketCancellation` (`canApproveEntryTicketCancellation`, `canApproveRideTicketCancellation`), `canManageExhibitions`, `canManageSessions`.
* **Restrictions:** Cannot edit password hashes directly, cannot modify Super Admin permissions, cannot revoke Super Admin sessions, and cannot view or modify data outside assigned exhibition scope.

### C. Counter Staff (`counter`)
* **Role Level:** 1.
* **Responsibilities:** Processes physical POS ticket sales (Cash/UPI/Free), prints thermal receipts, and submits ticket cancellation requests within 30 seconds post-sale.
* **Access Limits:** Restricted strictly to sales terminals and shift sales history. Cannot access admin pages, scan tickets, or execute immediate ticket voiding.

### D. Gate Staff (`gate`)
* **Role Level:** 1.
* **Responsibilities:** Scans main entrance QR passes using mobile device cameras, monitors entry validation feedback, and tracks gate check-in totals.
* **Access Limits:** Locked to gate scanner interfaces. Blocked from scanning ride tickets, making sales, or accessing administrative reports.

### E. Ride Staff (`ride`)
* **Role Level:** 1.
* **Responsibilities:** Scans ride-specific QR tickets at assigned attraction gates and toggles ride operating status (Open/Closed).
* **Access Limits:** Locked to assigned ride attractions. Cannot scan main entry tickets or scan tickets for unassigned rides.

### F. Visitor (Customer)
* **Responsibilities:** Purchases tickets at physical counters and presents thermal QR receipts at entrance gates and attraction turnstiles.

---

## 5. System Overview

EXORA 4.0 is architected as a serverless Next.js web application connected to MongoDB Atlas.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND                                      │
│                               Next.js 15 / React 19                             │
│                                                                                 │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────┐  │
│  │     UI Components     │  │    State Providers    │  │   Camera Scanner    │  │
│  │   Tailwind CSS v4     │  │ Auth / Session Sync   │  │    html5-qrcode     │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └──────────┬──────────┘  │
└──────────────┼──────────────────────────┼─────────────────────────┼─────────────┘
               │                          │                         │
               ▼                          ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   BACKEND                                       │
│                              Next.js Route Handlers                             │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                             Middleware Layer                              │  │
│  │   withAuth  │  SessionCheck  │  RoleCheck  │  ScopeCheck  │  AuditLog      │  │
│  └──────────────────────────────────────┬────────────────────────────────────┘  │
│                                         │                                       │
│  ┌──────────────────────────────────────▼────────────────────────────────────┐  │
│  │                              Service Layers                               │  │
│  │ TicketService │ RideService │ CancellationService │ SessionService │ TOTP│  │
│  └──────────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────────┼───────────────────────────────────────┘
                                          │ Database Connection Pooling
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   DATABASE                                      │
│                            MongoDB Atlas / Mongoose                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Layers:
1. **Frontend Presentation:** Styled with a premium soft light theme created by inverting Tailwind CSS v4's neutral color scale in `@theme`. Uses Google Fonts Inter and JetBrains Mono. Incorporates Framer Motion animations, thermal print styles (`@media print`), dynamic copyright footer (`Footer`), and `html5-qrcode` integration. `AuthProvider` conducts background session validity checks every 10 seconds.
2. **Middleware Security & Scope Wrapper:** `withAuth` verifies the session JWT (`exora-token`), checks the session ID (`sid`) against active MongoDB sessions in `SessionService`, re-hydrates user permissions and exhibition scope in real-time, rejects `mfa_pending` intermediate tokens, and enforces role and permission rules.
3. **Service Logic Layer:** Core business services (`TicketService`, `RideService`, `CancellationRequestService`, `SessionService`, `ExhibitionService`, `StaffService`, `FraudService`, `AuditService`) encapsulate business workflows, cryptographic signing, session validation, and database aggregations.
4. **Database Access Layer:** Uses Mongoose to connect to MongoDB Atlas with connection caching (`mongooseCache`). Clears compiled models from Mongoose's cache pool on hot-reloading to prevent serverless compilation errors.

---

## 6. Complete Feature Breakdown

### A. Authentication, Session Management & TOTP MFA
* **Password Hashing:** Uses BcryptJS to generate salted password hashes.
* **Session JWT:** Issues HTTP-only, Secure, SameSite=Strict cookie (`exora-token`) storing user ID, role, staff ID, and session ID (`sid`).
* **TOTP Multi-Factor Authentication (Super Admin):**
  * Implements RFC 6238 TOTP with ±30s drift tolerance.
  * Secret key encrypted using AES-256-GCM with `TOTP_ENCRYPTION_KEY`.
  * Generates 8 single-use recovery codes stored as SHA-256 hashes.
  * Two-Step Login: Step 1 password verification returns `mfaRequired: true` and a short-lived `mfaTicket` JWT (`type: 'mfa_pending'`, 5-min exp). Step 2 verifies the 6-digit TOTP code or recovery code before issuing `exora-token`.
* **Server-Side Device & Session Tracking:**
  * Records active sessions in `sessions` collection with parsed device metadata (OS, browser, IP, location label, last active timestamp).
  * Remote Revocation: Revoking a session instantly sets `isRevoked: true` in MongoDB and clears client cookies via `Set-Cookie` Max-Age=0.
  * Bulk Action: "Logout Other Devices" revokes all active sessions for a user except the current session.
  * Client Sync: Frontend polls session status every 10 seconds and on window focus. Revoked sessions trigger an immediate logout, toast notification, and redirect to `/login?reason=session_revoked`.

### B. Role-Based Access Control & Exhibition-Scoped Authorization
* **RBAC Hierarchy:** `super_admin` (10) > `admin` (5) > `counter` / `gate` / `ride` (1).
* **Permission Flags:** Fine-grained privileges: `canCreateUsers`, `canCreateAdmins`, `canManageStaff`, `canResetPasswords`, `canViewAuditLogs`, `canCreateExhibitions`, `canApproveTicketCancellation`, `canManageExhibitions`, `canManageSessions`.
* **Exhibition Access Scopes:**
  * `GENERAL`: Global access to all exhibitions (default for Super Admin).
  * `SELECTED`: Restricted strictly to assigned exhibition IDs (`assignedExhibitions`).
* **Real-Time Re-hydration:** Re-evaluates permissions and exhibition scope from MongoDB Atlas on every API request.
* **Super Admin Protections:** Standard admins cannot grant admin permissions, edit password hashes, request password resets for Super Admins, or revoke Super Admin sessions.

### C. Approval-Based Ticket Cancellation Workflow
* **Counter Cancellation Request Window:** Counter staff can only initiate a cancellation request within 30 seconds of ticket issuance.
* **Gate & Ride Scanner Safeguard:** Tickets with `cancellationStatus === 'pending'` are immediately blocked at entrance gates (`TicketService`) and ride turnstiles (`RideService`).
* **Admin Review Queue:** Dedicated interface at `/admin/cancellation-requests` listing pending, approved, and rejected requests with search, transaction details, and action modals.
* **Exhibition-Scoped Queue & Notifications:** Broadcast notifications and queue items are filtered so admins only see and manage requests for exhibitions within their assigned scope.

### D. Exhibition Lifecycle Management
* **Automatic Time-Based Shutdown:** Once an exhibition's `endDate` passes, `isOperational()` automatically evaluates to `false`, immediately blocking entry sales, ride ticket sales, gate scans, and ride scans.
* **Database Status Sync:** Expired exhibitions automatically transition to `status: 'completed'` in MongoDB Atlas via `autoCompleteExpiredExhibitions()`.
* **Lifecycle Actions:** Authorized admins (`canManageExhibitions`) can manually Pause, Resume, End, or Extend exhibitions via dedicated API endpoints (`/api/exhibitions/[id]/pause`, `/resume`, `/end`, `/extend`).

### E. Cryptographic Ticket Generation & QR Signing
* **Double-Pass Write Flow:**
  1. Inserts document into MongoDB to secure a unique `_id`.
  2. Generates payload string: `ticketId:exhibitionId:timestamp`.
  3. Computes HMAC-SHA256 signature using `QR_HMAC_SECRET`.
  4. Stores SHA-256 hash (`qrHash`) for fast database index lookups.

### F. Real-Time Ticket & Ride Validation Engine
* **Entry Gate Validation:** Verifies HMAC-SHA256 signature, enforces 2-second scan suppression cooldown, checks exhibition operational status, checks pending cancellation status, checks used state, and updates status to `used`.
* **Ride Attraction Validation:** Validates tickets against `ridetickets` collection, verifies operator assignment to ride, checks ride operating status (Open/Closed), and checks pending cancellation status.

### G. Counter Sales Terminal & Thermal Printing
* **POS Interface:** Select ticket tiers, register customer details (name/phone), calculate cash change, enter UPI transaction reference, and print thermal paper receipts.
* **Cancellation Request UI:** Replaces direct void button with "Request Cancellation" button featuring a 30-second live countdown timer and pending status indicator.

### H. Administrative Analytics, Fraud & Forensics
* **Scoped Intelligence:** Dashboards, sales feeds, fraud stats, risk scores, and audit logs automatically filter metrics according to the admin's exhibition access scope.
* **Console Updates:** Tickets (`/admin/tickets`) and Rides (`/admin/rides`) management consoles display "Tickets Purchased" (`quantity` / `ticketsSold`) instead of unit price.
* **Staff Risk Score Engine:** Profiles operator risk based on unpaid invoices, duplicate scans, forgery attempts, and security violations (+75 points per violation).

### I. Dynamic Copyright Branding System
* **Footer Component:** `src/components/layout/footer.tsx` dynamically computes current year (`new Date().getFullYear()`) rendering `© {currentYear} Exora. All rights reserved.`.
* **Print Exemption:** Hides footer automatically during thermal ticket printing via `@media print`.

---

## 7. Complete Workflow / Business Flow

### Normal Path: Main Entrance & Attraction Ticketing
```
[Staff Login & MFA] ──► [Exhibition Operational Check] ──► [POS Sale at Counter]
                                                                  │
                                                                  ▼
                                                          [Signed QR Generated]
                                                                  │
                                                                  ▼
[Visitor Admitted] ◄── [Gate Scan Verified] ◄── [Thermal Receipt Printed]
```

---

### Ticket Cancellation Approval Workflow Path
```
[Counter Ticket Sale] ──► [Visitor Requests Void (within 30s)] ──► [Counter Clicks Request Cancellation]
                                                                              │
                                                                              ▼
[Ticket Blocked at Gate/Ride] ◄── [cancellationStatus = 'pending'] ◄── [CancellationRequest Created]
                                                                              │
                                                                              ▼
                                                                  [Notification Sent to Scoped Admins]
                                                                              │
                                                                              ▼
                                                                  [Admin Reviews Queue at /admin/cancellation-requests]
                                                                              │
                                                       ┌──────────────────────┴──────────────────────┐
                                                       ▼                                             ▼
                                                [Admin Approves]                              [Admin Rejects]
                                                       │                                             │
                                                       ▼                                             ▼
                                              [Ticket Marked Cancelled]                     [Ticket Set Back to Valid]
```

---

### Alternate & Exception Handling Flows

1. **Invalid HMAC Signature:** Scanned payload fails HMAC verification. Access denied (`rejected_unknown`), flagged as suspected forgery in fraud dashboard.
2. **Duplicate Scan (Pass-Back Fraud):** Ticket status is `used`. Validation rejected (`rejected_used`), returning timestamp of original admission.
3. **Rapid Double-Scan Cooldown:** Rescanned within 2 seconds. System returns cached result of first scan without logging error.
4. **Pending Cancellation Ticket Scanned:** Ticket has `cancellationStatus === 'pending'`. Gate and ride scanners deny entry with message: *"Cancellation Pending Approval"*.
5. **Expired / Stopped Exhibition Scanned:** Exhibition end time passed or status is paused/completed. Validation rejected with message: *"Exhibition Not Operational"*.
6. **Wrong Exhibition / Wrong Ride Scanned:** Payload `exhibitionId` or `rideId` mismatch. Access denied (`rejected_wrong_exhibition` / `rejected_wrong_ride`).
7. **Revoked Session Attempt:** User session revoked by admin or another device. API returns HTTP 401 `SESSION_REVOKED`, client cookie destroyed, user redirected to `/login?reason=session_revoked`.
8. **Unassigned Scope Access Attempt:** Admin in `SELECTED` mode attempts to query unassigned exhibition data. Service returns HTTP 403 `FORBIDDEN_EXHIBITION_SCOPE` or empty scoped result.
9. **Super Admin Password Reset Attempt:** Standard admin attempts password reset for Super Admin. Request blocked (HTTP 403), audit log recorded as security violation, red warning flash triggered on client.

---

## 8. Page & Route Structure

### Public & Authentication Routes
* `/login` — Login screen with 2-step TOTP prompt and session revoked alerts.
* `/unauthorized` — Access denied notification page.
* `/setup` — Initial Super Admin bootstrap setup page (locks after configuration).

---

### Admin Dashboard Routes (`/admin/*`)
* `/admin` — Main executive dashboard with scoped metric cards and exhibition warnings.
* `/admin/exhibitions` — List of exhibitions with status badges and creation triggers.
* `/admin/exhibitions/[id]` — Detailed view with lifecycle controls (Pause, Resume, End, Extend).
* `/admin/cancellation-requests` — Dedicated queue for reviewing, approving, and rejecting cancellation requests.
* `/admin/tickets` — Ticket forensics listing displaying "Tickets Purchased".
* `/admin/rides` — Attraction management console displaying "Tickets Purchased".
* `/admin/staff` — Staff directory with role filters and creation modals.
* `/admin/staff/[id]/permissions` — Super Admin privilege manager with Exhibition Scope picker.
* `/admin/fraud` — Fraud analytics, security alert feeds, and forgery stats.
* `/admin/reconciliation` — Revenue reconciliation grid (Expected vs. Collected).
* `/admin/risk` — Staff risk profiling engine and timeline feeds.
* `/admin/audit-logs` — System-wide immutable audit trail viewer.
* `/admin/password-resets` — Password reset requests approval interface.
* `/admin/settings` — System settings with TOTP MFA and Active Device Sessions management tabs.

---

### Counter Staff Routes (`/counter/*`)
* `/counter` — Shift portal with sales summaries (Cash vs. UPI).
* `/counter/sell` — POS sales interface with 30s cancellation request countdown timer.
* `/counter/rides` — Ride ticket sales terminal.
* `/counter/history` — Shift sales history with pending cancellation badges.

---

### Gate & Ride Staff Routes (`/gate/*`, `/ride/*`)
* `/gate`, `/gate/scan`, `/gate/history` — Gate scanner viewfinder, stats, and check-in history.
* `/ride` — Attraction scanner viewfinder and operating status toggle (Open/Closed).

---

## 9. Database Design

```mermaid
erDiagram
    User ||--o{ Session : "owns"
    User ||--o{ Ticket : "sold-by"
    User ||--o{ CancellationRequest : "requested-by"
    User ||--o{ AuditLog : "performed-by"
    
    Exhibition ||--o{ User : "assigned-staff"
    Exhibition ||--o{ Ticket : "contains"
    Exhibition ||--o{ CancellationRequest : "scoped-to"
    Exhibition ||--o{ Ride : "hosts"
    
    Sale ||--|{ Ticket : "generates"
    Sale ||--o| CancellationRequest : "has-pending"
    Ticket ||--o{ TicketScan : "logs"
    
    Ride ||--o{ RideTicket : "hosts"
    RideTicket ||--o{ RideScan : "logs"
```

### Complete Collection Schema Specifications

#### 1. Users (`users` collection)
* `staffId` (String, Unique, Uppercase, Required): e.g. SUA-001, ADM-002, CTR-005.
* `name` (String, Required), `phoneNumber` (String, Unique, Required), `email` (String, Unique, Sparse).
* `passwordHash` (String, Required, Hidden).
* `role` (String, Required): `super_admin`, `admin`, `counter`, `gate`, `ride`.
* `permissions` (Sub-document):
  * `canCreateUsers`, `canCreateAdmins`, `canManageStaff`, `canResetPasswords`, `canViewAuditLogs`, `canCreateExhibitions`, `canApproveTicketCancellation`, `canApproveEntryTicketCancellation`, `canApproveRideTicketCancellation`, `canManageExhibitions`, `canManageSessions`.
* `exhibitionAccessMode` (String, Default: `'GENERAL'`): `'GENERAL' | 'SELECTED'`.
* `assignedExhibitions` (ObjectId Array): References `Exhibition`.
* `totpEnabled` (Boolean, Default: false), `totpSecretEncrypted` (String), `totpRecoveryCodesHashed` (Array of Strings), `totpVerifiedAt` (Date).
* `isActive` (Boolean, Default: true), `lastLoginAt` (Date), `lastLoginIp` (String).

#### 2. Device Sessions (`sessions` collection)
* `sessionId` (String, Unique, Required): UUID v4 session token.
* `userId` (ObjectId, Required): References `User`.
* `role` (String, Required), `deviceName` (String), `browserName` (String), `browserVersion` (String), `osName` (String), `osVersion` (String), `ipAddress` (String), `userAgent` (String), `locationLabel` (String).
* `createdAt` (Date, Default: Date.now), `lastSeenAt` (Date), `expiresAt` (Date, Required), `revokedAt` (Date), `revokedBy` (ObjectId), `revokeReason` (String), `isRevoked` (Boolean, Default: false).

#### 3. Cancellation Requests (`cancellationrequests` collection)
* `saleId` (ObjectId): References `Sale`.
* `rideSaleId` (ObjectId): References `RideSale`.
* `ticketIds` (ObjectId Array): References `Ticket` or `RideTicket`.
* `exhibitionId` (ObjectId, Required): References `Exhibition`.
* `type` (String, Required): `'entry' | 'ride'`.
* `requestedBy` (ObjectId, Required): References `User` (Counter Staff).
* `reason` (String, Required), `status` (String, Default: `'pending'`): `'pending' | 'approved' | 'rejected'`.
* `reviewedBy` (ObjectId): References `User` (Admin).
* `reviewedAt` (Date), `rejectionReason` (String), `requestedAt` (Date, Default: Date.now).

#### 4. Exhibitions (`exhibitions` collection)
* `name` (String, Required), `slug` (String, Unique), `venue` (String, Required).
* `startDate` (Date, Required), `endDate` (Date, Required).
* `status` (String, Default: `'draft'`): `draft`, `upcoming`, `active`, `paused`, `completed`, `closed`, `archived`.
* `completedAt` (Date), `pausedAt` (Date), `resumedAt` (Date), `managedBy` (ObjectId), `lastStatusChangeAt` (Date), `manualPauseReason` (String), `manualEndReason` (String), `manualExtendReason` (String).
* `ticketTypes` (Array of ITicketType: name, price, maxQuantity).
* `assignedStaffIds` (ObjectId Array): References `User`.

#### 5. Tickets (`tickets` collection)
* `ticketNumber` (String, Unique, Required), `exhibitionId` (ObjectId, Required).
* `qrPayload` (String, Unique, Required), `qrHash` (String, Unique, Required).
* `status` (String, Default: `'valid'`): `valid`, `used`, `cancelled`, `expired`.
* `cancellationStatus` (String, Default: null): `null | 'pending' | 'approved' | 'rejected'`.
* `scanCount` (Number, Default: 0), `soldBy` (ObjectId, Required), `usedAt` (Date), `usedBy` (ObjectId).

#### 6. Sales (`sales` collection)
* `transactionId` (String, Unique, Required), `exhibitionId` (ObjectId, Required).
* `tickets` (ObjectId Array), `ticketCount` (Number, Required), `totalAmount` (Number, Required).
* `cancellationStatus` (String, Default: null), `pendingCancellationRequestId` (ObjectId).
* `paymentMethod` (String, Required): `cash`, `upi`, `free`.

---

## 10. API Design

### Authentication & MFA Module
* `POST /api/auth/login` — Returns `mfaRequired: true` + `mfaTicket` if MFA enabled, or sets `exora-token`.
* `POST /api/auth/logout` — Revokes session in DB and clears cookie.
* `GET /api/auth/me` — Returns active session and user permissions.
* `POST /api/auth/mfa/verify` — Step 2 TOTP / recovery code verification.
* `POST /api/auth/mfa/setup`, `/enable`, `/disable`, `/regenerate-recovery-codes`, `/status` — MFA configuration endpoints.

---

### Device & Session Management Module
* `GET /api/auth/sessions` — Lists active sessions for current user.
* `POST /api/auth/sessions/revoke-others` — Bulk revokes all other active sessions.
* `POST /api/auth/sessions/[id]/revoke` — Revokes a single device session.
* `GET /api/admin/sessions` — System-wide active sessions view for Super Admins and authorized admins.

---

### Cancellation Requests Module
* `GET /api/cancellation-requests` — Lists scoped cancellation requests.
* `POST /api/cancellation-requests` — Submits cancellation request (enforces 30s limit).
* `POST /api/cancellation-requests/[id]/approve` — Approves request and voids transaction.
* `POST /api/cancellation-requests/[id]/reject` — Rejects request and unlocks tickets.

---

### Exhibition Lifecycle Module
* `POST /api/exhibitions/[id]/pause` — Manually pauses active exhibition.
* `POST /api/exhibitions/[id]/resume` — Resumes paused exhibition.
* `POST /api/exhibitions/[id]/end` — Marks exhibition as completed.
* `POST /api/exhibitions/[id]/extend` — Extends exhibition end date.

---

## 11. Authentication and Security

### Multi-Layer Security Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION & SECURITY                       │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 1: Passwords (BcryptJS) + Super Admin TOTP MFA (AES-256-GCM)     │
│ Layer 2: HTTP-Only Session Cookie + Server-Side Session Model (UUID)   │
│ Layer 3: Edge & API Auth Middleware (Instant Revocation Check)         │
│ Layer 4: Role & Permission Matrix (Strict Super Admin Protections)     │
│ Layer 5: Exhibition-Scoped Authorization (GENERAL vs SELECTED Mode)    │
│ Layer 6: Real-Time Client Session Polling (10-second sync)             │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Cookie Isolation:** Auth JWT stored in HTTP-only, Secure, SameSite=Strict cookie (`exora-token`).
2. **Server-Side Session Validation:** Every request validates `sid` against MongoDB Atlas via `SessionService.validateSession()`. Revoking a session immediately blocks all subsequent requests.
3. **Super Admin Protections:**
   * Standard admins cannot grant administrative permissions.
   * Standard admins cannot edit password hashes directly.
   * Super Admin password resets are strictly forbidden (returns 403, triggers audit log & red client flash).
   * Super Admin sessions cannot be revoked by standard admins.
4. **Exhibition-Scoped Authorization:** Evaluates effective permissions as `Role + Permission + Exhibition Scope`. Queries automatically append `{ exhibitionId: { $in: allowedIds } }`.

---

## 12. QR Code and Scanning System

### QR Payload Format
$$\text{Payload} = \text{ticketId} : \text{exhibitionId} : \text{timestamp}$$
$$\text{Signature} = \text{HMAC-SHA256}(\text{Payload}, \text{ServerSecret})$$
$$\text{Final Token} = \text{Payload} : \text{Signature}$$

### Validation Pipeline
1. **Cryptographic Check:** Re-computes HMAC signature. Returns `rejected_unknown` if invalid.
2. **Cooldown Check (2s):** Checks for identical scan payload within 2 seconds.
3. **Operational Check:** Verifies `exhibition.isOperational() === true`.
4. **Pending Cancellation Check:** Verifies `cancellationStatus !== 'pending'`.
5. **Used Check:** Verifies `status !== 'used'` (returns `rejected_used` if true).
6. **Admission:** Updates ticket state to `used` and records scan log in `ticketscans`.

---

## 13. Counter Sales System

* **Customer Details:** Captures customer name and 10-digit mobile number.
* **Payment Processing:** Handles Cash (with change calculator), UPI (with reference validation), and Free tickets.
* **Thermal Printing:** Formats receipts to fit thermal paper widths, hiding application headers and footers.
* **Approval Cancellation Window:** Direct voiding replaced by a 30-second post-sale request window with live countdown timer.

---

## 14. Ride / Game Ticketing System

* **Attraction Isolation:** Ride tickets managed in `ridetickets` collection to avoid main gate database contention.
* **Operator Scoping:** Only ride staff assigned to a specific ride can validate tickets for it.
* **Operating Status:** Operators can toggle ride status (Open/Closed). Closed rides block validation attempts (`rejected_closed`).

---

## 15. Dashboards and Analytics

* **Admin Dashboard:** Displays scoped metrics (revenue, admissions, flag counts), active exhibitions, and alerts.
* **Management Consoles:** Tickets (`/admin/tickets`) and Rides (`/admin/rides`) consoles display "Tickets Purchased".
* **Counter & Scanner Portals:** Real-time shift feeds, POS calculator, and camera viewfinders with laser sweep animations.

---

## 16. Fraud Detection & Reconciliation

1. **Revenue Reconciliation:** Compares Expected Revenue vs. Collected Revenue to flag cashier cash siphoning.
2. **Admissions Reconciliation:** Compares Admitted Scans vs. Tickets Sold to flag gate guard collusion.
3. **Staff Risk Score Engine:** Evaluates cashier unpaid invoices, scan rejections, forgery attempts, and security violations (+75 points per violation).
4. **Ticket Forensics:** Traces complete ticket lifecycle from purchase to scan logs.

---

## 17. UI / UX Design System

* **Soft Premium Theme:** Styled by inverting Tailwind CSS v4's neutral scale (`gray-950` mapped to `#f8f9fc`).
* **Brand Identity:** High-fidelity PNG logos (`/logo1.png` for sidebars/headers, `/logo2.png` for auth).
* **Dynamic Copyright Footer:** Displays `© {currentYear} Exora. All rights reserved.` across application layouts; automatically hidden during thermal printing via `@media print`.
* **Modals & Indicators:** Custom modals for TOTP setup, session revocation, cancellation approval, and lifecycle actions.

---

## 18. Non-Functional Requirements

* **Scan Validation Performance:** Validation checks complete in under 200ms.
* **Session Polling Overhead:** Background session validation executes in under 100ms.
* **Database Reliability:** Mongoose connection caching with indexed lookup queries.
* **Production Security:** HTTPS enforcement, HTTP-only cookies, AES-256-GCM secret encryption, and strict audit logging.

---

## 19. Edge Cases and Error Handling

| Edge Case | System Behavior | Response / Outcome |
| :--- | :--- | :--- |
| **Corrupt / Forged QR** | HMAC signature check fails | Scan rejected (`rejected_unknown`), logged as forgery alert |
| **Pending Cancellation Scan** | Ticket has `cancellationStatus === 'pending'` | Gate/ride scan rejected with message: *"Cancellation Pending Approval"* |
| **Expired Exhibition Scan** | Current time > `endDate` | Gate/ride scan rejected with message: *"Exhibition Not Operational"* |
| **Revoked Session Access** | `sid` marked `isRevoked: true` | HTTP 401 `SESSION_REVOKED`, cookie destroyed, redirected to `/login?reason=session_revoked` |
| **Unassigned Scope Access** | Admin accesses unassigned exhibition | HTTP 403 `FORBIDDEN_EXHIBITION_SCOPE` or empty scoped result |
| **Super Admin Reset Attempt** | Admin requests reset for Super Admin | HTTP 403 Forbidden, audit log security violation, red client flash |

---

## 20. Deployment & Production Notes

### Required Environment Variables
```bash
# Server Configuration
NODE_ENV=production
JWT_SECRET=production_jwt_signing_key_secret

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/exora

# Security & Secrets
QR_HMAC_SECRET=production_qr_payload_signing_secret
BOOTSTRAP_SECRET=production_bootstrap_setup_secret_key
ALLOW_BOOTSTRAP_OVERRIDE=false
TOTP_ENCRYPTION_KEY=32_byte_hex_string_for_aes_256_gcm

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=10 # Max requests per window
```

### Production Setup Requirements
1. **Database Indexes:** Verify primary indexes (`qrHash`, `sessionId`, `exhibitionId`, `scannedBy`, `phoneNumber`, `cancellationStatus`) exist in MongoDB Atlas.
2. **Seed Initial Super Admin:** Navigate to `/setup` using `BOOTSTRAP_SECRET`.
3. **Configure Thermal Printers:** Set print margins to minimum and hide headers/footers in browser print dialogs.
4. **Enforce HTTPS:** Required for HTTP-only cookies and camera stream access.

---

## 21. Future Extensions

* **Online Ticket Portal:** Visitor pre-purchasing with email QR delivery.
* **SMS / WhatsApp Receipts:** Auto-sending transaction receipts and QR links via messaging APIs.
* **Integrated POS Terminals:** Credit/debit card swipe reader integration.
* **Offline Service Worker Sync:** Offline scanning capabilities for temporary network dropouts.

---

## 22. Conclusion

**EXORA 4.0** represents a complete, production-ready enterprise exhibition management system. By seamlessly combining cryptographic QR validation, approval-based ticket cancellation workflows, dynamic time-based exhibition lifecycle controls, TOTP multi-factor security, server-side session tracking with remote revocation, and exhibition-scoped resource authorization, EXORA protects event revenues, enforces operational transparency, and guarantees bulletproof security across physical event venues.
