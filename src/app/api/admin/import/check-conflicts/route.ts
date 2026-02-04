import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

interface ConflictCheckRequest {
  items: Array<{
    title: string;
    slug: string;
    type: "lesson" | "path";
  }>;
}

interface ConflictInfo {
  slug: string;
  type: "lesson" | "path";
  existingId: string;
  existingTitle: string;
  newTitle: string;
  conflictType: "slug" | "title";
}

interface ConflictCheckResponse {
  conflicts: ConflictInfo[];
  clean: Array<{ slug: string; type: "lesson" | "path" }>;
}

/**
 * POST /api/admin/import/check-conflicts
 * Check for conflicts before importing content
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ConflictCheckResponse>>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body: ConflictCheckRequest = await request.json();
    const conflicts: ConflictInfo[] = [];
    const clean: Array<{ slug: string; type: "lesson" | "path" }> = [];

    // Check each item for conflicts
    for (const item of body.items) {
      if (item.type === "lesson") {
        // Check for slug conflict
        const existingBySlug = await prisma.lesson.findUnique({
          where: { slug: item.slug },
          select: { id: true, title: true },
        });

        if (existingBySlug) {
          conflicts.push({
            slug: item.slug,
            type: "lesson",
            existingId: existingBySlug.id,
            existingTitle: existingBySlug.title,
            newTitle: item.title,
            conflictType: "slug",
          });
          continue;
        }

        // Check for title conflict (exact match)
        const existingByTitle = await prisma.lesson.findFirst({
          where: { title: { equals: item.title, mode: "insensitive" } },
          select: { id: true, title: true, slug: true },
        });

        if (existingByTitle) {
          conflicts.push({
            slug: item.slug,
            type: "lesson",
            existingId: existingByTitle.id,
            existingTitle: existingByTitle.title,
            newTitle: item.title,
            conflictType: "title",
          });
          continue;
        }

        clean.push({ slug: item.slug, type: "lesson" });
      } else if (item.type === "path") {
        // Check for path slug conflict
        const existingBySlug = await prisma.learningPath.findUnique({
          where: { slug: item.slug },
          select: { id: true, title: true },
        });

        if (existingBySlug) {
          conflicts.push({
            slug: item.slug,
            type: "path",
            existingId: existingBySlug.id,
            existingTitle: existingBySlug.title,
            newTitle: item.title,
            conflictType: "slug",
          });
          continue;
        }

        // Check for title conflict
        const existingByTitle = await prisma.learningPath.findFirst({
          where: { title: { equals: item.title, mode: "insensitive" } },
          select: { id: true, title: true, slug: true },
        });

        if (existingByTitle) {
          conflicts.push({
            slug: item.slug,
            type: "path",
            existingId: existingByTitle.id,
            existingTitle: existingByTitle.title,
            newTitle: item.title,
            conflictType: "title",
          });
          continue;
        }

        clean.push({ slug: item.slug, type: "path" });
      }
    }

    return NextResponse.json({
      success: true,
      data: { conflicts, clean },
    });
  } catch (error) {
    console.error("Conflict check error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check conflicts" },
      { status: 500 }
    );
  }
}
