import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const [row] = await sql()`select 1 as ok`;
    return NextResponse.json({
      status: "online",
      database: row?.ok === 1 ? "ready" : "unknown",
      product: "AI Competitor Intelligence",
      runtime: "vercel-nextjs"
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "online",
        database: "degraded",
        product: "AI Competitor Intelligence",
        detail: error instanceof Error ? error.message : "Database check failed"
      },
      { status: 200 }
    );
  }
}

