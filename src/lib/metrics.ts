import type { KPISet, YouTubeVideo } from "./types";

export function normalizeHandle(handle: string): string {
  const clean = handle.trim();
  if (!clean) throw new Error("YouTube handle is required");
  return clean.startsWith("@") ? clean : `@${clean}`;
}

export function calculateKpis(
  videos: Array<Pick<YouTubeVideo, "views" | "engagement_rate">>,
  insightCount = 1,
  thumbnailCount = 0
): KPISet {
  const totalViews = videos.reduce((sum, video) => sum + Number(video.views || 0), 0);
  const avgEngagement = videos.length
    ? videos.reduce((sum, video) => sum + Number(video.engagement_rate || 0), 0) / videos.length
    : 0;

  return {
    total_views: totalViews,
    avg_engagement: Number(avgEngagement.toFixed(2)),
    videos_analyzed: videos.length,
    ai_insights_generated: insightCount,
    thumbnails_analyzed: thumbnailCount
  };
}

export function parseJsonFromText<T>(text: string): T {
  const cleaned = text.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response was not valid JSON");
    return JSON.parse(match[0]) as T;
  }
}

