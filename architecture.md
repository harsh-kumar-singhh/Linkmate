# Linkmate System Architecture

This document outlines the core architecture of the Linkmate application, specifically focusing on authentication, integrations, and content scheduling.

## 1. Authentication (`lib/auth.ts`, `lib/auth.config.ts`)

Linkmate uses **NextAuth.js v5** (beta) for authentication.

-   **Logic Location**: `lib/auth.ts` constitutes the primary initialization point.
    -   **Static Config**: exported as `authOptions`.
    -   **Initialization**: `NextAuth(authOptions)` exports `auth`, `signIn`, `signOut`.
    -   **Cookie Strategy**: Explicitly configured for secure cookies in production (`__Secure-` prefix).
    -   **Session Strategy**: JWT-based.
-   **Security**: `middleware.ts` is currently a **NO-OP**. It does NOT handle auth redirects to prevent loop issues.
-   **Session Gating**:
    -   **Backend**: API routes (`app/api/*`) manually call `await auth()` and return 401 if null.
    -   **Frontend**: Components use `useSession()` and check `status === "authenticated"`.

## 2. Integrations

### LinkedIn (`lib/auth.ts`, `app/settings/page.tsx`)

-   **Provider**: OIDC-compliant `LinkedInProvider`.
-   **Configuration**:
    -   **Issuer**: `https://www.linkedin.com/oauth`
    -   **JWKS**: `https://www.linkedin.com/oauth/openid/jwks`
    -   **Scopes**: `openid profile email w_member_social`
-   **Connection Flow**:
    1.  User clicks "Connect LinkedIn" in `app/settings/page.tsx`.
    2.  Redirects to LinkedIn OAuth.
    3.  Callback handled by NextAuth (`api/auth/callback/linkedin`).
    4.  **Profile Mapping**: `profile()` callback in `lib/auth.ts` maps `sub` -> `id` and `picture` -> `image`.
-   **Token Persistence**: Handled automatically by `@auth/prisma-adapter` into the `Account` table.

## 3. Post Scheduling & Publishing

### Data Models
-   `Post`: Stores content, status (`DRAFT`, `SCHEDULED`, `PUBLISHED`), and reference to user.

### Logic Locations
-   **Scheduling API**: `app/api/posts/schedule/route.ts` & `app/api/posts/route.ts`.
    -   Saves post to DB with `scheduledFor` timestamp.
-   **Publishing Logic**: `lib/linkedin.ts`.
    -   `publishToLinkedIn(userId, content)`: Fetches access token from `Account` table and calls LinkedIn API.
-   **Cron Job**: `app/api/scheduler/run/route.ts`.
    -   Called periodically (e.g., via Vercel Cron or heartbeat).
    -   Finds posts where `status === 'SCHEDULED'` and `scheduledFor <= now`.
    -   Calls `publishToLinkedIn`.
    -   Updates status to `PUBLISHED` or `FAILED`.

## 4. Frontend Architecture

### Session Management
-   **Dashboard** (`app/dashboard/page.tsx`): Gates data fetching behind `status === "authenticated"`.
-   **Editor** (`app/posts/new/page.tsx`): Gates saving/generating behind `status === "authenticated"`.

### Key Constraints (DO NOT TOUCH)
-   **Middleware**: Keep as no-op.
-   **Auth Config**: Keep `authOptions` static in `lib/auth.ts`.
-   **API Route Guards**: Always use `await auth()` at the start of protected routes.
