import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/lessons - List all lessons
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const lessons = await prisma.lesson.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: lessons });
  } catch (error) {
    console.error("List lessons error:", error);
    return NextResponse.json({ success: false, error: "Failed to list lessons" }, { status: 500 });
  }
}

// POST /api/admin/lessons - Create a new lesson
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      slug,
      description,
      content,
      contentType,
      difficulty,
      estimatedMinutes,
      hasCodeExercise,
      published,
    } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { success: false, error: "Title and slug are required" },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existing = await prisma.lesson.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A lesson with this slug already exists" },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        slug,
        description: description || null,
        content: content || "",
        contentType: contentType || "ARTICLE",
        difficulty: difficulty || "BEGINNER",
        estimatedMinutes: estimatedMinutes || 10,
        hasCodeExercise: hasCodeExercise || false,
        published: published || false,
      },
    });

    return NextResponse.json({ success: true, data: lesson });
  } catch (error) {
    console.error("Create lesson error:", error);
    return NextResponse.json({ success: false, error: "Failed to create lesson" }, { status: 500 });
  }
}
