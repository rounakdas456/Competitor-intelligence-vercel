import { NextRequest, NextResponse } from "next/server";
import { answerStrategicQuestion } from "@/lib/gemini";
import { getAnalysisBundle, storeChat } from "@/lib/db";
import { normalizeHandle } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const handle = normalizeHandle(body.handle || "");
    const question = String(body.question || "").trim();
    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const bundle = await getAnalysisBundle(handle);
    if (!bundle) {
      return NextResponse.json({ error: "Analyze this competitor before asking the AI analyst" }, { status: 404 });
    }

    const answer = await answerStrategicQuestion({
      question,
      competitor: bundle.competitor,
      videos: bundle.posts,
      insights: bundle.insights,
      thumbnails: bundle.thumbnails
    });

    await storeChat(handle, bundle.competitor.id, question, answer);
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI analyst failed" },
      { status: 500 }
    );
  }
}

