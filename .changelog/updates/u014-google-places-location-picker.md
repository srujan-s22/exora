# U014: Google Places Exhibition Location Picker

**Date:** 2026-09-24  
**Status:** Implemented & Verified  
**Commit:** Pending  
**Deployment Status:** Staged for Deployment  

---

## Short Summary
Replaced the tedious, error-prone manual 6-field exhibition location form (venue name, address, city, state, country, postal code) with a single Google Places Autocomplete location picker (`ExhibitionLocationPicker`). Administrators can now type a search query, select a verified Google Place result, preview the location on a live single-marker `ExoraMap`, and save canonical location coordinates and metadata with Google Place ID (`placeId`) support. Arbitrary typed text is strictly distinguished from confirmed selections, and legacy exhibitions without locations remain completely backward-compatible.

---

## Why the Change Was Made
Previously, administrators creating or updating exhibitions were forced to manually key in six separate text fields (venueName, address, city, state, country, postalCode) and rely on approximate server-side address geocoding. This led to:
1. Inconsistent venue addresses and typographical errors.
2. Incomplete geographic metadata preventing exhibitions from being accurately mapped on the Super Admin control plane dashboard.
3. Suboptimal operator experience requiring multiple inputs when a single Google Place lookup immediately provides verified venue name, formatted address, administrative areas, postal code, coordinates, and canonical Google Place ID.

---

## Files Changed
1. **`src/types/exhibition.types.ts`**: Added optional `placeId?: string` to `ExhibitionLocation`.
2. **`src/lib/db/models/exhibition.model.ts`**: Added optional `placeId?: string` to `IExhibitionLocation` and `ExhibitionLocationSchema`.
3. **`src/lib/validators/exhibition.schema.ts`**: Updated `exhibitionLocationSchema` with `placeId` support and relaxed `postalCode` to optional with empty-string default to tolerate open grounds/venues without postal codes.
4. **`src/lib/services/geocoding.service.ts`**: Extended service with `resolvePlaceId(placeId)` (Geocoding API place_id query with Place Details fallback and in-memory caching), updated `hasLocationChanged` to inspect `placeId`, and added `placeId` to input/result types.
5. **`src/lib/services/exhibition.service.ts`**: Updated `create` and `update` methods to authoritative placeId resolution, prevent redundant geocoding API requests when coordinates are provided from Place selection, validate coordinates (-90..90, -180..180), and maintain legacy `venue` and `address` compatibility fields.
6. **`src/lib/utils/google-maps-loader.ts`** *(New)*: Created shared Google Maps loader configuring `@googlemaps/js-api-loader` once (`configureGoogleMaps`, `loadMapsLibrary`, `loadPlacesLibrary`), preventing duplicate script injections.
7. **`src/components/shared/exora-map.tsx`**: Updated to reuse `configureGoogleMaps` from unified loader.
8. **`src/components/shared/exhibition-location-picker.tsx`** *(New)*: Reusable component providing Google Places Autocomplete suggestions (with session token cost control), keyboard navigation, address component parsing, selected location summary card, live single-marker `ExoraMap` preview, and Change/Clear state handling.
9. **`src/app/(dashboard)/admin/exhibitions/new/page.tsx`**: Replaced 6 manual location inputs with `ExhibitionLocationPicker` requiring verified selection.
10. **`src/app/(dashboard)/admin/exhibitions/[id]/edit/page.tsx`**: Replaced manual location inputs with `ExhibitionLocationPicker`, preserving existing locations when editing unrelated fields and supporting legacy unconfigured exhibitions.
11. **`scripts/test-location-picker.ts`** *(New)*: Comprehensive test suite covering all 14 programmatic validation and behavioral requirements.
12. **`package.json`**: Added `"test": "npx tsx scripts/test-location-picker.ts"`.

---

## Technical Impact

### 1. Google Places Autocomplete & Session Cost Control
- Uses `@googlemaps/js-api-loader` to load Google Places library (`google.maps.places`).
- Leverages modern `AutocompleteSuggestion.fetchAutocompleteSuggestions` with `AutocompleteService` fallback.
- Instantiates an `AutocompleteSessionToken` at search session start and refreshes it upon place selection, grouping keystroke predictions under a single autocomplete session to control Google Maps Platform billing.
- Only requests needed fields: `id`, `displayName`, `formattedAddress`, `location`, `addressComponents`.

### 2. Typed Text vs Confirmed Place Selection
- Prevents saving arbitrary typed queries as locations. If a user types text without selecting a dropdown prediction, a clear notice ("Please select a location from the suggestions to confirm coordinates.") appears and submission is blocked until a suggestion is picked.

### 3. Server Authority & Fallback Strategy
- Server validates that coordinates are within geographical boundaries (`-90 <= lat <= 90`, `-180 <= lng <= 180`).
- If `placeId` is present, `GeocodingService.resolvePlaceId` resolves canonical location server-side using server credentials.
- If Google Cloud server key has billing/API restrictions or network delays, the server defensively accepts and saves client-provided verified coordinates rather than crashing or rejecting legitimate submissions.
- Redundant text geocoding is bypassed when coordinates are already established.

### 4. Legacy Exhibitions & Backward Compatibility
- Existing exhibitions with `location: null` remain valid; `EditExhibitionPage` displays "Location not configured" with an `[ Add location ]` button.
- Saving edits to other exhibition fields (e.g. ticket prices, staff roster) on an existing exhibition does not alter or erase its location.
- Legacy `venue` and `address` root fields on `Exhibition` remain synchronized from `location.venueName` and `location.address`.

---

## Verification Result
- **Unit & Integration Tests:** Ran `npm test` (`scripts/test-location-picker.ts`): **23/23 tests passed** covering:
  - New exhibition location requirement.
  - `placeId` persistence and coordinate boundary enforcement.
  - Invalid coordinate rejection.
  - Legacy exhibition compatibility (null/omitted location on update).
  - Existing location replacement and preservation during unrelated field edits.
  - `venue` / `address` legacy compatibility synchronization.
  - Malformed payload rejection.
  - Clean error handling on place resolution failure.
  - Dashboard marker eligibility verification.
  - Redundant geocoding bypass when coordinates exist.
- **Lint Check:** `npx eslint src/components/shared/exhibition-location-picker.tsx src/lib/utils/google-maps-loader.ts scripts/test-location-picker.ts` passed with **0 errors, 0 warnings**.
- **Next.js Production Build:** `npm run build` compiled successfully with 82/82 static & dynamic pages and 0 TypeScript errors.

---

## Deployment Status
- Changes staged for Git commit and push to `origin/main`.
- Vercel production deployment build pending push.

---

## Rollback Notes
If rollback is required:
1. Revert the commit `feat(location): add Google Places exhibition location picker`.
2. The database schema addition of `placeId` is non-destructive and optional; legacy records and existing documents remain valid regardless.
