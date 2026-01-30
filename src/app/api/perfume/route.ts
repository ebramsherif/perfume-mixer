import { NextRequest, NextResponse } from "next/server";
import { getFragranceById, getSimilarFragrances } from "@/lib/fragranceApi";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url"); // This is the fragrance ID
  const name = searchParams.get("name"); // Optional name hint for better lookup

  if (!url) {
    return NextResponse.json(
      { error: "ID parameter is required" },
      { status: 400 }
    );
  }

  try {
    const [perfume, similar] = await Promise.all([
      getFragranceById(url, name || undefined),
      getSimilarFragrances(url, name || undefined),
    ]);

    if (!perfume) {
      return NextResponse.json(
        { error: "Perfume not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ perfume, similar });
  } catch (error) {
    console.error("Perfume API error:", error);

    if (error instanceof Error && error.message.includes("RAPIDAPI_KEY")) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch perfume" },
      { status: 500 }
    );
  }
}
