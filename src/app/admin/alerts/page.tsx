"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Route,
  TrendingDown,
  Clock,
  Target,
  Filter,
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

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

interface AlertsData {
  alerts: ContentAlert[];
  summary: {
    critical: number;
    warning: number;
    byType: Record<AlertType, number>;
  };
}

const alertTypeLabels: Record<AlertType, string> = {
  low_completion: "Low Completion",
  low_quiz_score: "Low Quiz Score",
  high_dropout: "High Dropout",
  stale_content: "Stale Content",
  no_engagement: "No Engagement",
};

const alertTypeIcons: Record<AlertType, React.ReactNode> = {
  low_completion: <TrendingDown className="h-4 w-4" />,
  low_quiz_score: <Target className="h-4 w-4" />,
  high_dropout: <AlertTriangle className="h-4 w-4" />,
  stale_content: <Clock className="h-4 w-4" />,
  no_engagement: <AlertCircle className="h-4 w-4" />,
};

export default function AlertsPage() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<AlertType | "">("");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "">("");
  const [contentTypeFilter, setContentTypeFilter] = useState<"lesson" | "path" | "">("");
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/analytics/alerts");
      const json = await response.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Load dismissed alerts from localStorage
    const stored = localStorage.getItem("dismissedAlerts");
    if (stored) {
      setDismissedAlerts(new Set(JSON.parse(stored)));
    }
  }, []);

  const dismissAlert = (alertId: string) => {
    const newDismissed = new Set(dismissedAlerts);
    newDismissed.add(alertId);
    setDismissedAlerts(newDismissed);
    localStorage.setItem("dismissedAlerts", JSON.stringify([...newDismissed]));
  };

  const clearDismissed = () => {
    setDismissedAlerts(new Set());
    localStorage.removeItem("dismissedAlerts");
  };

  const filteredAlerts =
    data?.alerts.filter((alert) => {
      if (dismissedAlerts.has(alert.id)) return false;
      if (typeFilter && alert.type !== typeFilter) return false;
      if (severityFilter && alert.severity !== severityFilter) return false;
      if (contentTypeFilter && alert.contentType !== contentTypeFilter) return false;
      return true;
    }) || [];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Alerts</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Monitor and address low-performing content
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dismissedAlerts.size > 0 && (
            <button
              onClick={clearDismissed}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Show {dismissedAlerts.size} dismissed
            </button>
          )}
          <button
            onClick={fetchAlerts}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<AlertCircle className="h-5 w-5" />}
            label="Critical Alerts"
            value={data.summary.critical}
            color="red"
          />
          <SummaryCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Warnings"
            value={data.summary.warning}
            color="yellow"
          />
          <SummaryCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Lesson Issues"
            value={data.alerts.filter((a) => a.contentType === "lesson").length}
            color="blue"
          />
          <SummaryCard
            icon={<Route className="h-5 w-5" />}
            label="Path Issues"
            value={data.alerts.filter((a) => a.contentType === "path").length}
            color="green"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | "")}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AlertType | "")}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Types</option>
          <option value="low_completion">Low Completion</option>
          <option value="low_quiz_score">Low Quiz Score</option>
          <option value="high_dropout">High Dropout</option>
          <option value="stale_content">Stale Content</option>
          <option value="no_engagement">No Engagement</option>
        </select>
        <select
          value={contentTypeFilter}
          onChange={(e) => setContentTypeFilter(e.target.value as "lesson" | "path" | "")}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Content</option>
          <option value="lesson">Lessons</option>
          <option value="path">Paths</option>
        </select>
        {(typeFilter || severityFilter || contentTypeFilter) && (
          <button
            onClick={() => {
              setTypeFilter("");
              setSeverityFilter("");
              setContentTypeFilter("");
            }}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Alert List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No alerts to show
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {data?.alerts.length === 0
                ? "All your content is performing well!"
                : "All alerts have been filtered or dismissed."}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
          ))
        )}
      </div>

      {/* Alert Type Legend */}
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
        <h3 className="mb-3 font-medium text-gray-900 dark:text-white">Alert Types</h3>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-2">
            <TrendingDown className="mt-0.5 h-4 w-4 text-red-500" />
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Low Completion:</span>
              <span className="ml-1 text-gray-500 dark:text-gray-400">
                Less than 30% of users complete the content
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Target className="mt-0.5 h-4 w-4 text-orange-500" />
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Low Quiz Score:</span>
              <span className="ml-1 text-gray-500 dark:text-gray-400">Average score below 50%</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500" />
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">High Dropout:</span>
              <span className="ml-1 text-gray-500 dark:text-gray-400">
                Over 70% start but don&apos;t finish
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-blue-500" />
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Stale Content:</span>
              <span className="ml-1 text-gray-500 dark:text-gray-400">Not updated in 90+ days</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-gray-500" />
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">No Engagement:</span>
              <span className="ml-1 text-gray-500 dark:text-gray-400">
                Published but no users started
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "red" | "yellow" | "blue" | "green";
}) {
  const colors = {
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    yellow: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert, onDismiss }: { alert: ContentAlert; onDismiss: () => void }) {
  const severityStyles = {
    critical: "border-l-red-500 bg-red-50 dark:bg-red-900/10",
    warning: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10",
  };

  const severityBadge = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  const editUrl =
    alert.contentType === "lesson"
      ? `/admin/lessons/${alert.contentId}`
      : `/admin/paths/${alert.contentId}`;

  return (
    <div
      className={`rounded-lg border border-l-4 border-gray-200 p-4 dark:border-gray-700 ${severityStyles[alert.severity]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-gray-500">{alertTypeIcons[alert.type]}</div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 dark:text-white">{alert.title}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge[alert.severity]}`}
              >
                {alert.severity}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {alertTypeLabels[alert.type]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{alert.description}</p>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-gray-500">
                {alert.contentType === "lesson" ? (
                  <BookOpen className="h-3.5 w-3.5" />
                ) : (
                  <Route className="h-3.5 w-3.5" />
                )}
                {alert.contentTitle}
              </span>
              <span className="text-gray-400">
                Metric: {alert.metric}
                {alert.type.includes("rate") ||
                alert.type === "low_completion" ||
                alert.type === "high_dropout" ||
                alert.type === "low_quiz_score"
                  ? "%"
                  : ""}
                (threshold: {alert.threshold}
                {alert.type.includes("rate") ||
                alert.type === "low_completion" ||
                alert.type === "high_dropout" ||
                alert.type === "low_quiz_score"
                  ? "%"
                  : ""}
                )
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={editUrl}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Edit
          </Link>
          <button
            onClick={onDismiss}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
