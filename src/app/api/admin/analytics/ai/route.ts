import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUsageStats, getDailyStats, getTopQuestions } from "@/lib/notebooklm";
import type { ApiResponse } from "@/types";

interface AnalyticsResponse {
  summary: {
    totalRequests: number;
    successRate: number;
    cacheHitRate: number;
    avgLatencyMs: number | null;
    rateLimitCount: number;
    uniqueUsers: number;
  };
  byFeature: Record<
    string,
    {
      requests: number;
      successRate: number;
      avgLatencyMs: number | null;
    }
  >;
  dailyStats: Array<{
    date: string;
    totalRequests: number;
    successCount: number;
    errorCount: number;
    cacheHits: number;
  }>;
  topQuestions: Array<{
    question: string;
    count: number;
  }>;
}

/**
 * GET /api/admin/analytics/ai - Get AI usage analytics
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AnalyticsResponse>>> {
  try {
    // Require admin authentication
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Parse date range from query params
    const url = new URL(request.url);
    const daysParam = url.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all analytics data
    const [usageStats, dailyStats, topQuestions] = await Promise.all([
      getUsageStats(startDate, endDate),
      getDailyStats(startDate, endDate),
      getTopQuestions(10, startDate),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRequests: usageStats.totalRequests,
          successRate: usageStats.successRate,
          cacheHitRate: usageStats.cacheHitRate,
          avgLatencyMs: usageStats.avgLatencyMs,
          rateLimitCount: usageStats.rateLimitCount,
          uniqueUsers: usageStats.uniqueUsers,
        },
        byFeature: usageStats.byFeature,
        dailyStats: dailyStats.map((d) => ({
          date: d.date,
          totalRequests: d.totalRequests,
          successCount: d.successCount,
          errorCount: d.errorCount,
          cacheHits: d.cacheHits,
        })),
        topQuestions,
      },
    });
  } catch (error) {
    console.error("Get AI analytics error:", error);
    return NextResponse.json({ success: false, error: "Failed to get analytics" }, { status: 500 });
  }
}
