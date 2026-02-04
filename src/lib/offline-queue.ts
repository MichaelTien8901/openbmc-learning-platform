/**
 * Offline Progress Queue
 *
 * Handles queueing progress updates when offline and syncing when back online.
 * Uses IndexedDB for persistent storage across sessions.
 */

export interface QueuedAction {
  id: string;
  type: "lesson_complete" | "quiz_submit" | "bookmark_toggle" | "note_save";
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
  userId: string;
}

interface QueueStatus {
  pending: number;
  processing: boolean;
  lastSync: number | null;
  online: boolean;
}

const DB_NAME = "openbmc-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "actions";
const MAX_RETRIES = 3;

class OfflineQueue {
  private db: IDBDatabase | null = null;
  private processing = false;
  private listeners: Set<(status: QueueStatus) => void> = new Set();
  private lastSync: number | null = null;

  /**
   * Initialize the offline queue
   */
  async initialize(): Promise<void> {
    if (typeof window === "undefined") return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.setupOnlineListener();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("type", "type", { unique: false });
        }
      };
    });
  }

  /**
   * Set up online/offline event listeners
   */
  private setupOnlineListener(): void {
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener("offline", () => {
      this.notifyListeners();
    });
  }

  /**
   * Check if we're online
   */
  isOnline(): boolean {
    if (typeof window === "undefined") return true;
    return navigator.onLine;
  }

  /**
   * Add an action to the queue
   */
  async enqueue(action: Omit<QueuedAction, "id" | "timestamp" | "retries">): Promise<string> {
    await this.ensureInitialized();

    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queuedAction);

      request.onsuccess = () => {
        this.notifyListeners();
        // Try to process immediately if online
        if (this.isOnline()) {
          this.processQueue();
        }
        resolve(queuedAction.id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending actions for a user
   */
  async getPendingActions(userId: string): Promise<QueuedAction[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("userId");
      const request = index.getAll(userId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get queue status
   */
  async getStatus(): Promise<QueueStatus> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        resolve({
          pending: request.result,
          processing: this.processing,
          lastSync: this.lastSync,
          online: this.isOnline(),
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Process the queue
   */
  async processQueue(): Promise<void> {
    if (this.processing || !this.isOnline()) return;
    await this.ensureInitialized();

    this.processing = true;
    this.notifyListeners();

    try {
      const actions = await this.getAllActions();

      for (const action of actions) {
        try {
          await this.processAction(action);
          await this.removeAction(action.id);
        } catch (error) {
          console.error(`Failed to process action ${action.id}:`, error);

          if (action.retries < MAX_RETRIES) {
            await this.updateRetries(action.id, action.retries + 1);
          } else {
            // Move to dead letter queue or remove after max retries
            console.error(`Action ${action.id} exceeded max retries, removing`);
            await this.removeAction(action.id);
          }
        }
      }

      this.lastSync = Date.now();
    } finally {
      this.processing = false;
      this.notifyListeners();
    }
  }

  /**
   * Process a single action
   */
  private async processAction(action: QueuedAction): Promise<void> {
    const endpoints: Record<QueuedAction["type"], string> = {
      lesson_complete: "/api/progress/complete",
      quiz_submit: "/api/progress/quiz",
      bookmark_toggle: "/api/lessons/bookmark",
      note_save: "/api/lessons/notes",
    };

    const endpoint = endpoints[action.type];
    if (!endpoint) {
      throw new Error(`Unknown action type: ${action.type}`);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...action.payload,
        _offlineQueueId: action.id,
        _queuedAt: action.timestamp,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
  }

  /**
   * Get all queued actions
   */
  private async getAllActions(): Promise<QueuedAction[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("timestamp");
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove an action from the queue
   */
  private async removeAction(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update retry count for an action
   */
  private async updateRetries(id: string, retries: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.retries = retries;
          const putRequest = store.put(action);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Subscribe to status changes
   */
  subscribe(callback: (status: QueueStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of status change
   */
  private async notifyListeners(): Promise<void> {
    try {
      const status = await this.getStatus();
      this.listeners.forEach((callback) => callback(status));
    } catch (error) {
      console.error("Failed to get status:", error);
    }
  }

  /**
   * Ensure the database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  /**
   * Clear all queued actions (for testing or user logout)
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Force retry all failed actions
   */
  async retryAll(): Promise<void> {
    if (!this.isOnline()) {
      throw new Error("Cannot retry while offline");
    }

    // Reset retry counts
    const actions = await this.getAllActions();
    for (const action of actions) {
      await this.updateRetries(action.id, 0);
    }

    // Process queue
    await this.processQueue();
  }
}

// Singleton instance
let queueInstance: OfflineQueue | null = null;

/**
 * Get the offline queue instance
 */
export function getOfflineQueue(): OfflineQueue {
  if (!queueInstance) {
    queueInstance = new OfflineQueue();
  }
  return queueInstance;
}

/**
 * React hook for offline queue status
 */
export function useOfflineQueue() {
  // This will be implemented in a separate hook file for React integration
  return getOfflineQueue();
}
