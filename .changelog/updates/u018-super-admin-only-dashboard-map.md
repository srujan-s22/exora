# U018: Super Admin Only Centralized Dashboard Map Visibility

**Date:** 2026-09-24  
**Status:** Implemented  
**Scope:** Authorization, UI Visibility, Dashboard Analytics, Exhibition API, Testing

---

## 1. Executive Summary

This update restricts the centralized Exhibition Map / Map View on the operations dashboard exclusively to users with the `super_admin` role. Regular `admin` users (and all other operational staff roles) no longer see or download the centralized exhibition map or its geographic coordinates dataset. Crucially, Capability A (Admin location management, search, and editing for authorized exhibitions) remains completely functional and preserved.

---

## 2. Why the Change Was Made

The centralized exhibition overview on the dashboard ("Multiple exhibitions. One control plane.") provides a macro geographic distribution of all authorized venues across the system. This overview is tailored for platform governance by Super Admins. Regular Admins supervise individual assigned exhibitions or operations and do not require the centralized system-wide map view.

Per security and architectural requirements:
1. **Not CSS-only**: The restriction is enforced at the server authorization and data-access layer. Regular admins calling `/api/dashboard/admin` receive `location: null` for exhibition breakdown items, preventing client-side or manual API extraction of geographic coordinates.
2. **Zero Layout Regressions**: When an Admin accesses the dashboard, the overview component is not mounted, eliminating empty map placeholders, map controls, or awkward whitespace. The filter toolbar sits immediately beneath the page header.
3. **Preserved Location Management**: Admins retain full ability to search venues via Photon (`/api/location/search`), select venues, and save coordinates for authorized exhibitions (`/api/exhibitions/[id]`).

---

## 3. Architecture & Enforcement

### Dual-Layer Protection

```
                    EXORA DASHBOARD (/admin)
                               │
               ┌───────────────┴───────────────┐
               │                               │
         SUPER ADMIN                         ADMIN
               │                               │
               ▼                               ▼
      MAP + ALL EXHIBITIONS             NORMAL DASHBOARD
 (SuperAdminExhibitionOverview)   (Filter Toolbar + Stats + Cards)
               │                               │
               ▼                               ▼
       CENTRALIZED MAP DATA             NO MAP DATA
    (location with coordinates)       (location: null)
               │
               ▼
     Leaflet + OSM Tiles


LOCATION MANAGEMENT & SEARCH (Preserved for Super Admin + Admin):
        Super Admin / Admin (Authorized Exhibition)
                           │
                           ▼
                 /api/location/search (Photon)
                           │
                           ▼
          Select Venue -> Save Coordinates to MongoDB
```

---

## 4. Files Changed

1. `src/lib/services/dashboard.service.ts`:
   - Updated `getAdminMetrics(user)` to check `isSuperAdmin = user?.role === 'super_admin'`.
   - In `exhibitionBreakdown`, `location` is set to `isSuperAdmin ? (exh.location || null) : null`.
   - Standard venue and address strings (`exh.venue`, `exh.address`) remain populated for card headers and CSV exports.

2. `src/lib/services/exhibition.service.ts`:
   - In `ExhibitionService.list()`, stripped `latitude` and `longitude` from `location` in bulk queries for non-super-admins (`latitude: null, longitude: null`).
   - Retained full location detail in `findById()` for authorized exhibition editing on `/admin/exhibitions/[id]/edit`.

3. `src/app/(dashboard)/admin/page.tsx`:
   - Imported `useAuth` hook and retrieved `isSuperAdmin`.
   - Guarded rendering of `<SuperAdminExhibitionOverview>` with `{isSuperAdmin && <SuperAdminExhibitionOverview ... />}`.
   - Natural layout closure: PageHeader divider directly precedes the Advanced Filter Toolbar, Stat Cards, and Exhibition Cards.

4. `src/components/dashboard/super-admin-exhibition-overview.tsx`:
   - Added defense-in-depth check: `const { isSuperAdmin } = useAuth(); if (!isSuperAdmin) return null;`.
   - Prevents accidental mounting or rendering by non-super-admin users.

5. `scripts/test-location-picker.ts`:
   - Added Tests 39 through 44 covering:
     - Super Admin coordinates retrieval in dashboard metrics.
     - Admin coordinates restriction (`location: null`).
     - Bulk exhibition coordinates sanitization for non-super-admins.
     - UI visibility and DOM omission without placeholders.
     - Role blocking (403) for counter, gate, and ride roles on `/api/dashboard/admin`.
     - Admin location search and editing workflow preservation.
   - Test suite expanded to 90 passing assertions.

---

## 5. Verification & Results

- **Automated Test Suite**: `npm test` passed 90 / 90 tests.
- **Production Build**: `npm run build` compiled cleanly via Next.js Turbopack in 4.2s across all 83 routes without TypeScript or build warnings.
- **API Verification**:
  - `SABO-001` (`super_admin`): `/api/dashboard/admin` status 200, coordinates present (`latitude: 13.061732`, `longitude: 77.474618`).
  - `ADM-001` (`admin`): `/api/dashboard/admin` status 200, all items `location: null`.
  - `ADM-001` (`admin`): `/api/location/search?q=Bengaluru` status 200, returned 6 venue suggestions.
  - `ADM-001` (`admin`): `/api/exhibitions/[id]` status 200 for assigned exhibition (`6a72f5fec83cf2804e80574f`), full location object returned for venue editing.

---

## 6. Rollback Notes

If reverting, restore `location: exh.location || null` unconditionally in `src/lib/services/dashboard.service.ts` and remove the `isSuperAdmin` guard from `src/app/(dashboard)/admin/page.tsx`.
