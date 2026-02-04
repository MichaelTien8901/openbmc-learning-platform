"use client";

import { X, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import { useServiceStatus, type DegradedFeature } from "@/lib/service-status";

const featureNames: Record<string, string> = {
  database: "Database",
  notebookLm: "AI Features",
  tts: "Text-to-Speech",
  sandbox: "Code Sandbox",
};

function FeatureBanner({
  feature,
  onDismiss,
}: {
  feature: DegradedFeature;
  onDismiss: () => void;
}) {
  const isError = feature.severity === "error";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 ${
        isError
          ? "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300"
          : "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="flex-1 text-sm">
        <span className="font-medium">{featureNames[feature.feature]}:</span> {feature.message}
      </span>
      <button
        onClick={onDismiss}
        className={`rounded p-1 transition-colors ${
          isError
            ? "hover:bg-red-100 dark:hover:bg-red-800/50"
            : "hover:bg-yellow-100 dark:hover:bg-yellow-800/50"
        }`}
        aria-label={`Dismiss ${featureNames[feature.feature]} notification`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ServiceStatusBanner() {
  const { degradedFeatures, dismissDegradedFeature, checkStatus, isLoading } = useServiceStatus();

  if (degradedFeatures.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      {degradedFeatures.map((feature) => (
        <FeatureBanner
          key={feature.feature}
          feature={feature}
          onDismiss={() => dismissDegradedFeature(feature.feature)}
        />
      ))}
      <div className="flex items-center justify-end bg-gray-50 px-4 py-1 dark:bg-gray-900">
        <button
          onClick={checkStatus}
          disabled={isLoading}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:hover:text-gray-300"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Checking..." : "Check status"}
        </button>
      </div>
    </div>
  );
}

/**
 * Compact feature status indicator for use in feature UIs
 */
export function FeatureUnavailableNotice({
  feature,
  fallbackMessage,
}: {
  feature: "notebookLm" | "tts" | "sandbox";
  fallbackMessage?: string;
}) {
  const { status } = useServiceStatus();

  if (status[feature] === "healthy" || status[feature] === "unknown") {
    return null;
  }

  const messages = {
    notebookLm:
      fallbackMessage || "AI features are unavailable. Questions will use cached content.",
    tts: fallbackMessage || "Text-to-speech is not available. Read the content directly below.",
    sandbox:
      fallbackMessage || "Code sandbox is unavailable. Code exercises cannot be run at this time.",
  };

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-500" />
        <p className="text-sm text-yellow-800 dark:text-yellow-300">{messages[feature]}</p>
      </div>
    </div>
  );
}
