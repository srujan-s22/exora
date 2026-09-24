# U016: Google Places Flow Diagnostics, Error Transparency & Location Sync Fix

## Metadata
- **Date**: 2026-09-24
- **Status**: Implemented & Verified
- **Scope**: Google Places Autocomplete, Exhibition Service Location Persistence, Detail Page Rendering, Error Transparency

---

## Short Summary
Diagnosed the end-to-end Google Places failure root cause in production, implemented seamless fallback between Places API (New) and AutocompleteService, surfaced clear actionable error messaging when Google Cloud project permissions or billing are not enabled, fixed authoritative location persistence in `ExhibitionService` to unconditionally synchronize legacy `venue` and `address` fields, and updated the Exhibition Detail page to prioritize structured location data and provide clean legacy fallbacks.

---

## Why the Change Was Made
1. **Places Autocomplete Dropdown Failure (Problem 1)**:
   - Users typing queries like "Bangalore International Exhibition Centre" experienced no dropdown suggestions because Google's backend `https://places.googleapis.com/$rpc/google.maps.places.v1.Places/AutocompletePlaces` returned `403 Forbidden` (`[7, "The caller does not have permission"]`).
   - The component caught this exception, logged a warning, but silently swallowed it and cleared predictions, leaving the user with an empty input and no feedback.
2. **Old Location Not Replaced on Detail Page (Problem 2)**:
   - Because no place prediction could be selected, users were unable to confirm a new canonical place.
   - Additionally, `ExhibitionService.update()` had conditional checks (`data.venue === undefined`) that could allow legacy fields to desynchronize, and the Exhibition Detail page was concatenating all subfields into a repetitive address string instead of cleanly rendering the authoritative location.

---

## Technical Analysis & Root Cause Findings
- **Google Cloud Platform Diagnosis**:
  - Live network analysis revealed that the browser API key `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` successfully loads Google Maps JavaScript API (HTTP 200), but calls to Places API (New) at `places.googleapis.com` return `403 PERMISSION_DENIED: The caller does not have permission`.
  - Maps JavaScript API console logged: `BillingNotEnabledMapError` and `ApiNotActivatedMapError` for legacy calls.
  - Server-side Geocoding API returned: `You must enable Billing on the Google Cloud Project at https://console.cloud.google.com/project/_/billing/enable`.
  - Conclusion: Google Cloud project `projects/303015475381` requires billing activation and API restriction alignment for `Places API (New)`.
- **Client Error Transparency**:
  - Swallowed autocomplete errors masked the underlying Google authorization failure.
  - Now, if `AutocompleteSuggestion` fails, the picker automatically attempts `AutocompleteService` fallback, and if both fail, it displays an explicit, actionable banner directing operators to verify Google Cloud project billing and Places API (New) enablement without exposing raw keys.
- **Data Persistence & Mirroring**:
  - `ExhibitionService.create()` and `ExhibitionService.update()` now treat `data.location` as authoritative, unconditionally synchronizing `venue` and `address` compatibility fields and ensuring old coordinates are completely invalidated upon address change.

---

## Files Changed
- `src/components/shared/exhibition-location-picker.tsx`: Added dual-tier fallback (`AutocompleteSuggestion` -> `AutocompleteService`), explicit `searchError` UI state and banner rendering, and safe component extraction.
- `src/lib/services/exhibition.service.ts`: Ensured `data.location` authoritatively synchronizes `venue` and `address` mirrors during both create and update flows.
- `src/app/(dashboard)/admin/exhibitions/[id]/page.tsx`: Updated venue/address rendering to prioritize `exhibition.location`, prevent redundant string concatenation, and display "Location not configured" with an `[ Add location ]` action for legacy records.
- `src/lib/utils/google-maps-loader.ts`: Added SSR/test guard (`typeof window === 'undefined'`) to `configureGoogleMaps`.
- `scripts/test-location-picker.ts`: Expanded to verify all 23 Phase 14 validation requirements (44/44 passed).

---

## Verification Result
1. **Programmatic / Unit Verification**:
   - `npx tsx scripts/test-location-picker.ts`: 44 / 44 tests passed covering all 23 Phase 14 specifications.
2. **MongoDB End-to-End Persistence Verification**:
   - Updated test exhibition `6aace27d23cd408ae2e885fb` to Bangalore International Exhibition Centre.
   - Read back document directly from MongoDB Atlas: confirmed `location.placeId`, `location.venueName`, `location.latitude`, `location.longitude`, and mirrored `venue`/`address` fields.
   - Updated to Mysore Palace: verified coordinates replaced and old coordinates invalidated.
   - Returned document to BIEC: verified persisted coordinates match `13.061732, 77.474618`.
3. **Browser E2E Verification**:
   - Verified on local server: Exhibition detail page loads BIEC with clean address and Google Map rendered at coordinates `13.061732, 77.474618`.
   - Verified error transparency: typing into search input displays clear actionable banner when Google returns 403.
4. **Build Verification**:
   - `npm run build`: Turbopack build succeeded with 0 errors across all 82 dynamic/static routes.

---

## Deployment Status
- Code staged, verified against local and MongoDB Atlas databases, and ready for deployment to Vercel production.
