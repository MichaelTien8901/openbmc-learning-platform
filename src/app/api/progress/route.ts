import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

interface ProgressSummary {
  lessonsCompleted: number;
  totalLessons: number;
  pathsEnrolled: number;
  pathsCompleted: number;
  quizzesTaken: number;
  averageQuizScore: number | null;
  currentStreak: number;
  longestStreak: number;
  recentActivity: Array<{
    lessonId: string;
    lessonTitle: string;
    pathTitle: string | null;
    completedAt: string;
  }>;
  enrolledPaths: Array<{
    id: string;
    slug: string;
    title: string;
    progress: number;
    lessonsCompleted: number;
    totalLessons: number;
  }>;
}

export async function GET(): Promise<NextResponse<ApiResponse<ProgressSummary>>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get completed lessons
    const completedProgress = await prisma.userProgress.findMany({
      where: {
        userId: session.id,
        status: "COMPLETED",
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            pathLessons: {
              include: {
                path: { select: { title: true } },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    // Get total published lessons
    const totalLessons = await prisma.lesson.count({
      where: { published: true },
    });

    // Get enrollments
    const enrollments = await prisma.pathEnrollment.findMany({
      where: { userId: session.id },
      include: {
        path: {
          include: {
            lessons: {
              select: { lessonId: true },
            },
          },
        },
      },
    });

    // Get quiz attempts
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId: session.id },
      select: { score: true },
    });

    const averageQuizScore =
      quizAttempts.length > 0
        ? Math.round(quizAttempts.reduce((sum, q) => sum + q.score, 0) / quizAttempts.length)
        : null;

    // Calculate streaks (simplified - counts consecutive days with completions)
    const completionDates = completedProgress
      .filter((p) => p.completedAt)
      .map((p) => new Date(p.completedAt!).toDateString());
    const uniqueDates = [...new Set(completionDates)];

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date().toDateString();

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toDateString();

      if (uniqueDates.includes(dateStr)) {
        tempStreak++;
        if (i === 0 || dateStr === today) {
          currentStreak = tempStreak;
        }
      } else if (tempStreak > 0) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Build enrolled paths progress
    const completedLessonIds = new Set(completedProgress.map((p) => p.lessonId));
    const enrolledPaths = enrollments.map((enrollment) => {
      const pathLessonIds = enrollment.path.lessons.map((pl) => pl.lessonId);
      const completedCount = pathLessonIds.filter((id) => completedLessonIds.has(id)).length;
      const total = pathLessonIds.length;

      return {
        id: enrollment.path.id,
        slug: enrollment.path.slug,
        title: enrollment.path.title,
        progress: total > 0 ? Math.round((completedCount / total) * 100) : 0,
        lessonsCompleted: completedCount,
        totalLessons: total,
      };
    });

    // Recent activity (last 10)
    const recentActivity = completedProgress.slice(0, 10).map((p) => ({
      lessonId: p.lesson.id,
      lessonTitle: p.lesson.title,
      pathTitle: p.lesson.pathLessons[0]?.path.title || null,
      completedAt: p.completedAt?.toISOString() || "",
    }));

    const summary: ProgressSummary = {
      lessonsCompleted: completedProgress.length,
      totalLessons,
      pathsEnrolled: enrollments.length,
      pathsCompleted: enrollments.filter((e) => e.completedAt).length,
      quizzesTaken: quizAttempts.length,
      averageQuizScore,
      currentStreak,
      longestStreak,
      recentActivity,
      enrolledPaths,
    };

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
