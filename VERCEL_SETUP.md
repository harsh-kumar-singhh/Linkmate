# Vercel Environment Setup

## Database Configuration

> [!IMPORTANT]
> `DATABASE_URL` is **MANDATORY** for the application to function in production. Without it, Prisma will fail to initialize, causing login and signup errors.

1. Open your Vercel dashboard and navigate to **Project Settings → Environment Variables**.
2. Add a new variable:
   - **Key**: `DATABASE_URL`
   - **Value**: `file:./dev.db` (for SQLite) or your hosted database connection string.
   - **Note**: SQLite files on Vercel are ephemeral and will be reset on every deployment. For persistence, use a hosted database.
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
   - `NEXTAUTH_URL` – your production URL (e.g., `https://your-project.vercel.app`).
   - `NEXTAUTH_SECRET` – a random 32-character string.
3. Redeploy.

## Build Command

The `package.json` is configured to run `prisma generate` during build. Ensure your build command is simply `npm run build`.

## Verify

- Signup and Login should work without "Server error".
- "Sign in with Google" and "Sign in with LinkedIn" buttons will be visible and functional.
- Check Vercel logs if errors persist.
