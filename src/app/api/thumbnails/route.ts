import { NextRequest, NextResponse } from "next/server";
import { analyzeThumbnail } from "@/lib/gemini";
import { getAnalysisBundle, storeThumbnailAnalysis } from "@/lib/db";
import { normalizeHandle } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const handle = normalizeHandle(body.handle || "");
    const limit = Number(body.limit || 4);
    const bundle = await getAnalysisBundle(handle);

    if (!bundle) {
      return NextResponse.json({ error: "Analyze this competitor before analyzing thumbnails" }, { status: 404 });
    }

    const existingIds = new Set((bundle.thumbnails || []).map((item: any) => item.video_id));
    const candidates = [...bundle.posts]
      .filter((video: any) => video.thumbnail_url && (!existingIds.has(video.video_id) || body.refresh === true))
      .sort((a: any, b: any) => Number(b.views || 0) - Number(a.views || 0))
      .slice(0, limit);

    const rows = [];
    for (const video of candidates) {
      const thumbnail = await analyzeThumbnail({
        video_id: video.video_id,
        title: video.title,
        description: video.description || "",
        thumbnail_url: video.thumbnail_url,
        video_url: video.video_url,
        views: Number(video.views || 0),
        likes: Number(video.likes || 0),
        comments: Number(video.comments || 0),
        engagement_rate: Number(video.engagement_rate || 0),
        published_at: video.published_at
      });
      rows.push(await storeThumbnailAnalysis(bundle.competitor.id, video.id, thumbnail));
    }

    const updated = await getAnalysisBundle(handle);
    return NextResponse.json({ thumbnails: updated?.thumbnails || rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Thumbnail analysis failed" },
      { status: 500 }
    );
  }
}

