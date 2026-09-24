# Graph Report - Exora  (2026-09-24)

## Corpus Check
- 272 files · ~292,418 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1558 nodes · 4327 edges · 100 communities (82 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8340d081`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- EXORA_SRS_4.0.md
- roles.ts
- Agents.md
- toast-provider.tsx
- constants.ts
- useToast
- connection.ts
- errorResponse
- ticket.schema.ts
- crypto.ts
- exhibition-scope.ts
- button.tsx
- ride.service.ts
- topbar.tsx
- password-resets/page.tsx
- exhibition-lifecycle.schema.ts
- admin/staff/[id]/page.tsx
- compilerOptions
- .changelog/README.md
- fraud.service.ts
- exhibitions/[id]/edit/page.tsx
- super-admin-exhibition-overview.tsx
- u001-changelog.md
- connectToDatabase
- u004-copyright-footer.md
- u005-mfa-security.md
- u007-exhibition-scoped-admin-access.md
- u009-srs-4.0-specification.md
- u002-cancellation-approval-workflow.md
- u006-device-session-management.md
- u003-exhibition-lifecycle-management.md
- devDependencies
- README.md
- cancellation-request.schema.ts
- dependencies
- password-reset.schema.ts
- api.types.ts
- api-error.ts
- u008-exhibition-scoped-cancellation-notifications.md
- cancellation-request.service.ts
- ride.schema.ts
- package.json
- app/layout.tsx
- common.schema.ts
- proxy.ts
- toast.tsx
- date.ts
- U017: Leaflet + OpenStreetMap & Photon Complete Location Infrastructure Migration
- tabs.tsx
- index.md
- next.config.ts
- unauthorized/page.tsx
- not-found.tsx
- avatar.tsx
- radio.tsx
- tooltip.tsx
- eslint.config.mjs
- U014: Google Places Exhibition Location Picker
- exhibition.model.ts
- U015: Content Security Policy (CSP) Google Maps & Places Compatibility
- U016: Google Places Flow Diagnostics, Error Transparency & Location Sync Fix
- U018: Super Admin Only Centralized Dashboard Map Visibility
- U010: Security IDOR Remediation & Counter Sale Scope Hardening
- postcss.config.mjs
- spinner.tsx
- ticket.service.ts
- U011: Exhibition Venue & Location System (Step 1)
- location-search.service.ts
- staff.schema.ts
- Q: What is the authentication path?
- U012: Location Geocoding & Map Infrastructure (Step 2)
- health/route.ts
- U013: Super Admin Exhibition Map Overview (Step 3)
- device-parser.ts
- bootstrap.schema.ts
- bootstrap/setup/route.ts
- jsonwebtoken
- next
- leaflet
- mongoose
- @vercel/speed-insights
- @types/react

## God Nodes (most connected - your core abstractions)
1. `errorResponse()` - 153 edges
2. `successResponse()` - 130 edges
3. `connectToDatabase()` - 87 edges
4. `safeErrorMessage()` - 87 edges
5. `useToast()` - 82 edges
6. `logger` - 75 edges
7. `useAuth()` - 63 edges
8. `AUTH_COOKIE_NAME` - 54 edges
9. `AuthService` - 51 edges
10. `Button` - 45 edges

## Surprising Connections (you probably didn't know these)
- `migrate()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/migrate-super-admins.ts → src/lib/db/connection.ts
- `createAdmin()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/create-admin.ts → src/lib/db/connection.ts
- `createUser()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/create-user.ts → src/lib/db/connection.ts
- `resetPassword()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/reset-password.ts → src/lib/db/connection.ts
- `seed()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/seed.ts → src/lib/db/connection.ts

## Import Cycles
- None detected.

## Communities (100 total, 18 thin omitted)

### Community 0 - "EXORA_SRS_4.0.md"
Cohesion: 0.02
Nodes (91): 10. API Design, 11. Authentication and Security, 12. QR Code and Scanning System, 13. Counter Sales System, 14. Ride / Game Ticketing System, 15. Dashboards and Analytics, 16. Fraud Detection & Reconciliation, 17. UI / UX Design System (+83 more)

### Community 1 - "roles.ts"
Cohesion: 0.07
Nodes (39): migrate(), AuthContextValue, COUNTER_PERMISSION_PRESETS, CounterPreset, ALL_ROLES, CREATABLE_ROLES, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_COUNTER_PERMISSIONS (+31 more)

### Community 2 - "Agents.md"
Cohesion: 0.04
Nodes (56): Admin and Staff Management, API Design, Application Structure Overview, Approval-Based Cancellation Workflow, Audit Logs, Authentication, Authentication and Access, Authorization (+48 more)

### Community 3 - "toast-provider.tsx"
Cohesion: 0.14
Nodes (28): CancellationRequestItem, ExhibitionStats, TabType, ActiveTab, GeneratedResult, ContentWrapper(), ContentWrapperProps, ToastContext (+20 more)

### Community 4 - "constants.ts"
Cohesion: 0.17
Nodes (19): checkRateLimit(), GET(), rateLimitMap, DEFAULT_PRINT_CONFIG, RouteContext, AuthService, ExhibitionService, FraudService (+11 more)

### Community 5 - "useToast"
Cohesion: 0.05
Nodes (41): LoginFormContent(), AnalyticsDashboardPage(), AuditLogsPage(), CancellationRequestsPage(), EditExhibitionPage(), ExhibitionDetailPage(), NewExhibitionPage(), AdminExhibitionsPage() (+33 more)

### Community 6 - "connection.ts"
Cohesion: 0.07
Nodes (54): RFC-4226, RFC-4648, RFC-6238, POST(), POST, POST, POST, POST (+46 more)

### Community 7 - "errorResponse"
Cohesion: 0.07
Nodes (77): GET(), GET(), POST(), GET, GET(), PATCH(), GET(), POST (+69 more)

### Community 8 - "ticket.schema.ts"
Cohesion: 0.29
Nodes (6): AdminCreateTicketInput, adminCreateTicketSchema, CreateTicketInput, createTicketSchema, ValidateTicketInput, validateTicketSchema

### Community 9 - "crypto.ts"
Cohesion: 0.21
Nodes (11): createAdmin(), createUser(), resetPassword(), seed(), Exhibition, BCRYPT_SALT_ROUNDS, generateRandomCode(), generateTicketNumber() (+3 more)

### Community 10 - "exhibition-scope.ts"
Cohesion: 0.15
Nodes (16): ISale, Sale, SaleSchema, ITicketScan, TicketScan, TicketScanSchema, AnalyticsQueryOptions, AnalyticsService (+8 more)

### Community 11 - "button.tsx"
Cohesion: 0.10
Nodes (16): AdminTicketDetailPage(), formatDate(), formatPrice(), statusIcon, statusVariant, EmptyStateProps, ErrorStateProps, DEFAULT_PRINT (+8 more)

### Community 12 - "ride.service.ts"
Cohesion: 0.12
Nodes (23): IRide, Ride, RideSchema, IRideScan, RideScan, RideScanSchema, createRideQrPayload(), parseRideQrPayload() (+15 more)

### Community 13 - "topbar.tsx"
Cohesion: 0.09
Nodes (20): metadata, DashboardLayout(), BreadcrumbItem, Breadcrumbs(), Footer(), MobileNav(), Sidebar(), AppNotification (+12 more)

### Community 14 - "password-resets/page.tsx"
Cohesion: 0.09
Nodes (23): formatDate(), PasswordResetsPage(), statusIcon, statusVariant, formatDate(), roleVariant, StaffManagementPage(), AdminTicketsPage() (+15 more)

### Community 15 - "exhibition-lifecycle.schema.ts"
Cohesion: 0.22
Nodes (8): EndExhibitionInput, endExhibitionSchema, ExtendExhibitionInput, extendExhibitionSchema, PauseExhibitionInput, pauseExhibitionSchema, ResumeExhibitionInput, resumeExhibitionSchema

### Community 16 - "admin/staff/[id]/page.tsx"
Cohesion: 0.28
Nodes (6): AuditLogEntry, formatAuditAction(), formatDate(), roleVariant, StaffDetail, StaffDetailPage()

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 18 - ".changelog/README.md"
Cohesion: 0.07
Nodes (27): 🔌 API Changes, 💼 Business Impact, 🗄️ Database Changes, 🚀 Deployment, ❌ Do NOT Log These Changes:, Examples:, Exora Engineering Changelog System, 📂 Files Changed (+19 more)

### Community 19 - "fraud.service.ts"
Cohesion: 0.20
Nodes (13): AuditLog, AuditLogSchema, IAuditLog, AUDIT_ACTIONS, AUDIT_TARGET_TYPES, ExhibitionRiskProfile, FraudOverview, ReconciliationRow (+5 more)

### Community 20 - "exhibitions/[id]/edit/page.tsx"
Cohesion: 0.11
Nodes (20): BootstrapSetupPage(), StaffOption, StaffOption, AdminRidesNewPage(), ExhibitionCard(), ExhibitionLocationPicker(), SelectedExhibitionLocation, StatusIndicatorProps (+12 more)

### Community 21 - "super-admin-exhibition-overview.tsx"
Cohesion: 0.15
Nodes (13): ErrorBoundaryProps, ErrorBoundaryState, ExhibitionOverviewItem, getLocationState(), isValidCoordinate(), MapErrorBoundary, SuperAdminExhibitionOverview(), SuperAdminExhibitionOverviewProps (+5 more)

### Community 22 - "u001-changelog.md"
Cohesion: 0.08
Nodes (24): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, 🚀 Deployment, Server-Side Device & Session Management, Exhibition Lifecycle Management (+16 more)

### Community 23 - "connectToDatabase"
Cohesion: 0.12
Nodes (21): printConfigSchema, updateSettingsSchema, RouteContext, GET(), PATCH(), updateProfileSchema, POST(), POST() (+13 more)

### Community 24 - "u004-copyright-footer.md"
Cohesion: 0.08
Nodes (23): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, 🚀 Deployment, Server-Side Device & Session Management, Exhibition Lifecycle Management (+15 more)

### Community 25 - "u005-mfa-security.md"
Cohesion: 0.08
Nodes (23): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, 🚀 Deployment, Server-Side Device & Session Management, Exhibition Lifecycle Management (+15 more)

### Community 26 - "u007-exhibition-scoped-admin-access.md"
Cohesion: 0.09
Nodes (22): 1. Database & Schema Updates (`user.model.ts`), 2. Authorization Helper (`exhibition-scope.ts`), 3. Middleware & Session Re-hydration (`with-auth.ts`, `auth.service.ts`), 4. Super Admin Management UI & API (`permissions/page.tsx`, `/api/staff/[id]/permissions/route.ts`), 5. Staff Management & Boundary Enforcement (`staff.service.ts`, `/api/staff/route.ts`, `/api/staff/[id]/route.ts`), 6. Operational & Metrics Scoping (`dashboard.service.ts`, `analytics.service.ts`, `sale.service.ts`, `audit.service.ts`, `fraud.service.ts`, `exhibition.service.ts`), Approval-Based Cancellation Workflow, Cashier to Gate Reconciliation (+14 more)

### Community 27 - "u009-srs-4.0-specification.md"
Cohesion: 0.09
Nodes (22): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, Server-Side Device & Session Management, Exhibition Lifecycle Management, Exhibition-Scoped Access Control (+14 more)

### Community 28 - "u002-cancellation-approval-workflow.md"
Cohesion: 0.09
Nodes (21): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, Server-Side Device & Session Management, Exhibition Lifecycle Management, Exhibition-Scoped Access Control (+13 more)

### Community 29 - "u006-device-session-management.md"
Cohesion: 0.09
Nodes (21): 1. MongoDB Session Model & Database Schema, 2. Device Parsing Utility, 3. Session Service & Performance Throttling, 4. Auth & Middleware Integration, 5. API Endpoints, 6. User Interface & Staff Permissions Management, Approval-Based Cancellation Workflow, Cashier to Gate Reconciliation (+13 more)

### Community 30 - "u003-exhibition-lifecycle-management.md"
Cohesion: 0.10
Nodes (20): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, Server-Side Device & Session Management, Exhibition Lifecycle Management, Exhibition-Scoped Access Control (+12 more)

### Community 31 - "devDependencies"
Cohesion: 0.09
Nodes (23): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/bcryptjs (+15 more)

### Community 32 - "README.md"
Cohesion: 0.10
Nodes (20): 1. Installation, 2. Environment Configuration, 3. Database Seeding & Setup, 4. Running Development Server, 📊 Analytics & Fraud Monitoring, Application Settings, 📜 Available Scripts, Database (+12 more)

### Community 33 - "cancellation-request.schema.ts"
Cohesion: 0.29
Nodes (6): CreateCancellationRequestInput, createCancellationRequestSchema, ListCancellationRequestsInput, listCancellationRequestsSchema, RejectCancellationRequestInput, rejectCancellationRequestSchema

### Community 34 - "dependencies"
Cohesion: 0.10
Nodes (21): bcryptjs, framer-motion, html5-qrcode, lucide-react, dependencies, bcryptjs, framer-motion, html5-qrcode (+13 more)

### Community 35 - "password-reset.schema.ts"
Cohesion: 0.29
Nodes (6): CreatePasswordResetInput, createPasswordResetSchema, PasswordResetActionInput, passwordResetActionSchema, PasswordResetCompleteInput, passwordResetCompleteSchema

### Community 36 - "api.types.ts"
Cohesion: 0.12
Nodes (16): IPasswordResetRequest, PasswordResetRequest, PasswordResetRequestSchema, PasswordResetStatusType, PasswordResetService, generateRandomToken(), ApiErrorResponse, ApiResponse (+8 more)

### Community 37 - "api-error.ts"
Cohesion: 0.17
Nodes (7): AppError, AuthenticationError, ConflictError, ForbiddenError, NotFoundError, RateLimitError, ValidationError

### Community 38 - "u008-exhibition-scoped-cancellation-notifications.md"
Cohesion: 0.13
Nodes (14): Approval-Based Cancellation Workflow, Cashier to Gate Reconciliation, Server-Side Device & Session Management, Exhibition Lifecycle Management, Exhibition-Scoped Access Control, 🛠️ Files Changed, HMAC-SHA256 QR Validation, Immutable System Audit Logging (+6 more)

### Community 39 - "cancellation-request.service.ts"
Cohesion: 0.10
Nodes (20): ensureIndexes(), CancellationRequest, CancellationRequestSchema, ICancellationRequest, IRideSale, RideSale, RideSaleSchema, IRideTicket (+12 more)

### Community 40 - "ride.schema.ts"
Cohesion: 0.22
Nodes (8): CreateRideInput, createRideSchema, CreateRideTicketInput, createRideTicketSchema, UpdateRideInput, updateRideSchema, ValidateRideTicketInput, validateRideTicketSchema

### Community 41 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, test (+1 more)

### Community 42 - "app/layout.tsx"
Cohesion: 0.29
Nodes (5): inter, jetbrainsMono, metadata, ThemeProvider(), ToastProvider()

### Community 43 - "common.schema.ts"
Cohesion: 0.25
Nodes (7): DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, DateRangeInput, dateRangeSchema, objectIdSchema, PaginationInput, paginationSchema

### Community 44 - "proxy.ts"
Cohesion: 0.36
Nodes (7): config, decodeJwtPayload(), getDashboardPath(), proxy(), ROUTE_ROLE_MAP, SECURITY_HEADERS, withSecurityHeaders()

### Community 45 - "toast.tsx"
Cohesion: 0.38
Nodes (5): ToastContextValue, ToastContainer(), ToastContainerProps, ToastProps, ToastData

### Community 48 - "U017: Leaflet + OpenStreetMap & Photon Complete Location Infrastructure Migration"
Cohesion: 0.13
Nodes (14): 1. 38-Point Automated Test Suite (`npm test`):, 1. Summary, 2. Code Quality & Linting (`npm run lint`):, 2. Why the Change Was Made, 3. Files Created, Modified, and Deleted, 3. Production Build (`npm run build`):, 4. End-to-End Workflow Verification:, 4. Technical Architecture (+6 more)

### Community 49 - "tabs.tsx"
Cohesion: 0.50
Nodes (3): TabOption, Tabs(), TabsProps

### Community 58 - "U014: Google Places Exhibition Location Picker"
Cohesion: 0.15
Nodes (12): 1. Google Places Autocomplete & Session Cost Control, 2. Typed Text vs Confirmed Place Selection, 3. Server Authority & Fallback Strategy, 4. Legacy Exhibitions & Backward Compatibility, Deployment Status, Files Changed, Rollback Notes, Short Summary (+4 more)

### Community 59 - "exhibition.model.ts"
Cohesion: 0.20
Nodes (9): ExhibitionCardProps, ExhibitionLocationSchema, ExhibitionSchema, ExhibitionSettingsSchema, IExhibition, IExhibitionLocation, IExhibitionSettings, ITicketType (+1 more)

### Community 60 - "U015: Content Security Policy (CSP) Google Maps & Places Compatibility"
Cohesion: 0.22
Nodes (8): Deployment Status, Files Changed, Rollback Notes, Short Summary, Technical Impact & Security Posture, U015: Content Security Policy (CSP) Google Maps & Places Compatibility, Verification Result, Why the Change Was Made

### Community 61 - "U016: Google Places Flow Diagnostics, Error Transparency & Location Sync Fix"
Cohesion: 0.22
Nodes (8): Deployment Status, Files Changed, Metadata, Short Summary, Technical Analysis & Root Cause Findings, U016: Google Places Flow Diagnostics, Error Transparency & Location Sync Fix, Verification Result, Why the Change Was Made

### Community 62 - "U018: Super Admin Only Centralized Dashboard Map Visibility"
Cohesion: 0.22
Nodes (8): 1. Executive Summary, 2. Why the Change Was Made, 3. Architecture & Enforcement, 4. Files Changed, 5. Verification & Results, 6. Rollback Notes, Dual-Layer Protection, U018: Super Admin Only Centralized Dashboard Map Visibility

### Community 63 - "U010: Security IDOR Remediation & Counter Sale Scope Hardening"
Cohesion: 0.25
Nodes (7): Files Changed, Rollback Notes, Short Summary, Technical Impact, U010: Security IDOR Remediation & Counter Sale Scope Hardening, Verification Result, Why the Change Was Made

### Community 81 - "spinner.tsx"
Cohesion: 0.18
Nodes (19): BroadcastLog, CancelTransactionButtonProps, PageHeader(), PageHeaderProps, AuthContext, PaymentBadge(), QRDisplay(), StatCard() (+11 more)

### Community 82 - "ticket.service.ts"
Cohesion: 0.30
Nodes (10): PaymentBadgeProps, ScanResultCardProps, PaymentMethod, ScanResult, TicketStatus, CreateTicketInput, Ticket, TicketScan (+2 more)

### Community 83 - "U011: Exhibition Venue & Location System (Step 1)"
Cohesion: 0.25
Nodes (7): Files Changed, Rollback Notes, Short Summary, Technical Impact, U011: Exhibition Venue & Location System (Step 1), Verification Result, Why the Change Was Made

### Community 84 - "location-search.service.ts"
Cohesion: 0.09
Nodes (25): assert(), runTests(), GeocodeResult, GeocodingService, cleanString(), deduplicateResults(), GeocodeLocationInput, LocationSearchOptions (+17 more)

### Community 85 - "staff.schema.ts"
Cohesion: 0.29
Nodes (6): CreateStaffInput, createStaffSchema, UpdatePermissionsInput, updatePermissionsSchema, UpdateStaffInput, updateStaffSchema

### Community 86 - "Q: What is the authentication path?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: What is the authentication path?, Source Nodes

### Community 87 - "U012: Location Geocoding & Map Infrastructure (Step 2)"
Cohesion: 0.25
Nodes (7): Files Changed, Rollback Notes, Short Summary, Technical Impact, U012: Location Geocoding & Map Infrastructure (Step 2), Verification Result, Why the Change Was Made

### Community 88 - "health/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), isDatabaseHealthy()

### Community 89 - "U013: Super Admin Exhibition Map Overview (Step 3)"
Cohesion: 0.25
Nodes (7): Files Changed, Rollback Notes, Short Summary, Technical & Security Impact, U013: Super Admin Exhibition Map Overview (Step 3), Verification Result, Why the Change Was Made

### Community 90 - "device-parser.ts"
Cohesion: 0.50
Nodes (3): getLocationLabel(), ParsedDeviceInfo, parseUserAgent()

## Knowledge Gaps
- **717 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+712 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `constants.ts` to `roles.ts`, `toast-provider.tsx`, `connection.ts`, `cancellation-request.service.ts`, `ride.service.ts`, `location-search.service.ts`, `super-admin-exhibition-overview.tsx`, `connectToDatabase`, `bootstrap/setup/route.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `toast-provider.tsx`, `button.tsx`, `topbar.tsx`, `password-resets/page.tsx`, `admin/staff/[id]/page.tsx`, `spinner.tsx`, `exhibitions/[id]/edit/page.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `connectToDatabase()` connect `connectToDatabase` to `roles.ts`, `constants.ts`, `api.types.ts`, `connection.ts`, `errorResponse`, `cancellation-request.service.ts`, `crypto.ts`, `exhibition-scope.ts`, `ride.service.ts`, `ticket.service.ts`, `fraud.service.ts`, `health/route.ts`, `bootstrap/setup/route.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _717 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `EXORA_SRS_4.0.md` be split into smaller, more focused modules?**
  _Cohesion score 0.021739130434782608 - nodes in this community are weakly interconnected._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07164404223227752 - nodes in this community are weakly interconnected._
- **Should `Agents.md` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._