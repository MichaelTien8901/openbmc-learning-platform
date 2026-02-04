/**
 * Sync Verification Tests
 *
 * Tests for cross-device sync verification logic.
 */

describe("Sync Verification Logic", () => {
  describe("Sync Hash Generation", () => {
    interface SyncData {
      completions: Array<{ lessonId: string; completedAt: string }>;
      quizAttempts: Array<{ lessonId: string; attemptedAt: string }>;
      bookmarks: Array<{ lessonId: string; createdAt: string }>;
      notes: Array<{ lessonId: string; updatedAt: string }>;
    }

    function generateNormalizedString(data: SyncData): string {
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
      return JSON.stringify(normalized);
    }

    it("generates consistent string for same data", () => {
      const data: SyncData = {
        completions: [{ lessonId: "l1", completedAt: "2024-01-01T00:00:00Z" }],
        quizAttempts: [],
        bookmarks: [],
        notes: [],
      };

      const str1 = generateNormalizedString(data);
      const str2 = generateNormalizedString(data);

      expect(str1).toBe(str2);
    });

    it("generates same string regardless of order", () => {
      const data1: SyncData = {
        completions: [
          { lessonId: "l2", completedAt: "2024-01-02T00:00:00Z" },
          { lessonId: "l1", completedAt: "2024-01-01T00:00:00Z" },
        ],
        quizAttempts: [],
        bookmarks: [],
        notes: [],
      };

      const data2: SyncData = {
        completions: [
          { lessonId: "l1", completedAt: "2024-01-01T00:00:00Z" },
          { lessonId: "l2", completedAt: "2024-01-02T00:00:00Z" },
        ],
        quizAttempts: [],
        bookmarks: [],
        notes: [],
      };

      expect(generateNormalizedString(data1)).toBe(generateNormalizedString(data2));
    });

    it("generates different string for different data", () => {
      const data1: SyncData = {
        completions: [{ lessonId: "l1", completedAt: "2024-01-01T00:00:00Z" }],
        quizAttempts: [],
        bookmarks: [],
        notes: [],
      };

      const data2: SyncData = {
        completions: [{ lessonId: "l2", completedAt: "2024-01-01T00:00:00Z" }],
        quizAttempts: [],
        bookmarks: [],
        notes: [],
      };

      expect(generateNormalizedString(data1)).not.toBe(generateNormalizedString(data2));
    });

    it("handles empty data", () => {
      const data: SyncData = {
        completions: [],
        quizAttempts: [],
        bookmarks: [],
        notes: [],
      };

      const str = generateNormalizedString(data);
      expect(str).toBe('{"completions":"","quizAttempts":"","bookmarks":"","notes":""}');
    });
  });

  describe("Conflict Detection", () => {
    interface Item {
      id: string;
      timestamp: string;
    }

    type ConflictType = "missing_on_server" | "missing_on_client" | "timestamp_mismatch";

    interface Conflict {
      itemId: string;
      type: ConflictType;
    }

    function detectConflicts(clientItems: Item[], serverItems: Item[]): Conflict[] {
      const conflicts: Conflict[] = [];
      const serverMap = new Map(serverItems.map((i) => [i.id, i.timestamp]));
      const clientMap = new Map(clientItems.map((i) => [i.id, i.timestamp]));

      // Check client items
      for (const [id, timestamp] of clientMap) {
        if (!serverMap.has(id)) {
          conflicts.push({ itemId: id, type: "missing_on_server" });
        } else if (serverMap.get(id) !== timestamp) {
          conflicts.push({ itemId: id, type: "timestamp_mismatch" });
        }
      }

      // Check server items
      for (const [id] of serverMap) {
        if (!clientMap.has(id)) {
          conflicts.push({ itemId: id, type: "missing_on_client" });
        }
      }

      return conflicts;
    }

    it("detects no conflicts when items match", () => {
      const clientItems: Item[] = [
        { id: "1", timestamp: "2024-01-01T00:00:00Z" },
        { id: "2", timestamp: "2024-01-02T00:00:00Z" },
      ];

      const serverItems: Item[] = [
        { id: "1", timestamp: "2024-01-01T00:00:00Z" },
        { id: "2", timestamp: "2024-01-02T00:00:00Z" },
      ];

      const conflicts = detectConflicts(clientItems, serverItems);
      expect(conflicts).toHaveLength(0);
    });

    it("detects missing on server", () => {
      const clientItems: Item[] = [
        { id: "1", timestamp: "2024-01-01T00:00:00Z" },
        { id: "2", timestamp: "2024-01-02T00:00:00Z" },
      ];

      const serverItems: Item[] = [{ id: "1", timestamp: "2024-01-01T00:00:00Z" }];

      const conflicts = detectConflicts(clientItems, serverItems);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual({ itemId: "2", type: "missing_on_server" });
    });

    it("detects missing on client", () => {
      const clientItems: Item[] = [{ id: "1", timestamp: "2024-01-01T00:00:00Z" }];

      const serverItems: Item[] = [
        { id: "1", timestamp: "2024-01-01T00:00:00Z" },
        { id: "2", timestamp: "2024-01-02T00:00:00Z" },
      ];

      const conflicts = detectConflicts(clientItems, serverItems);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual({ itemId: "2", type: "missing_on_client" });
    });

    it("detects timestamp mismatch", () => {
      const clientItems: Item[] = [{ id: "1", timestamp: "2024-01-01T00:00:00Z" }];

      const serverItems: Item[] = [{ id: "1", timestamp: "2024-01-01T12:00:00Z" }];

      const conflicts = detectConflicts(clientItems, serverItems);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual({ itemId: "1", type: "timestamp_mismatch" });
    });

    it("detects multiple conflict types", () => {
      const clientItems: Item[] = [
        { id: "1", timestamp: "2024-01-01T00:00:00Z" },
        { id: "2", timestamp: "2024-01-02T00:00:00Z" },
      ];

      const serverItems: Item[] = [
        { id: "1", timestamp: "2024-01-01T12:00:00Z" }, // timestamp mismatch
        { id: "3", timestamp: "2024-01-03T00:00:00Z" }, // missing on client
      ];

      const conflicts = detectConflicts(clientItems, serverItems);
      expect(conflicts).toHaveLength(3);
      expect(conflicts.map((c) => c.type).sort()).toEqual([
        "missing_on_client",
        "missing_on_server",
        "timestamp_mismatch",
      ]);
    });

    it("handles empty arrays", () => {
      expect(detectConflicts([], [])).toHaveLength(0);
      expect(detectConflicts([{ id: "1", timestamp: "t" }], [])).toHaveLength(1);
      expect(detectConflicts([], [{ id: "1", timestamp: "t" }])).toHaveLength(1);
    });
  });

  describe("Sync Status", () => {
    interface SyncStatus {
      pending: number;
      processing: boolean;
      lastSync: number | null;
      online: boolean;
    }

    function shouldShowSyncNeeded(status: SyncStatus, conflicts: number): boolean {
      return status.online && conflicts > 0 && !status.processing;
    }

    function shouldShowInSync(status: SyncStatus, conflicts: number): boolean {
      return status.online && conflicts === 0 && status.pending === 0;
    }

    it("shows sync needed when there are conflicts", () => {
      const status: SyncStatus = {
        pending: 0,
        processing: false,
        lastSync: Date.now(),
        online: true,
      };
      expect(shouldShowSyncNeeded(status, 3)).toBe(true);
    });

    it("does not show sync needed when offline", () => {
      const status: SyncStatus = {
        pending: 0,
        processing: false,
        lastSync: Date.now(),
        online: false,
      };
      expect(shouldShowSyncNeeded(status, 3)).toBe(false);
    });

    it("does not show sync needed when processing", () => {
      const status: SyncStatus = {
        pending: 0,
        processing: true,
        lastSync: Date.now(),
        online: true,
      };
      expect(shouldShowSyncNeeded(status, 3)).toBe(false);
    });

    it("shows in sync when all conditions met", () => {
      const status: SyncStatus = {
        pending: 0,
        processing: false,
        lastSync: Date.now(),
        online: true,
      };
      expect(shouldShowInSync(status, 0)).toBe(true);
    });

    it("does not show in sync when pending items", () => {
      const status: SyncStatus = {
        pending: 5,
        processing: false,
        lastSync: Date.now(),
        online: true,
      };
      expect(shouldShowInSync(status, 0)).toBe(false);
    });

    it("does not show in sync when offline", () => {
      const status: SyncStatus = {
        pending: 0,
        processing: false,
        lastSync: Date.now(),
        online: false,
      };
      expect(shouldShowInSync(status, 0)).toBe(false);
    });
  });

  describe("Sync Resolution Strategies", () => {
    type ResolutionStrategy = "server_wins" | "client_wins" | "latest_wins" | "manual";

    interface ConflictWithTimestamps {
      itemId: string;
      clientTimestamp: string;
      serverTimestamp: string;
    }

    function resolveConflict(
      conflict: ConflictWithTimestamps,
      strategy: ResolutionStrategy
    ): "use_server" | "use_client" | "manual" {
      switch (strategy) {
        case "server_wins":
          return "use_server";
        case "client_wins":
          return "use_client";
        case "latest_wins": {
          const clientTime = new Date(conflict.clientTimestamp).getTime();
          const serverTime = new Date(conflict.serverTimestamp).getTime();
          return clientTime >= serverTime ? "use_client" : "use_server";
        }
        case "manual":
          return "manual";
      }
    }

    it("server wins strategy always uses server", () => {
      const conflict: ConflictWithTimestamps = {
        itemId: "1",
        clientTimestamp: "2024-01-02T00:00:00Z",
        serverTimestamp: "2024-01-01T00:00:00Z",
      };
      expect(resolveConflict(conflict, "server_wins")).toBe("use_server");
    });

    it("client wins strategy always uses client", () => {
      const conflict: ConflictWithTimestamps = {
        itemId: "1",
        clientTimestamp: "2024-01-01T00:00:00Z",
        serverTimestamp: "2024-01-02T00:00:00Z",
      };
      expect(resolveConflict(conflict, "client_wins")).toBe("use_client");
    });

    it("latest wins uses client when client is newer", () => {
      const conflict: ConflictWithTimestamps = {
        itemId: "1",
        clientTimestamp: "2024-01-02T00:00:00Z",
        serverTimestamp: "2024-01-01T00:00:00Z",
      };
      expect(resolveConflict(conflict, "latest_wins")).toBe("use_client");
    });

    it("latest wins uses server when server is newer", () => {
      const conflict: ConflictWithTimestamps = {
        itemId: "1",
        clientTimestamp: "2024-01-01T00:00:00Z",
        serverTimestamp: "2024-01-02T00:00:00Z",
      };
      expect(resolveConflict(conflict, "latest_wins")).toBe("use_server");
    });

    it("manual strategy returns manual", () => {
      const conflict: ConflictWithTimestamps = {
        itemId: "1",
        clientTimestamp: "2024-01-01T00:00:00Z",
        serverTimestamp: "2024-01-02T00:00:00Z",
      };
      expect(resolveConflict(conflict, "manual")).toBe("manual");
    });
  });

  describe("Hash Consistency", () => {
    function simpleHash(str: string): string {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      const hex = Math.abs(hash).toString(16).padStart(8, "0");
      return hex + hex;
    }

    it("produces consistent hash for same input", () => {
      const input = "test string";
      expect(simpleHash(input)).toBe(simpleHash(input));
    });

    it("produces different hash for different input", () => {
      expect(simpleHash("input1")).not.toBe(simpleHash("input2"));
    });

    it("produces 16 character hash", () => {
      expect(simpleHash("test").length).toBe(16);
      expect(simpleHash("").length).toBe(16);
      expect(simpleHash("a very long string with many characters").length).toBe(16);
    });

    it("handles empty string", () => {
      const hash = simpleHash("");
      expect(hash).toBeTruthy();
      expect(hash.length).toBe(16);
    });

    it("handles unicode characters", () => {
      const hash = simpleHash("hello 世界 🌍");
      expect(hash).toBeTruthy();
      expect(hash.length).toBe(16);
    });
  });
});
