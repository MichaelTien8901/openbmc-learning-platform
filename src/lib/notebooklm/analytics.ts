/**
 * AI Usage Analytics
 *
 * Tracks usage of AI features for monitoring and optimization.
 */

import { prisma } from "@/lib/prisma";
import type {
  Prisma,
  AIEventType as PrismaAIEventType,
  AIFeature as PrismaAIFeature,
} from "@/generated/prisma";

// Event types matching Prisma enum
export type AIEventType =
  | "QUERY"
  | "CONTENT_GEN"
  | "QUIZ_GEN"
  | "RATE_LIMITED"
  | "ERROR"
  | "FALLBACK";

// Feature types matching Prisma enum
export type AIFeature = "QA" | "CONTENT" | "QUIZ" | "TTS";

export interface TrackEventOptions {
  userId?: string;
  eventType: AIEventType;
  feature: AIFeature;
  lessonId?: string;
  success?: boolean;
  errorCode?: string;
  latencyMs?: number;
  cached?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UsageStats {
  totalRequests: number;
  successRate: number;
  cacheHitRate: number;
  avgLatencyMs: number | null;
  rateLimitCount: number;
  uniqueUsers: number;
  byFeature: Record<
    AIFeature,
    {
      requests: number;
      successRate: number;
      avgLatencyMs: number | null;
    }
  >;
}

export interface DailyStats {
  date: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  cacheHits: number;
  rateLimitCount: number;
  avgLatencyMs: number | null;
  uniqueUsers: number;
}

/**
 * Track an AI usage event
 */
export async function trackAIEvent(options: TrackEventOptions): Promise<void> {
  try {
    await prisma.aIUsageEvent.create({
      data: {
        userId: options.userId,
        eventType: options.eventType,
        feature: options.feature,
        lessonId: options.lessonId,
        success: options.success ?? true,
        errorCode: options.errorCode,
        latencyMs: options.latencyMs,
        cached: options.cached ?? false,
        metadata: options.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    // Update daily aggregates asynchronously
    updateDailyStats(options).catch(console.error);
  } catch (error) {
    // Don't let analytics errors affect the main flow
    console.error("Failed to track AI event:", error);
  }
}

/**
 * Update daily aggregated statistics
 */
async function updateDailyStats(options: TrackEventOptions): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.aIUsageDaily.upsert({
    where: {
      date_feature: {
        date: today,
        feature: options.feature,
      },
    },
    update: {
      totalRequests: { increment: 1 },
      successCount: options.success !== false ? { increment: 1 } : undefined,
      errorCount: options.success === false ? { increment: 1 } : undefined,
      cacheHits: options.cached ? { increment: 1 } : undefined,
      rateLimitCount: options.eventType === "RATE_LIMITED" ? { increment: 1 } : undefined,
    },
    create: {
      date: today,
      feature: options.feature,
      totalRequests: 1,
      successCount: options.success !== false ? 1 : 0,
      errorCount: options.success === false ? 1 : 0,
      cacheHits: options.cached ? 1 : 0,
      rateLimitCount: options.eventType === "RATE_LIMITED" ? 1 : 0,
      uniqueUsers: options.userId ? 1 : 0,
    },
  });
}

/**
 * Get usage statistics for a time period
 */
export async function getUsageStats(
  startDate: Date,
  endDate: Date = new Date()
): Promise<UsageStats> {
  const events = await prisma.aIUsageEvent.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      feature: true,
      success: true,
      cached: true,
      latencyMs: true,
      eventType: true,
      userId: true,
    },
  });

  const totalRequests = events.length;
  const successCount = events.filter((e) => e.success).length;
  const cacheHits = events.filter((e) => e.cached).length;
  const rateLimitCount = events.filter((e) => e.eventType === "RATE_LIMITED").length;
  const uniqueUsers = new Set(events.filter((e) => e.userId).map((e) => e.userId)).size;

  const latencies = events.filter((e) => e.latencyMs !== null).map((e) => e.latencyMs!);
  const avgLatencyMs =
    latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;

  // Calculate by feature
  const features: AIFeature[] = ["QA", "CONTENT", "QUIZ", "TTS"];
  const byFeature = {} as UsageStats["byFeature"];

