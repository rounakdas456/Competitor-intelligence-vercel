import { NextRequest, NextResponse } from "next/server";
import { analyzeStrategy, analyzeThumbnail } from "@/lib/gemini";
import {
  storeInsight,
  storeThumbnailAnalysis,
  upsertCompetitor,
  upsertPosts
} from "@/lib/db";
import { optionalEnv } from "@/lib/env";
import { calculateKpis, normalizeHandle } from "@/lib/metrics";
import { fetchChannelAnalysis } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const handle = normalizeHandle(body.handle || "");
    const includeThumbnails = body.includeThumbnails === true;
    const maxResults = Number(body.maxResults || optionalEnv("DEFAULT_VIDEO_LIMIT", "12"));

    const { channel, videos } = await fetchChannelAnalysis(handle, maxResults);
    const [competitor, analysis] = await Promise.all([
      upsertCompetitor(channel),
      analyzeStrategy(channel, videos)
    ]);

    const posts = await upsertPosts(competitor.id, videos);
    const insight = await storeInsight(competitor.id, channel.handle, analysis);

    const thumbnailRows = [];
    if (includeThumbnails) {
      const rankedVideos = [...videos]
        .filter((video) => video.thumbnail_url)
        .sort((a, b) => b.views - a.views)
        .slice(0, 2);

      for (const video of rankedVideos) {
        try {
          const thumbnail = await analyzeThumbnail(video);
          const post = posts.find((item) => item.video_id === video.video_id);
          const row = await storeThumbnailAnalysis(competitor.id, post?.id || null, thumbnail);
          thumbnailRows.push(row);
        } catch {
          // Thumbnail analysis should enrich the report, not block core strategy output.
        }
      }
    }

    return NextResponse.json({
      handle: channel.handle,
      channel: competitor,
      videos: posts,
      insight,
      thumbnails: thumbnailRows,
      kpis: calculateKpis(posts, 1, thumbnailRows.length),
      storage: { status: "saved" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
