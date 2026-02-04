import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/paths - List all paths
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const paths = await prisma.learningPath.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ success: true, data: paths });
  } catch (error) {
    console.error("List paths error:", error);
    return NextResponse.json({ success: false, error: "Failed to list paths" }, { status: 500 });
  }
}

interface LessonOrder {
  lessonId: string;
  order: number;
}

// POST /api/admin/paths - Create a new path
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, description, difficulty, estimatedHours, published, order, lessons } =
      body;

    if (!title || !slug) {
      return NextResponse.json(
        { success: false, error: "Title and slug are required" },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existing = await prisma.learningPath.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A path with this slug already exists" },
        { status: 400 }
      );
    }

    // Get max order if not specified
    let pathOrder = order;
    if (pathOrder === undefined) {
      const maxOrder = await prisma.learningPath.aggregate({
        _max: { order: true },
      });
      pathOrder = (maxOrder._max.order ?? -1) + 1;
    }

    const path = await prisma.learningPath.create({
      data: {
        title,
        slug,
        description: description || null,
        difficulty: difficulty || "BEGINNER",
        estimatedHours: estimatedHours || 1,
        published: published || false,
        order: pathOrder,
        lessons: lessons
          ? {
              create: (lessons as LessonOrder[]).map((l: LessonOrder, index: number) => ({
                lessonId: l.lessonId,
                order: l.order ?? index,
              })),
            }
          : undefined,
      },
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

    return NextResponse.json({
      success: true,
      data: {
        id: path.id,
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
    console.error("Create path error:", error);
    return NextResponse.json({ success: false, error: "Failed to create path" }, { status: 500 });
  }
}
