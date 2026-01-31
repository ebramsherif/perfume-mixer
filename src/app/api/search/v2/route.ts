import { NextRequest, NextResponse } from "next/server";
import { searchFragrancesV2 } from "@/lib/fragranceApiV2";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], source: "none" });
  }

  try {
    const results = await searchFragrancesV2(query);
    return NextResponse.json({
      results,
      source: "fragrantica",
      version: "v2",
    });
  } catch (error) {
    console.error("[Search V2] Error:", error);
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 }
    );
  }
}
