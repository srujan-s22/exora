# Exora AGENTS.md

## Project Identity

Exora is a live, production-deployed Exhibition Management Platform built with Next.js, TypeScript, MongoDB Atlas, and Vercel.

It manages:
- exhibition ticketing
- QR-based gate entry
- ride ticketing and ride scanning
- counter staff sales
- admin dashboards and analytics
- staff roles and permissions
- audit logs
- password resets
- notifications
- print layouts and ticket receipts
- system configuration and business settings

This is not a toy project. It is a real production system. Any change must preserve live behaviour and avoid breaking deployed users.

---

## Highest Priority Rule

**Production safety comes first.**

Before making changes:
1. Inspect the existing implementation.
2. Understand the current architecture and data flow.
3. Make the smallest safe change possible.
4. Preserve all current business logic unless the task explicitly requires otherwise.
5. Verify the build before considering the task complete.

If there is any conflict between convenience and production safety, choose production safety.

---

## Core Technology Stack

- Next.js App Router
- TypeScript
- React
- MongoDB Atlas
- Mongoose
- Tailwind CSS
- Vercel deployment
- NextAuth is not used unless already present
- QR scanning in browser using camera access
- HTTP-only auth cookies / JWT session flow
- Role-based and permission-based access control
- Server-side validation with Zod
- Structured audit logging
- Reusable UI primitives and shared components

---

## Application Structure Overview

### Authentication and Access
- Login
- Logout
- Bootstrap / initial super admin setup
- Unauthorized access page
- Role checks
- Permission checks
- Session validation
- HTTP-only auth cookie handling

### Main Roles
- `super_admin`
- `admin`
- `counter`
- `gate`
- `ride`

### Counter Permissions
Counter staff should be controlled using permissions rather than hardcoded assumptions. Examples:
- `canSellEntryTickets`
- `canViewEntrySales`
- `canReprintEntryTickets`
- `canCancelEntryTickets`
- `canSellRideTickets`
- `canViewRideSales`
- `canReprintRideTickets`
- `canCancelRideTickets`

Existing counter users should continue to work through backward-compatible defaults.

---

## Important Product Areas

### Ticketing
- Entry ticket sales
- Ride ticket sales
- Bulk ticket generation
- QR generation
- Ticket validation
- Ticket scans
- Ticket cancellations
- Reprints
- Ticket bundles with one QR representing multiple tickets when configured that way

### Gate and Ride Scanning
- Camera-based QR scanning
- Duplicate scan prevention
- Scan cooldown / lock behaviour
- Atomic quantity tracking
- Friendly scan result display
- Audit logging for every meaningful scan action

### Printing
- Ticket print layouts
- Reprint flow
- Thermal-friendly output
- Configurable paper width / height
- Print preview should match the actual printed output as closely as possible
- Avoid printing full blank pages when only a ticket area is needed

### Dashboard and Analytics
- Admin dashboard
- Staff dashboard
- Counter dashboard
- Gate dashboard
- Ride dashboard
- Analytics and report pages
- Charts, summaries, feeds, and stats
- Use backend aggregation where appropriate
- Prefer fast first paint and good perceived performance

### Admin and Staff Management
- Staff creation
- Staff editing
- Staff permissions
- Role management
- Password reset requests
- Staff profile pages
- Admin configuration pages

### System Settings
- Business info
- System branding
- Printing configuration
- Ticket layout configuration
- Other operational settings

---

## Safety Rules for All Changes

### Do
- Inspect current code before modifying it
- Reuse existing utilities, services, and components
- Keep changes minimal and focused
- Preserve API contracts whenever possible
- Keep UI behaviour consistent
- Add tests or verification steps when appropriate
- Keep production deployment stability in mind
- Use existing folder conventions and naming patterns
- Prefer incremental changes over refactors

### Do Not
- Do not redesign the app unless explicitly requested
- Do not rewrite working modules
- Do not remove production features
- Do not change business rules without clear instruction
- Do not add heavy dependencies without strong justification
- Do not break existing routes, APIs, or data shapes
- Do not weaken auth or permissions
- Do not expose secrets in client code
- Do not commit `.env.local`
- Do not silently delete important functionality
- Do not replace stable flows with experimental ones

---

## Security Rules

Security is critical because Exora is live.

### Authentication
- Keep auth logic secure and production-safe
- Use server-side session validation
- Preserve HTTP-only cookie handling
- Ensure logout fully clears the session
- Do not leak sensitive auth details in client responses

### Authorization
- Always enforce permissions on the server
- Never trust frontend-only checks
- Admin and Super Admin should retain full access unless explicitly restricted
- Counter permissions must be checked through permissions, not UI hiding alone

### Camera Permissions
- Camera access must be allowed only on scanner pages
- Do not grant global camera access unless explicitly intended
- Scanner routes must remain functional
- Do not break QR scanning while hardening browser permissions

