# Update U008: Exhibition-Scoped Cancellation Notifications & Admin Tickets/Rides Column Updates

**Date:** 2026-08-10  
**Status:** Implemented & Verified  
**Deployment Status:** Ready for Vercel Deployment  

---

## 🚀 Summary
Updated Exora's ticket cancellation workflow and Admin console UI:
1. **Exhibition-Scoped Cancellation Notifications & Queue Access**: Restricted ticket cancellation request broadcast notifications and admin queue access so that only active admins (and super admins) who are assigned to the specific exhibition (and have ticket cancellation approval permissions enabled) receive notifications and can manage the request.
2. **Admin Tickets & Rides Column Update**: Replaced the "Price" column with "Tickets Purchased" in the Admin & Super Admin Tickets console (`/admin/tickets`) and Rides console (`/admin/rides`).

---

## 🎯 Why the Change Was Made
- Previously, when a counter staff member requested a ticket cancellation, broadcast notifications were sent to **all** admins with approval permissions across all exhibitions.
- Admins assigned to a specific exhibition (`SELECTED` access mode) should only receive cancellation request notifications and manage requests originating from their assigned exhibitions.
- Admins and Super Admins required a direct view of the number of tickets purchased (`quantity` / `ticketsSold`) instead of unit price in the main Tickets and Rides management consoles.

---

## 🛠️ Files Changed

- `src/lib/services/cancellation-request.service.ts`:
  - Updated `createRequest` to filter candidate admins using `hasExhibitionAccess(adminDoc, saleDoc.exhibitionId)` and check ticket cancellation approval permissions (`canApproveTicketCancellation`, `canApproveRideTicketCancellation`, or `canApproveEntryTicketCancellation`).
  - Updated `listRequests` to accept an optional `user` object and apply `applyExhibitionScopeQuery(user, filter)` for database scoping.
  - Updated `approveRequest` and `rejectRequest` to call `requireExhibitionAccess(adminUser, request.exhibitionId)`.

- `src/app/api/cancellation-requests/route.ts`:
  - Passed authenticated `user` to `CancellationRequestService.listRequests` for exhibition-scoped queue listing.

- `src/app/(dashboard)/admin/tickets/page.tsx`:
  - Replaced `Price` column in the data table with `Tickets Purchased` (`key: 'quantity'`), rendering `row.quantity || 1`.

- `src/app/(dashboard)/admin/rides/page.tsx`:
  - Replaced `Price` header and table cell with `Tickets Purchased`, rendering `rideStats.ticketsSold`.

---

## 🔍 Verification Result
- Ran `npm run build` — TypeScript compilation and Next.js static page generation passed with 0 errors across all 82 routes.
