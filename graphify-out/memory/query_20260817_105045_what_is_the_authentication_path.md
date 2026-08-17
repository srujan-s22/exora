---
type: "query"
date: "2026-08-17T10:50:45.382373+00:00"
question: "What is the authentication path?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["src_app_auth_login_page_loginpage", "src_app_api_auth_login_route_post", "src_lib_services_auth_service_authservice", "src_lib_middleware_with_auth_authenticatedhandler", "src_context_auth_context_authprovider"]
---

# Q: What is the authentication path?

## Answer

The authentication path spans from the login UI (src/app/(auth)/login/page.tsx) to edge routing proxy (src/proxy.ts), rate-limited API validation (src/app/api/auth/login/route.ts), AuthService credential check with constant-time bcrypt timing protection and TOTP MFA verification (src/lib/services/auth.service.ts, src/lib/utils/totp.ts), server-side session tracking in MongoDB (src/lib/services/session.service.ts), HTTP-only JWT cookie issuance (exora-token), real-time session and permission re-hydration via withAuth API middleware (src/lib/middleware/with-auth.ts), and client-side background session polling via AuthProvider (src/context/auth-context.tsx).

## Outcome

- Signal: useful

## Source Nodes

- src_app_auth_login_page_loginpage
- src_app_api_auth_login_route_post
- src_lib_services_auth_service_authservice
- src_lib_middleware_with_auth_authenticatedhandler
- src_context_auth_context_authprovider