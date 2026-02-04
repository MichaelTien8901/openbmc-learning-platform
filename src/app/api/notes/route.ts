import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/notes - List user's notes (optionally filtered by lesson)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId");

    const where: { userId: string; lessonId?: string } = { userId: session.id };
    if (lessonId) {
      where.lessonId = lessonId;
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: notes.map((n) => ({
        id: n.id,
        lessonId: n.lessonId,
        content: n.content,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        lesson: n.lesson,
      })),
    });
  } catch (error) {
    console.error("List notes error:", error);
    return NextResponse.json({ success: false, error: "Failed to list notes" }, { status: 500 });
  }
}

// POST /api/notes - Create or update a note
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, content } = body;

    if (!lessonId) {
      return NextResponse.json({ success: false, error: "Lesson ID is required" }, { status: 400 });
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
    }

    // Check if lesson exists
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    // Find existing note or create new one
    const existingNote = await prisma.note.findFirst({
      where: {
        userId: session.id,
        lessonId,
      },
    });

    let note;
    if (existingNote) {
      note = await prisma.note.update({
        where: { id: existingNote.id },
        data: { content },
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
    } else {
      note = await prisma.note.create({
        data: {
          userId: session.id,
          lessonId,
          content,
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
    }

    return NextResponse.json({
      success: true,
      data: {
        id: note.id,
        lessonId: note.lessonId,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        lesson: note.lesson,
      },
    });
  } catch (error) {
    console.error("Save note error:", error);
    return NextResponse.json({ success: false, error: "Failed to save note" }, { status: 500 });
  }
}
