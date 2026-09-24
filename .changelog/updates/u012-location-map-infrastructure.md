# U012: Location Geocoding & Map Infrastructure (Step 2)

**Date:** 2026-09-24  
**Status:** Implemented & Verified  
**Commit:** `6b5e756`  
**Deployment Status:** Deployed to Vercel & Verified  

---

## Short Summary
Constructed the backend geocoding service and reusable frontend map component infrastructure for Exora. Integrates Google Maps Platform Geocoding API (`https://maps.googleapis.com/maps/api/geocode/json`) to resolve structured exhibition locations into geographic coordinates, enforces strict server-side key separation (`GOOGLE_MAPS_SERVER_API_KEY` strictly server-side, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` browser-only), enforces stale-coordinate invalidation on address changes, caches lookups, and provides a reusable, responsive `ExoraMap` component powered by Google Maps JavaScript API via `@googlemaps/js-api-loader`, featuring clean light styling, custom white/indigo enterprise markers (`AdvancedMarkerElement` with fallback), native light InfoWindows, and graceful empty/missing-key fallbacks.

---

## Why the Change Was Made
Following the Step 1 introduction of structured exhibition location fields, the platform required the infrastructure to automatically resolve and persist latitude and longitude without manual operator entry, and a reusable map component to support future dashboard visualizations in Step 3. Migrated mapping infrastructure to Google Maps Platform to ensure high geocoding fidelity and reliable global coverage.

---

## Files Changed
1. `src/lib/services/geocoding.service.ts`: Server-side geocoding service using Google Maps Platform Geocoding API. Strictly uses server-side `GOOGLE_MAPS_SERVER_API_KEY` (zero browser fallback). Implements normalized whitespace querying, multi-tier query fallback (full address -> street + city), coordinate bounds validation (-90 to 90 lat, -180 to 180 lng), location type tracking, in-memory LRU caching, 6-second timeout, error resilience (handling `ZERO_RESULTS`, `OVER_QUERY_LIMIT`, `REQUEST_DENIED`, etc.), and location change detection.
2. `src/lib/services/exhibition.service.ts`: Integrated automatic geocoding on exhibition creation; implemented location change detection and strict stale-coordinate invalidation on updates (clearing old coordinates whenever address fields change, and preserving coordinates on unchanged locations without redundant API calls).
3. `src/components/shared/exora-map.tsx`: Reusable client-side map component powered by Google Maps JavaScript API (`@googlemaps/js-api-loader`). Supports single/multiple markers with auto-bounds fitting (`google.maps.LatLngBounds`), custom Exora white circular DOM markers with indigo accents (`AdvancedMarkerElement` with standard `Marker` fallback), native InfoWindow cards, responsive container tracking via `ResizeObserver`, graceful empty-state rendering, and browser-key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) fallbacks.
4. `src/app/globals.css`: Added clean styling for `.gm-style-iw.gm-style-iw-c` to ensure modern border-radius and shadow without default padding clipping.
5. `src/app/(dashboard)/admin/exhibitions/[id]/page.tsx`: Embedded minimal `ExoraMap` preview in the Overview tab to render when an exhibition has valid coordinates.
6. `.env.example`: Documented strict separation between server-side `GOOGLE_MAPS_SERVER_API_KEY` and browser `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
7. `package.json` & `package-lock.json`: Added `@googlemaps/js-api-loader` and `@types/google.maps`; removed `mapbox-gl` and `@types/mapbox-gl`.
8. `.changelog/updates/u012-location-map-infrastructure.md`: Changelog update file.
9. `.changelog/index.md`: Added U012 to master index.

---

## Technical Impact
- **Coordinate Automation:** Operators never manually enter coordinates; the backend resolves coordinates server-side from structured address fields using Google Maps Platform Geocoding API.
- **Strict Key Separation:** `GOOGLE_MAPS_SERVER_API_KEY` is strictly server-side and never exposed to the client; `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is browser-only and never accessed by server services.
- **Stale Coordinate Protection:** When an exhibition's address changes, previous coordinates are immediately invalidated and set to null if re-geocoding fails, preventing incorrect pin placements.
- **Light Design System Alignment:** Map and markers visually integrate into Exora's soft enterprise light theme.
- **Cache Optimization:** Normalized address keys avoid redundant API hits for duplicate or repeated addresses.
- **Provider Isolation:** Provider-specific Google Maps logic is centralized within `GeocodingService` and `ExoraMap`.
- **Zero Hydration Mismatch:** Google Maps initialization is strictly client-side with container observers and proper unmount cleanup.
- **Graceful Token Absence:** The system functions fully even if `GOOGLE_MAPS_SERVER_API_KEY` or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` are not yet supplied in the environment.

---

## Verification Result
1. **Automated Verification Script:**
   - Address change detection correctly identified normalized equality and detected modifications.
   - Missing key & empty location gracefully handled without throwing errors.
   - Exhibition creation persisted location with coordinates.
   - Stale coordinate invalidation verified: updating an address from Bengaluru to Mysuru invalidated previous coordinates.
   - Unchanged address update preserved coordinates without calling geocoding.
2. **Build Verification:**
   - `npm run build` compiled successfully in Turbopack across all 82 routes with zero TypeScript or bundling errors.

---

## Rollback Notes
If rollback is ever required, revert the modified files. No database migrations or schema alterations were performed.
