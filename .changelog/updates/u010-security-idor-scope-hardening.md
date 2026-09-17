# U010: Security IDOR Remediation & Counter Sale Scope Hardening

**Date:** 2026-09-17  
**Status:** Verified & Build Passed  
**Deployment Status:** Local Verified (`npm run build` passed cleanly with Turbopack)  

---

## Short Summary
Identified and remediated a critical Cross-Exhibition Authorization Bypass (Broken Object Level Authorization / IDOR) across `/api/exhibitions/[id]` endpoints and resolved a counter ticket sale scope restriction bug affecting Super Administrators and selected-scope administrators.

---

## Why the Change Was Made
During exhaustive QA validation (Phase 1–20), two defects were discovered:
1. **DEFECT-SEC-001 (High):** `GET /api/exhibitions/[id]`, `PATCH /api/exhibitions/[id]`, `DELETE /api/exhibitions/[id]`, as well as lifecycle sub-routes (`pause`, `resume`, `end`, `extend`, `stats`) only enforced coarse role checks (`role === 'admin'`) and permission flags without validating whether an administrator in `SELECTED` access mode was assigned to the targeted exhibition. This allowed cross-exhibition inspection and state mutation by unassigned admins.
2. **DEFECT-AUTH-002 (Medium):** In `POST /api/sales`, the check `if (user.role !== 'admin')` failed to recognize `super_admin` or respect dynamic exhibition assignment resolution, erroneously returning `403 FORBIDDEN` when Super Administrators attempted to issue tickets or when administrators with proper scoping conducted transactions.

---

## Files Changed
- `src/app/api/exhibitions/[id]/route.ts`: Added `hasExhibitionAccess(user, id)` checks on `GET`, `PATCH`, and `DELETE` methods.
- `src/app/api/exhibitions/[id]/pause/route.ts`: Added `hasExhibitionAccess(user, id)` verification before allowing exhibition pause.
- `src/app/api/exhibitions/[id]/resume/route.ts`: Added `hasExhibitionAccess(user, id)` verification before allowing exhibition resumption.
- `src/app/api/exhibitions/[id]/end/route.ts`: Added `hasExhibitionAccess(user, id)` verification before allowing exhibition termination.
- `src/app/api/exhibitions/[id]/extend/route.ts`: Added `hasExhibitionAccess(user, id)` verification before extending exhibition end date.
- `src/app/api/exhibitions/[id]/stats/route.ts`: Added `hasExhibitionAccess(user, id)` verification before exposing exhibition performance metrics.
- `src/app/api/sales/route.ts`: Imported and integrated `hasExhibitionAccess` alongside legacy `assignedStaffIds` checks to correctly permit Super Administrators and properly scoped counter/admin staff while blocking unauthorized cross-exhibition ticket creation.

---

## Technical Impact
- **Security Posture:** Eliminated IDOR/BOLA vulnerability. Administrators operating in `SELECTED` exhibition access mode cannot read, update, pause, resume, extend, or delete unassigned exhibitions.
- **Architectural Uniformity:** Aligned `/api/exhibitions/[id]` with the platform's core authorization model (`Effective Access = Role + Permission + Exhibition Scope`).
- **Backward Compatibility:** Preserved full global access for `super_admin` and `admin` in `GENERAL` mode. Existing counter staff assignments remain fully backward compatible.

---

## Verification Result
1. **Targeted Regression Suites:**
   - `TEST-SCOPE-002`: Admin A attempting to access unassigned Exhibition B -> Verified HTTP `403 FORBIDDEN` (`Access denied: You are not assigned to this exhibition`).
   - `TEST-SCOPE-003`: Admin B attempting to access unassigned Exhibition A -> Verified HTTP `403 FORBIDDEN`.
   - `TEST-SEC-QR-007`: Super Admin creating ticket for Exhibition B -> Verified HTTP `201 CREATED`.
   - All 98 executed test cases across Suite 1 through Suite 6 passed (100% pass rate).
2. **Build Verification:**
   - `npm run build` completed with zero TypeScript errors and zero lint warnings across all 82 routes.

---

## Rollback Notes
If rollback is ever required, revert the `hasExhibitionAccess` checks in the affected route handlers. No database migrations or schema alterations were performed.
