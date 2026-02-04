import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/paths/[id] - Get a single path with lessons
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const path = await prisma.learningPath.findUnique({
      where: { id },
      include: {
        lessons: {
          include: {
            lesson: {
              select: { id: true, title: true, slug: true },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!path) {
      return NextResponse.json({ success: false, error: "Path not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        path: {
          id: path.id,
          slug: path.slug,
          title: path.title,
          description: path.description,
          difficulty: path.difficulty,
          estimatedHours: path.estimatedHours,
          published: path.published,
          order: path.order,
        },
        lessons: path.lessons.map((pl) => ({
          lessonId: pl.lessonId,
          order: pl.order,
          lesson: pl.lesson,
        })),
      },
    });
  } catch (error) {
    console.error("Get path error:", error);
    return NextResponse.json({ success: false, error: "Failed to get path" }, { status: 500 });
  }
}

interface LessonOrder {
  lessonId: string;
  order: number;
}

// PUT /api/admin/paths/[id] - Update a path
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, slug, description, difficulty, estimatedHours, published, order, lessons } =
      body;

    // Check if path exists
    const existing = await prisma.learningPath.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Path not found" }, { status: 404 });
    }

    // Check for duplicate slug if changed
    if (slug && slug !== existing.slug) {
      const duplicateSlug = await prisma.learningPath.findUnique({ where: { slug } });
      if (duplicateSlug) {
        return NextResponse.json(
          { success: false, error: "A path with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Update path and lessons in a transaction
    const updatedPath = await prisma.$transaction(async (tx) => {
      // Update path
      await tx.learningPath.update({
        where: { id },
        data: {
          title: title ?? existing.title,
          slug: slug ?? existing.slug,
          description: description !== undefined ? description : existing.description,
          difficulty: difficulty ?? existing.difficulty,
          estimatedHours: estimatedHours ?? existing.estimatedHours,
          published: published ?? existing.published,
          order: order ?? existing.order,
        },
      });

      // Update lessons if provided
      if (lessons !== undefined) {
        // Delete existing path lessons
        await tx.pathLesson.deleteMany({
          where: { pathId: id },
        });

        // Create new path lessons
        if (lessons.length > 0) {
          await tx.pathLesson.createMany({
            data: (lessons as LessonOrder[]).map((l: LessonOrder, index: number) => ({
              pathId: id,
              lessonId: l.lessonId,
              order: l.order ?? index,
            })),
          });
        }
      }

      // Return path with lessons
      return tx.learningPath.findUnique({
        where: { id },
        include: {
          lessons: {
            include: {
              lesson: {
                select: { id: true, title: true, slug: true },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        path: {
          id: updatedPath!.id,
          slug: updatedPath!.slug,
          title: updatedPath!.title,
          description: updatedPath!.description,
          difficulty: updatedPath!.difficulty,
          estimatedHours: updatedPath!.estimatedHours,
          published: updatedPath!.published,
          order: updatedPath!.order,
        },
        lessons: updatedPath!.lessons.map((pl) => ({
          lessonId: pl.lessonId,
          order: pl.order,
          lesson: pl.lesson,
        })),
      },
    });
  } catch (error) {
    console.error("Update path error:", error);
    return NextResponse.json({ success: false, error: "Failed to update path" }, { status: 500 });
  }
}

// DELETE /api/admin/paths/[id] - Delete a path
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

    // Check if path exists
    const existing = await prisma.learningPath.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Path not found" }, { status: 404 });
    }

    await prisma.learningPath.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Path deleted" });
  } catch (error) {
    console.error("Delete path error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete path" }, { status: 500 });
  }
}
