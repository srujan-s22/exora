# U013: Super Admin Exhibition Map Overview (Step 3)

**Date:** 2026-09-24  
**Status:** Implemented & Verified  
**Commit:** `b6ad4a9`  
**Deployment Status:** Deployed to Vercel & Verified  

---

## Short Summary
Redesigned the top section of the Super Admin and Administrator dashboard (`/admin`) to introduce a unified, interactive exhibition control plane: "Multiple exhibitions. One control plane." Implemented a two-column responsive overview layout containing a polished **All Exhibitions** list (~40%) synchronized with an interactive **Map View** (~60%) powered by `ExoraMap`. Features seamless bidirectional synchronization (selecting a card focuses/zooms the map and opens the InfoWindow; clicking a map marker highlights and scrolls the corresponding card into view), robust three-state location handling (Mapped, Location not configured, Map location unavailable), graceful map failure isolation via React `MapErrorBoundary`, comprehensive loading/error states, and full preservation of existing dashboard filters, analytics, charts, and audit feeds below the new section.

---

## Why the Change Was Made
In Step 1 (Exhibition Location System) and Step 2 (Location + Map Infrastructure), Exora established structured address storage and automatic server-side geocoding into coordinates. Step 3 fulfills the operational requirement to provide Super Admins with an immediate at-a-glance operational visualization of all authorized exhibitions, their venue and geographic distribution, and their current operational status without navigating into individual exhibition detail pages.

---

## Files Changed
1. `src/components/dashboard/super-admin-exhibition-overview.tsx`: New primary dashboard component implementing:
   - Two-column responsive layout (Left: All Exhibitions list, Right: Map View; stacks vertically on mobile/tablet).
   - Bidirectional card ↔ map synchronization via shared `selectedExhibitionId`.
   - Polished compact exhibition cards with name, venue, city/state, status indicator (`StatusIndicator`), location state badge, and real operational metrics (tickets sold, revenue).
   - Three location state treatments (Case A: Mapped; Case B: Location not configured; Case C: Map location unavailable) with zero coordinate fabrication.
   - Smooth list auto-scrolling (`scrollIntoView`) on marker interaction.
   - Restrained enterprise styling using Exora design tokens (Navy `#06183D`, Blue `#1557FF`, Teal `#10B8B2`, Background `#F7F9FC`).
   - Skeletons for cards and map during loading.
   - `MapErrorBoundary` isolating Google Maps runtime failures from the rest of the application.
   - Non-intrusive floating indicator when a selected exhibition lacks geographic coordinates.
2. `src/components/shared/exora-map.tsx`:
   - Added `selectedMarkerId` and `emptyMessage` props to `ExoraMapProps`.
   - Synchronized map viewport (`panTo`, `setZoom(15)`) and native InfoWindow opening when `selectedMarkerId` updates.
   - Automated bounds fitting across all markers when no specific marker is selected.
   - Enhanced zero-valid-marker handling to render a clean operational fallback rather than initializing an empty Google Map.
3. `src/app/(dashboard)/admin/page.tsx`:
   - Integrated `SuperAdminExhibitionOverview` above the existing filter toolbar and analytics metrics.
   - Connected `selectedExhibitionId` to synchronize between the exhibition card list, map markers, the exhibition select dropdown, and downstream metrics calculation.
   - Added operational error state screen with retry action on fetch failures.
   - Fully preserved all existing stats cards, analytics charts, gate audit breakdown, and live activity feeds.
4. `src/lib/services/dashboard.service.ts`:
   - Enhanced `exhibitionBreakdown` in `getAdminMetrics` to include `venue`, `address`, `category`, `startDate`, `endDate`, and `location` for authorized exhibitions.
5. `.changelog/updates/u013-super-admin-exhibition-map-overview.md`:
   - Created this changelog update entry.
6. `.changelog/index.md`:
   - Added U013 to master changelog index.

---

## Technical & Security Impact
- **Authoritative Authorization Preserved:** Exhibition data continues to be queried through `DashboardService.getAdminMetrics(user)` with strict server-side session authentication (`AuthService.verifyToken`) and RBAC scope filtering (`applyExhibitionScopeQuery`). Super Admins receive all exhibitions, while scoped Admins receive only exhibitions assigned to them. No unauthorized data is delivered to the client.
- **Single Source of Truth:** `selectedExhibitionId` serves as the unified selection state. Clicking a card, clicking a marker, or choosing from the filter dropdown updates the exact same state without race conditions.
- **Performance Optimized:** Zero duplicate network requests; leverages the existing `/api/dashboard/admin` payload. Map markers are memoized and bounds recalculations are guarded.
- **Map Failure Isolation:** A failure in Google Maps initialization or network connectivity is trapped by `MapErrorBoundary` and `ExoraMap` fallbacks without crashing the parent dashboard or affecting metrics.
- **Location Integrity:** No fake or default coordinates are generated. Unconfigured or malformed locations are transparently identified to operators.

---

## Verification Result
1. **Compilation & Type Check:**
   - `npm run build` executed successfully using Turbopack with 0 errors across all 82 routes.
2. **ESLint Verification:**
   - Verified clean zero-error, zero-warning status on `super-admin-exhibition-overview.tsx`.
3. **Accessibility:**
   - Cards are keyboard accessible (`tabIndex={0}`, `role="button"`, `aria-pressed={isSelected}`, Enter/Space keydown support, high-contrast focus rings).
4. **Dashboard Preservation:**
   - Verified filter toolbar, revenue/ticket stat cards, payment channel charts, gate security audit progress, and live terminal activity feeds remain functional below the new section.

---

## Rollback Notes
If rollback is required, revert the modified files. No database schema alterations or migrations were performed.
