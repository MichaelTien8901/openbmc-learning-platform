"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  BookOpen,
  Route,
  TrendingUp,
  Award,
  Clock,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface ContentAnalytics {
  overview: {
    totalLessons: number;
    publishedLessons: number;
    totalPaths: number;
    publishedPaths: number;
    totalUsers: number;
    activeUsers: number;
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

interface AIAnalytics {
  summary: {
    totalRequests: number;
    successRate: number;
    cacheHitRate: number;
    avgLatencyMs: number | null;
    rateLimitCount: number;
    uniqueUsers: number;
  };
  topQuestions: Array<{ question: string; count: number }>;
}

export default function AnalyticsPage() {
  const [contentData, setContentData] = useState<ContentAnalytics | null>(null);
  const [aiData, setAIData] = useState<AIAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [contentRes, aiRes] = await Promise.all([
          fetch("/api/admin/analytics/content"),
          fetch("/api/admin/analytics/ai?days=30"),
        ]);

        const [contentJson, aiJson] = await Promise.all([contentRes.json(), aiRes.json()]);

        if (contentJson.success) setContentData(contentJson.data);
        if (aiJson.success) setAIData(aiJson.data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Content performance and platform usage metrics
        </p>
      </div>

      {/* Overview Stats */}
      {contentData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Lessons"
            value={contentData.overview.publishedLessons}
            subtext={`${contentData.overview.totalLessons} total`}
            color="blue"
          />
          <StatCard
            icon={<Route className="h-5 w-5" />}
            label="Learning Paths"
            value={contentData.overview.publishedPaths}
            subtext={`${contentData.overview.totalPaths} total`}
            color="green"
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Users"
            value={contentData.overview.totalUsers}
            subtext={`${contentData.overview.activeUsers} active`}
            color="purple"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Completions Today"
            value={contentData.recentActivity.completionsToday}
            subtext={`${contentData.recentActivity.completionsThisWeek} this week`}
            color="orange"
          />
        </div>
      )}

      {/* AI Stats */}
      {aiData && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <BarChart3 className="h-5 w-5" />
            AI Feature Usage (Last 30 Days)
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Total Requests" value={aiData.summary.totalRequests} />
            <MiniStat label="Success Rate" value={`${aiData.summary.successRate.toFixed(1)}%`} />
            <MiniStat label="Cache Hit Rate" value={`${aiData.summary.cacheHitRate.toFixed(1)}%`} />
            <MiniStat
              label="Avg Latency"
              value={
                aiData.summary.avgLatencyMs ? `${Math.round(aiData.summary.avgLatencyMs)}ms` : "N/A"
              }
            />
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Lessons */}
        {contentData && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Award className="h-5 w-5" />
              Top Lessons by Completions
            </h2>
            <div className="space-y-3">
              {contentData.lessonStats.slice(0, 5).map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{lesson.title}</p>
                      <p className="text-xs text-gray-500">
                        {lesson.completions} completions
                        {lesson.avgQuizScore !== null && ` • ${lesson.avgQuizScore}% avg quiz`}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/lessons/${lesson.id}`}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              ))}
              {contentData.lessonStats.length === 0 && (
                <p className="py-4 text-center text-gray-500">No lesson data yet</p>
              )}
            </div>
          </div>
        )}

        {/* Top Paths */}
        {contentData && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Route className="h-5 w-5" />
              Top Learning Paths
            </h2>
            <div className="space-y-3">
              {contentData.pathStats.slice(0, 5).map((path, index) => (
                <div
                  key={path.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{path.title}</p>
                      <p className="text-xs text-gray-500">
                        {path.enrollments} enrolled • {path.completionRate}% completion
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/paths/${path.id}`}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              ))}
              {contentData.pathStats.length === 0 && (
                <p className="py-4 text-center text-gray-500">No path data yet</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Questions */}
      {aiData && aiData.topQuestions.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Clock className="h-5 w-5" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {aiData.topQuestions.map((q, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-700/50"
              >
                <p className="text-sm text-gray-700 dark:text-gray-300">{q.question}</p>
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  {q.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500">{subtext}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
