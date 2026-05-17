import { NextResponse } from "next/server";
import { getAnalysisBundle } from "@/lib/db";
import { calculateKpis, normalizeHandle } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  try {
    const params = await context.params;
    const handle = normalizeHandle(decodeURIComponent(params.handle));
    const bundle = await getAnalysisBundle(handle);

    if (!bundle) {
      return NextResponse.json({ error: "Competitor has not been analyzed yet" }, { status: 404 });
    }

    const kpiVideos = bundle.posts.map((post: any) => ({
      views: Number(post.views || 0),
      engagement_rate: Number(post.engagement_rate || 0)
    }));

    return NextResponse.json({
      handle,
      channel: bundle.competitor,
      videos: bundle.posts,
      insights: bundle.insights,
      insight: bundle.insights[0] || null,
      thumbnails: bundle.thumbnails,
      chats: bundle.chats,
      kpis: calculateKpis(kpiVideos, bundle.insights.length, bundle.thumbnails.length),
      storage: { status: "saved" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load insights" },
      { status: 500 }
    );
  }
}
