import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

interface PathLessonInfo {
  slug: string;
  title: string;
  completed: boolean;
}

interface LessonDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  contentType: string;
  difficulty: string;
  estimatedMinutes: number;
  hasCodeExercise: boolean;
  completed: boolean;
  lastPosition: number;
  path: {
    id: string;
    slug: string;
    title: string;
  } | null;
  pathLessons: PathLessonInfo[];
  currentLessonIndex: number;
  prevLesson: { slug: string; title: string } | null;
  nextLesson: { slug: string; title: string } | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<LessonDetail>>> {
  try {
    const { id } = await params;
    const session = await getSession();

    const lesson = await prisma.lesson.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        published: true,
      },
      include: {
        pathLessons: {
          include: {
            path: {
              select: { id: true, slug: true, title: true },
            },
          },
          take: 1,
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    // Get user progress
    let completed = false;
    let lastPosition = 0;

    if (session) {
      const progress = await prisma.userProgress.findUnique({
        where: {
          userId_lessonId: {
            userId: session.id,
            lessonId: lesson.id,
          },
        },
      });

      if (progress) {
        completed = progress.status === "COMPLETED";
        lastPosition = progress.lastPosition;
      }
    }

    // Get path context and navigation
    const pathLesson = lesson.pathLessons[0];
    let prevLesson = null;
    let nextLesson = null;
    let pathLessons: PathLessonInfo[] = [];
    let currentLessonIndex = -1;

    if (pathLesson) {
      const allPathLessons = await prisma.pathLesson.findMany({
        where: { pathId: pathLesson.pathId },
        include: {
          lesson: {
            select: { id: true, slug: true, title: true },
          },
        },
        orderBy: { order: "asc" },
      });

      // Get completion status for all lessons in path if user is logged in
      const progressMap = new Map<string, boolean>();
      if (session) {
        const lessonIds = allPathLessons.map((pl) => pl.lesson.id);
        const progressRecords = await prisma.userProgress.findMany({
          where: {
            userId: session.id,
            lessonId: { in: lessonIds },
            status: "COMPLETED",
          },
          select: { lessonId: true },
        });
        progressRecords.forEach((p) => progressMap.set(p.lessonId, true));
      }

      currentLessonIndex = allPathLessons.findIndex((pl) => pl.lessonId === lesson.id);

      if (currentLessonIndex > 0) {
        const prev = allPathLessons[currentLessonIndex - 1];
        prevLesson = { slug: prev.lesson.slug, title: prev.lesson.title };
      }
      if (currentLessonIndex < allPathLessons.length - 1) {
        const next = allPathLessons[currentLessonIndex + 1];
        nextLesson = { slug: next.lesson.slug, title: next.lesson.title };
      }

      pathLessons = allPathLessons.map((pl) => ({
        slug: pl.lesson.slug,
        title: pl.lesson.title,
        completed: progressMap.get(pl.lesson.id) || false,
      }));
    }

    const lessonDetail: LessonDetail = {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      contentType: lesson.contentType,
      difficulty: lesson.difficulty,
      estimatedMinutes: lesson.estimatedMinutes,
      hasCodeExercise: lesson.hasCodeExercise,
      completed,
      lastPosition,
      path: pathLesson
        ? {
            id: pathLesson.path.id,
            slug: pathLesson.path.slug,
            title: pathLesson.path.title,
          }
        : null,
      pathLessons,
      currentLessonIndex,
      prevLesson,
      nextLesson,
    };

    return NextResponse.json({
      success: true,
      data: lessonDetail,
    });
  } catch (error) {
    console.error("Get lesson error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
