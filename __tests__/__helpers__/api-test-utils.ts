/**
 * API Test Setup
 *
 * Provides utilities for testing Next.js API routes
 */

/**
 * Mock session for authenticated requests
 */
export interface MockSession {
  id: string;
  email: string;
  displayName: string;
  role: "LEARNER" | "EDITOR" | "ADMIN";
}

export const mockLearnerSession: MockSession = {
  id: "user-learner-123",
  email: "learner@test.com",
  displayName: "Test Learner",
  role: "LEARNER",
};

export const mockEditorSession: MockSession = {
  id: "user-editor-123",
  email: "editor@test.com",
  displayName: "Test Editor",
  role: "EDITOR",
};

export const mockAdminSession: MockSession = {
  id: "user-admin-123",
  email: "admin@test.com",
  displayName: "Test Admin",
  role: "ADMIN",
};

/**
 * Create a mock Request object for testing
 * This is a simplified version that works without the Next.js runtime
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): {
  url: string;
  method: string;
  json: () => Promise<unknown>;
  headers: Headers;
} {
  const { method = "GET", body, headers = {}, searchParams = {} } = options;

  const urlObj = new URL(url, "http://localhost:3000");
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  return {
    url: urlObj.toString(),
    method,
    json: async () => body,
    headers: new Headers({
      "Content-Type": "application/json",
      ...headers,
    }),
  };
}

/**
 * Parse JSON response
 */
export async function parseResponse<T>(response: { json: () => Promise<T> }): Promise<T> {
  return response.json();
}

/**
 * Mock Prisma client for tests
 */
export function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    learningPath: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    lesson: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    userProgress: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    pathEnrollment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    bookmark: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    note: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    quizAttempt: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    quizQuestion: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    generatedContent: {
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    aIResponseCache: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    aIUsageEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    aIUsageDaily: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn()),
  };
}

/**
 * Mock NextResponse for testing
 */
export function createMockNextResponse() {
  return {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      json: async () => data,
      headers: new Headers(init?.headers || {}),
    })),
  };
}
