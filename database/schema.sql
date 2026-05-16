create extension if not exists pgcrypto;

create table if not exists ci_competitors (
  id uuid primary key default gen_random_uuid(),
  handle text unique not null,
  channel_id text unique not null,
  title text,
  description text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
);

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
);

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
);

create table if not exists ci_chat_messages (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid references ci_competitors(id) on delete set null,
  handle text not null,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_competitor_published on ci_posts(competitor_id, published_at desc);
create index if not exists idx_insights_competitor_created on ci_insights(competitor_id, created_at desc);
create index if not exists idx_thumbnail_competitor_created on ci_thumbnail_analyses(competitor_id, created_at desc);

