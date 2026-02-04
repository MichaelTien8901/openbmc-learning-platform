import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

interface PathDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  imageUrl: string | null;
  enrolled: boolean;
  progress: number;
  completedAt: Date | null;
  prerequisites: Array<{ id: string; slug: string; title: string; completed: boolean }>;
  lessons: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    difficulty: string;
    estimatedMinutes: number;
    hasCodeExercise: boolean;
    completed: boolean;
    order: number;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PathDetail>>> {
  try {
    const { id } = await params;
    const session = await getSession();

    const path = await prisma.learningPath.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        published: true,
      },
      include: {
        lessons: {
          include: {
            lesson: {
              select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                difficulty: true,
                estimatedMinutes: true,
                hasCodeExercise: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        prerequisites: {
          include: {
            prerequisite: {
              select: { id: true, slug: true, title: true },
            },
          },
        },
        enrollments: session
          ? {
              where: { userId: session.id },
              take: 1,
            }
          : false,
      },
    });

    if (!path) {
      return NextResponse.json(
        { success: false, error: "Learning path not found" },
        { status: 404 }
      );
    }

    // Get user progress if logged in
    let completedLessons: Set<string> = new Set();
    let completedPaths: Set<string> = new Set();

    if (session) {
      const progress = await prisma.userProgress.findMany({
        where: {
          userId: session.id,
          status: "COMPLETED",
          lessonId: { in: path.lessons.map((pl) => pl.lesson.id) },
        },
        select: { lessonId: true },
      });
      completedLessons = new Set(progress.map((p) => p.lessonId));

      const enrollments = await prisma.pathEnrollment.findMany({
        where: {
          userId: session.id,
          completedAt: { not: null },
          pathId: { in: path.prerequisites.map((p) => p.prerequisiteId) },
        },
        select: { pathId: true },
      });
      completedPaths = new Set(enrollments.map((e) => e.pathId));
    }

    const enrollment = Array.isArray(path.enrollments) ? path.enrollments[0] : null;
    const totalLessons = path.lessons.length;
    const completedCount = path.lessons.filter((pl) => completedLessons.has(pl.lesson.id)).length;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    const pathDetail: PathDetail = {
      id: path.id,
      slug: path.slug,
      title: path.title,
      description: path.description,
      difficulty: path.difficulty,
      estimatedHours: path.estimatedHours,
      imageUrl: path.imageUrl,
      enrolled: !!enrollment,
      progress: progressPercent,
      completedAt: enrollment?.completedAt || null,
      prerequisites: path.prerequisites.map((p) => ({
        id: p.prerequisite.id,
        slug: p.prerequisite.slug,
        title: p.prerequisite.title,
        completed: completedPaths.has(p.prerequisite.id),
      })),
      lessons: path.lessons.map((pl) => ({
        id: pl.lesson.id,
        slug: pl.lesson.slug,
        title: pl.lesson.title,
        description: pl.lesson.description,
        difficulty: pl.lesson.difficulty,
        estimatedMinutes: pl.lesson.estimatedMinutes,
        hasCodeExercise: pl.lesson.hasCodeExercise,
        completed: completedLessons.has(pl.lesson.id),
        order: pl.order,
      })),
    };

    return NextResponse.json({
      success: true,
      data: pathDetail,
    });
  } catch (error) {
    console.error("Get path error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
