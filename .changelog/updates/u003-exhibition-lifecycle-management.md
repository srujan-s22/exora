# U003 — Exhibition Lifecycle Management & Permission System

- **Date**: 2026-08-06
- **Status**: Implemented & Verified
- **Author**: Senior Full Stack Next.js Engineer, RBAC Architect, & Production Safety Specialist

## 📝 Summary
Implemented an automatic exhibition lifecycle system that terminates operational capabilities (entry ticket sales, ride ticket sales, gate scanning, and ride scanning) once an exhibition's end time passes. Added a dedicated admin permission `canManageExhibitions` to control manual lifecycle management actions (pause, resume, end now, extend end date).

## 🎯 Why
Previously, exhibitions remained operational indefinitely even after their end time passed, allowing unauthorized ticket sales and scanner validation after an event closed. Introducing an automatic time-based lifecycle and RBAC-controlled manual status transitions ensures operational integrity, financial control, and strict compliance with event boundaries.

## 💼 Business Impact
- **Automatic Operational Shutdown**: Ticket sales and QR scanning at entry gates and rides are automatically rejected once `endDate` passes.
- **Granular Permission Control**: Non-super-admin users require the `canManageExhibitions` permission to execute lifecycle interventions.
- **Auditability**: Every manual pause, resume, end, or extension action generates structured audit logs and broadcasts real-time notifications to system administrators.

## ⚙️ Technical Impact
- Extended Mongoose `Exhibition` model with lifecycle tracking fields (`completedAt`, `pausedAt`, `resumedAt`, `managedBy`, `lastStatusChangeAt`, `lastStatusChangeBy`, `manualPauseReason`, `manualEndReason`, `manualExtendReason`).
- Added permission key `canManageExhibitions` across `roles.ts`, `user.model.ts`, `staff.schema.ts`, and `permission-helpers.ts`.
- Created `exhibition-lifecycle.schema.ts` for Zod validation of lifecycle action payloads.
- Added dynamic status resolution `ExhibitionService.getEffectiveStatus()` and operational check `ExhibitionService.isOperational()`:
  - Added `autoCompleteExpiredExhibitions()` background & synchronous DB sync on queries (`findById`, `findBySlug`, `list`, `getActiveExhibitions`).
  - Ensures expired exhibitions automatically transition to `status: 'completed'` in MongoDB and API responses immediately upon end time expiry.
  - Enforced in `POST /api/sales` (entry ticket sales)
  - Enforced in `RideService.createTickets` (ride ticket sales)
  - Enforced in `TicketService.validateTicketScan` (gate scanner)
  - Enforced in `RideService.validateRideScan` (ride scanner)
  - Enforced in `getActiveExhibitions` queries.
- Protected `PATCH /api/exhibitions/[id]` (editing setup) and `DELETE /api/exhibitions/[id]` (archiving) with `canManageExhibitions` permission check on both backend and frontend.
- Implemented lifecycle methods `pauseExhibition`, `resumeExhibition`, `endExhibition`, `extendExhibition` with audit logging and admin notifications.
- Created API route handlers under `/api/exhibitions/[id]/pause`, `/resume`, `/end`, and `/extend`.
- Updated Admin UI (`/admin/exhibitions/[id]`) with lifecycle action controls, modals, and status cards.
- Updated Staff Permissions UI (`/admin/staff/[id]/permissions`) with the "Manage Exhibition Lifecycle" permission item.

## 📂 Files Changed
- `src/lib/db/models/exhibition.model.ts` [MODIFY] — Extended `IExhibition` and `ExhibitionSchema` with lifecycle tracking fields.
- `src/lib/utils/constants.ts` [MODIFY] — Registered audit actions `exhibition.pause`, `exhibition.resume`, `exhibition.end`, `exhibition.extend`.
- `src/lib/config/roles.ts` [MODIFY] — Added `canManageExhibitions` to permission keys and role default maps.
- `src/lib/db/models/user.model.ts` [MODIFY] — Added `canManageExhibitions` to `IUserPermissions` and schema defaults.
- `src/lib/validators/staff.schema.ts` [MODIFY] — Added `canManageExhibitions` to staff Zod validators.
- `src/lib/utils/permission-helpers.ts` [MODIFY] — Updated `hasAdminPermission` and `hasCounterPermission` for null safety.
- `src/lib/validators/exhibition-lifecycle.schema.ts` [NEW] — Zod validation schemas for pause, resume, end, extend inputs.
- `src/lib/services/exhibition.service.ts` [MODIFY] — Added `getEffectiveStatus`, `isOperational`, `pauseExhibition`, `resumeExhibition`, `endExhibition`, `extendExhibition`.
- `src/app/api/sales/route.ts` [MODIFY] — Added `isOperational` check for entry sales.
- `src/lib/services/ride.service.ts` [MODIFY] — Added `isOperational` checks for ride ticket sales and ride scans.
- `src/lib/services/ticket.service.ts` [MODIFY] — Added `isOperational` check for gate scans.
- `src/app/api/exhibitions/[id]/pause/route.ts` [NEW] — POST handler for pausing exhibitions.
- `src/app/api/exhibitions/[id]/resume/route.ts` [NEW] — POST handler for resuming exhibitions.
- `src/app/api/exhibitions/[id]/end/route.ts` [NEW] — POST handler for ending exhibitions.
- `src/app/api/exhibitions/[id]/extend/route.ts` [NEW] — POST handler for extending exhibition end date.
- `src/app/(dashboard)/admin/staff/[id]/permissions/page.tsx` [MODIFY] — Added "Manage Exhibition Lifecycle" permission item.
- `src/app/(dashboard)/admin/exhibitions/[id]/page.tsx` [MODIFY] — Added lifecycle action controls, modals, and status tracking card.

## 🗄️ Database Changes
- **Fields Added on `Exhibition`**: `completedAt`, `pausedAt`, `resumedAt`, `managedBy`, `lastStatusChangeAt`, `lastStatusChangeBy`, `manualPauseReason`, `manualEndReason`, `manualExtendReason`.

## 🔌 API Changes
- **POST `/api/exhibitions/[id]/pause`**: Pauses exhibition manually (requires `canManageExhibitions`).
- **POST `/api/exhibitions/[id]/resume`**: Resumes paused exhibition (requires `canManageExhibitions`).
- **POST `/api/exhibitions/[id]/end`**: Marks exhibition as completed (requires `canManageExhibitions`).
- **POST `/api/exhibitions/[id]/extend`**: Updates exhibition `endDate` (requires `canManageExhibitions`).

## 🔒 Security & RBAC Impact
- Backend route protection enforces `hasAdminPermission(user, 'canManageExhibitions')` on all lifecycle action endpoints.
- Operational checks dynamically evaluate server time (`Date.now()`), preventing client time tampering.

## ✅ Verification
- Ran `npm run build` — compiled Next.js bundle and TypeScript check succeeded with **0 errors**.

## 🔄 Rollback Notes
- All database additions are non-destructive and backward compatible. Reverting Git commits restores previous behavior if required.
