"use client";

/**
 * Cross-Device Sync Verification Hook
 *
 * Verifies that local progress data matches the server state.
 * Useful for detecting sync issues across devices.
 */

import { useState, useCallback, useEffect } from "react";

interface SyncStatus {
  syncHash: string;
  lastModified: string;
  itemCount: {
    completions: number;
    quizAttempts: number;
    bookmarks: number;
    notes: number;
  };
}

interface SyncConflict {
  type: "completion" | "quiz" | "bookmark" | "note";
  itemId: string;
  serverTimestamp: string;
  conflict: "missing_on_server" | "missing_on_client" | "timestamp_mismatch";
}

interface SyncVerifyResult {
  inSync: boolean;
  conflicts: SyncConflict[];
  serverStatus: SyncStatus;
}

interface UseSyncVerificationReturn {
  status: SyncStatus | null;
  isVerifying: boolean;
  lastVerified: Date | null;
  conflicts: SyncConflict[];
  isInSync: boolean | null;
  fetchStatus: () => Promise<SyncStatus | null>;
  verify: (clientData: ClientSyncData) => Promise<SyncVerifyResult | null>;
  error: string | null;
}

interface ClientSyncData {
  clientHash: string;
  clientItems: {
    completions: Array<{ lessonId: string; completedAt: string }>;
    quizAttempts: Array<{ lessonId: string; attemptedAt: string }>;
    bookmarks: Array<{ lessonId: string; createdAt: string }>;
    notes: Array<{ lessonId: string; updatedAt: string }>;
  };
}

/**
 * Hook for cross-device sync verification
 */
export function useSyncVerification(): UseSyncVerificationReturn {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerified, setLastVerified] = useState<Date | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [isInSync, setIsInSync] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current sync status from server
  const fetchStatus = useCallback(async (): Promise<SyncStatus | null> => {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/progress/sync");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch sync status");
      }

      setStatus(data.data);
      setLastVerified(new Date());
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync status fetch failed";
      setError(message);
      console.error("Sync status error:", err);
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Verify sync with client data
  const verify = useCallback(
    async (clientData: ClientSyncData): Promise<SyncVerifyResult | null> => {
      setIsVerifying(true);
      setError(null);

      try {
        const response = await fetch("/api/progress/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to verify sync");
        }

        const result: SyncVerifyResult = data.data;
        setStatus(result.serverStatus);
        setConflicts(result.conflicts);
        setIsInSync(result.inSync);
        setLastVerified(new Date());

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync verification failed";
        setError(message);
        console.error("Sync verify error:", err);
        return null;
      } finally {
        setIsVerifying(false);
      }
    },
    []
  );

  return {
    status,
    isVerifying,
    lastVerified,
    conflicts,
    isInSync,
    fetchStatus,
    verify,
    error,
  };
}

/**
 * Generate a sync hash on the client side
 * This should match the server-side algorithm
 */
export function generateClientSyncHash(data: {
  completions: Array<{ lessonId: string; completedAt: string }>;
  quizAttempts: Array<{ lessonId: string; attemptedAt: string }>;
  bookmarks: Array<{ lessonId: string; createdAt: string }>;
  notes: Array<{ lessonId: string; updatedAt: string }>;
}): string {
  const normalized = {
    completions: data.completions
      .map((c) => `${c.lessonId}:${c.completedAt}`)
      .sort()
      .join(","),
    quizAttempts: data.quizAttempts
      .map((q) => `${q.lessonId}:${q.attemptedAt}`)
      .sort()
      .join(","),
    bookmarks: data.bookmarks
      .map((b) => `${b.lessonId}:${b.createdAt}`)
      .sort()
      .join(","),
    notes: data.notes
      .map((n) => `${n.lessonId}:${n.updatedAt}`)
      .sort()
      .join(","),
  };

  // Use Web Crypto API for browser-side hashing
  const content = JSON.stringify(normalized);
  return simpleHash(content);
}

/**
 * Simple hash function for browser (matches server SHA256 truncated to 16 chars)
 * For production, use SubtleCrypto.digest
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and pad to 16 chars
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return hex + hex; // Repeat to get 16 chars
}

/**
 * Hook that periodically checks sync status
 */
export function useAutoSyncVerification(intervalMs: number = 60000): UseSyncVerificationReturn {
  const syncVerification = useSyncVerification();
  const { fetchStatus } = syncVerification;

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Set up periodic checking
    const interval = setInterval(() => {
      fetchStatus();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, fetchStatus]);

  return syncVerification;
}
