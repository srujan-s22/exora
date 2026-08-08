# Update U006: Device & Session Management System

**Date:** 2026-08-08  
**Status:** Implemented  
**Author:** AntiGravity Security Architecture Team  

---

## Executive Summary

Implemented an enterprise-grade Device & Session Management system in Exora. This update extends JWT-based cookie authentication with a server-side MongoDB `Session` tracking layer, allowing active session inspection, device metadata identification (OS, browser, IP, location label), individual session revocation, and bulk "Logout Other Devices" functionality for Super Admins and authorized staff while guaranteeing 100% backward compatibility.

---

## Why The Change Was Made

Prior to this update, Exora relied strictly on client-side cookie deletion for logout. A compromised or stolen JWT token remained valid until its 8-hour expiration date. To meet production security standards for high-value exhibition operations:
1. Super Admins and account owners needed visibility into all active device sessions.
2. Immediate server-side session revocation capability was required to instantly block compromised credentials.
3. System-wide active session monitoring was required for security auditing and suspicious activity control.

---

## Key Technical Changes

### 1. MongoDB Session Model & Database Schema
- **`src/lib/db/models/session.model.ts`**: Created Mongoose schema for `Session` with fields:
  - `sessionId` (UUID v4)
  - `userId` (ref `User`)
  - `role`, `deviceName`, `browserName`, `browserVersion`, `osName`, `osVersion`, `ipAddress`, `userAgent`, `locationLabel`
  - `createdAt`, `lastSeenAt`, `expiresAt`, `revokedAt`, `revokedBy`, `revokeReason`, `isRevoked`, `loginMethod`, `authVersion`
- Added compound indexes for high-throughput lookups: `{ sessionId: 1 }`, `{ userId: 1, isRevoked: 1, expiresAt: 1 }`.

### 2. Device Parsing Utility
- **`src/lib/utils/device-parser.ts`**: Built lightweight, zero-dependency User-Agent parser extracting browser name/version, OS name/version, and device type (Desktop, iPhone, iPad, Android).

### 3. Session Service & Performance Throttling
- **`src/lib/services/session.service.ts`**: Updated `listUserSessions` to default to querying active (non-revoked and non-expired) sessions (`isRevoked: false, expiresAt: { $gt: now }`), matching the system-wide active sessions view and eliminating obsolete revoked device cards from the user's "Active Device Sessions" panel.

### 4. Auth & Middleware Integration
- **`src/lib/services/auth.service.ts` & `src/app/api/auth/mfa/verify/route.ts`**: Embedded `sid` (session ID) in signed JWT payload on login and MFA verification.
- **`src/lib/middleware/with-auth.ts`**: Checked `sid` against MongoDB via `SessionService.validateSession(sid)`. Rejects revoked sessions immediately with HTTP 401 `SESSION_REVOKED` and attaches a `Set-Cookie` header to immediately destroy `exora-token` on the client browser. Re-hydrates current user permissions from MongoDB database for `admin` accounts so permission updates (such as granting `canManageSessions`) take effect in real-time without requiring a user logout/re-login.
- **`src/app/api/auth/me/route.ts`**: Purges `exora-token` cookie with `Set-Cookie` Max-Age=0 header when verifying a revoked or invalid token.
- **`src/app/api/auth/logout/route.ts`**: Calls `SessionService.revokeSession()` prior to purging the HTTP-only cookie.
- **`src/components/providers/auth-provider.tsx`**: Implemented active background session polling (every 10 seconds) and tab visibility listeners (`visibilitychange`/`focus`). Upon detecting a 401/revoked session response, clears auth state immediately via a clean `userRef` tracking check (avoiding synchronous `setState` calls during render), shows a `"Session Revoked"` toast notification, and redirects the user to `/login?reason=session_revoked`.
- **`src/app/(auth)/login/page.tsx`**: Displays an explicit notification banner when redirected with `reason=session_revoked`.

