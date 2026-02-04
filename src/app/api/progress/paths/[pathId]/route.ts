import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface PathProgress {
  path: {
    id: string;
    slug: string;
    title: string;
    description: string;
    difficulty: string;
    estimatedHours: number;
  };
  enrolledAt: string;
  completedAt: string | null;
  overallProgress: number;
  lessonsCompleted: number;
  totalLessons: number;
  quizzesCompleted: number;
  averageQuizScore: number | null;
  totalTimeSpent: number;
  lessons: Array<{
    id: string;
    slug: string;
    title: string;
    order: number;
    estimatedMinutes: number;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    completedAt: string | null;
    quizScore: number | null;
  }>;
}

// GET /api/progress/paths/[pathId] - Get detailed progress for a specific path
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pathId: string }> }
): Promise<NextResponse> {
  try {
    const { pathId } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Find enrollment
    const enrollment = await prisma.pathEnrollment.findFirst({
      where: {
        userId: session.id,
        OR: [{ pathId }, { path: { slug: pathId } }],
      },
      include: {
        path: {
          include: {
            lessons: {
              include: {
                lesson: {
                  select: {
                    id: true,
                    slug: true,
                    title: true,
                    estimatedMinutes: true,
                  },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: "You are not enrolled in this path" },
        { status: 404 }
      );
    }

    // Get user progress for all lessons in this path
    const lessonIds = enrollment.path.lessons.map((pl) => pl.lesson.id);
    const userProgress = await prisma.userProgress.findMany({
      where: {
        userId: session.id,
        lessonId: { in: lessonIds },
      },
    });

    const progressMap = new Map(userProgress.map((p) => [p.lessonId, p]));

    // Get quiz attempts for lessons in this path
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId: session.id,
        lessonId: { in: lessonIds },
      },
      orderBy: { startedAt: "desc" },
    });

    // Get best quiz score for each lesson
    const quizScoreMap = new Map<string, number>();
    for (const attempt of quizAttempts) {
      const existing = quizScoreMap.get(attempt.lessonId);
      if (existing === undefined || attempt.score > existing) {
        quizScoreMap.set(attempt.lessonId, attempt.score);
      }
    }

    // Build lesson progress data
    const lessons = enrollment.path.lessons.map((pl, index) => {
      const progress = progressMap.get(pl.lesson.id);
      const quizScore = quizScoreMap.get(pl.lesson.id);

      return {
        id: pl.lesson.id,
        slug: pl.lesson.slug,
        title: pl.lesson.title,
        order: index + 1,
        estimatedMinutes: pl.lesson.estimatedMinutes,
        status: progress?.status || ("NOT_STARTED" as const),
        completedAt: progress?.completedAt?.toISOString() || null,
        quizScore: quizScore !== undefined ? Math.round(quizScore) : null,
      };
    });

    const lessonsCompleted = lessons.filter((l) => l.status === "COMPLETED").length;
    const totalLessons = lessons.length;
    const overallProgress =
      totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;

    // Calculate total time spent (estimated based on completed lessons)
    const totalTimeSpent = lessons
      .filter((l) => l.status === "COMPLETED")
      .reduce((sum, l) => sum + l.estimatedMinutes, 0);

    // Calculate quiz stats
    const quizzesCompleted = quizAttempts.length;
    const averageQuizScore =
      quizzesCompleted > 0
        ? Math.round(quizAttempts.reduce((sum, q) => sum + q.score, 0) / quizzesCompleted)
        : null;

    const pathProgress: PathProgress = {
      path: {
        id: enrollment.path.id,
        slug: enrollment.path.slug,
        title: enrollment.path.title,
        description: enrollment.path.description,
        difficulty: enrollment.path.difficulty,
        estimatedHours: enrollment.path.estimatedHours,
      },
      enrolledAt: enrollment.enrolledAt.toISOString(),
      completedAt: enrollment.completedAt?.toISOString() || null,
      overallProgress,
      lessonsCompleted,
      totalLessons,
      quizzesCompleted,
      averageQuizScore,
      totalTimeSpent,
      lessons,
    };

    return NextResponse.json({
      success: true,
      data: pathProgress,
    });
  } catch (error) {
    console.error("Get path progress error:", error);
    return NextResponse.json({ success: false, error: "Failed to get progress" }, { status: 500 });
  }
}
