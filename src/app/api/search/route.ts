import { NextRequest, NextResponse } from "next/server";
import { searchFragrances } from "@/lib/fragranceApi";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchFragrances(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search API error:", error);

    // Check if it's an API key error
    if (error instanceof Error && error.message.includes("RAPIDAPI_KEY")) {
      return NextResponse.json(
        { error: "API key not configured. Please add RAPIDAPI_KEY to .env.local" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to search perfumes" },
      { status: 500 }
    );
  }
}
