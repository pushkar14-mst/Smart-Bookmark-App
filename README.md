# Smart Bookmark App

A real-time bookmark manager built with Next.js that allows users to save, organize, and manage their bookmarks with Google OAuth authentication.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth (Google OAuth)
- **Data Fetching**: SWR
- **Deployment**: Vercel

## Features

- Google OAuth authentication (no email/password required)
- Create bookmarks with URL and title
- Delete bookmarks
- Real-time updates across multiple tabs/devices
- Private bookmarks per user
- Clean, minimal UI

## Problems Faced and Solutions

### 1. Prisma Migration Stuck on Supabase Connection Pooler

**Problem**: Running `npx prisma migrate dev` would hang indefinitely when using the Supabase connection pooler (port 6543).

**Error Message**:

```
Datasource "db": PostgreSQL database "postgres" at "aws-0-us-west-2.pooler.supabase.com:6543"
[Process stuck here]
```

**Root Cause**: Supabase's connection pooler (PgBouncer) operates in transaction mode and doesn't support the persistent connections that Prisma migrations require.

**Solution**: Use Supabase's direct connection (port 5432) for migrations instead of the pooler.

Updated the Prisma schema to support both connection types:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_DIRECT")
}
```

Environment variables configuration:

```env
# Direct connection for migrations (port 5432)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-west-2.compute.amazonaws.com:5432/postgres"

# Pooler connection for application runtime (port 6543)
DATABASE_URL_DIRECT="postgresql://postgres.[ref]:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
```

The `directUrl` is used by Prisma CLI for migrations, while `url` is used by the application at runtime for better connection pooling performance.

### 2. Real-time Updates Not Working with Supabase Realtime

**Problem**: Bookmarks created in one browser tab would not appear in another tab until a hard refresh, despite implementing Supabase Realtime subscriptions.

**Error in Console**:

```
WebSocket connection to 'wss://[project].supabase.co/realtime/v1/websocket' failed:
WebSocket is closed before the connection is established.
```

**Root Cause**: Supabase Realtime requires explicit enablement at the table level in the database replication settings. By default, tables do not broadcast changes via WebSocket.

**Initial Approach**: Attempted to use Supabase Realtime with postgres_changes subscriptions.

**Problem with Initial Approach**:

- Required additional Supabase dashboard configuration
- WebSocket connections can be unreliable in certain network conditions
- Added complexity for a simple use case

**Final Solution**: Switched to SWR with polling for automatic data revalidation.

Implementation:

```typescript
const { data: bookmarks } = useSWR<Bookmark[]>("/api/bookmarks", fetcher, {
  refreshInterval: 2000, // Poll every 2 seconds
  revalidateOnFocus: true, // Refresh when tab gains focus
  revalidateOnReconnect: true, // Refresh on network reconnect
});
```

Benefits of this approach:

- Simpler implementation with no WebSocket configuration needed
- More predictable behavior across different network conditions
- Automatic revalidation on focus/reconnect
- Optimistic updates for better perceived performance

Combined with optimistic updates for delete operations:

```typescript
// Immediately update UI
mutate(
  "/api/bookmarks",
  bookmarks?.filter((b) => b.id !== id),
  false,
);

// Make API call
await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });

// Revalidate to ensure consistency
mutate("/api/bookmarks");
```

### 3. Authentication Token Management in API Routes

**Problem**: Initial implementation couldn't verify user identity in API routes, leading to potential security issues where any authenticated user could access any bookmark.

**Challenge**: Next.js App Router API routes don't have built-in session management like the Pages Router's `getServerSession`.

**Solution**: Implemented token-based authentication using Supabase Auth.

Process:

1. Client obtains session token from Supabase Auth
2. Token is sent in Authorization header with each API request
3. API route verifies token with Supabase and extracts user ID
4. Database queries are scoped to the authenticated user

Implementation:

```typescript
const authHeader = request.headers.get("authorization");
const token = authHeader.replace("Bearer ", "");
const {
  data: { user },
  error,
} = await supabase.auth.getUser(token);

// Use user.id to scope database queries
const bookmarks = await prisma.bookmark.findMany({
  where: { userId: user.id },
});
```

This ensures bookmarks are truly private to each user without requiring complex middleware or session management.

### 4. User Creation Race Condition

**Problem**: When a user first signed in and immediately created a bookmark, the request would fail because the user record didn't exist in the database yet.

**Root Cause**: Google OAuth creates a user session in Supabase Auth, but our application's User table in Prisma is separate and not automatically synchronized.

**Solution**: Implemented an upsert pattern in the bookmark creation endpoint.

```typescript
// Ensure user exists before creating bookmark
await prisma.user.upsert({
  where: { email: user.email! },
  update: {}, // No-op if user exists
  create: {
    id: user.id,
    email: user.email!,
    name: user.user_metadata.full_name,
    image: user.user_metadata.avatar_url,
  },
});

// Now safe to create bookmark
const bookmark = await prisma.bookmark.create({
  data: { url, title, userId: user.id },
});
```

This ensures the user record always exists before any bookmark operations, handling the race condition gracefully.

## Setup Instructions

1. Clone the repository

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables in `.env`:

```env
DATABASE_URL="your-direct-connection-url"
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

4. Run Prisma migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. Configure Google OAuth in Supabase Dashboard:
   - Go to Authentication > Providers > Google
   - Enable Google provider
   - Add authorized redirect URLs

6. Run the development server:

```bash
npm run dev
```

7. Open http://localhost:3000

## Deployment

The app is configured for deployment on Vercel:

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

Ensure the callback URL in Supabase includes your production domain:

```
https://your-app.vercel.app/auth/callback
```

## Key Learnings

- Supabase connection poolers require special handling for Prisma migrations
- SWR polling can be simpler and more reliable than WebSocket subscriptions for basic real-time needs
- Upsert patterns are essential when dealing with third-party authentication providers
- Token-based authentication in Next.js App Router requires manual implementation
- Optimistic updates significantly improve perceived performance in CRUD operations
