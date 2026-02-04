import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/bookmarks - List user's bookmarks
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: session.id },
      include: {
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            difficulty: true,
            estimatedMinutes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: bookmarks.map((b) => ({
        id: b.id,
        lessonId: b.lessonId,
        note: b.note,
        createdAt: b.createdAt,
        lesson: b.lesson,
      })),
    });
  } catch (error) {
    console.error("List bookmarks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list bookmarks" },
      { status: 500 }
    );
  }
}

// POST /api/bookmarks - Create a bookmark
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, note } = body;

    if (!lessonId) {
      return NextResponse.json({ success: false, error: "Lesson ID is required" }, { status: 400 });
    }

    // Check if lesson exists
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    // Check if already bookmarked
    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_lessonId: {
          userId: session.id,
          lessonId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Lesson already bookmarked" },
        { status: 400 }
      );
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        userId: session.id,
        lessonId,
        note: note || null,
      },
      include: {
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: bookmark.id,
        lessonId: bookmark.lessonId,
        note: bookmark.note,
        createdAt: bookmark.createdAt,
        lesson: bookmark.lesson,
      },
    });
  } catch (error) {
    console.error("Create bookmark error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create bookmark" },
      { status: 500 }
    );
  }
}
