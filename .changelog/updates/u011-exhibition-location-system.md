# U011: Exhibition Venue & Location System (Step 1)

**Date:** 2026-09-24  
**Status:** Implemented & Verified  
**Commit:** `3e8c5f5`  
**Deployment Status:** Verified Locally (`npm run build` passed Turbopack build cleanly across 82 routes)  

---

## Short Summary
Added a structured, backward-compatible Venue & Location system to exhibitions across the Exora Exhibition Operations Platform. Allows configuring venue name, street address, city, state, country, and postal code during exhibition creation and editing, while preserving existing unconfigured exhibitions without breaking live operations.

---

## Why the Change Was Made
In preparation for spatial exhibition mapping and geolocation analytics, the platform required structured geographical and venue data beyond simple freeform string fields (`venue` and `address`). This step establishes the persistent data model, server-side Zod validation, and UI input workflows without breaking existing production exhibitions or introducing disruptive map/dashboard redesigns prematurely.

---

## Files Changed
1. `src/types/exhibition.types.ts`: Added `ExhibitionLocation` interface and integrated `location?: ExhibitionLocation | null` into `Exhibition`, `CreateExhibitionInput`, and `UpdateExhibitionInput`.
2. `src/lib/db/models/exhibition.model.ts`: Added `IExhibitionLocation` interface, created non-required `ExhibitionLocationSchema` subdocument with coordinate bounds (-90 to +90 lat, -180 to +180 lng), and attached it to `ExhibitionSchema`. Maintained existing `venue` and `address` fields for full backward compatibility.
3. `src/lib/validators/exhibition.schema.ts`: Defined `exhibitionLocationSchema` with field validation and coordinate range enforcement; required `location` in `createExhibitionSchema`; made `location` optional/nullable in `updateExhibitionSchema`.
4. `src/lib/services/exhibition.service.ts`: Extended `create` to persist `location` and synchronize `doc.venue` and `doc.address`; extended `update` to map `doc.location` and maintain sync with `doc.venue` and `doc.address`.
5. `src/app/(dashboard)/admin/exhibitions/new/page.tsx`: Added dedicated **Venue & Location** form card with inline validation error display for all 6 required location fields.
6. `src/app/(dashboard)/admin/exhibitions/[id]/edit/page.tsx`: Added dedicated **Venue & Location** card displaying *"Location not configured yet"* status for legacy records, permitting edits to unrelated fields without error, and validating and persisting location data when entered.
7. `src/app/(dashboard)/admin/exhibitions/[id]/page.tsx`: Enhanced overview tab to display structured venue name, street address, city, state, country, and postal code with clean fallback to legacy strings when unconfigured.

---

## Technical Impact
- **Data Model & Backward Compatibility:** Existing exhibitions without location objects continue loading and operating with zero regressions (`location` is optional/null on existing records).
- **Dual Compatibility:** When location is updated or created, `venue` and `address` top-level fields are automatically synchronized, ensuring tickets, receipts, and listings continue displaying the venue correctly.
- **Server-Side Validation:** Zod enforces required address fields on creation and validates latitude/longitude bounds whenever coordinates are supplied.
- **Security & Authorization:** Preserved existing RBAC (`super_admin` / `admin` with `canManageExhibitions` and `canCreateExhibitions`) and exhibition scope isolation (`hasExhibitionAccess`).

---

## Verification Result
1. **Automated Schema & Database Tests:**
   - Validated omission of `location` fails `createExhibitionSchema`.
   - Validated incomplete address fields fail `exhibitionLocationSchema`.
   - Validated invalid coordinate bounds (lat > 90, lng < -180) are rejected.
   - Validated MongoDB load of existing exhibition with `location: null` completes with zero errors.
   - Validated exhibition creation with location persists all 6 fields in MongoDB and synchronizes `venue` and `address`.
   - Validated updating location persists changes in MongoDB.
   - Validated updating unrelated fields on an exhibition preserves location data without error.
2. **Build Verification:**
   - `npm run build` passed with zero TypeScript errors and zero warnings across all 82 routes.

---

## Rollback Notes
If rollback is ever required, revert the 7 modified files. No destructive migrations were performed, and the database schema changes are additive.
