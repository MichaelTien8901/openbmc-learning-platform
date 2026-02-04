import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import crypto from "crypto";
import type { ApiResponse } from "@/types";

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

interface SyncVerifyRequest {
  clientHash: string;
  clientItems: {
    completions: Array<{ lessonId: string; completedAt: string }>;
    quizAttempts: Array<{ lessonId: string; attemptedAt: string }>;
    bookmarks: Array<{ lessonId: string; createdAt: string }>;
    notes: Array<{ lessonId: string; updatedAt: string }>;
  };
}

interface SyncVerifyResponse {
  inSync: boolean;
  conflicts: SyncConflict[];
  serverStatus: SyncStatus;
}

/**
 * Generate a hash of user's progress state for sync verification
 */
function generateSyncHash(data: {
  completions: Array<{ lessonId: string; completedAt: Date }>;
  quizAttempts: Array<{ lessonId: string; createdAt: Date }>;
  bookmarks: Array<{ lessonId: string; createdAt: Date }>;
  notes: Array<{ lessonId: string; updatedAt: Date }>;
}): string {
  const normalized = {
    completions: data.completions
      .map((c) => `${c.lessonId}:${c.completedAt.toISOString()}`)
      .sort()
      .join(","),
    quizAttempts: data.quizAttempts
      .map((q) => `${q.lessonId}:${q.createdAt.toISOString()}`)
      .sort()
      .join(","),
    bookmarks: data.bookmarks
      .map((b) => `${b.lessonId}:${b.createdAt.toISOString()}`)
      .sort()
      .join(","),
    notes: data.notes
      .map((n) => `${n.lessonId}:${n.updatedAt.toISOString()}`)
      .sort()
      .join(","),
  };

  const content = JSON.stringify(normalized);
  return crypto.createHash("sha256").update(content).digest("hex").substring(0, 16);
}

/**
 * GET /api/progress/sync - Get sync status for current user
 */
