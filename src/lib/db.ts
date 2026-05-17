import postgres from "postgres";
import type { StrategyInsight, ThumbnailInsight, YouTubeChannel, YouTubeVideo } from "./types";

type DbRow = Record<string, any>;
type DbRows = DbRow[];
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

let client: postgres.Sql<any> | null = null;
let schemaReady = false;

function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, toJsonValue(item)])
    );
  }

  return null;
}

export function sql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!client) {
    client = postgres(databaseUrl, {
      max: 3,
      idle_timeout: 10,
      connect_timeout: 20,
      prepare: false
    });
  }
  return client;
}

export async function ensureSchema() {
  if (schemaReady) return;
  const db = sql();

  await db`create extension if not exists pgcrypto`;
  await db`
    create table if not exists ci_competitors (
      id uuid primary key default gen_random_uuid(),
      handle text unique not null,
      channel_id text unique not null,
      title text,
      description text,
      thumbnail_url text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await db`
    create table if not exists ci_posts (
      id uuid primary key default gen_random_uuid(),
      competitor_id uuid not null references ci_competitors(id) on delete cascade,
      video_id text unique not null,
      title text not null,
      description text,
      thumbnail_url text,
      video_url text not null,
      views bigint not null default 0,
      likes bigint not null default 0,
      comments bigint not null default 0,
      engagement_rate numeric not null default 0,
      published_at timestamptz not null,
      raw_data jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await db`
    create table if not exists ci_insights (
      id uuid primary key default gen_random_uuid(),
      competitor_id uuid not null references ci_competitors(id) on delete cascade,
      handle text not null,
      content_theme text,
      strategy_summary text,
      virality_reason text,
      audience_type text,
      emotional_hook text,
      confidence_score numeric not null default 0,
      full_analysis jsonb,
      created_at timestamptz not null default now()
    )
  `;
  await db`
    create table if not exists ci_thumbnail_analyses (
      id uuid primary key default gen_random_uuid(),
      competitor_id uuid not null references ci_competitors(id) on delete cascade,
      post_id uuid references ci_posts(id) on delete cascade,
      video_id text unique not null,
      visual_hook text,
      thumbnail_strategy text,
      text_overlay text,
      emotion_signal text,
      improvement_idea text,
      confidence_score numeric not null default 0,
      full_analysis jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await db`
    create table if not exists ci_chat_messages (
      id uuid primary key default gen_random_uuid(),
      competitor_id uuid references ci_competitors(id) on delete set null,
      handle text not null,
      question text not null,
      answer text not null,
      created_at timestamptz not null default now()
    )
  `;
  await db`create index if not exists idx_posts_competitor_published on ci_posts(competitor_id, published_at desc)`;
  await db`create index if not exists idx_insights_competitor_created on ci_insights(competitor_id, created_at desc)`;
  await db`create index if not exists idx_thumbnail_competitor_created on ci_thumbnail_analyses(competitor_id, created_at desc)`;

  schemaReady = true;
}

export async function upsertCompetitor(channel: YouTubeChannel): Promise<DbRow> {
  await ensureSchema();
  const [competitor] = await sql()`
    insert into ci_competitors (handle, channel_id, title, description, thumbnail_url, updated_at)
    values (${channel.handle}, ${channel.channel_id}, ${channel.title}, ${channel.description}, ${channel.thumbnail_url}, now())
    on conflict (channel_id)
    do update set
      handle = excluded.handle,
      title = excluded.title,
      description = excluded.description,
      thumbnail_url = excluded.thumbnail_url,
      updated_at = now()
    returning *
  `;
  return competitor;
}

export async function upsertPosts(competitorId: string, videos: YouTubeVideo[]): Promise<DbRows> {
  await ensureSchema();
  const rows: DbRows = [];
  for (const video of videos) {
    const rawData = toJsonValue(video.raw_data ?? {});
    const [row] = await sql()`
      insert into ci_posts (
        competitor_id, video_id, title, description, thumbnail_url, video_url,
        views, likes, comments, engagement_rate, published_at, raw_data, updated_at
      )
      values (
        ${competitorId}, ${video.video_id}, ${video.title}, ${video.description}, ${video.thumbnail_url}, ${video.video_url},
        ${video.views}, ${video.likes}, ${video.comments}, ${video.engagement_rate}, ${video.published_at}, ${sql().json(rawData)}, now()
      )
      on conflict (video_id)
      do update set
        title = excluded.title,
        description = excluded.description,
        thumbnail_url = excluded.thumbnail_url,
        video_url = excluded.video_url,
        views = excluded.views,
        likes = excluded.likes,
        comments = excluded.comments,
        engagement_rate = excluded.engagement_rate,
        published_at = excluded.published_at,
        raw_data = excluded.raw_data,
        updated_at = now()
      returning *
    `;
    rows.push(row);
  }
  return rows;
}

export async function storeInsight(competitorId: string, handle: string, analysis: StrategyInsight): Promise<DbRow> {
  await ensureSchema();
  const fullAnalysis = toJsonValue(analysis);
  const [row] = await sql()`
    insert into ci_insights (
      competitor_id, handle, content_theme, strategy_summary, virality_reason,
      audience_type, emotional_hook, confidence_score, full_analysis
    )
    values (
      ${competitorId}, ${handle}, ${analysis.content_theme}, ${analysis.strategy_summary}, ${analysis.virality_reason},
      ${analysis.audience_type}, ${analysis.emotional_hook}, ${analysis.confidence_score || 0}, ${sql().json(fullAnalysis)}
    )
    returning *
  `;
  return row;
}

export async function storeThumbnailAnalysis(
  competitorId: string,
  postId: string | null,
  analysis: ThumbnailInsight
): Promise<DbRow> {
  await ensureSchema();
  const fullAnalysis = toJsonValue(analysis);
  const [row] = await sql()`
    insert into ci_thumbnail_analyses (
      competitor_id, post_id, video_id, visual_hook, thumbnail_strategy,
      text_overlay, emotion_signal, improvement_idea, confidence_score, full_analysis, updated_at
    )
    values (
      ${competitorId}, ${postId}, ${analysis.video_id}, ${analysis.visual_hook}, ${analysis.thumbnail_strategy},
      ${analysis.text_overlay}, ${analysis.emotion_signal}, ${analysis.improvement_idea}, ${analysis.confidence_score || 0},
      ${sql().json(fullAnalysis)}, now()
    )
    on conflict (video_id)
    do update set
      visual_hook = excluded.visual_hook,
      thumbnail_strategy = excluded.thumbnail_strategy,
      text_overlay = excluded.text_overlay,
      emotion_signal = excluded.emotion_signal,
      improvement_idea = excluded.improvement_idea,
      confidence_score = excluded.confidence_score,
      full_analysis = excluded.full_analysis,
      updated_at = now()
    returning *
  `;
  return row;
}

export async function storeChat(
  handle: string,
  competitorId: string | null,
  question: string,
  answer: string
): Promise<DbRow> {
  await ensureSchema();
  const [row] = await sql()`
    insert into ci_chat_messages (handle, competitor_id, question, answer)
    values (${handle}, ${competitorId}, ${question}, ${answer})
    returning *
  `;
  return row;
}

export async function getCompetitorByHandle(handle: string): Promise<DbRow | null> {
  await ensureSchema();
  const [row] = await sql()`select * from ci_competitors where lower(handle) = lower(${handle}) limit 1`;
  return row || null;
}

export async function getAnalysisBundle(handle: string): Promise<{
  competitor: DbRow;
  posts: DbRows;
  insights: DbRows;
  thumbnails: DbRows;
  chats: DbRows;
} | null> {
  await ensureSchema();
  const competitor = await getCompetitorByHandle(handle);
  if (!competitor) return null;

  const [posts, insights, thumbnails, chats] = await Promise.all([
    sql()`select * from ci_posts where competitor_id = ${competitor.id} order by published_at desc limit 30`,
    sql()`select * from ci_insights where competitor_id = ${competitor.id} order by created_at desc limit 10`,
    sql()`select * from ci_thumbnail_analyses where competitor_id = ${competitor.id} order by updated_at desc limit 12`,
    sql()`select * from ci_chat_messages where competitor_id = ${competitor.id} order by created_at desc limit 6`
  ]);

  return { competitor, posts, insights, thumbnails, chats };
}

export async function getCompetitors(): Promise<DbRows> {
  await ensureSchema();
  return sql()`select * from ci_competitors order by updated_at desc limit 20`;
}

