"use client";

/**
 * React Hook for Offline Queue
 *
 * Provides offline queue status and actions to React components.
 */

import { useState, useEffect, useCallback } from "react";
import { getOfflineQueue, type QueuedAction } from "@/lib/offline-queue";

interface QueueStatus {
  pending: number;
  processing: boolean;
  lastSync: number | null;
  online: boolean;
}

interface UseOfflineQueueReturn {
  status: QueueStatus;
  isOnline: boolean;
  pendingCount: number;
  isProcessing: boolean;
  enqueue: (action: Omit<QueuedAction, "id" | "timestamp" | "retries">) => Promise<string>;
  processQueue: () => Promise<void>;
  retryAll: () => Promise<void>;
  clear: () => Promise<void>;
  getPendingActions: (userId: string) => Promise<QueuedAction[]>;
}

const defaultStatus: QueueStatus = {
  pending: 0,
  processing: false,
  lastSync: null,
  online: true,
};

/**
 * Hook for accessing offline queue functionality
 */
export function useOfflineQueue(): UseOfflineQueueReturn {
  const [status, setStatus] = useState<QueueStatus>(defaultStatus);

  useEffect(() => {
    const queue = getOfflineQueue();

    // Initialize and subscribe
    const init = async () => {
      try {
        await queue.initialize();
        const initialStatus = await queue.getStatus();
        setStatus(initialStatus);
      } catch (error) {
        console.error("Failed to initialize offline queue:", error);
      }
    };

    init();

    // Subscribe to status changes
    const unsubscribe = queue.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const enqueue = useCallback(
    async (action: Omit<QueuedAction, "id" | "timestamp" | "retries">) => {
      const queue = getOfflineQueue();
      return queue.enqueue(action);
    },
    []
  );

  const processQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    return queue.processQueue();
  }, []);

  const retryAll = useCallback(async () => {
    const queue = getOfflineQueue();
    return queue.retryAll();
  }, []);

  const clear = useCallback(async () => {
    const queue = getOfflineQueue();
    return queue.clear();
  }, []);

  const getPendingActions = useCallback(async (userId: string) => {
    const queue = getOfflineQueue();
    return queue.getPendingActions(userId);
  }, []);

  return {
    status,
    isOnline: status.online,
    pendingCount: status.pending,
    isProcessing: status.processing,
    enqueue,
    processQueue,
    retryAll,
    clear,
    getPendingActions,
  };
}

/**
 * Hook for tracking online/offline status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