  for (const feature of features) {
    const featureEvents = events.filter((e) => e.feature === feature);
    const featureLatencies = featureEvents
      .filter((e) => e.latencyMs !== null)
      .map((e) => e.latencyMs!);

    byFeature[feature] = {
      requests: featureEvents.length,
      successRate:
        featureEvents.length > 0
          ? (featureEvents.filter((e) => e.success).length / featureEvents.length) * 100
          : 0,
      avgLatencyMs:
        featureLatencies.length > 0
          ? featureLatencies.reduce((a, b) => a + b, 0) / featureLatencies.length
          : null,
    };
  }

  return {
    totalRequests,
    successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
    cacheHitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
    avgLatencyMs,
    rateLimitCount,
    uniqueUsers,
    byFeature,
  };
}

/**
 * Get daily statistics for a time range
 */
export async function getDailyStats(
  startDate: Date,
  endDate: Date = new Date()
): Promise<DailyStats[]> {
  const dailyStats = await prisma.aIUsageDaily.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  // Group by date
  const byDate = new Map<string, DailyStats>();

  for (const stat of dailyStats) {
    const dateStr = stat.date.toISOString().split("T")[0];
    const existing = byDate.get(dateStr);

    if (existing) {
      existing.totalRequests += stat.totalRequests;
      existing.successCount += stat.successCount;
      existing.errorCount += stat.errorCount;
      existing.cacheHits += stat.cacheHits;
      existing.rateLimitCount += stat.rateLimitCount;
      existing.uniqueUsers += stat.uniqueUsers;
      // Average latencies
      if (stat.avgLatencyMs !== null) {
        if (existing.avgLatencyMs === null) {
          existing.avgLatencyMs = stat.avgLatencyMs;
        } else {
          existing.avgLatencyMs = (existing.avgLatencyMs + stat.avgLatencyMs) / 2;
        }
      }
    } else {
      byDate.set(dateStr, {
        date: dateStr,
        totalRequests: stat.totalRequests,
        successCount: stat.successCount,
        errorCount: stat.errorCount,
        cacheHits: stat.cacheHits,
        rateLimitCount: stat.rateLimitCount,
        avgLatencyMs: stat.avgLatencyMs,
        uniqueUsers: stat.uniqueUsers,
      });
    }
  }

  return Array.from(byDate.values());
}

/**
 * Get top questions asked
 */
export async function getTopQuestions(
  limit: number = 10,
  startDate?: Date
): Promise<Array<{ question: string; count: number }>> {
  const where: Prisma.AIUsageEventWhereInput = {
    eventType: "QUERY" as PrismaAIEventType,
    feature: "QA" as PrismaAIFeature,
  };

  if (startDate) {
    where.createdAt = { gte: startDate };
  }

  const events = await prisma.aIUsageEvent.findMany({
    where,
    select: {
      metadata: true,
    },
  });

  // Count questions
  const questionCounts = new Map<string, number>();
  for (const event of events) {
    const metadata = event.metadata as { question?: string } | null;
    const question = metadata?.question;
    if (question) {
      questionCounts.set(question, (questionCounts.get(question) || 0) + 1);
    }
  }

  // Sort by count and take top N
  return Array.from(questionCounts.entries())
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get user activity summary
 */
export async function getUserActivity(
  userId: string,
  startDate?: Date
): Promise<{
  totalQuestions: number;
  totalQuizzes: number;
  rateLimitHits: number;
  recentActivity: Array<{
    eventType: AIEventType;
    feature: AIFeature;
    createdAt: Date;
  }>;
}> {
  const where: { userId: string; createdAt?: { gte: Date } } = { userId };
  if (startDate) {
    where.createdAt = { gte: startDate };
  }

  const events = await prisma.aIUsageEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    totalQuestions: events.filter((e) => e.eventType === "QUERY").length,
    totalQuizzes: events.filter((e) => e.eventType === "QUIZ_GEN").length,
    rateLimitHits: events.filter((e) => e.eventType === "RATE_LIMITED").length,
    recentActivity: events.slice(0, 10).map((e) => ({
      eventType: e.eventType as AIEventType,
      feature: e.feature as AIFeature,
      createdAt: e.createdAt,
    })),
  };
}
