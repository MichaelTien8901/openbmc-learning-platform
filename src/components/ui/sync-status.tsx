"use client";

/**
 * Sync Status Component
 *
 * Displays cross-device sync status and any conflicts.
 */

import { useState } from "react";
import { useSyncVerification } from "@/hooks/use-sync-verification";
import { RefreshCw, Check, AlertTriangle, Cloud, CloudOff } from "lucide-react";

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatus({ className = "", showDetails = false }: SyncStatusProps) {
  const { status, isVerifying, lastVerified, isInSync, fetchStatus, error } = useSyncVerification();

  const handleRefresh = () => {
    fetchStatus();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Sync Status Icon */}
      {isVerifying ? (
        <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {showDetails && <span>Syncing...</span>}
        </span>
      ) : isInSync === true ? (
        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
          <Check className="h-4 w-4" />
          {showDetails && <span>In sync</span>}
        </span>
      ) : isInSync === false ? (
        <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4" />
          {showDetails && <span>Sync needed</span>}
        </span>
      ) : error ? (
        <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <CloudOff className="h-4 w-4" />
          {showDetails && <span>Sync error</span>}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Cloud className="h-4 w-4" />
          {showDetails && <span>Unknown</span>}
        </span>
      )}

      {/* Refresh Button */}
      {!isVerifying && (
        <button
          onClick={handleRefresh}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          title="Check sync status"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}

      {/* Last Verified */}
      {showDetails && lastVerified && (
        <span className="text-xs text-gray-500">
          Last checked: {formatRelativeTime(lastVerified)}
        </span>
      )}

      {/* Item Counts */}
      {showDetails && status && (
        <span className="text-xs text-gray-500">
          {status.itemCount.completions} completions, {status.itemCount.bookmarks} bookmarks
        </span>
      )}
    </div>
  );
}

/**
 * Detailed Sync Panel - Shows full sync status with conflict resolution
 */
export function SyncPanel() {
  const { status, isVerifying, lastVerified, conflicts, isInSync, fetchStatus, error } =
    useSyncVerification();
  const [showConflicts, setShowConflicts] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sync Status</h3>
        <button
          onClick={() => fetchStatus()}
          disabled={isVerifying}
          className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-300"
        >
          <RefreshCw className={`h-4 w-4 ${isVerifying ? "animate-spin" : ""}`} />
          {isVerifying ? "Checking..." : "Check Now"}
        </button>
      </div>

      {/* Status Display */}
      <div className="mt-4">
        {isInSync === true && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">All Synced</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Your progress is synced across all devices.
              </p>
            </div>
          </div>
        )}

        {isInSync === false && (
          <div className="flex items-center gap-2 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300">
                Sync Conflicts Detected
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                {conflicts.length} item{conflicts.length !== 1 ? "s" : ""} need attention.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
            <CloudOff className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Sync Error</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {status && (
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700">
            <p className="text-2xl font-bold">{status.itemCount.completions}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Completions</p>
          </div>
          <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700">
            <p className="text-2xl font-bold">{status.itemCount.quizAttempts}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Quizzes</p>
          </div>
          <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700">
            <p className="text-2xl font-bold">{status.itemCount.bookmarks}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Bookmarks</p>
          </div>
          <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-700">
            <p className="text-2xl font-bold">{status.itemCount.notes}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Notes</p>
          </div>
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowConflicts(!showConflicts)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {showConflicts
              ? "Hide Conflicts"
              : `View ${conflicts.length} Conflict${conflicts.length !== 1 ? "s" : ""}`}
          </button>

          {showConflicts && (
            <div className="mt-2 max-h-60 space-y-2 overflow-y-auto">
              {conflicts.map((conflict, index) => (
                <div
                  key={`${conflict.type}-${conflict.itemId}-${index}`}
                  className="rounded-md border border-gray-200 p-2 text-sm dark:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{conflict.type}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        conflict.conflict === "missing_on_server"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : conflict.conflict === "missing_on_client"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                      }`}
                    >
                      {formatConflictType(conflict.conflict)}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Item: {conflict.itemId.substring(0, 8)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Last Checked */}
      {lastVerified && (
        <p className="mt-4 text-xs text-gray-500">Last checked: {lastVerified.toLocaleString()}</p>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function formatConflictType(type: string): string {
  switch (type) {
    case "missing_on_server":
      return "Not synced";
    case "missing_on_client":
      return "From other device";
    case "timestamp_mismatch":
      return "Modified";
    default:
      return type;
  }
}
