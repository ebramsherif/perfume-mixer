import { NextRequest, NextResponse } from "next/server";
import { getFragranceById, getSimilarFragrances } from "@/lib/fragranceApi";
import { getFragranceByIdV2 } from "@/lib/fragranceApiV2";
import { SearchResult } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url"); // This is the fragrance ID or Fragrantica URL
  const name = searchParams.get("name"); // Optional name hint for better lookup
  const brand = searchParams.get("brand"); // Optional brand
  const imageUrl = searchParams.get("imageUrl"); // Optional image URL

  if (!url) {
    return NextResponse.json(
      { error: "ID parameter is required" },
      { status: 400 }
    );
  }

  // Check if this is a Fragrantica URL (v2)
  const isFragranticaUrl = url.includes("fragrantica.com");

  try {
    let perfume;
    let similar: SearchResult[] = [];

    if (isFragranticaUrl) {
      // V2: Scrape from Fragrantica
      console.log("[Perfume API] Using V2 for Fragrantica URL:", url);

      // Extract ID from URL
      const idMatch = url.match(/-(\d+)\.html$/);
      const id = idMatch ? idMatch[1] : url;

      const searchResult: SearchResult = {
        id,
        name: name || "",
        brand: brand || "",
        imageUrl: imageUrl || undefined,
        url,
      };

      perfume = await getFragranceByIdV2(searchResult);

      // For similar fragrances, we'd need to scrape more - skip for now
      // or fall back to v1 search based on notes
    } else {
      // V1: Use RapidAPI
      console.log("[Perfume API] Using V1 for ID:", url);
      [perfume, similar] = await Promise.all([
        getFragranceById(url, name || undefined),
        getSimilarFragrances(url, name || undefined),
      ]);
    }

    if (!perfume) {
      return NextResponse.json(
        { error: "Perfume not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ perfume, similar, source: isFragranticaUrl ? "fragrantica" : "rapidapi" });
  } catch (error) {
    console.error("Perfume API error:", error);

    if (error instanceof Error && error.message.includes("RAPIDAPI_KEY")) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    if (error instanceof Error && error.message.includes("FIRECRAWL_API_KEY")) {
      return NextResponse.json(
        { error: "Firecrawl API key not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch perfume" },
      { status: 500 }
    );
  }
}
