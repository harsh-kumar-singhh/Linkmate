# LinkedIn Scheduler

A LinkedIn-first social media scheduling web application that removes daily posting friction through intelligent batch scheduling and automated publishing.

## Current Status

### ✅ Phase 1: Foundation (COMPLETED)

- [x] Next.js 14+ project initialized with TypeScript
- [x] Tailwind CSS configured with LinkedIn brand colors
- [x] App Router structure set up
- [x] Beautiful landing page with modern design
- [x] Prisma database schema configured
- [x] NextAuth.js authentication setup
- [x] Beautiful login/signup pages (Steve Jobs style - simple & attractive)
- [x] Dashboard with working buttons and data display
- [x] Protected routes with middleware
- [x] Posts API endpoints

## Project Structure

```
linkedin-scheduler/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   └── signup/route.ts
│   │   └── posts/route.ts
│   ├── dashboard/page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   └── globals.css
├── lib/
│   ├── prisma.ts
│   └── auth.ts
├── prisma/
│   └── schema.prisma
├── types/
│   └── next-auth.d.ts
├── middleware.ts
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

1. Create a PostgreSQL database (use Neon, Supabase, or local PostgreSQL)
2. Copy `.env.example` to `.env.local`
3. Update `DATABASE_URL` in `.env.local`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
```

### 3. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Set Up Environment Variables

Create `.env.local` file with:

```env
# Database
DATABASE_URL="your-database-url"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# LinkedIn OAuth (Optional - for LinkedIn sign-in)
LINKEDIN_CLIENT_ID="your-linkedin-app-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-app-secret"
```

To generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Features Implemented

### Authentication
- ✅ Email/password signup and login
- ✅ LinkedIn OAuth integration (ready)
- ✅ Protected routes with middleware
- ✅ Session management

### Dashboard
- ✅ Beautiful, modern UI design
- ✅ Stats cards (Total Posts, Scheduled, Published)
- ✅ Quick action buttons (Create Post, Batch Create, View Calendar)
- ✅ Recent posts display
- ✅ Empty states with call-to-action

### Data Management
- ✅ Posts API (GET, POST)
- ✅ Database schema with Prisma
- ✅ Professional data storage
- ✅ User authentication and authorization

## Next Steps

- [ ] Create post editor page
- [ ] Implement post scheduling
- [ ] Create calendar view
- [ ] Batch post creation
- [ ] LinkedIn API integration
- [ ] Background job queue (BullMQ)
- [ ] Automated publishing

## Development

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm start       # Start production server
npx prisma studio  # Open Prisma Studio to view database
```

