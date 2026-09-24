# U017: Leaflet + OpenStreetMap & Photon Complete Location Infrastructure Migration

**Date:** 2026-09-24  
**Status:** Implemented & Verified  
**Author:** Antigravity  

---

## 1. Summary

Completely replaced Google Maps Platform (Maps JavaScript API, Places API New, Geocoding API, Map IDs, billing requirements, Google API keys, and Google CSP headers) with **Leaflet** for interactive map rendering using OpenStreetMap tiles and **Photon** (`https://photon.komoot.io/api/`) for typeahead venue search, geocoding, and reverse geocoding. Established a provider-independent location architecture (`LocationSearchService`) so that all Exora UI components, database schemas, and exhibition workflows are decoupled from provider-specific formats.

---

## 2. Why the Change Was Made

The prior implementation relied on Google Maps Platform, which required commercial Google Cloud billing, active credit card setup, Google-specific Map IDs, and complex browser/server API key provisioning. Due to strict Google Cloud billing requirements, production deployments encountered authorization blocks (`BillingNotEnabledMapError` and 403 denied errors).

Migrating to Leaflet and Photon with OpenStreetMap provides:
1. **Zero Billing / Zero API Key Dependencies:** Eliminates reliance on Google Maps Platform billing accounts.
2. **Open Source & Extensible:** Clean separation between map rendering (Leaflet) and location search (Photon).
3. **Provider Independence:** A single normalized abstraction (`LocationSearchResult`) protects Exora from vendor lock-in.
4. **Enhanced Security & Clean CSP:** Removes broad Google domains (`maps.googleapis.com`, `places.googleapis.com`, `maps.gstatic.com`) from Content Security Policy in favor of strict OSM tile origins.

---

## 3. Files Created, Modified, and Deleted

### Files Created:
- `src/lib/services/location-search.service.ts` — Provider-independent location search service with Photon integration, bounded LRU caching (500 entries, 30m TTL), query bounds (3–100 chars), India geographic bias (`lat=20.5937, lon=78.9629`), duplicate result suppression, and 6s timeout.
- `src/app/api/location/search/route.ts` — Protected internal API route requiring Super Admin or Admin session authentication, rate-limiting (60 req/min/user), parameter validation, and structured error responses.
- `.changelog/updates/u017-leaflet-photon-location-migration.md` — This changelog record.

### Files Modified:
- `src/components/shared/exora-map.tsx` — Complete Leaflet rewrite using dynamic import for full SSR safety, custom Exora SVG DivIcon pins (preventing Next.js asset 404 bugs), automatic bounds fitting with padding, responsive ResizeObserver, clean unmount instance destruction preventing container re-initialization errors, and visible OpenStreetMap attribution.
- `src/components/shared/exhibition-location-picker.tsx` — Migrated from Google Places to internal `/api/location/search`. Implemented 350ms debounce, `AbortController` cancellation of stale requests, human-readable suggestions with venue/address and category badges, keyboard navigation (ArrowDown, ArrowUp, Enter, Escape), strict selection confirmation requirement, mini Leaflet preview, and "Keep current" functionality.
- `src/lib/services/exhibition.service.ts` — Migrated from `GeocodingService` to `LocationSearchService` for location change detection and coordinate validation. Retained canonical `location` updates and bidirectional legacy `venue`/`address` synchronization.
- `src/lib/services/geocoding.service.ts` — Converted to backward-compatible facade delegating directly to `LocationSearchService`, removing all Google Geocoding API HTTP calls.
- `src/components/dashboard/super-admin-exhibition-overview.tsx` — Updated `MapErrorBoundary` to remove Google-specific messaging.
- `src/proxy.ts` — Cleaned Content Security Policy: removed `maps.googleapis.com`, `places.googleapis.com`, `maps.gstatic.com`; allowed `https://tile.openstreetmap.org https://*.tile.openstreetmap.org` in `img-src`.
- `src/app/globals.css` — Imported `leaflet/dist/leaflet.css` and added styled Leaflet popup wrappers matching Exora's enterprise design system; removed `.gm-style-iw` rules.
- `.env.example` — Removed Google Maps variables; added `NEXT_PUBLIC_MAP_TILE_URL`, `LOCATION_SEARCH_PROVIDER`, and `PHOTON_API_BASE_URL`.
- `package.json` & `package-lock.json` — Added `leaflet` and `@types/leaflet`; uninstalled `@googlemaps/js-api-loader` and `@types/google.maps`.
- `scripts/test-location-picker.ts` — Updated to full 38-point comprehensive regression test suite.
- `.changelog/index.md` — Registered U017 update.

