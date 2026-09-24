# U015: Content Security Policy (CSP) Google Maps & Places Compatibility

**Date:** 2026-09-24  
**Status:** Implemented & Verified  
**Commit:** Pending  
**Deployment Status:** Staged for Deployment  

---

## Short Summary
Updated Exora's centralized Content Security Policy (CSP) in `src/proxy.ts` to permit the Google Maps JavaScript API (`https://maps.googleapis.com`), Google Places API (New) endpoints (`https://places.googleapis.com`), map tiles and pin assets (`https://maps.gstatic.com`), and WebGL/map web workers (`worker-src 'self' blob:`). This resolves the `script-src` blocking issue on the Exhibition Location Picker while maintaining strict protection across all existing security directives.

---

## Why the Change Was Made
Following the deployment of U014, the browser console on the Exhibition Location Picker reported:
```
Refused to load the script 'https://maps.googleapis.com/maps/api/js?libraries=places...' because it violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval'".
Google Places: Failed to load places library
```
The application's centralized security header policy previously restricted `script-src` and `connect-src` strictly to `'self'`, blocking `@googlemaps/js-api-loader` from fetching the Google Maps JavaScript API, the Places library, and live suggestion endpoints.

---

## Files Changed
1. **`src/proxy.ts`**:
   - `script-src`: Added `https://maps.googleapis.com`.
   - `connect-src`: Added `https://maps.googleapis.com` and `https://places.googleapis.com`.
   - `img-src`: Added `https://maps.googleapis.com` and `https://maps.gstatic.com`.
   - `worker-src`: Added `'self' blob:` for Google Maps vector tiles and web workers.
2. **`scripts/test-location-picker.ts`**:
   - Added automated test asserting the exact presence of required Google Maps & Places origins within `src/proxy.ts`.

---

## Technical Impact & Security Posture
- **No Broad Wildcards:** Avoided `script-src *`, `connect-src *`, or unrestricted hosts. Only the specific Google API endpoints required by Google Maps Platform and Google Places (New) were allowed.
- **Preserved Existing Defenses:** Maintained `'self'`, `default-src 'self'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and dynamically scoped `Permissions-Policy`.
- **Worker Support:** Permitted `blob:` for `worker-src` to support modern Google Maps vector rendering and `AdvancedMarkerElement` pins without triggering CSP worker blocks.

---

## Verification Result
- **Unit / CSP Tests:** `npm test` passed 27/27 tests.
- **Lint Check:** `npx eslint src/proxy.ts scripts/test-location-picker.ts` passed with 0 errors and 0 warnings.
- **Next.js Production Build:** `npm run build` compiled cleanly (code 0) with all 82 routes optimized.

---

## Deployment Status
- Changes staged for commit and push to `main`.
- Vercel production deployment build pending push.

---

## Rollback Notes
If rollback is needed:
Revert the commit touching `src/proxy.ts` to restore previous restrictive headers.
