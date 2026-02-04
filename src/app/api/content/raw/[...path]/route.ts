import { NextRequest, NextResponse } from "next/server";
import { fetchRawContent, GitHubContentError, DEFAULT_CONFIG } from "@/lib/github";

/**
 * GET /api/content/raw/[...path]
 *
 * Proxy endpoint for fetching raw markdown from GitHub.
 * Handles CORS and caching for direct content rendering.
 *
 * Example: GET /api/content/raw/docs/intro/what-is-openbmc.md
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const path = pathSegments.join("/");

    if (!path) {
      return NextResponse.json({ success: false, error: "Path is required" }, { status: 400 });
    }

    // Security: Only allow markdown files from docs directory
    if (!path.startsWith("docs/") || !path.endsWith(".md")) {
      return NextResponse.json(
        { success: false, error: "Only markdown files from docs/ are allowed" },
        { status: 403 }
      );
    }

    const { content, lastModified } = await fetchRawContent(path, DEFAULT_CONFIG);

    // Return with appropriate headers
    const response = new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });

    if (lastModified) {
      response.headers.set("Last-Modified", lastModified);
    }

    return response;
  } catch (error) {
    console.error("Raw content fetch error:", error);

    if (error instanceof GitHubContentError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ success: false, error: "Failed to fetch content" }, { status: 500 });
  }
}