### Files Deleted:
- `src/lib/utils/google-maps-loader.ts` — Obsolete Google Maps JS SDK loader.
- `scripts/diagnose-places.ts` — Temporary Google Places diagnostic script.

---

## 4. Technical Architecture

```
                    EXORA
                      │
             Location Search UI (ExhibitionLocationPicker)
                      │ (debounced, min 3 chars, abort stale)
                      ▼
         Protected API Route (/api/location/search)
                      │ (Admin / Super Admin RBAC, Rate-limited)
                      ▼
            LocationSearchService
                      │
              ┌───────┴───────┐
              │               │
        Search / Geocode   Reverse Geocode
              │               │
           Photon API (https://photon.komoot.io)
              │
        OpenStreetMap Geodata
              
                      +
                      
                 Map Rendering
                      │
              ExoraMap Component
                      │
                   Leaflet (L.divIcon custom pins, auto-bounds)
                      │
            OpenStreetMap Tile Layer
      (https://tile.openstreetmap.org/{z}/{x}/{y}.png)
          (Attribution: © OpenStreetMap contributors)
```

---

## 5. Verification & Test Results

### 1. 38-Point Automated Test Suite (`npm test`):
Ran all 38 test suites covering 66 individual assertions:
- **Search & Query:** Valid queries, <3 char rejection, >100 char bounding, multi-results, zero results.
- **Resilience:** Provider failure handling, timeout handling, stale request abort, duplicate suppression.
- **Normalization & Mapping:** Photon GeoJSON to `LocationSearchResult` normalization, coordinate extraction, category tagging.
- **Persistence & Synchronization:** Schema validation, MongoDB updates, legacy `venue`/`address` mirroring, detail page reads, dashboard reads.
- **Map & Leaflet:** Marker filtering, bounds calculation, single marker centering, zero marker empty state, marker click, card <-> marker synchronization, container lifecycle cleanup.
- **Security & RBAC:** Unauthenticated/unauthorized rejection, admin/super admin approval, counter/gate/ride restrictions, Google code absence, CSP cleanliness.
- **Result:** **66 / 66 PASSED**.

### 2. Code Quality & Linting (`npm run lint`):
Zero errors and zero warnings across all modified and created files (`location-search.service.ts`, `geocoding.service.ts`, `route.ts`, `exora-map.tsx`, `exhibition-location-picker.tsx`, `proxy.ts`).

### 3. Production Build (`npm run build`):
Compiled successfully in 4.2s with Turbopack across all 83 static and dynamic routes.

### 4. End-to-End Workflow Verification:
Verified real live database pipeline against MongoDB Atlas:
1. `TYPE VENUE` -> "Bangalore International Exhibition Centre" queried.
2. `SUGGESTIONS APPEAR` -> 3 suggestions with coordinates returned.
3. `SELECT VENUE` -> Authorized selection created normalized location object.
4. `SAVE EXHIBITION` -> Updated exhibition in MongoDB Atlas.
5. `MONGODB UPDATED` -> Verified `location` fields and legacy `venue`/`address` fields synchronized.
6. `DETAIL PAGE SHOWS NEW LOCATION` -> Detail page service returned new location and coordinates.
7. `LEAFLET MARKER APPEARS` -> Leaflet marker received coordinates `[13.060278, 77.474726]`.

---

## 6. Deployment & Rollback Notes

- **Deployment Target:** Vercel (`https://exora-beta.vercel.app`) connected to MongoDB Atlas.
- **Backward Compatibility:** Zero destructive database migrations. Existing exhibitions without coordinates (`location: null`) continue to render with "Location not configured" fallback.
- **Rollback Procedure:** If required, git revert commit to restore previous state; however, Leaflet + Photon eliminates all Google billing failures.
