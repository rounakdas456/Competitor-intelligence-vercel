# Competitor Intelligence for Vercel

AI-powered competitor intelligence for YouTube channels. This rebuild is a single full-stack Next.js app designed for Vercel, with API routes for ingestion, Gemini analysis, Supabase storage, thumbnail analysis, and AI analyst chat.

## What It Does

- Accepts YouTube handles such as `@MrBeast`
- Fetches recent videos from YouTube Data API v3
- Calculates views, likes, comments, and engagement rate
- Uses Gemini 2.5 Flash for strategic competitor analysis
- Uses Gemini vision input to analyze top video thumbnails on demand
- Stores competitors, videos, insights, thumbnail reports, and chat history in Supabase Postgres
- Shows an interactive SaaS-style dashboard with functional tabs:
  - Strategy
  - Videos
  - Thumbnails
  - Trends
  - AI Analyst

## Architecture

```mermaid
flowchart LR
  User["User"] --> Next["Next.js app on Vercel"]
  Next --> API["Next.js API routes"]
  API --> YouTube["YouTube Data API v3"]
  API --> Gemini["Gemini 2.5 Flash"]
  API --> Supabase["Supabase Postgres"]
  Supabase --> API
  API --> Next
```

## Environment Variables

Create `.env.local` locally and add the same variables in Vercel.

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
DEFAULT_VIDEO_LIMIT=12
```

For Vercel serverless functions, Supabase recommends a pooler connection string. Transaction pooler is ideal for serverless; session pooler also works if your project only exposes that. This app uses `postgres.js` with prepared statements disabled for pooler compatibility.

## Local Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

You want:

```json
{
  "database": "ready"
}
```

## Supabase Tables

The app automatically creates these tables on first API use:

- `ci_competitors`
- `ci_posts`
- `ci_insights`
- `ci_thumbnail_analyses`
- `ci_chat_messages`

The `ci_` prefix avoids conflicts with any older tables already in your Supabase project.

The SQL is also available in:

```text
database/schema.sql
```

## Deploy To Vercel

1. Push this folder to GitHub.
2. Go to Vercel.
3. Click **Add New Project**.
4. Import the GitHub repository.
5. Framework preset: **Next.js**.
6. Root directory:

```text
competitor-intelligence-vercel
```

If your repo contains only this project, leave root directory blank.

7. Add environment variables:

```env
DATABASE_URL=your_supabase_pooler_url
YOUTUBE_API_KEY=your_youtube_key
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
DEFAULT_VIDEO_LIMIT=12
```

8. Deploy.

## API Routes

Analyze core strategy:

```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"handle\":\"@MrBeast\",\"includeThumbnails\":true}"
```

Analyze stored thumbnails:

```bash
curl -X POST https://your-app.vercel.app/api/thumbnails \
  -H "Content-Type: application/json" \
  -d "{\"handle\":\"@MrBeast\",\"limit\":4,\"refresh\":true}"
```

Load stored insights:

```text
GET /api/insights/MrBeast
```

Ask AI Analyst:

```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"handle\":\"@MrBeast\",\"question\":\"Why is this creator growing?\"}"
```

## Deployment Notes

- Do not commit `.env.local`.
- Keep Gemini, YouTube, and database keys only in Vercel environment variables.
- If a long competitor scan times out, lower `DEFAULT_VIDEO_LIMIT` to `8`.
- Thumbnail analysis runs from its own dashboard button/API route so the core scan stays fast on Vercel.