### Audit Logs
- Important actions should be logged
- Capture actor, action, target, and timestamp where relevant
- Audit logs must not expose private secrets or raw stack traces

### Secrets
- Never hardcode production secrets
- Validate env variables carefully
- Never expose `JWT_SECRET`, `QR_HMAC_SECRET`, or bootstrap secrets to the client
- Treat `.env.local` as local-only

---

## Scanner and Ticket Flow Rules

### QR Scanning
- Prevent duplicate scan spam
- Use cooldown / lock logic where necessary
- Keep scanner fast and lightweight
- Ensure scans are atomic on the backend
- Use the backend as the source of truth for ticket usage

### Quantity-Based Tickets
- A QR may represent a ticket bundle
- The backend must never allow used count to exceed quantity
- Partial admissions must remain accurate
- Concurrent scans must be protected with atomic updates

### Error Handling
Show friendly operational messages for:
- invalid QR
- expired QR
- already used QR
- cancelled ticket
- duplicate scan
- network issue
- permission issue

Do not surface raw internal stack traces to operators.

---

## Printing Rules

- Keep print output compact and clean
- Avoid printing the entire webpage when only the ticket should print
- Support configurable print dimensions
- Respect system print settings
- Make thermal-style output paper-efficient
- Keep QR clarity high
- Keep ticket print and reprint flows backward compatible

If a change affects printing, test it carefully with the actual print preview flow.

---

## Dashboard and Performance Rules

- Use backend aggregation instead of loading large collections into memory when possible
- Use `Promise.all` for independent queries
- Use `.lean()` for read-only MongoDB queries where appropriate
- Avoid unnecessary re-renders
- Avoid over-fetching data
- Keep dashboard loading states smooth
- Prefer skeletons over blank spinners for better perceived performance

Do not optimize in a way that changes the meaning of dashboard values.

---

## Code Style and Architecture Rules

- Follow the existing file structure
- Reuse existing services, middleware, validators, and utilities
- Keep naming consistent with the current codebase
- Use TypeScript types properly
- Keep components small and understandable
- Avoid introducing duplicate logic
- Keep helper functions reusable

When in doubt, prefer the simplest implementation that preserves existing behaviour.

---

## Backend Rules

### API Design
- Keep API response shapes stable
- Use the existing response utilities
- Use Zod validation where available
- Return proper status codes
- Protect API routes with auth and permission checks

### MongoDB / Mongoose
- Prefer atomic updates for counters and ticket usage
- Use indexes thoughtfully
- Avoid excessive document fetching
- Do not change schemas casually in a way that breaks existing data
- Make schema changes backward compatible

### Services
The following service layers are important and should be reused where possible:
- auth.service.ts
- bootstrap.service.ts
- ticket.service.ts
- ride.service.ts
- sale.service.ts
- staff.service.ts
- exhibition.service.ts
- dashboard.service.ts
- analytics.service.ts
- audit.service.ts
- password-reset.service.ts
- fraud.service.ts
- notification.service.ts

---

## Frontend Rules

- Keep the current UI style and structure
- Preserve responsive layouts
- Use existing shared components whenever possible
- Prefer skeleton loading states over full-page spinners
- Do not break mobile layouts
- Avoid unnecessary visual redesigns
- Keep forms accessible and predictable
- Keep modals, tables, and dashboards consistent

If a page is slow, improve perceived speed without changing the product meaning.

---

## Testing and Verification Rules

Before marking work complete:

1. Run or verify `npm run build`
2. Check for TypeScript errors
3. Confirm the affected pages still work
4. Confirm permission checks still behave correctly
5. Confirm scanner and print flows still work if touched
6. Confirm no unrelated route was broken
7. Confirm production safety

For performance work:
- verify the UI feels faster
- verify metrics remain correct
- verify loading states look right

For security work:
- verify unauthorized access is blocked
- verify secrets and sensitive headers are handled properly
- verify audit and auth flows remain intact

---

## Deployment Awareness

Exora is deployed on Vercel and connected to MongoDB Atlas.

Important:
- Changes may affect live users immediately after deployment
- Be careful with schema changes and security updates
- Avoid destructive database changes unless explicitly requested
- Preserve compatibility with existing production data
- Treat the app as a live service, not a local prototype

---

## Repo Hygiene Rules

Do not commit:
- `.env.local`
- build artifacts such as `tsconfig.tsbuildinfo`
- temporary debug files
- local machine files
- logs
- screenshots
- test dumps

Keep the repository clean and production-ready.

---

## If Asked to Modify the Codebase

When a task is requested:
1. Identify the relevant files
2. Inspect existing implementation first
3. Describe the smallest safe change
4. Make only the needed change
5. Verify impact
6. Keep production behaviour stable

If the request is ambiguous, ask for clarification before making risky assumptions.

---

## Final Principle

Exora should always remain:
- secure
- stable
- production-safe
- maintainable
- fast
- clean
- role-aware
- audit-friendly
- print-safe
- scanner-safe

Every change should make the system better without risking the live deployment.