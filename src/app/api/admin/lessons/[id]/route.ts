import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/lessons/[id] - Get a single lesson
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lesson });
  } catch (error) {
    console.error("Get lesson error:", error);
    return NextResponse.json({ success: false, error: "Failed to get lesson" }, { status: 500 });
  }
}

// PUT /api/admin/lessons/[id] - Update a lesson
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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

    // Check if lesson exists
    const existing = await prisma.lesson.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    // Check for duplicate slug if changed
    if (slug && slug !== existing.slug) {
      const duplicateSlug = await prisma.lesson.findUnique({ where: { slug } });
      if (duplicateSlug) {
        return NextResponse.json(
          { success: false, error: "A lesson with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Create version before updating (if content changed)
    const contentChanged =
      (content && content !== existing.content) ||
      (title && title !== existing.title) ||
      (description !== undefined && description !== existing.description);

    if (contentChanged) {
      // Get latest version number
      const latestVersion = await prisma.contentVersion.findFirst({
        where: { entityType: "lesson", entityId: id },
        orderBy: { version: "desc" },
      });

      const nextVersion = (latestVersion?.version || 0) + 1;

      // Save current state as new version
      await prisma.contentVersion.create({
        data: {
          entityType: "lesson",
          entityId: id,
          version: nextVersion,
          content: {
            title: existing.title,
            slug: existing.slug,
            description: existing.description,
            content: existing.content,
            difficulty: existing.difficulty,
            estimatedMinutes: existing.estimatedMinutes,
          },
          changedBy: session.id,
        },
      });
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        slug: slug ?? existing.slug,
        description: description !== undefined ? description : existing.description,
        content: content ?? existing.content,
        contentType: contentType ?? existing.contentType,
        difficulty: difficulty ?? existing.difficulty,
        estimatedMinutes: estimatedMinutes ?? existing.estimatedMinutes,
        hasCodeExercise: hasCodeExercise ?? existing.hasCodeExercise,
        published: published ?? existing.published,
      },
    });

    return NextResponse.json({ success: true, data: lesson });
  } catch (error) {
    console.error("Update lesson error:", error);
    return NextResponse.json({ success: false, error: "Failed to update lesson" }, { status: 500 });
  }
}

// DELETE /api/admin/lessons/[id] - Delete a lesson
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if lesson exists
    const existing = await prisma.lesson.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    await prisma.lesson.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Lesson deleted" });
  } catch (error) {
    console.error("Delete lesson error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete lesson" }, { status: 500 });
  }
}
