import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

type AlertSeverity = "warning" | "critical";
type AlertType =
  | "low_completion"
  | "low_quiz_score"
  | "high_dropout"
  | "stale_content"
  | "no_engagement";

interface ContentAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  contentType: "lesson" | "path";
  contentId: string;
  contentTitle: string;
  contentSlug: string;
  metric: number;
  threshold: number;
  createdAt: string;
}

interface AlertsResponse {
  alerts: ContentAlert[];
  summary: {
    critical: number;
    warning: number;
    byType: Record<AlertType, number>;
  };
}

// Thresholds for alerts
const THRESHOLDS = {
  LOW_COMPLETION_RATE: 30, // Less than 30% completion rate
  LOW_QUIZ_SCORE: 50, // Average quiz score below 50%
  HIGH_DROPOUT_RATE: 70, // More than 70% started but didn't complete
  STALE_CONTENT_DAYS: 90, // Not updated in 90 days
  MIN_ENROLLMENTS_FOR_ALERTS: 5, // Minimum enrollments to consider for alerts
  MIN_ATTEMPTS_FOR_QUIZ_ALERT: 3, // Minimum quiz attempts to consider
};

/**
 * GET /api/admin/analytics/alerts - Get content performance alerts
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AlertsResponse>>> {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const alerts: ContentAlert[] = [];
    const now = new Date();
    const staleCutoff = new Date(
      now.getTime() - THRESHOLDS.STALE_CONTENT_DAYS * 24 * 60 * 60 * 1000
    );

    // 1. Check lessons for low completion rates
    const lessonsWithProgress = await prisma.lesson.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
        _count: {
          select: {
            progress: true,
          },
        },
        progress: {
          select: {
            status: true,
          },
        },
        quizAttempts: {
          select: {
            score: true,
          },
        },
      },
    });

    for (const lesson of lessonsWithProgress) {
      const totalStarted = lesson._count.progress;
      const completed = lesson.progress.filter((p) => p.status === "COMPLETED").length;
      const completionRate = totalStarted > 0 ? (completed / totalStarted) * 100 : 0;

      // Low completion rate alert
      if (
        totalStarted >= THRESHOLDS.MIN_ENROLLMENTS_FOR_ALERTS &&
        completionRate < THRESHOLDS.LOW_COMPLETION_RATE
      ) {
        alerts.push({
          id: `lesson-completion-${lesson.id}`,
          type: "low_completion",
          severity: completionRate < 15 ? "critical" : "warning",
          title: "Low Completion Rate",
          description: `Only ${completionRate.toFixed(0)}% of users who started this lesson completed it.`,
          contentType: "lesson",
          contentId: lesson.id,
          contentTitle: lesson.title,
          contentSlug: lesson.slug,
          metric: Math.round(completionRate),
          threshold: THRESHOLDS.LOW_COMPLETION_RATE,
          createdAt: now.toISOString(),
        });
      }

      // High dropout alert (started but didn't complete)
      const dropoutRate = totalStarted > 0 ? ((totalStarted - completed) / totalStarted) * 100 : 0;
      if (
        totalStarted >= THRESHOLDS.MIN_ENROLLMENTS_FOR_ALERTS &&
        dropoutRate > THRESHOLDS.HIGH_DROPOUT_RATE
      ) {
        alerts.push({
          id: `lesson-dropout-${lesson.id}`,
          type: "high_dropout",
          severity: dropoutRate > 85 ? "critical" : "warning",
          title: "High Dropout Rate",
          description: `${dropoutRate.toFixed(0)}% of users dropped off before completing this lesson.`,
          contentType: "lesson",
          contentId: lesson.id,
          contentTitle: lesson.title,
          contentSlug: lesson.slug,
          metric: Math.round(dropoutRate),
          threshold: THRESHOLDS.HIGH_DROPOUT_RATE,
          createdAt: now.toISOString(),
        });
      }

      // Low quiz score alert
      if (lesson.quizAttempts.length >= THRESHOLDS.MIN_ATTEMPTS_FOR_QUIZ_ALERT) {
        const avgScore =
          lesson.quizAttempts.reduce((sum, a) => sum + a.score, 0) / lesson.quizAttempts.length;
        if (avgScore < THRESHOLDS.LOW_QUIZ_SCORE) {
          alerts.push({
            id: `lesson-quiz-${lesson.id}`,
            type: "low_quiz_score",
            severity: avgScore < 30 ? "critical" : "warning",
            title: "Low Quiz Performance",
            description: `Average quiz score is ${avgScore.toFixed(0)}%, suggesting content may be unclear or quiz is too difficult.`,
            contentType: "lesson",
            contentId: lesson.id,
            contentTitle: lesson.title,
            contentSlug: lesson.slug,
            metric: Math.round(avgScore),
            threshold: THRESHOLDS.LOW_QUIZ_SCORE,
            createdAt: now.toISOString(),
          });
        }
      }

      // Stale content alert
      if (lesson.updatedAt < staleCutoff) {
        const daysSinceUpdate = Math.floor(
          (now.getTime() - lesson.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        alerts.push({
          id: `lesson-stale-${lesson.id}`,
          type: "stale_content",
          severity: daysSinceUpdate > 180 ? "critical" : "warning",
          title: "Content Needs Review",
          description: `This lesson hasn't been updated in ${daysSinceUpdate} days. Consider reviewing for accuracy.`,
          contentType: "lesson",
          contentId: lesson.id,
          contentTitle: lesson.title,
          contentSlug: lesson.slug,
          metric: daysSinceUpdate,
          threshold: THRESHOLDS.STALE_CONTENT_DAYS,
          createdAt: now.toISOString(),
        });
      }

      // No engagement alert (published but no progress)
      if (totalStarted === 0) {
        const daysSinceCreated = Math.floor(
          (now.getTime() - lesson.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        if (daysSinceCreated > 14) {
          // Only alert if published for more than 2 weeks
          alerts.push({
            id: `lesson-no-engagement-${lesson.id}`,
            type: "no_engagement",
            severity: "warning",
            title: "No User Engagement",
            description: `No users have started this lesson since it was published ${daysSinceCreated} days ago.`,
            contentType: "lesson",
            contentId: lesson.id,
            contentTitle: lesson.title,
            contentSlug: lesson.slug,
            metric: 0,
            threshold: 1,
            createdAt: now.toISOString(),
          });
        }
      }
    }

    // 2. Check learning paths
    const pathsWithEnrollments = await prisma.learningPath.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
        enrollments: {
          select: {
            completedAt: true,
          },
        },
      },
    });

    for (const path of pathsWithEnrollments) {
      const totalEnrolled = path._count.enrollments;
      const completed = path.enrollments.filter((e) => e.completedAt !== null).length;
      const completionRate = totalEnrolled > 0 ? (completed / totalEnrolled) * 100 : 0;

      // Low path completion rate
      if (
        totalEnrolled >= THRESHOLDS.MIN_ENROLLMENTS_FOR_ALERTS &&
        completionRate < THRESHOLDS.LOW_COMPLETION_RATE
      ) {
        alerts.push({
          id: `path-completion-${path.id}`,
          type: "low_completion",
          severity: completionRate < 10 ? "critical" : "warning",
          title: "Low Path Completion Rate",
          description: `Only ${completionRate.toFixed(0)}% of enrolled users completed this learning path.`,
          contentType: "path",
          contentId: path.id,
          contentTitle: path.title,
          contentSlug: path.slug,
          metric: Math.round(completionRate),
          threshold: THRESHOLDS.LOW_COMPLETION_RATE,
          createdAt: now.toISOString(),
        });
      }

      // Stale path alert
      if (path.updatedAt < staleCutoff) {
        const daysSinceUpdate = Math.floor(
          (now.getTime() - path.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        alerts.push({
          id: `path-stale-${path.id}`,
          type: "stale_content",
          severity: daysSinceUpdate > 180 ? "critical" : "warning",
          title: "Learning Path Needs Review",
          description: `This path hasn't been updated in ${daysSinceUpdate} days. Consider reviewing content and structure.`,
          contentType: "path",
          contentId: path.id,
          contentTitle: path.title,
          contentSlug: path.slug,
          metric: daysSinceUpdate,
          threshold: THRESHOLDS.STALE_CONTENT_DAYS,
          createdAt: now.toISOString(),
        });
      }
    }

    // Sort alerts by severity (critical first) then by metric difference from threshold
    alerts.sort((a, b) => {
      if (a.severity === "critical" && b.severity !== "critical") return -1;
      if (a.severity !== "critical" && b.severity === "critical") return 1;
      return 0;
    });

    // Calculate summary
    const summary = {
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      byType: {
        low_completion: alerts.filter((a) => a.type === "low_completion").length,
        low_quiz_score: alerts.filter((a) => a.type === "low_quiz_score").length,
        high_dropout: alerts.filter((a) => a.type === "high_dropout").length,
        stale_content: alerts.filter((a) => a.type === "stale_content").length,
        no_engagement: alerts.filter((a) => a.type === "no_engagement").length,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        summary,
      },
    });
  } catch (error) {
    console.error("Get content alerts error:", error);
    return NextResponse.json({ success: false, error: "Failed to get alerts" }, { status: 500 });
  }
}
