# Graph Report - Exora  (2026-09-17)

## Corpus Check
- 256 files · ~275,211 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1409 nodes · 4088 edges · 93 communities (76 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `30a6c95b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- EXORA_SRS_4.0.md
- roles.ts
- Agents.md
- card.tsx
- constants.ts
- useToast
- verify/route.ts
- errorResponse
- ticket.schema.ts
- connection.ts
- seed.ts
- button.tsx
- ride.service.ts
- topbar.tsx
- password-resets/page.tsx
- exhibition-lifecycle.schema.ts
- admin/staff/[id]/page.tsx
- compilerOptions
- .changelog/README.md
- fraud.service.ts
- CardContent
- admin/tickets/[id]/page.tsx
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
- exhibition.service.ts
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
- password-reset.types.ts
- tabs.tsx
- index.md
- next.config.ts
- unauthorized/page.tsx
- not-found.tsx
- avatar.tsx
- radio.tsx
- tooltip.tsx
- eslint.config.mjs
- html5-qrcode
- with-auth.ts
- react-dom
- recharts
- zod
- @tailwindcss/postcss
- postcss.config.mjs
- exhibitions/[id]/page.tsx
- ticket.service.ts
- rides/sales/[id]/cancel/route.ts
- exhibition.schema.ts
- staff.schema.ts
- Q: What is the authentication path?
- password-reset-request.model.ts
- health/route.ts
- notification.model.ts
- device-parser.ts
- bootstrap.schema.ts
- react

## God Nodes (most connected - your core abstractions)
1. `errorResponse()` - 151 edges
2. `successResponse()` - 128 edges
3. `connectToDatabase()` - 87 edges
4. `safeErrorMessage()` - 87 edges
5. `useToast()` - 82 edges
6. `logger` - 70 edges
7. `useAuth()` - 59 edges
8. `AUTH_COOKIE_NAME` - 53 edges
9. `AuthService` - 50 edges
10. `Button` - 44 edges

## Surprising Connections (you probably didn't know these)
- `createAdmin()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/create-admin.ts → src/lib/db/connection.ts
- `createUser()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/create-user.ts → src/lib/db/connection.ts
- `migrate()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/migrate-super-admins.ts → src/lib/db/connection.ts
- `resetPassword()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/reset-password.ts → src/lib/db/connection.ts
- `seed()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/seed.ts → src/lib/db/connection.ts

## Import Cycles
- None detected.

## Communities (93 total, 17 thin omitted)

### Community 0 - "EXORA_SRS_4.0.md"
Cohesion: 0.02
Nodes (91): 10. API Design, 11. Authentication and Security, 12. QR Code and Scanning System, 13. Counter Sales System, 14. Ride / Game Ticketing System, 15. Dashboards and Analytics, 16. Fraud Detection & Reconciliation, 17. UI / UX Design System (+83 more)

### Community 1 - "roles.ts"
Cohesion: 0.09
Nodes (34): AuthContextValue, COUNTER_PERMISSION_PRESETS, CounterPreset, NavItem, NavSection, ALL_ROLES, CREATABLE_ROLES, DEFAULT_COUNTER_PERMISSIONS (+26 more)

### Community 2 - "Agents.md"
Cohesion: 0.04
Nodes (56): Admin and Staff Management, API Design, Application Structure Overview, Approval-Based Cancellation Workflow, Audit Logs, Authentication, Authentication and Access, Authorization (+48 more)

### Community 3 - "card.tsx"
Cohesion: 0.19
Nodes (24): BroadcastLog, AdminDashboardPage(), TabType, ActiveTab, ContentWrapper(), ContentWrapperProps, PageHeader(), PageHeaderProps (+16 more)

### Community 4 - "constants.ts"
Cohesion: 0.19
Nodes (15): RouteContext, AuthService, ExhibitionService, FraudService, RideService, SaleService, TicketService, APP_DESCRIPTION (+7 more)

### Community 5 - "useToast"
Cohesion: 0.06
Nodes (42): LoginFormContent(), AnalyticsDashboardPage(), AuditLogsPage(), CancellationRequestsPage(), EditExhibitionPage(), ExhibitionDetailPage(), NewExhibitionPage(), AdminExhibitionsPage() (+34 more)

### Community 6 - "verify/route.ts"
Cohesion: 0.11
Nodes (37): RFC-4226, RFC-4648, RFC-6238, POST, POST, POST, POST, POST (+29 more)

### Community 7 - "errorResponse"
Cohesion: 0.06
Nodes (78): GET(), GET(), POST(), GET, GET(), PATCH(), GET(), POST (+70 more)

### Community 8 - "ticket.schema.ts"
Cohesion: 0.29
Nodes (6): AdminCreateTicketInput, adminCreateTicketSchema, CreateTicketInput, createTicketSchema, ValidateTicketInput, validateTicketSchema

### Community 9 - "connection.ts"
Cohesion: 0.13
Nodes (19): createAdmin(), createUser(), resetPassword(), RouteContext, updateProfileSchema, RouteContext, validateEnv(), SUPER_ADMIN_PERMISSIONS (+11 more)

### Community 10 - "seed.ts"
Cohesion: 0.13
Nodes (18): seed(), Exhibition, ExhibitionSchema, ExhibitionSettingsSchema, IExhibition, IExhibitionSettings, TicketTypeSchema, ITicket (+10 more)

### Community 11 - "button.tsx"
Cohesion: 0.14
Nodes (17): BootstrapSetupPage(), CancelTransactionButtonProps, EmptyStateProps, ErrorStateProps, PaymentBadge(), DEFAULT_PRINT, QRDisplay(), QRDisplayProps (+9 more)

### Community 12 - "ride.service.ts"
Cohesion: 0.11
Nodes (25): PaymentBadgeProps, IRide, Ride, RideSchema, IRideScan, RideScan, RideScanSchema, createRideQrPayload() (+17 more)

### Community 13 - "topbar.tsx"
Cohesion: 0.10
Nodes (18): metadata, DashboardLayout(), BreadcrumbItem, Breadcrumbs(), Footer(), MobileNav(), Sidebar(), AppNotification (+10 more)

### Community 14 - "password-resets/page.tsx"
Cohesion: 0.11
Nodes (23): CancellationRequestItem, statusIcon, statusVariant, formatDate(), roleVariant, StaffManagementPage(), AdminTicketsPage(), formatDate() (+15 more)

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
Cohesion: 0.18
Nodes (14): AuditLog, AuditLogSchema, IAuditLog, AUDIT_ACTIONS, AUDIT_TARGET_TYPES, ExhibitionRiskProfile, FraudOverview, ReconciliationRow (+6 more)

### Community 20 - "CardContent"
Cohesion: 0.10
Nodes (26): StaffOption, StaffOption, AdminRidesEditPage(), AdminRidesNewPage(), AdminRidesPage(), AdminCreateTicketsPage(), formatPrice(), GeneratedResult (+18 more)

### Community 21 - "admin/tickets/[id]/page.tsx"
Cohesion: 0.28
Nodes (5): AdminTicketDetailPage(), formatDate(), formatPrice(), statusIcon, statusVariant

### Community 22 - "u001-changelog.md"
Cohesion: 0.08
Nodes (24): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, 🚀 Deployment, Server-Side Device & Session Management, Exhibition Lifecycle Management (+16 more)

### Community 23 - "connectToDatabase"
Cohesion: 0.14
Nodes (20): migrate(), GET(), PATCH(), GET(), POST(), connectToDatabase(), getMongoUri(), AnalyticsService (+12 more)

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
Cohesion: 0.10
Nodes (21): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @types/bcryptjs, @types/jsonwebtoken (+13 more)

### Community 32 - "README.md"
Cohesion: 0.10
Nodes (20): 1. Installation, 2. Environment Configuration, 3. Database Seeding & Setup, 4. Running Development Server, 📊 Analytics & Fraud Monitoring, Application Settings, 📜 Available Scripts, Database (+12 more)

### Community 33 - "cancellation-request.schema.ts"
Cohesion: 0.29
Nodes (6): CreateCancellationRequestInput, createCancellationRequestSchema, ListCancellationRequestsInput, listCancellationRequestsSchema, RejectCancellationRequestInput, rejectCancellationRequestSchema

### Community 34 - "dependencies"
Cohesion: 0.11
Nodes (19): bcryptjs, framer-motion, jsonwebtoken, lucide-react, next, dependencies, bcryptjs, framer-motion (+11 more)

### Community 35 - "password-reset.schema.ts"
Cohesion: 0.29
Nodes (6): CreatePasswordResetInput, createPasswordResetSchema, PasswordResetActionInput, passwordResetActionSchema, PasswordResetCompleteInput, passwordResetCompleteSchema

### Community 36 - "exhibition.service.ts"
Cohesion: 0.22
Nodes (10): ISale, Sale, SaleSchema, ApiErrorResponse, ApiResponse, ApiSuccessResponse, PaginatedResponse, PaginationMeta (+2 more)

### Community 37 - "api-error.ts"
Cohesion: 0.17
Nodes (7): AppError, AuthenticationError, ConflictError, ForbiddenError, NotFoundError, RateLimitError, ValidationError

### Community 38 - "u008-exhibition-scoped-cancellation-notifications.md"
Cohesion: 0.13
Nodes (14): Approval-Based Cancellation Workflow, Cashier to Gate Reconciliation, Server-Side Device & Session Management, Exhibition Lifecycle Management, Exhibition-Scoped Access Control, 🛠️ Files Changed, HMAC-SHA256 QR Validation, Immutable System Audit Logging (+6 more)

### Community 39 - "cancellation-request.service.ts"
Cohesion: 0.15
Nodes (13): ensureIndexes(), CancellationRequest, CancellationRequestSchema, ICancellationRequest, IRideSale, RideSale, RideSaleSchema, IRideTicket (+5 more)

### Community 40 - "ride.schema.ts"
Cohesion: 0.22
Nodes (8): CreateRideInput, createRideSchema, CreateRideTicketInput, createRideTicketSchema, UpdateRideInput, updateRideSchema, ValidateRideTicketInput, validateRideTicketSchema

### Community 41 - "package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

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

### Community 48 - "password-reset.types.ts"
Cohesion: 0.40
Nodes (4): CreatePasswordResetInput, PasswordResetActionInput, PasswordResetRequest, PasswordResetStatus

### Community 49 - "tabs.tsx"
Cohesion: 0.50
Nodes (3): TabOption, Tabs(), TabsProps

### Community 59 - "with-auth.ts"
Cohesion: 0.15
Nodes (14): POST(), resolvePermissions(), ISession, Session, SessionSchema, AuthenticatedHandler, AuthenticatedRequest, withAuth() (+6 more)

### Community 81 - "exhibitions/[id]/page.tsx"
Cohesion: 0.18
Nodes (8): ExhibitionStats, StaffCardProps, ICON_MAP, StatCard(), StatCardProps, StatusIndicator(), StatusIndicatorProps, TicketCardProps

### Community 82 - "ticket.service.ts"
Cohesion: 0.22
Nodes (11): ScanResultCardProps, ScanResult, TicketStatus, generateRandomCode(), generateTicketNumber(), generateTransactionId(), CreateTicketInput, Ticket (+3 more)

### Community 83 - "rides/sales/[id]/cancel/route.ts"
Cohesion: 0.23
Nodes (7): printConfigSchema, updateSettingsSchema, DEFAULT_PRINT_CONFIG, ISystemSettings, PrintConfigSchema, SystemSettings, SystemSettingsSchema

### Community 84 - "exhibition.schema.ts"
Cohesion: 0.25
Nodes (7): EXHIBITION_STATUSES, CreateExhibitionInput, createExhibitionSchema, exhibitionSettingsSchema, ticketTypeSchema, UpdateExhibitionInput, updateExhibitionSchema

### Community 85 - "staff.schema.ts"
Cohesion: 0.29
Nodes (6): CreateStaffInput, createStaffSchema, UpdatePermissionsInput, updatePermissionsSchema, UpdateStaffInput, updateStaffSchema

### Community 86 - "Q: What is the authentication path?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: What is the authentication path?, Source Nodes

### Community 87 - "password-reset-request.model.ts"
Cohesion: 0.40
Nodes (4): IPasswordResetRequest, PasswordResetRequest, PasswordResetRequestSchema, PasswordResetStatusType

### Community 88 - "health/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), isDatabaseHealthy()

### Community 89 - "notification.model.ts"
Cohesion: 0.50
Nodes (3): INotification, Notification, NotificationSchema

### Community 90 - "device-parser.ts"
Cohesion: 0.50
Nodes (3): getLocationLabel(), ParsedDeviceInfo, parseUserAgent()

## Knowledge Gaps
- **633 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+628 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `useToast` to `card.tsx`, `button.tsx`, `topbar.tsx`, `password-resets/page.tsx`, `admin/staff/[id]/page.tsx`, `exhibitions/[id]/page.tsx`, `CardContent`, `admin/tickets/[id]/page.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `connectToDatabase()` connect `connectToDatabase` to `roles.ts`, `constants.ts`, `exhibition.service.ts`, `verify/route.ts`, `errorResponse`, `cancellation-request.service.ts`, `connection.ts`, `seed.ts`, `ride.service.ts`, `ticket.service.ts`, `rides/sales/[id]/cancel/route.ts`, `fraud.service.ts`, `health/route.ts`, `with-auth.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `errorResponse()` connect `errorResponse` to `constants.ts`, `verify/route.ts`, `connection.ts`, `rides/sales/[id]/cancel/route.ts`, `connectToDatabase`, `with-auth.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _633 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `EXORA_SRS_4.0.md` be split into smaller, more focused modules?**
  _Cohesion score 0.021739130434782608 - nodes in this community are weakly interconnected._
- **Should `roles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08859357696567 - nodes in this community are weakly interconnected._
- **Should `Agents.md` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._