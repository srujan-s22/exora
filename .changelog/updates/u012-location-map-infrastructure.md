# U012: Location Geocoding & Map Infrastructure (Step 2)

**Date:** 2026-09-24  
**Status:** Implemented & Verified  
**Commit:** `6b5e756`  
**Deployment Status:** Deployed to Vercel & Verified  

---

## Short Summary
Constructed the backend geocoding service and reusable frontend map component infrastructure for Exora. Integrates Mapbox Geocoding API to resolve structured exhibition locations into geographic coordinates, enforces stale-coordinate invalidation on address changes, caches lookups, and provides a reusable, responsive `ExoraMap` component supporting multiple markers, dark theme styling, and graceful empty/missing-token fallbacks.

---

## Why the Change Was Made
Following the Step 1 introduction of structured exhibition location fields, the platform required the infrastructure to automatically resolve and persist latitude and longitude without manual operator entry, and a reusable map component to support future dashboard visualizations in Step 3.

---

## Files Changed
1. `src/lib/services/geocoding.service.ts`: New server-side geocoding service. Wraps Mapbox Geocoding Places API with normalized whitespace querying, multi-tier query fallback (full address -> street + city), coordinate bounds validation (-90 to 90 lat, -180 to 180 lng), in-memory LRU caching, 6-second timeout, error resilience, and location change detection.
2. `src/lib/services/exhibition.service.ts`: Integrated automatic geocoding on exhibition creation; implemented location change detection and strict stale-coordinate invalidation on updates (clearing old coordinates whenever address fields change, and preserving coordinates on unchanged locations without redundant API calls).
3. `src/components/shared/exora-map.tsx`: New reusable client-side map component powered by Mapbox GL JS. Supports single/multiple markers with auto-bounds fitting (`LngLatBounds`), custom Exora-themed DOM markers with hover/click popups, responsive container tracking via `ResizeObserver`, graceful empty-state rendering, and missing-token fallbacks.
4. `src/app/(dashboard)/admin/exhibitions/[id]/page.tsx`: Embedded `ExoraMap` preview in the Overview tab to render when an exhibition has valid coordinates.
5. `.env.example`: Documented `MAPBOX_ACCESS_TOKEN` and `NEXT_PUBLIC_MAPBOX_TOKEN`.
6. `package.json` & `package-lock.json`: Added `mapbox-gl` and `@types/mapbox-gl`.
7. `.changelog/updates/u012-location-map-infrastructure.md`: Changelog update file.
8. `.changelog/index.md`: Added U012 to master index.

---

## Technical Impact
- **Coordinate Automation:** Operators never manually enter coordinates; the backend resolves coordinates server-side from structured address fields.
- **Stale Coordinate Protection:** When an exhibition's address changes, previous coordinates are immediately invalidated and set to null if re-geocoding fails, preventing incorrect pin placements.
- **Cache Optimization:** Normalized address keys avoid redundant API hits for duplicate or repeated addresses.
- **Provider Isolation:** Provider-specific Mapbox logic is centralized within `GeocodingService` and `ExoraMap`.
- **Zero Hydration Mismatch:** Mapbox initialization is strictly client-side with container observers and proper unmount cleanup.
- **Graceful Token Absence:** The system functions fully even if `MAPBOX_ACCESS_TOKEN` or `NEXT_PUBLIC_MAPBOX_TOKEN` are not yet supplied in the environment.

---

## Verification Result
1. **Automated Verification Script:**
   - Address change detection correctly identified normalized equality and detected modifications.
   - Missing token & empty location gracefully handled without throwing errors.
   - Exhibition creation persisted location with coordinates.
   - Stale coordinate invalidation verified: updating an address from Bengaluru to Mysuru invalidated previous coordinates.
   - Unchanged address update preserved coordinates without calling geocoding.
2. **Build Verification:**
   - `npm run build` compiled successfully in Turbopack across all 82 routes with zero TypeScript or bundling errors.

---

## Rollback Notes
If rollback is ever required, revert the modified files and uninstall `mapbox-gl`. No database migrations or schema alterations were performed.
