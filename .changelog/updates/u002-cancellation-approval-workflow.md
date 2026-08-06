# U002 — Approval-Based Ticket Cancellation Workflow

- **Date**: 2026-08-06
- **Status**: Implemented & Verified
- **Author**: Senior Full Stack Next.js Engineer & RBAC Specialist

## 📝 Summary
Replaced immediate counter ticket cancellation with an approval-based workflow. Counter staff can now only initiate a cancellation request within a strict 30-second window post-sale. The ticket remains active but blocked from gate/ride scanning while pending. An authorized Admin or Super Admin must review and explicitly approve or reject the request via a dedicated queue.

## 🎯 Why
Immediate cancellation allowed counter staff to void transactions without oversight. Moving to an approval workflow introduces strict financial controls, prevents ticket misuse at gate/ride entry points during pending review, and ensures full auditability for every request, approval, and rejection step.

## 💼 Business Impact
- **Financial Risk Mitigation**: Eliminates unauthorized direct ticket voiding by counter staff.
- **Operational Clarity**: Dedicated admin queue provides complete visibility into pending cancellation requests, transaction details, and reasons.
- **Gate/Ride Abuse Prevention**: Tickets pending cancellation are automatically blocked at gate/ride scanners until approved or rejected.

## ⚙️ Technical Impact
- Introduced new Mongoose data model `CancellationRequest` to track cancellation requests.
- Extended `Sale`, `RideSale`, `Ticket`, `RideTicket` schemas with `cancellationStatus` (`'pending' | 'approved' | 'rejected' | null`).
- Added permission keys `canApproveTicketCancellation`, `canApproveEntryTicketCancellation`, `canApproveRideTicketCancellation` to RBAC system.
- Created `CancellationRequestService` for encapsulated business logic, audit logging, and admin notifications.
- Updated Gate (`ticket.service.ts`) and Ride (`ride.service.ts`) scanners to reject scans for tickets in `pending` cancellation status.
- Created Admin Cancellation Queue UI page at `/admin/cancellation-requests`.

## 📂 Files Changed
- `src/lib/db/models/cancellation-request.model.ts` [NEW] — Schema & Mongoose model for `CancellationRequest`.
- `src/lib/validators/cancellation-request.schema.ts` [NEW] — Zod validation schemas for request creation, listing, rejection.
- `src/lib/services/cancellation-request.service.ts` [NEW] — Service class implementing `createRequest`, `listRequests`, `approveRequest`, `rejectRequest`.
- `src/app/api/cancellation-requests/route.ts` [NEW] — GET (list) and POST (create request) API handlers.
- `src/app/api/cancellation-requests/[id]/approve/route.ts` [NEW] — POST approval route handler.
- `src/app/api/cancellation-requests/[id]/reject/route.ts` [NEW] — POST rejection route handler.
- `src/app/(dashboard)/admin/cancellation-requests/page.tsx` [NEW] — Dedicated Admin Queue UI for reviewing cancellation requests.
- `src/lib/db/models/sale.model.ts` [MODIFY] — Added `cancellationStatus` and `pendingCancellationRequestId`.
- `src/lib/db/models/ride-sale.model.ts` [MODIFY] — Added `cancellationStatus` and `pendingCancellationRequestId`.
- `src/lib/db/models/ticket.model.ts` [MODIFY] — Added `cancellationStatus`.
- `src/lib/db/models/ride-ticket.model.ts` [MODIFY] — Added `cancellationStatus`.
- `src/lib/db/models/user.model.ts` [MODIFY] — Extended `IUserPermissions` and `PermissionsSchema` with approval permission flags.
- `src/lib/config/roles.ts` [MODIFY] — Added permission keys, default admin/super_admin permissions, and action permission map.
- `src/lib/validators/staff.schema.ts` [MODIFY] — Added approval permission keys to Zod staff schemas.
- `src/lib/utils/permission-helpers.ts` [MODIFY] — Added `hasAdminPermission` helper function.
- `src/lib/utils/constants.ts` [MODIFY] — Added audit actions (`cancellation_request.create`, `cancellation_request.approve`, `cancellation_request.reject`, `transaction.cancelled`) and target type `cancellation_request`.
- `src/lib/services/ticket.service.ts` [MODIFY] — Added pending cancellation check in `validateTicketScan`.
- `src/lib/services/ride.service.ts` [MODIFY] — Added pending cancellation check in `validateRideScan`.
- `src/app/api/sales/[id]/cancel/route.ts` [MODIFY] — Rewritten to enforce approval request flow for counter staff.
- `src/app/api/rides/sales/[id]/cancel/route.ts` [MODIFY] — Rewritten to enforce approval request flow for counter staff.
- `src/app/(dashboard)/counter/history/page.tsx` [MODIFY] — Updated `CancelTransactionButton` to request cancellation within 30s countdown and show pending badge.
- `src/lib/config/navigation.ts` [MODIFY] — Added "Cancellation Requests" sidebar navigation menu item for admins.
- `src/app/(dashboard)/admin/staff/[id]/permissions/page.tsx` [MODIFY] — Added "Approve Ticket Cancellations" permission toggle for admin staff management.

## 🗄️ Database Changes
- **New Model**: `CancellationRequest` (`cancellationrequests` collection).
- **Fields Added**: `cancellationStatus` and `pendingCancellationRequestId` on `Sale` & `RideSale`; `cancellationStatus` on `Ticket` & `RideTicket`.
- **Indexes Added**: `{ saleId: 1, status: 1 }`, `{ exhibitionId: 1, status: 1 }`, `{ status: 1, requestedAt: -1 }` on `CancellationRequest`.

## 🔌 API Changes
- **GET `/api/cancellation-requests`**: Paginated listing of cancellation requests for authorized admins.
- **POST `/api/cancellation-requests`**: Submit a new cancellation request (enforces 30s limit for counter).
- **POST `/api/cancellation-requests/[id]/approve`**: Admin approves a pending request and soft-cancels the transaction.
- **POST `/api/cancellation-requests/[id]/reject`**: Admin rejects a pending request; ticket remains active.
- **POST `/api/sales/[id]/cancel` & `/api/rides/sales/[id]/cancel`**: Redirect counter staff requests to approval creation workflow.

## 🎨 UI Changes
- **Counter History (`/counter/history`)**: "Cancel Ticket" replaced with "Request Cancellation", 30s countdown timer, pending badge when awaiting approval.
- **Admin Approval Queue (`/admin/cancellation-requests`)**: Comprehensive management interface with stat metric cards, filters (All, Pending, Approved, Rejected), search, and Approve/Reject action modals.
- **Staff Permissions (`/admin/staff/[id]/permissions`)**: Toggle for `canApproveTicketCancellation` permission.

## 🔒 Security & RBAC Impact
- Counter staff can no longer directly void tickets.
- Backend strictly checks permission (`canApproveTicketCancellation` or super admin role) before allowing approval/rejection.
- Audit logs capture actor, target request, timestamp, and network IP/User-Agent details for request creation, approval, and rejection.

## ✅ Verification
- Ran `npm run build` — compiled Next.js bundle and TypeScript check succeeded with **0 errors**.
- Verified all API routes, schemas, models, and UI pages.

## 🔄 Rollback Notes
If rollback is necessary:
1. Revert Git commits for the files modified above.
2. The database schema extensions are backward compatible and non-destructive; existing fields on `Sale` and `Ticket` remain untouched.