export async function GET(_request: NextRequest): Promise<NextResponse<ApiResponse<SyncStatus>>> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get all user progress data
    const [completions, quizAttempts, bookmarks, notes] = await Promise.all([
      prisma.userProgress.findMany({
        where: { userId: session.userId, completed: true },
        select: { lessonId: true, completedAt: true },
      }),
      prisma.quizAttempt.findMany({
        where: { userId: session.userId },
        select: { lessonId: true, createdAt: true },
      }),
      prisma.bookmark.findMany({
        where: { userId: session.userId },
        select: { lessonId: true, createdAt: true },
      }),
      prisma.note.findMany({
        where: { userId: session.userId },
        select: { lessonId: true, updatedAt: true },
      }),
    ]);

    // Find last modified timestamp
    const timestamps = [
      ...completions.map((c) => c.completedAt),
      ...quizAttempts.map((q) => q.createdAt),
      ...bookmarks.map((b) => b.createdAt),
      ...notes.map((n) => n.updatedAt),
    ].filter((t): t is Date => t !== null);

    const lastModified =
      timestamps.length > 0
        ? new Date(Math.max(...timestamps.map((t) => t.getTime())))
        : new Date(0);

    // Generate sync hash
    const syncHash = generateSyncHash({
      completions: completions.filter((c) => c.completedAt !== null) as Array<{
        lessonId: string;
        completedAt: Date;
      }>,
      quizAttempts,
      bookmarks,
      notes,
    });

    return NextResponse.json({
      success: true,
      data: {
        syncHash,
        lastModified: lastModified.toISOString(),
        itemCount: {
          completions: completions.length,
          quizAttempts: quizAttempts.length,
          bookmarks: bookmarks.length,
          notes: notes.length,
        },
      },
    });
  } catch (error) {
    console.error("Sync status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/progress/sync - Verify sync status and detect conflicts
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<SyncVerifyResponse>>> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body: SyncVerifyRequest = await request.json();

    // Get server state
    const [completions, quizAttempts, bookmarks, notes] = await Promise.all([
      prisma.userProgress.findMany({
        where: { userId: session.userId, completed: true },
        select: { lessonId: true, completedAt: true },
      }),
      prisma.quizAttempt.findMany({
        where: { userId: session.userId },
        select: { lessonId: true, createdAt: true },
      }),
      prisma.bookmark.findMany({
        where: { userId: session.userId },
        select: { lessonId: true, createdAt: true },
      }),
      prisma.note.findMany({
        where: { userId: session.userId },
        select: { lessonId: true, updatedAt: true },
      }),
    ]);

    const conflicts: SyncConflict[] = [];

    // Check completions
    const serverCompletionMap = new Map(
      completions
        .filter((c) => c.completedAt !== null)
        .map((c) => [c.lessonId, c.completedAt!.toISOString()])
    );
    const clientCompletionMap = new Map(
      body.clientItems.completions.map((c) => [c.lessonId, c.completedAt])
    );

    for (const [lessonId, timestamp] of clientCompletionMap) {
      if (!serverCompletionMap.has(lessonId)) {
        conflicts.push({
          type: "completion",
          itemId: lessonId,
          serverTimestamp: "",
          conflict: "missing_on_server",
        });
      } else if (serverCompletionMap.get(lessonId) !== timestamp) {
        conflicts.push({
          type: "completion",
          itemId: lessonId,
          serverTimestamp: serverCompletionMap.get(lessonId)!,
          conflict: "timestamp_mismatch",
        });
      }
    }

    for (const [lessonId, timestamp] of serverCompletionMap) {
      if (!clientCompletionMap.has(lessonId)) {
        conflicts.push({
          type: "completion",
          itemId: lessonId,
          serverTimestamp: timestamp,
          conflict: "missing_on_client",
        });
      }
    }

    // Check bookmarks
    const serverBookmarkMap = new Map(
      bookmarks.map((b) => [b.lessonId, b.createdAt.toISOString()])
    );
    const clientBookmarkMap = new Map(
      body.clientItems.bookmarks.map((b) => [b.lessonId, b.createdAt])
    );

    for (const [lessonId] of clientBookmarkMap) {
      if (!serverBookmarkMap.has(lessonId)) {
        conflicts.push({
          type: "bookmark",
          itemId: lessonId,
          serverTimestamp: "",
          conflict: "missing_on_server",
        });
      }
    }

    for (const [lessonId, timestamp] of serverBookmarkMap) {
      if (!clientBookmarkMap.has(lessonId)) {
        conflicts.push({
          type: "bookmark",
          itemId: lessonId,
          serverTimestamp: timestamp,
          conflict: "missing_on_client",
        });
      }
    }

    // Generate server sync hash
    const serverSyncHash = generateSyncHash({
      completions: completions.filter((c) => c.completedAt !== null) as Array<{
        lessonId: string;
        completedAt: Date;
      }>,
      quizAttempts,
      bookmarks,
      notes,
    });

    const timestamps = [
      ...completions.map((c) => c.completedAt),
      ...quizAttempts.map((q) => q.createdAt),
      ...bookmarks.map((b) => b.createdAt),
      ...notes.map((n) => n.updatedAt),
    ].filter((t): t is Date => t !== null);

    const lastModified =
      timestamps.length > 0
        ? new Date(Math.max(...timestamps.map((t) => t.getTime())))
        : new Date(0);

    const inSync = body.clientHash === serverSyncHash && conflicts.length === 0;

    return NextResponse.json({
      success: true,
      data: {
        inSync,
        conflicts,
        serverStatus: {
          syncHash: serverSyncHash,
          lastModified: lastModified.toISOString(),
          itemCount: {
            completions: completions.length,
            quizAttempts: quizAttempts.length,
            bookmarks: bookmarks.length,
            notes: notes.length,
          },
        },
      },
    });
  } catch (error) {
    console.error("Sync verify error:", error);
    return NextResponse.json({ success: false, error: "Failed to verify sync" }, { status: 500 });
  }
}
