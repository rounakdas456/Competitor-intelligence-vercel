import { NextResponse } from "next/server";
import { getCompetitors } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const competitors = await getCompetitors();
    return NextResponse.json({ competitors });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load competitors" },
      { status: 500 }
    );
  }
}

