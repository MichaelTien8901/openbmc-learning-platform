/**
 * NotebookLM Service
 *
 * High-level service for interacting with NotebookLM.
 * Handles caching, rate limiting, and database integration.
 */

import { prisma } from "@/lib/prisma";
import { getNotebookLMClient, type ConnectionMode } from "./client";
import type {
  NotebookConfig,
  NotebookLMQuery,
  NotebookLMResponse,
  NotebookLMStatus,
  GeneratedContent,
  GeneratedQuiz,
} from "./types";

// Rate limit configuration (20 requests per hour)
const RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
};

// Cache duration (24 hours)
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// In-memory rate limit tracking
const userRequestCounts = new Map<string, { count: number; windowStart: number }>();

interface NotebookLMServiceConfig {
  mode?: ConnectionMode;
  mcpEndpoint?: string;
}

class NotebookLMService {
  private initialized = false;

  /**
   * Initialize the service
   */
  async initialize(config?: NotebookLMServiceConfig): Promise<void> {
    if (this.initialized) return;

    const client = getNotebookLMClient({
      mode: config?.mode || (process.env.NOTEBOOKLM_MODE as ConnectionMode) || "fallback",
      mcpEndpoint: config?.mcpEndpoint || process.env.NOTEBOOKLM_MCP_ENDPOINT,
    });

    await client.initialize();

    // Load notebook configurations from environment or database
    await this.loadNotebookConfigs();

    this.initialized = true;
  }

  /**
   * Load notebook configurations
   */
  private async loadNotebookConfigs(): Promise<void> {
    const client = getNotebookLMClient();

    // Load from environment variable (JSON array)
    const configJson = process.env.NOTEBOOKLM_NOTEBOOKS;
    if (configJson) {
      try {
        const configs: NotebookConfig[] = JSON.parse(configJson);
        for (const config of configs) {
          client.registerNotebook(config);
        }
      } catch (error) {
        console.error("Failed to parse NOTEBOOKLM_NOTEBOOKS:", error);
      }
    }

    // Default OpenBMC notebook if no configs provided
    if (client.getNotebooks().length === 0) {
      client.registerNotebook({
        id: "openbmc-docs",
        name: "OpenBMC Documentation",
        url: process.env.NOTEBOOKLM_DEFAULT_URL || "",
        description: "OpenBMC documentation and tutorials",
        topics: ["openbmc", "bmc", "firmware", "dbus"],
        isActive: true,
      });
    }
  }

  /**
   * Get service status
   */
  getStatus(): NotebookLMStatus {
    const client = getNotebookLMClient();
    return client.getStatus();
  }

  /**
   * Check if rate limit allows request
   */
  checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const userLimit = userRequestCounts.get(userId);

    if (!userLimit || now - userLimit.windowStart > RATE_LIMIT.windowMs) {
      // Start new window
      userRequestCounts.set(userId, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: RATE_LIMIT.maxRequests - 1,
        resetIn: RATE_LIMIT.windowMs,
      };
    }