### 5. API Endpoints
- **`GET /api/auth/sessions`**: List active sessions for authenticated user.
- **`POST /api/auth/sessions/revoke-others`**: Revoke all other active sessions for user.
- **`POST /api/auth/sessions/[id]/revoke`**: Revoke single session.
- **`GET /api/admin/sessions`**: System-wide active sessions view for Super Admins and authorized admins with `canManageSessions` permission.

### 6. User Interface & Staff Permissions Management
- **`src/app/(dashboard)/admin/staff/[id]/permissions/page.tsx`**: Added "Manage Active Sessions & Security" (`canManageSessions`) toggle under Admin System Permissions so Super Admins can grant or revoke full system-wide session control for individual Admin accounts.
- **`src/app/(dashboard)/admin/staff/page.tsx`**: Added "Manage Active Sessions" permission checkbox to the Admin Creation modal.
- **`src/app/(dashboard)/admin/settings/page.tsx`**: Added "Active Sessions & Security" tab with 100% feature symmetry between Super Admins and Admins with `canManageSessions`:
  - Account session inspection with "Logout Other Devices" bulk action and individual device revocation.
  - System-wide active sessions view with real-time user, staff ID, device metadata, IP searching, and remote session revocation capabilities.
  - Protected badge rendering for Super Admin rows when viewed by Admin accounts.
- **`src/app/api/auth/sessions/[id]/revoke/route.ts`**: Enforced protection rule preventing Admin accounts (even with `canManageSessions` permission enabled) from revoking Super Admin sessions (HTTP 403 `FORBIDDEN`).
- **`src/lib/config/roles.ts`**: Exported `resolvePermissions()` helper to standardize role and permission fallback resolution across API middleware.

---

## Verification & Build Results

- **`npm run build`**: Succeeded cleanly with zero TypeScript errors or Next.js build issues.
- **Backward Compatibility**: Non-session-embedded JWT tokens continue to validate smoothly during transition, preserving live user sessions without disruption.

---

## File Summary

| File | Type | Purpose |
| :--- | :--- | :--- |
| `src/lib/db/models/session.model.ts` | **New** | Mongoose schema & model for server-side sessions |
| `src/lib/utils/device-parser.ts` | **New** | User-Agent and IP location parser |
| `src/lib/services/session.service.ts` | **New** | Core service for creating, validating, revoking sessions |
| `src/app/api/auth/sessions/route.ts` | **New** | API route for listing user sessions |
| `src/app/api/auth/sessions/revoke-others/route.ts` | **New** | API route for bulk logout of other devices |
| `src/app/api/auth/sessions/[id]/revoke/route.ts` | **New** | API route for revoking a single session |
| `src/app/api/admin/sessions/route.ts` | **New** | API route for Super Admin & authorized admin system-wide session inspection |
| `src/lib/config/roles.ts` | **Modified** | Added `canManageSessions` permission and permission matrix |
| `src/lib/db/models/user.model.ts` | **Modified** | Added `canManageSessions` to user permission schema |
| `src/lib/validators/staff.schema.ts` | **Modified** | Added `canManageSessions` to staff validation schema |
| `src/lib/utils/constants.ts` | **Modified** | Added session audit log actions and target type |
| `src/types/auth.types.ts` | **Modified** | Added `sid` to `JwtPayload` and defined `DeviceSession` |
| `src/lib/services/auth.service.ts` | **Modified** | Embedded `sid` on login and validated `sid` in `verifyToken` |
| `src/app/api/auth/mfa/verify/route.ts` | **Modified** | Embedded `sid` on MFA verification |
| `src/app/api/auth/logout/route.ts` | **Modified** | Server-side session revocation on logout |
| `src/lib/middleware/with-auth.ts` | **Modified** | Enforced session revocation checks on API routes |
| `src/app/(dashboard)/admin/staff/[id]/permissions/page.tsx` | **Modified** | Added `canManageSessions` toggle for Admin permissions |
| `src/app/(dashboard)/admin/staff/page.tsx` | **Modified** | Added `canManageSessions` checkbox to admin creation modal |
| `src/app/(dashboard)/admin/settings/page.tsx` | **Modified** | Added Active Sessions & Security tab UI |
