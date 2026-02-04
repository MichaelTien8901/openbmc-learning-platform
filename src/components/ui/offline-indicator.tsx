"use client";

/**
 * Offline Status Indicator
 *
 * Shows the current online/offline status and pending sync items.
 */

import { useState, useEffect, useRef } from "react";
import { useOfflineQueue, useOnlineStatus } from "@/hooks/use-offline-queue";
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Check } from "lucide-react";

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineIndicator({ className = "", showDetails = false }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();
  const { pendingCount, isProcessing, status, retryAll } = useOfflineQueue();
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const lastShownSyncRef = useRef<number | null>(null);

  // Show sync success indicator for 3 seconds after a new sync completes
  useEffect(() => {
    // Only trigger on new sync events (different from what we've already shown)
    const isNewSync =
      status.lastSync !== null &&
      status.lastSync !== lastShownSyncRef.current &&
      pendingCount === 0 &&
      !isProcessing;

    if (!isNewSync) {
      return;
    }

    lastShownSyncRef.current = status.lastSync;

    // Use setTimeout to show success (avoids synchronous setState in effect)
    const showTimer = setTimeout(() => {
      setShowSyncSuccess(true);
    }, 0);

    const hideTimer = setTimeout(() => {
      setShowSyncSuccess(false);
    }, 3000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [status.lastSync, pendingCount, isProcessing]);

  // Don't show anything if online with no pending items and not recently synced
  if (isOnline && pendingCount === 0 && !showSyncSuccess && !showDetails) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Connection Status */}
      {isOnline ? (
        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
          <Wifi className="h-4 w-4" />
          {showDetails && <span>Online</span>}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
          <WifiOff className="h-4 w-4" />
          {showDetails && <span>Offline</span>}
        </span>
      )}

      {/* Pending Items */}
      {pendingCount > 0 && (
        <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          {isProcessing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <CloudOff className="h-4 w-4" />
              <span>{pendingCount} pending</span>
              {isOnline && (
                <button
                  onClick={() => retryAll()}
                  className="ml-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  title="Sync now"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </span>
      )}

      {/* Sync Success */}
      {showSyncSuccess && (
        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
          <Check className="h-4 w-4" />
          <span>Synced</span>
        </span>
      )}
    </div>
  );
}

/**
 * Offline Banner - Shows when offline with pending items
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { pendingCount, isProcessing, retryAll } = useOfflineQueue();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`px-4 py-2 text-sm ${
        isOnline
          ? "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
          : "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Cloud className="h-4 w-4" />
              <span>
                {isProcessing
                  ? "Syncing your progress..."
                  : `${pendingCount} item${pendingCount !== 1 ? "s" : ""} waiting to sync`}
              </span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>
                You&apos;re offline. Your progress will be saved and synced when you&apos;re back
                online.
                {pendingCount > 0 && ` (${pendingCount} pending)`}
              </span>
            </>
          )}
        </div>

        {isOnline && pendingCount > 0 && !isProcessing && (
          <button
            onClick={() => retryAll()}
            className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium hover:bg-blue-200 dark:bg-blue-800/30 dark:hover:bg-blue-800/50"
          >
            <RefreshCw className="h-3 w-3" />
            Sync Now
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Offline-aware action wrapper
 * Use this to wrap progress actions that should work offline
 */
export function useOfflineAction<T extends (...args: unknown[]) => Promise<unknown>>(
  action: T,
  options: {
    type: "lesson_complete" | "quiz_submit" | "bookmark_toggle" | "note_save";
    userId: string;
    getPayload: (...args: Parameters<T>) => Record<string, unknown>;
    onOptimistic?: (...args: Parameters<T>) => void;
    onError?: (error: Error) => void;
  }
): T {
  const { enqueue } = useOfflineQueue();
  const isOnline = useOnlineStatus();

  const wrappedAction = async (...args: Parameters<T>) => {
    // Optimistic update
    options.onOptimistic?.(...args);

    if (isOnline) {
      try {
        return await action(...args);
      } catch (error) {
        // If online request fails, queue it
        console.error("Action failed, queueing for retry:", error);
        await enqueue({
          type: options.type,
          userId: options.userId,
          payload: options.getPayload(...args),
        });
        throw error;
      }
    } else {
      // Queue the action for later
      await enqueue({
        type: options.type,
        userId: options.userId,
        payload: options.getPayload(...args),
      });
    }
  };

  return wrappedAction as T;
}
