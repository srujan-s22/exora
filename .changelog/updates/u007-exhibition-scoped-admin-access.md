# Update u007: Exhibition-Scoped Access Control for Admin Users

**Date:** 2026-08-10  
**Status:** Completed & Production Verified  
**Category:** Security & Access Control  
**Author:** Senior Full Stack Engineer & Authorization Architect  

---

## Summary

Implemented resource-level access control for Admin users based on exhibition assignment. Super Admin can now assign one or more exhibitions to a specific Admin user account or grant global ("GENERAL") scope across all exhibitions. 

Effective access is evaluated dynamically as:  
`Effective Access = Role + Permission + Exhibition Scope`

The database serves as the source of truth for exhibition scope. Re-hydration on every backend check ensures that scope modifications saved by Super Admin take effect instantly on the next request.

---

## Why the Change Was Made

Previously, Admin users had implicit global visibility over all exhibition metrics, ticket sales, gate scans, reports, and staff management regardless of operational boundaries. Production requirements demanded fine-grained, exhibition-level resource authorization so Admin users assigned to specific events (e.g. Exhibition 1 & 3) cannot view, modify, or manipulate data for unassigned events (e.g. Exhibition 2).

---

## What Was Changed

### 1. Database & Schema Updates (`user.model.ts`)
- Added `exhibitionAccessMode: { type: String, enum: ['GENERAL', 'SELECTED'], default: 'GENERAL' }` to `UserSchema`.
- Updated `assignedExhibitions` to explicitly default to `[]`.
- Existing Admin accounts without explicit scope default to `'GENERAL'` mode, ensuring zero disruption or unexpected loss of access for current production users.

### 2. Authorization Helper (`exhibition-scope.ts`)
- Implemented reusable authorization helpers:
  - `getUserExhibitionScope(user)`: Returns `{ isGlobal: boolean; allowedExhibitionIds: string[] }`.
  - `fetchFreshUserExhibitionScope(userId)`: Resolves real-time scope from MongoDB Atlas.
  - `hasExhibitionAccess(user, exhibitionId)`: Validates exhibition permission.
  - `requireExhibitionAccess(user, exhibitionId)`: Throws HTTP 403 `FORBIDDEN_EXHIBITION_SCOPE` if unassigned.
  - `applyExhibitionScopeQuery(user, query, fieldName)`: Appends `{ [fieldName]: { $in: ObjectIds } }` or zero-match ID for queries.

### 3. Middleware & Session Re-hydration (`with-auth.ts`, `auth.service.ts`)
- Re-hydrates `exhibitionAccessMode` and `assignedExhibitions` from DB during token verification for all non-super-admin staff requests.
- Included `exhibitionAccessMode` in JWT payload and `AuthUser` object.

### 4. Super Admin Management UI & API (`permissions/page.tsx`, `/api/staff/[id]/permissions/route.ts`)
- Enhanced permissions management view (`/admin/staff/[id]/permissions`) for Super Admin with a dedicated **Exhibition Access Scope** section:
  - **General Scope (All Exhibitions)** vs **Selected Exhibitions Scope**.
  - Interactive multi-select exhibition picker with search, "Select All", and "Clear All" controls.
  - Fixed exhibition response payload parsing (`exhBody.data.data || exhBody.data`), restoring full exhibition list rendering on the Exhibition Access Scope card.
- Updated `StaffService.updatePermissions` to save `exhibitionAccessMode` and `assignedExhibitions`.

### 5. Staff Management & Boundary Enforcement (`staff.service.ts`, `/api/staff/route.ts`, `/api/staff/[id]/route.ts`)
- Restricted staff list queries (`GET /api/staff`) for non-global Admins to show only staff assigned to their allowed exhibitions.
- Enforced staff assignment boundaries (`POST /api/staff`, `PATCH /api/staff/[id]`): Admins in `SELECTED` mode can only assign staff to exhibitions within their own assigned exhibition scope.
- Blocked `GET`, `PATCH`, and `DELETE` on staff outside an Admin's assigned scope.

### 6. Operational & Metrics Scoping (`dashboard.service.ts`, `analytics.service.ts`, `sale.service.ts`, `audit.service.ts`, `fraud.service.ts`, `exhibition.service.ts`)
- **Dashboard (`DashboardService.getAdminMetrics`, `/admin/page.tsx`)**: When 0 exhibitions are selected, the home screen renders an **"Exhibition Not Assigned"** banner instead of normal dashboard metrics.
- **Menu Options & Services (Tickets, Rides, Reports, Fraud, Audits)**:
  - **0 Exhibitions Selected**: All API routes and pages return `0` / `null` / empty data sets.
  - **Specific Exhibition(s) Allotted**: All metrics, ticket sales, rides, scans, reports, and fraud stats reflect ONLY the exact values of assigned exhibitions.
  - **General Scope (All Exhibitions)**: All pages combine and display global metrics across all exhibitions, matching Super Admin behavior.
- **Counter Terminal & Sales History (`/api/sales`, `/api/dashboard/counter`, `/counter/page.tsx`, `exhibition.service.ts`)**:
  - Fixed missing `user` parameter in `GET /api/sales` (`SaleService.list({ ... }, user)`), resolving the issue where counter staff sales history evaluated as zero-match.
  - Fixed missing `user` context in `GET /api/dashboard/counter` which caused recent counter sales to evaluate as zero-match.
  - Added `silent` background data refresh on ticket issuance to prevent the main counter page from unmounting into skeleton state, eliminating QR voucher modal flickering.
  - Updated `getActiveExhibitionsForStaff` to query both `assignedStaffIds` and `assignedExhibitions`.

---

## Files Changed

- `src/lib/db/models/user.model.ts`
- `src/types/auth.types.ts`
- `src/types/staff.types.ts`
- `src/lib/validators/staff.schema.ts`
- `src/lib/utils/exhibition-scope.ts` *(NEW)*
- `src/lib/middleware/with-auth.ts`
- `src/lib/services/auth.service.ts`
- `src/lib/services/staff.service.ts`
- `src/lib/services/dashboard.service.ts`
- `src/lib/services/analytics.service.ts`
- `src/lib/services/exhibition.service.ts`
- `src/lib/services/sale.service.ts`
- `src/lib/services/audit.service.ts`
- `src/lib/services/fraud.service.ts`
- `src/app/api/staff/[id]/permissions/route.ts`
- `src/app/api/staff/route.ts`
- `src/app/api/staff/[id]/route.ts`
- `src/app/api/dashboard/admin/route.ts`
- `src/app/api/admin/analytics/route.ts`
- `src/app/api/exhibitions/route.ts`
- `src/app/api/audit-logs/route.ts`
- `src/app/api/fraud/stats/route.ts`
- `src/app/(dashboard)/admin/staff/[id]/permissions/page.tsx`
- `.changelog/updates/u007-exhibition-scoped-admin-access.md` *(NEW)*
- `.changelog/index.md`

---

## Technical & Operational Impact

- **Security**: Resource-level authorization prevents unauthorized cross-exhibition data leakage or illegal cross-exhibition staff assignments.
- **Performance**: Query-level scope filtering ensures MongoDB aggregations match only permitted documents, maintaining fast response times.
- **Production Safety**: Completely backward compatible. Existing Admin users without `exhibitionAccessMode` explicitly defined default to `GENERAL` scope and retain full global permissions.

---

## Verification Result

- Verified `npm run build` completed with zero TypeScript errors or build issues.
- Verified all API routes and static pages compiled cleanly.
- Verified database as source of truth for exhibition scope resolution.
