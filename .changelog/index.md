# Exora Engineering Changelog Index

Master index of all completed engineering updates for the **Exora** platform.

---

## 📜 Updates

| ID | Date | Update Title | Status | Summary |
| :--- | :--- | :--- | :--- | :--- |
| **[U001](./updates/u001-changelog.md)** | 2026-07-30 | Engineering Changelog System | Deployed | Established repository-level engineering memory and update logging framework. |
| **[U002](./updates/u002-cancellation-approval-workflow.md)** | 2026-08-06 | Approval-Based Ticket Cancellation Workflow | Implemented | Replaced immediate counter cancellation with approval workflow, 30s limit, gate safeguards, and admin queue. |
| **[U003](./updates/u003-exhibition-lifecycle-management.md)** | 2026-08-06 | Exhibition Lifecycle Management & Permission System | Implemented | Auto-stops sales/scans past end time, added canManageExhibitions permission & pause/resume/end/extend controls. |
| **[U004](./updates/u004-copyright-footer.md)** | 2026-08-06 | Dynamic Copyright Footer Integration | Implemented | Integrated dynamic copyright footer across application layouts using existing design system tokens. |
| **[U005](./updates/u005-mfa-security.md)** | 2026-08-07 | Super Admin TOTP Multi-Factor Authentication | Implemented | Added TOTP MFA for Super Admins with AES-256-GCM encrypted secrets, recovery codes, 2-step login, rate limiting, and audit logging. |
| **[U006](./updates/u006-device-session-management.md)** | 2026-08-08 | Device & Session Management System | Implemented | Added server-side session tracking in MongoDB, session revocation, "Logout Other Devices", device metadata parsing, and Super Admin session controls. |
| **[U007](./updates/u007-exhibition-scoped-admin-access.md)** | 2026-08-10 | Exhibition-Scoped Access Control for Admin Users | Implemented | Resource-level authorization: Role + Permission + Exhibition Scope with DB as source of truth, Super Admin UI, and query scoping. |
| **[U008](./updates/u008-exhibition-scoped-cancellation-notifications.md)** | 2026-08-10 | Exhibition-Scoped Cancellation Notifications & Column Updates | Implemented | Scoped cancellation request notifications & queue to assigned admins, and replaced Price with Tickets Purchased in admin tickets/rides menus. |
| **[U009](./updates/u009-srs-4.0-specification.md)** | 2026-08-11 | Software Requirements Specification (SRS) 4.0 | Completed | Upgraded and consolidated SRS reference document to version 4.0 incorporating updates U001 through U008. |
| **[U010](./updates/u010-security-idor-scope-hardening.md)** | 2026-09-17 | Security IDOR Remediation & Counter Sale Scope Hardening | Implemented | Remediated cross-exhibition authorization bypass on /api/exhibitions/[id] routes and restored Super Admin sales scoping. |
| **[U011](./updates/u011-exhibition-location-system.md)** | 2026-09-24 | Exhibition Venue & Location System (Step 1) | Implemented | Added backward-compatible venue and address structure, Zod validation, and Create/Edit UI workflows. |
| **[U012](./updates/u012-location-map-infrastructure.md)** | 2026-09-24 | Location Geocoding & Map Infrastructure (Step 2) | Implemented | Added Google Maps Platform geocoding service, stale coordinate protection, caching, and reusable ExoraMap component. |
| **[U013](./updates/u013-super-admin-exhibition-map-overview.md)** | 2026-09-24 | Super Admin Exhibition Map Overview (Step 3) | Implemented | Unified control plane with two-column overview, bidirectional card-map sync, 3-state location badges, and isolated map errors. |


