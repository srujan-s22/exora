# Graph Report - Exora  (2026-08-17)

## Corpus Check
- 266 files · ~275,101 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1404 nodes · 4084 edges · 81 communities (65 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- TOTP MFA Security Engine
- Device Session Management
- TOTP MFA Security Engine
- Cancellation Approval Workflow
- Authentication & Setup Flow
- Authentication & Setup Flow
- TOTP MFA Security Engine
- Device Session Management
- TOTP MFA Security Engine
- Authentication & Setup Flow
- Gate Entry & QR Scanner
- Exhibition Lifecycle & Scope
- Ride Management & Ticketing
- Notification Broadcast Engine
- Ride Management & Ticketing
- Cancellation Approval Workflow
- Ride Management & Ticketing
- dom Core
- Changelog & Update History (18)
- Gate Entry & QR Scanner
- Authentication & Setup Flow
- Ride Management & Ticketing
- TOTP MFA Security Engine
- Exhibition Lifecycle & Scope
- TOTP MFA Security Engine
- TOTP MFA Security Engine
- TOTP MFA Security Engine
- TOTP MFA Security Engine
- TOTP MFA Security Engine
- TOTP MFA Security Engine
- TOTP MFA Security Engine
- eslint Core
- Ticket Sales & POS Terminal
- Cancellation Approval Workflow
- Analytics & Admin Dashboard
- route.ts Core
- password-reset-request.model.t
- api-error.ts Core
- TOTP MFA Security Engine
- Cancellation Approval Workflow
- Ride Management & Ticketing
- UI Component Module 41
- UI Component Module 42
- DEFAULT_PAGE_SIZE Core
- Staff Roles & Permissions
- UI Component Module 45
- date.ts Core
- password-reset.types.ts Core
- UI Component Module 49
- Changelog & Update History (50)
- next.config.ts Core
- page.tsx Core
- not-found.tsx Core
- UI Component Module 54
- UI Component Module 55
- UI Component Module 56
- eslint.config.mjs Core
- html5-qrcode Core
- mongoose Core
- react-dom Core
- recharts Core
- zod Core
- @tailwindcss/postcss Core
- postcss.config.mjs Core

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
- `migrate()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/migrate-super-admins.ts → src/lib/db/connection.ts
- `seed()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/seed.ts → src/lib/db/connection.ts
- `seed()` --calls--> `hashPassword()`  [EXTRACTED]
  scripts/seed.ts → src/lib/utils/crypto.ts
- `createAdmin()` --calls--> `connectToDatabase()`  [EXTRACTED]
  scripts/create-admin.ts → src/lib/db/connection.ts
- `createAdmin()` --calls--> `hashPassword()`  [EXTRACTED]
  scripts/create-admin.ts → src/lib/utils/crypto.ts

## Import Cycles
- None detected.

## Communities (81 total, 16 thin omitted)

### Community 0 - "TOTP MFA Security Engine"
Cohesion: 0.02
Nodes (91): 10. API Design, 11. Authentication and Security, 12. QR Code and Scanning System, 13. Counter Sales System, 14. Ride / Game Ticketing System, 15. Dashboards and Analytics, 16. Fraud Detection & Reconciliation, 17. UI / UX Design System (+83 more)

### Community 1 - "Device Session Management"
Cohesion: 0.07
Nodes (45): AuthContextValue, COUNTER_PERMISSION_PRESETS, CounterPreset, ALL_ROLES, CREATABLE_ROLES, DEFAULT_COUNTER_PERMISSIONS, Permission, PERMISSIONS (+37 more)

### Community 2 - "TOTP MFA Security Engine"
Cohesion: 0.04
Nodes (56): Admin and Staff Management, API Design, Application Structure Overview, Approval-Based Cancellation Workflow, Audit Logs, Authentication, Authentication and Access, Authorization (+48 more)

### Community 3 - "Cancellation Approval Workflow"
Cohesion: 0.16
Nodes (26): CancellationRequestItem, TabType, ContentWrapper(), ContentWrapperProps, PageHeader(), PageHeaderProps, ActivityFeed(), ActivityFeedProps (+18 more)

### Community 4 - "Authentication & Setup Flow"
Cohesion: 0.18
Nodes (17): DEFAULT_PRINT_CONFIG, ISystemSettings, PrintConfigSchema, SystemSettings, SystemSettingsSchema, AuthenticatedHandler, AuthService, CancellationRequestService (+9 more)

### Community 5 - "Authentication & Setup Flow"
Cohesion: 0.06
Nodes (35): LoginFormContent(), BootstrapSetupPage(), AnalyticsDashboardPage(), AuditLogsPage(), CancellationRequestsPage(), EditExhibitionPage(), NewExhibitionPage(), FraudDashboardPage() (+27 more)

### Community 6 - "TOTP MFA Security Engine"
Cohesion: 0.11
Nodes (37): RFC-4226, RFC-4648, RFC-6238, POST, POST, POST, POST, POST (+29 more)

### Community 7 - "Device Session Management"
Cohesion: 0.08
Nodes (39): GET(), GET(), POST(), GET, GET(), PATCH(), printConfigSchema, updateSettingsSchema (+31 more)

### Community 8 - "TOTP MFA Security Engine"
Cohesion: 0.08
Nodes (34): GET(), POST, GET, POST, dynamic, GET(), GET(), POST() (+26 more)

### Community 9 - "Authentication & Setup Flow"
Cohesion: 0.09
Nodes (24): createAdmin(), createUser(), migrate(), resetPassword(), dynamic, GET(), PATCH(), updateProfileSchema (+16 more)

### Community 10 - "Gate Entry & QR Scanner"
Cohesion: 0.13
Nodes (25): seed(), ensureIndexes(), Exhibition, ExhibitionSchema, ExhibitionSettingsSchema, IExhibition, IExhibitionSettings, TicketTypeSchema (+17 more)

### Community 11 - "Exhibition Lifecycle & Scope"
Cohesion: 0.10
Nodes (21): AdminExhibitionsPage(), formatDate(), roleVariant, StaffManagementPage(), AdminTicketsPage(), formatDate(), statusVariant, EmptyStateProps (+13 more)

### Community 12 - "Ride Management & Ticketing"
Cohesion: 0.10
Nodes (27): IRide, Ride, RideSchema, IRideScan, RideScan, RideScanSchema, createRideQrPayload(), parseRideQrPayload() (+19 more)

### Community 13 - "Notification Broadcast Engine"
Cohesion: 0.09
Nodes (20): metadata, DashboardLayout(), BreadcrumbItem, Breadcrumbs(), Footer(), MobileNav(), Sidebar(), AppNotification (+12 more)

### Community 14 - "Ride Management & Ticketing"
Cohesion: 0.16
Nodes (19): BroadcastLog, statusIcon, statusVariant, AuthContext, ToastContext, StatCard(), StatusIndicator(), DataTable() (+11 more)

### Community 15 - "Cancellation Approval Workflow"
Cohesion: 0.10
Nodes (25): POST(), POST(), POST(), POST(), POST(), POST(), DELETE(), GET() (+17 more)

### Community 16 - "Ride Management & Ticketing"
Cohesion: 0.09
Nodes (19): AuditLogEntry, formatAuditAction(), formatDate(), roleVariant, StaffDetail, StaffDetailPage(), ADMIN_PERMISSION_ITEMS, COUNTER_ENTRY_ITEMS (+11 more)

### Community 17 - "dom Core"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 18 - "Changelog & Update History (18)"
Cohesion: 0.07
Nodes (27): 🔌 API Changes, 💼 Business Impact, 🗄️ Database Changes, 🚀 Deployment, ❌ Do NOT Log These Changes:, Examples:, Exora Engineering Changelog System, 📂 Files Changed (+19 more)

### Community 19 - "Gate Entry & QR Scanner"
Cohesion: 0.12
Nodes (23): PaymentBadgeProps, ScanResultCardProps, AuditLog, AuditLogSchema, IAuditLog, AUDIT_ACTIONS, AUDIT_TARGET_TYPES, PaymentMethod (+15 more)

### Community 20 - "Authentication & Setup Flow"
Cohesion: 0.19
Nodes (14): StaffOption, StaffOption, AdminCreateTicketsPage(), formatPrice(), GeneratedResult, CardDescription, Checkbox, CheckboxProps (+6 more)

### Community 21 - "Ride Management & Ticketing"
Cohesion: 0.11
Nodes (17): ExhibitionDetailPage(), ExhibitionStats, ActiveTab, SettingsPage(), AdminTicketDetailPage(), formatDate(), formatPrice(), statusIcon (+9 more)

### Community 22 - "TOTP MFA Security Engine"
Cohesion: 0.08
Nodes (24): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, 🚀 Deployment, Server-Side Device & Session Management, Exhibition Lifecycle Management (+16 more)

### Community 23 - "Exhibition Lifecycle & Scope"
Cohesion: 0.16
Nodes (20): PATCH(), RouteContext, GET(), POST(), AnalyticsService, timingSafeStringEqual(), applyExhibitionScopeQuery(), ExhibitionScope (+12 more)

### Community 24 - "TOTP MFA Security Engine"
Cohesion: 0.08
Nodes (23): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, 🚀 Deployment, Server-Side Device & Session Management, Exhibition Lifecycle Management (+15 more)

### Community 25 - "TOTP MFA Security Engine"
Cohesion: 0.08
Nodes (23): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, 🚀 Deployment, Server-Side Device & Session Management, Exhibition Lifecycle Management (+15 more)

### Community 26 - "TOTP MFA Security Engine"
Cohesion: 0.09
Nodes (22): 1. Database & Schema Updates (`user.model.ts`), 2. Authorization Helper (`exhibition-scope.ts`), 3. Middleware & Session Re-hydration (`with-auth.ts`, `auth.service.ts`), 4. Super Admin Management UI & API (`permissions/page.tsx`, `/api/staff/[id]/permissions/route.ts`), 5. Staff Management & Boundary Enforcement (`staff.service.ts`, `/api/staff/route.ts`, `/api/staff/[id]/route.ts`), 6. Operational & Metrics Scoping (`dashboard.service.ts`, `analytics.service.ts`, `sale.service.ts`, `audit.service.ts`, `fraud.service.ts`, `exhibition.service.ts`), Approval-Based Cancellation Workflow, Cashier to Gate Reconciliation (+14 more)

### Community 27 - "TOTP MFA Security Engine"
Cohesion: 0.09
Nodes (22): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, Server-Side Device & Session Management, Exhibition Lifecycle Management, Exhibition-Scoped Access Control (+14 more)

### Community 28 - "TOTP MFA Security Engine"
Cohesion: 0.09
Nodes (21): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, Server-Side Device & Session Management, Exhibition Lifecycle Management, Exhibition-Scoped Access Control (+13 more)

### Community 29 - "TOTP MFA Security Engine"
Cohesion: 0.09
Nodes (21): 1. MongoDB Session Model & Database Schema, 2. Device Parsing Utility, 3. Session Service & Performance Throttling, 4. Auth & Middleware Integration, 5. API Endpoints, 6. User Interface & Staff Permissions Management, Approval-Based Cancellation Workflow, Cashier to Gate Reconciliation (+13 more)

### Community 30 - "TOTP MFA Security Engine"
Cohesion: 0.10
Nodes (20): 🔌 API Changes, Approval-Based Cancellation Workflow, 💼 Business Impact, Cashier to Gate Reconciliation, 🗄️ Database Changes, Server-Side Device & Session Management, Exhibition Lifecycle Management, Exhibition-Scoped Access Control (+12 more)

### Community 31 - "eslint Core"
Cohesion: 0.10
Nodes (21): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @types/bcryptjs, @types/jsonwebtoken (+13 more)

### Community 32 - "Ticket Sales & POS Terminal"
Cohesion: 0.10
Nodes (20): 1. Installation, 2. Environment Configuration, 3. Database Seeding & Setup, 4. Running Development Server, 📊 Analytics & Fraud Monitoring, Application Settings, 📜 Available Scripts, Database (+12 more)

### Community 33 - "Cancellation Approval Workflow"
Cohesion: 0.16
Nodes (14): GET(), POST(), POST(), GET(), POST(), POST(), RideService, hasCounterPermission() (+6 more)

### Community 34 - "Analytics & Admin Dashboard"
Cohesion: 0.11
Nodes (19): bcryptjs, framer-motion, jsonwebtoken, lucide-react, next, dependencies, bcryptjs, framer-motion (+11 more)

### Community 35 - "route.ts Core"
Cohesion: 0.17
Nodes (13): GET(), PATCH(), RouteContext, GET(), POST, PasswordResetService, paginatedResponse(), CreatePasswordResetInput (+5 more)

### Community 36 - "password-reset-request.model.t"
Cohesion: 0.17
Nodes (12): IPasswordResetRequest, PasswordResetRequest, PasswordResetRequestSchema, PasswordResetStatusType, generateRandomToken(), ApiErrorResponse, ApiResponse, ApiSuccessResponse (+4 more)

### Community 37 - "api-error.ts Core"
Cohesion: 0.17
Nodes (7): AppError, AuthenticationError, ConflictError, ForbiddenError, NotFoundError, RateLimitError, ValidationError

### Community 38 - "TOTP MFA Security Engine"
Cohesion: 0.13
Nodes (14): Approval-Based Cancellation Workflow, Cashier to Gate Reconciliation, Server-Side Device & Session Management, Exhibition Lifecycle Management, Exhibition-Scoped Access Control, 🛠️ Files Changed, HMAC-SHA256 QR Validation, Immutable System Audit Logging (+6 more)

### Community 39 - "Cancellation Approval Workflow"
Cohesion: 0.17
Nodes (11): CancellationRequest, CancellationRequestSchema, ICancellationRequest, IRideSale, RideSale, RideSaleSchema, IRideTicket, RideTicket (+3 more)

### Community 40 - "Ride Management & Ticketing"
Cohesion: 0.20
Nodes (9): GET(), POST, CreateRideInput, createRideSchema, CreateRideTicketInput, createRideTicketSchema, UpdateRideInput, ValidateRideTicketInput (+1 more)

### Community 41 - "UI Component Module 41"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 42 - "UI Component Module 42"
Cohesion: 0.29
Nodes (5): inter, jetbrainsMono, metadata, ThemeProvider(), ToastProvider()

### Community 43 - "DEFAULT_PAGE_SIZE Core"
Cohesion: 0.25
Nodes (7): DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, DateRangeInput, dateRangeSchema, objectIdSchema, PaginationInput, paginationSchema

### Community 44 - "Staff Roles & Permissions"
Cohesion: 0.36
Nodes (7): config, decodeJwtPayload(), getDashboardPath(), proxy(), ROUTE_ROLE_MAP, SECURITY_HEADERS, withSecurityHeaders()

### Community 45 - "UI Component Module 45"
Cohesion: 0.38
Nodes (5): ToastContextValue, ToastContainer(), ToastContainerProps, ToastProps, ToastData

### Community 48 - "password-reset.types.ts Core"
Cohesion: 0.40
Nodes (4): CreatePasswordResetInput, PasswordResetActionInput, PasswordResetRequest, PasswordResetStatus

### Community 49 - "UI Component Module 49"
Cohesion: 0.50
Nodes (3): TabOption, Tabs(), TabsProps

## Knowledge Gaps
- **630 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+625 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Authentication & Setup Flow` to `Cancellation Approval Workflow`, `Exhibition Lifecycle & Scope`, `Notification Broadcast Engine`, `Ride Management & Ticketing`, `Ride Management & Ticketing`, `Authentication & Setup Flow`, `Ride Management & Ticketing`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `connectToDatabase()` connect `Authentication & Setup Flow` to `Device Session Management`, `Cancellation Approval Workflow`, `route.ts Core`, `Authentication & Setup Flow`, `password-reset-request.model.t`, `TOTP MFA Security Engine`, `Device Session Management`, `TOTP MFA Security Engine`, `Cancellation Approval Workflow`, `Gate Entry & QR Scanner`, `Ride Management & Ticketing`, `Gate Entry & QR Scanner`, `Exhibition Lifecycle & Scope`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `errorResponse()` connect `Device Session Management` to `Device Session Management`, `Cancellation Approval Workflow`, `route.ts Core`, `Authentication & Setup Flow`, `TOTP MFA Security Engine`, `TOTP MFA Security Engine`, `Authentication & Setup Flow`, `Ride Management & Ticketing`, `Cancellation Approval Workflow`, `Exhibition Lifecycle & Scope`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _630 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TOTP MFA Security Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.021739130434782608 - nodes in this community are weakly interconnected._
- **Should `Device Session Management` be split into smaller, more focused modules?**
  _Cohesion score 0.06586538461538462 - nodes in this community are weakly interconnected._
- **Should `TOTP MFA Security Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._