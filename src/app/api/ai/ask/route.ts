import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getNotebookLMService, RateLimitError, trackAIEvent } from "@/lib/notebooklm";
import type { ApiResponse } from "@/types";

interface AskRequest {
  question: string;
  lessonId?: string;
  context?: string;
}

interface AskResponse {
  answer: string;
  citations: Array<{
    text: string;
    source: string;
    pageOrSection?: string;
  }>;
  cached: boolean;
  rateLimitRemaining: number;
}

/**
 * POST /api/ai/ask - Ask a question to NotebookLM
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AskResponse>>> {
  try {
    // Require authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: AskRequest = await request.json();

    if (!body.question || body.question.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Question is required" }, { status: 400 });
    }

    if (body.question.length > 1000) {
      return NextResponse.json(
        { success: false, error: "Question must be less than 1000 characters" },
        { status: 400 }
      );
    }

    // Get NotebookLM service
    const service = getNotebookLMService();
    const startTime = Date.now();

    // Query NotebookLM
    const response = await service.askQuestion(session.id, {
      question: body.question.trim(),
      context: body.context,
    });

    const latencyMs = Date.now() - startTime;

    // Track successful query
    await trackAIEvent({
      userId: session.id,
      eventType: response.cached ? "QUERY" : "QUERY",
      feature: "QA",
      lessonId: body.lessonId,
      success: true,
      latencyMs,
      cached: response.cached,
      metadata: {
        questionLength: body.question.length,
        citationCount: response.citations.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        answer: response.answer,
        citations: response.citations,
        cached: response.cached,
        rateLimitRemaining: response.rateLimitRemaining,
      },
    });
  } catch (error) {
    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      // Track rate limit event
      const session = await getSession();
      await trackAIEvent({
        userId: session?.id,
        eventType: "RATE_LIMITED",
        feature: "QA",
        success: false,
      });

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          retryAfter: Math.ceil(error.resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(error.resetIn / 1000).toString(),
          },
        }
      );
    }

    // Track error event
    const session = await getSession();
    await trackAIEvent({
      userId: session?.id,
      eventType: "ERROR",
      feature: "QA",
      success: false,
      errorCode: error instanceof Error ? error.name : "UNKNOWN",
    });

    console.error("Ask question error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process question" },
      { status: 500 }
    );
  }
}
