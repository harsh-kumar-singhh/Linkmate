# Vercel Environment Setup

## Database Configuration

> [!IMPORTANT]
> `DATABASE_URL` and `DIRECT_URL` are **MANDATORY** for the application to function in production. The project has been updated to use **Supabase** (PostgreSQL) with connection pooling.

1. Open your Vercel dashboard and navigate to **Project Settings → Environment Variables**.
2. Add a new variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Your PostgreSQL connection string (Transaction Pooler, port 6543, with `?pgbouncer=true`).
3. Add another variable for direct connections:
   - **Key**: `DIRECT_URL`
   - **Value**: Your direct PostgreSQL connection string (Session Pooler/Direct, port 5432).
   - **Supabase Note**: If using Supabase, use the connection strings provided in your database settings for pooling and direct connection.
3. Set the **Environment** to **Production**, **Preview**, and **Development**.
4. Click **Save** and redeploy.

## Google & LinkedIn OAuth

To enable authentication providers:

1. In **Environment Variables**, add the following:
   - `GOOGLE_CLIENT_ID` – your Google OAuth client ID.
   - `GOOGLE_CLIENT_SECRET` – your Google OAuth client secret.
   - `LINKEDIN_CLIENT_ID` – your LinkedIn OAuth client ID.
   - `LINKEDIN_CLIENT_SECRET` – your LinkedIn OAuth client secret.
2. Ensure these core variables are also set:
   - `NEXTAUTH_URL` – your production URL (MUST be `https://www.linkmateapp.me` to avoid OAuth errors).
   - `NEXTAUTH_SECRET` – a random 32-character string.
3. Redeploy.

## Build Command

The `package.json` is configured to run `prisma generate` during build. Ensure your build command is simply `npm run build`.

## Verify

- Signup and Login should work without "Server error".
- "Sign in with Google" and "Sign in with LinkedIn" buttons will be visible and functional.
- Check Vercel logs if errors persist.
