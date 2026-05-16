export type YouTubeVideo = {
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  video_url: string;
  views: number;
  likes: number;
  comments: number;
  engagement_rate: number;
  published_at: string;
  raw_data?: unknown;
};

export type YouTubeChannel = {
  handle: string;
  channel_id: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  uploads_playlist_id?: string | null;
  subscriber_count?: number;
  video_count?: number;
};

export type StrategyInsight = {
  content_theme: string;
  strategy_summary: string;
  virality_reason: string;
  audience_type: string;
  emotional_hook: string;
  confidence_score: number;
  content_style?: string;
  storytelling_patterns?: string[];
  marketing_angle?: string;
  viral_mechanics?: string[];
  positioning_strategy?: string;
  upload_consistency?: string;
  creator_branding?: string;
  strategic_insights?: string[];
  recommended_response?: string[];
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
  };
};

export type ThumbnailInsight = {
  video_id: string;
  visual_hook: string;
  thumbnail_strategy: string;
  text_overlay: string;
  emotion_signal: string;
  improvement_idea: string;
  confidence_score: number;
};

export type StoredCompetitor = {
  id: string;
  handle: string;
  channel_id: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  updated_at?: string;
};

export type KPISet = {
  total_views: number;
  avg_engagement: number;
  videos_analyzed: number;
  ai_insights_generated: number;
  thumbnails_analyzed: number;
};