    if (userLimit.count >= RATE_LIMIT.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: RATE_LIMIT.windowMs - (now - userLimit.windowStart),
      };
    }

    userLimit.count++;
    return {
      allowed: true,
      remaining: RATE_LIMIT.maxRequests - userLimit.count,
      resetIn: RATE_LIMIT.windowMs - (now - userLimit.windowStart),
    };
  }

  /**
   * Ask a question with caching
   */
  async askQuestion(
    userId: string,
    query: NotebookLMQuery
  ): Promise<NotebookLMResponse & { rateLimitRemaining: number }> {
    await this.initialize();

    // Check rate limit
    const rateCheck = this.checkRateLimit(userId);
    if (!rateCheck.allowed) {
      throw new RateLimitError("Rate limit exceeded. Please try again later.", rateCheck.resetIn);
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey("qa", query.question, query.notebookId);

    // Check cache
    const cachedResponse = await this.getCachedResponse(cacheKey);
    if (cachedResponse) {
      return {
        ...cachedResponse,
        cached: true,
        rateLimitRemaining: rateCheck.remaining,
      };
    }

    // Query NotebookLM
    const client = getNotebookLMClient();
    const response = await client.query(query);

    // Cache the response
    await this.cacheResponse(cacheKey, response);

    return {
      ...response,
      rateLimitRemaining: rateCheck.remaining,
    };
  }

  /**
   * Get or generate content for a lesson
   */
  async getContent(
    lessonId: string,
    notebookId: string,
    topic: string,
    forceRegenerate = false
  ): Promise<GeneratedContent> {
    await this.initialize();

    // Check for cached content in database
    if (!forceRegenerate) {
      const cached = await prisma.generatedContent.findFirst({
        where: {
          lessonId,
          type: "TEACHING_CONTENT",
          createdAt: {
            gte: new Date(Date.now() - CACHE_DURATION_MS),
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (cached) {
        return JSON.parse(cached.content) as GeneratedContent;
      }
    }

    // Generate new content
    const client = getNotebookLMClient();
    const content = await client.generateContent({
      topic,
      lessonId,
      notebookId,
      style: "detailed",
    });

    // Cache in database
    await prisma.generatedContent.create({
      data: {
        lessonId,
        type: "TEACHING_CONTENT",
        content: JSON.stringify(content),
        metadata: { topic, notebookId },
      },
    });

    return content;
  }

  /**
   * Get or generate quiz for a lesson
   */
  async getQuiz(
    lessonId: string,
    notebookId: string,
    topic: string,
    forceRegenerate = false
  ): Promise<GeneratedQuiz> {
    await this.initialize();

    // Check for cached quiz in database
    if (!forceRegenerate) {
      const cached = await prisma.generatedContent.findFirst({
        where: {
          lessonId,
          type: "QUIZ",
          createdAt: {
            gte: new Date(Date.now() - CACHE_DURATION_MS),
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (cached) {
        return JSON.parse(cached.content) as GeneratedQuiz;
      }
    }

    // Generate new quiz
    const client = getNotebookLMClient();
    const quiz = await client.generateQuiz({
      lessonId,
      topic,
      notebookId,
      questionCount: 5,
      difficulty: "medium",
    });

    // Cache in database
    await prisma.generatedContent.create({
      data: {
        lessonId,
        type: "QUIZ",
        content: JSON.stringify(quiz),
        metadata: { topic, notebookId },
      },
    });

    return quiz;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(type: string, ...parts: (string | undefined)[]): string {
    return `${type}:${parts.filter(Boolean).join(":")}`;
  }

  /**
   * Get cached response from database
   */
  private async getCachedResponse(cacheKey: string): Promise<NotebookLMResponse | null> {
    const cached = await prisma.aIResponseCache.findFirst({
      where: {
        cacheKey,
        expiresAt: { gte: new Date() },
      },
    });

    if (cached) {
      return JSON.parse(cached.response) as NotebookLMResponse;
    }

    return null;
  }

  /**
   * Cache response in database
   */
  private async cacheResponse(cacheKey: string, response: NotebookLMResponse): Promise<void> {
    await prisma.aIResponseCache.upsert({
      where: { cacheKey },
      update: {
        response: JSON.stringify(response),
        expiresAt: new Date(Date.now() + CACHE_DURATION_MS),
      },
      create: {
        cacheKey,
        response: JSON.stringify(response),
        expiresAt: new Date(Date.now() + CACHE_DURATION_MS),
      },
    });
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  public readonly resetIn: number;

  constructor(message: string, resetIn: number) {
    super(message);
    this.name = "RateLimitError";
    this.resetIn = resetIn;
  }
}

// Singleton instance
let serviceInstance: NotebookLMService | null = null;

/**
 * Get the NotebookLM service instance
 */
export function getNotebookLMService(): NotebookLMService {
  if (!serviceInstance) {
    serviceInstance = new NotebookLMService();
  }
  return serviceInstance;
}

export { NotebookLMService };
