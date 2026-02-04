/**
 * NotebookLM Service Tests
 *
 * Tests the NotebookLM service layer with mocked dependencies.
 */

// Mock modules must be hoisted, use jest.mock with factory functions
jest.mock("@/lib/notebooklm/client", () => {
  const mockClient = {
    initialize: jest.fn().mockResolvedValue(undefined),
    getStatus: jest.fn(),
    query: jest.fn(),
    generateContent: jest.fn(),
    generateQuiz: jest.fn(),
    registerNotebook: jest.fn(),
    getNotebooks: jest.fn().mockReturnValue([]),
  };
  return {
    getNotebookLMClient: jest.fn(() => mockClient),
    __mockClient: mockClient,
  };
});

jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    aIResponseCache: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    generatedContent: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
  return {
    prisma: mockPrisma,
    __mockPrisma: mockPrisma,
  };
});

import { NotebookLMService, RateLimitError, getNotebookLMService } from "@/lib/notebooklm/service";
import { __mockClient as mockClient } from "@/lib/notebooklm/client";
import { __mockPrisma as mockPrisma } from "@/lib/prisma";

describe("NotebookLMService", () => {
  let service: NotebookLMService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton for each test
    service = new NotebookLMService();
    // Mock environment
    process.env.NOTEBOOKLM_MODE = "fallback";
  });

  describe("getStatus", () => {
    it("returns status from client", () => {
      const mockStatus = {
        mode: "mcp" as const,
        connected: true,
        notebookCount: 1,
        lastHealthCheck: new Date(),
      };
      (mockClient as { getStatus: jest.Mock }).getStatus.mockReturnValue(mockStatus);

      const status = service.getStatus();

      expect(status).toEqual(mockStatus);
    });
  });

  describe("checkRateLimit", () => {
    it("allows first request for new user", () => {
      const result = service.checkRateLimit("new-user-" + Date.now());

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19); // 20 - 1
    });

    it("tracks requests correctly", () => {
      const userId = "test-user-" + Date.now();

      // First request
      const result1 = service.checkRateLimit(userId);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(19);

      // Second request
      const result2 = service.checkRateLimit(userId);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(18);
    });

    it("blocks requests when limit exceeded", () => {
      const userId = "rate-limited-" + Date.now();

      // Exhaust the rate limit
      for (let i = 0; i < 20; i++) {
        service.checkRateLimit(userId);
      }

      // Next request should be blocked
      const result = service.checkRateLimit(userId);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("isolates rate limits per user", () => {
      const user1 = "user-a-" + Date.now();
      const user2 = "user-b-" + Date.now();

      // Exhaust user1's limit
      for (let i = 0; i < 20; i++) {
        service.checkRateLimit(user1);
      }

      // User2 should still be allowed
      const result = service.checkRateLimit(user2);
      expect(result.allowed).toBe(true);
    });
  });

  describe("askQuestion", () => {
    const mockQuery = {
      question: "What is OpenBMC?",
      notebookId: "openbmc-docs",
    };

    it("returns cached response when available", async () => {
      const cachedResponse = {
        answer: "OpenBMC is an open-source BMC firmware stack.",
        citations: [],
        cached: false,
      };

      (
        mockPrisma as { aIResponseCache: { findFirst: jest.Mock } }
      ).aIResponseCache.findFirst.mockResolvedValue({
        cacheKey: "qa:What is OpenBMC?:openbmc-docs",
        response: JSON.stringify(cachedResponse),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = await service.askQuestion("user-cached-" + Date.now(), mockQuery);

      expect(result.answer).toBe(cachedResponse.answer);
      expect(result.cached).toBe(true);
      expect((mockClient as { query: jest.Mock }).query).not.toHaveBeenCalled();
    });

    it("queries client on cache miss", async () => {
      (
        mockPrisma as { aIResponseCache: { findFirst: jest.Mock } }
      ).aIResponseCache.findFirst.mockResolvedValue(null);
      (mockClient as { query: jest.Mock }).query.mockResolvedValue({
        answer: "OpenBMC is a Linux Foundation project.",
        citations: [{ title: "OpenBMC Docs", url: "https://openbmc.org" }],
        cached: false,
      });
      (
        mockPrisma as { aIResponseCache: { upsert: jest.Mock } }
      ).aIResponseCache.upsert.mockResolvedValue({});

      const result = await service.askQuestion("user-nocache-" + Date.now(), mockQuery);

      expect(result.answer).toBe("OpenBMC is a Linux Foundation project.");
      expect((mockClient as { query: jest.Mock }).query).toHaveBeenCalledWith(mockQuery);
    });

    it("caches successful responses", async () => {
      (
        mockPrisma as { aIResponseCache: { findFirst: jest.Mock } }
      ).aIResponseCache.findFirst.mockResolvedValue(null);
      (mockClient as { query: jest.Mock }).query.mockResolvedValue({
        answer: "Test answer",
        citations: [],
        cached: false,
      });

      await service.askQuestion("user-cache-" + Date.now(), mockQuery);

      expect(
        (mockPrisma as { aIResponseCache: { upsert: jest.Mock } }).aIResponseCache.upsert
      ).toHaveBeenCalled();
    });

    it("throws RateLimitError when limit exceeded", async () => {
      const userId = "rate-limited-q-" + Date.now();

      // Exhaust the rate limit
      for (let i = 0; i < 20; i++) {
        service.checkRateLimit(userId);
      }

      await expect(service.askQuestion(userId, mockQuery)).rejects.toThrow(RateLimitError);
    });

    it("includes rate limit remaining in response", async () => {
      (
        mockPrisma as { aIResponseCache: { findFirst: jest.Mock } }
      ).aIResponseCache.findFirst.mockResolvedValue(null);
      (mockClient as { query: jest.Mock }).query.mockResolvedValue({
        answer: "Test",
        citations: [],
        cached: false,
      });

      const result = await service.askQuestion("user-rl-" + Date.now(), mockQuery);

      expect(result.rateLimitRemaining).toBeDefined();
      expect(typeof result.rateLimitRemaining).toBe("number");
    });
  });

  describe("getContent", () => {
    const lessonId = "lesson-123";
    const notebookId = "openbmc-docs";
    const topic = "Introduction to OpenBMC";

    it("returns cached content when available", async () => {
      const cachedContent = {
        title: "Introduction to OpenBMC",
        content: "OpenBMC is...",
        keyPoints: ["Point 1", "Point 2"],
      };

      (
        mockPrisma as { generatedContent: { findFirst: jest.Mock } }
      ).generatedContent.findFirst.mockResolvedValue({
        lessonId,
        type: "TEACHING_CONTENT",
        content: JSON.stringify(cachedContent),
        createdAt: new Date(),
      });

      const result = await service.getContent(lessonId, notebookId, topic);

      expect(result).toEqual(cachedContent);
      expect((mockClient as { generateContent: jest.Mock }).generateContent).not.toHaveBeenCalled();
    });

    it("generates new content on cache miss", async () => {
      const generatedContent = {
        title: "New Content",
        content: "Fresh content...",
        keyPoints: ["New point"],
      };

      (
        mockPrisma as { generatedContent: { findFirst: jest.Mock } }
      ).generatedContent.findFirst.mockResolvedValue(null);
      (mockClient as { generateContent: jest.Mock }).generateContent.mockResolvedValue(
        generatedContent
      );
      (
        mockPrisma as { generatedContent: { create: jest.Mock } }
      ).generatedContent.create.mockResolvedValue({});

      const result = await service.getContent(lessonId, notebookId, topic);

      expect(result).toEqual(generatedContent);
      expect((mockClient as { generateContent: jest.Mock }).generateContent).toHaveBeenCalled();
    });

    it("regenerates content when forced", async () => {
      const cachedContent = { title: "Old", content: "Old content" };
      const newContent = { title: "New", content: "New content" };

      (
        mockPrisma as { generatedContent: { findFirst: jest.Mock } }
      ).generatedContent.findFirst.mockResolvedValue({
        content: JSON.stringify(cachedContent),
      });
      (mockClient as { generateContent: jest.Mock }).generateContent.mockResolvedValue(newContent);
      (
        mockPrisma as { generatedContent: { create: jest.Mock } }
      ).generatedContent.create.mockResolvedValue({});

      const result = await service.getContent(lessonId, notebookId, topic, true);

      expect(result).toEqual(newContent);
      expect((mockClient as { generateContent: jest.Mock }).generateContent).toHaveBeenCalled();
    });
  });

  describe("getQuiz", () => {
    const lessonId = "lesson-456";
    const notebookId = "openbmc-docs";
    const topic = "BMC Architecture";

    it("returns cached quiz when available", async () => {
      const cachedQuiz = {
        questions: [{ question: "What is BMC?", options: ["A", "B", "C", "D"], correctAnswer: 0 }],
      };

      (
        mockPrisma as { generatedContent: { findFirst: jest.Mock } }
      ).generatedContent.findFirst.mockResolvedValue({
        lessonId,
        type: "QUIZ",
        content: JSON.stringify(cachedQuiz),
        createdAt: new Date(),
      });

      const result = await service.getQuiz(lessonId, notebookId, topic);

      expect(result).toEqual(cachedQuiz);
      expect((mockClient as { generateQuiz: jest.Mock }).generateQuiz).not.toHaveBeenCalled();
    });

    it("generates new quiz on cache miss", async () => {
      const generatedQuiz = {
        questions: [{ question: "New question?", options: ["A", "B", "C", "D"], correctAnswer: 1 }],
      };

      (
        mockPrisma as { generatedContent: { findFirst: jest.Mock } }
      ).generatedContent.findFirst.mockResolvedValue(null);
      (mockClient as { generateQuiz: jest.Mock }).generateQuiz.mockResolvedValue(generatedQuiz);
      (
        mockPrisma as { generatedContent: { create: jest.Mock } }
      ).generatedContent.create.mockResolvedValue({});

      const result = await service.getQuiz(lessonId, notebookId, topic);

      expect(result).toEqual(generatedQuiz);
      expect((mockClient as { generateQuiz: jest.Mock }).generateQuiz).toHaveBeenCalled();
    });

    it("passes correct parameters to quiz generator", async () => {
      (
        mockPrisma as { generatedContent: { findFirst: jest.Mock } }
      ).generatedContent.findFirst.mockResolvedValue(null);
      (mockClient as { generateQuiz: jest.Mock }).generateQuiz.mockResolvedValue({ questions: [] });

      await service.getQuiz(lessonId, notebookId, topic);

      expect((mockClient as { generateQuiz: jest.Mock }).generateQuiz).toHaveBeenCalledWith({
        lessonId,
        topic,
        notebookId,
        questionCount: 5,
        difficulty: "medium",
      });
    });
  });
});

describe("RateLimitError", () => {
  it("has correct properties", () => {
    const error = new RateLimitError("Rate limit exceeded", 3600000);

    expect(error.name).toBe("RateLimitError");
    expect(error.message).toBe("Rate limit exceeded");
    expect(error.resetIn).toBe(3600000);
  });

  it("is an instance of Error", () => {
    const error = new RateLimitError("Test", 1000);
    expect(error instanceof Error).toBe(true);
  });
});

describe("getNotebookLMService", () => {
  it("returns a NotebookLMService instance", () => {
    const instance = getNotebookLMService();
    expect(instance).toBeInstanceOf(NotebookLMService);
  });
});
