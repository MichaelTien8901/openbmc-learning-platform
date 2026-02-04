import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

interface PathWithProgress {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  imageUrl: string | null;
  lessonCount: number;
  enrolled: boolean;
  progress: number;
  prerequisites: Array<{ id: string; slug: string; title: string; completed: boolean }>;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PathWithProgress[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");

    const session = await getSession();

    const paths = await prisma.learningPath.findMany({
      where: {
        published: true,
        ...(difficulty && { difficulty: difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" }),
      },
      include: {
        lessons: {
          include: {
            lesson: {
              select: { id: true },
            },
          },
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
      orderBy: { order: "asc" },
    });

    // Get user progress if logged in
    let completedLessons: Set<string> = new Set();
    let completedPaths: Set<string> = new Set();

    if (session) {
      const progress = await prisma.userProgress.findMany({
        where: {
          userId: session.id,
          status: "COMPLETED",
        },
        select: { lessonId: true },
      });
      completedLessons = new Set(progress.map((p) => p.lessonId));

      const enrollments = await prisma.pathEnrollment.findMany({
        where: {
          userId: session.id,
          completedAt: { not: null },
        },
        select: { pathId: true },
      });
      completedPaths = new Set(enrollments.map((e) => e.pathId));
    }

    const pathsWithProgress: PathWithProgress[] = paths.map((path) => {
      const lessonIds = path.lessons.map((pl) => pl.lesson.id);
      const completedCount = lessonIds.filter((id) => completedLessons.has(id)).length;
      const totalLessons = lessonIds.length;
      const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      return {
        id: path.id,
        slug: path.slug,
        title: path.title,
        description: path.description,
        difficulty: path.difficulty,
        estimatedHours: path.estimatedHours,
        imageUrl: path.imageUrl,
        lessonCount: totalLessons,
        enrolled: Array.isArray(path.enrollments) && path.enrollments.length > 0,
        progress,
        prerequisites: path.prerequisites.map((p) => ({
          id: p.prerequisite.id,
          slug: p.prerequisite.slug,
          title: p.prerequisite.title,
          completed: completedPaths.has(p.prerequisite.id),
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: pathsWithProgress,
    });
  } catch (error) {
    console.error("Get paths error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
