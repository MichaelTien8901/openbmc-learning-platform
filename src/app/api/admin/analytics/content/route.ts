import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

interface ContentAnalytics {
  overview: {
    totalLessons: number;
    publishedLessons: number;
    totalPaths: number;
    publishedPaths: number;
    totalUsers: number;
    activeUsers: number; // Users with activity in last 30 days
  };
  lessonStats: Array<{
    id: string;
    title: string;
    slug: string;
    completions: number;
    avgQuizScore: number | null;
    bookmarks: number;
  }>;
  pathStats: Array<{
    id: string;
    title: string;
    slug: string;
    enrollments: number;
    completions: number;
    completionRate: number;
  }>;
  recentActivity: {
    completionsToday: number;
    completionsThisWeek: number;
    quizzesToday: number;
    quizzesThisWeek: number;
  };
}

/**
 * GET /api/admin/analytics/content - Get content analytics
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse<ContentAnalytics>>> {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Overview stats
    const [totalLessons, publishedLessons, totalPaths, publishedPaths, totalUsers, activeUsers] =
      await Promise.all([
        prisma.lesson.count(),
        prisma.lesson.count({ where: { published: true } }),
        prisma.learningPath.count(),
        prisma.learningPath.count({ where: { published: true } }),
        prisma.user.count(),
        prisma.user.count({
          where: {
            progress: {
              some: {
                updatedAt: { gte: thirtyDaysAgo },
              },
            },
          },
        }),
      ]);

    // Lesson stats - top lessons by completions
    const lessonCompletions = await prisma.lesson.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        _count: {
          select: {
            progress: { where: { status: "COMPLETED" } },
            bookmarks: true,
          },
        },
        quizAttempts: {
          select: { score: true },
        },
      },
      orderBy: {
        progress: { _count: "desc" },
      },
      take: 10,
    });

    const lessonStats = lessonCompletions.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      completions: lesson._count.progress,
      avgQuizScore:
        lesson.quizAttempts.length > 0
          ? Math.round(
              lesson.quizAttempts.reduce((sum, a) => sum + a.score, 0) / lesson.quizAttempts.length
            )
          : null,
      bookmarks: lesson._count.bookmarks,
    }));

    // Path stats
    const pathEnrollments = await prisma.learningPath.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
        enrollments: {
          where: { completedAt: { not: null } },
          select: { id: true },
        },
      },
      orderBy: {
        enrollments: { _count: "desc" },
      },
      take: 10,
    });

    const pathStats = pathEnrollments.map((path) => ({
      id: path.id,
      title: path.title,
      slug: path.slug,
      enrollments: path._count.enrollments,
      completions: path.enrollments.length,
      completionRate:
        path._count.enrollments > 0
          ? Math.round((path.enrollments.length / path._count.enrollments) * 100)
          : 0,
    }));

    // Recent activity
    const [completionsToday, completionsThisWeek, quizzesToday, quizzesThisWeek] =
      await Promise.all([
        prisma.userProgress.count({
          where: {
            status: "COMPLETED",
            completedAt: { gte: todayStart },
          },
        }),
        prisma.userProgress.count({
          where: {
            status: "COMPLETED",
            completedAt: { gte: sevenDaysAgo },
          },
        }),
        prisma.quizAttempt.count({
          where: {
            completedAt: { gte: todayStart },
          },
        }),
        prisma.quizAttempt.count({
          where: {
            completedAt: { gte: sevenDaysAgo },
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalLessons,
          publishedLessons,
          totalPaths,
          publishedPaths,
          totalUsers,
          activeUsers,
        },
        lessonStats,
        pathStats,
        recentActivity: {
          completionsToday,
          completionsThisWeek,
          quizzesToday,
          quizzesThisWeek,
        },
      },
    });
  } catch (error) {
    console.error("Get content analytics error:", error);
    return NextResponse.json({ success: false, error: "Failed to get analytics" }, { status: 500 });
  }
}
