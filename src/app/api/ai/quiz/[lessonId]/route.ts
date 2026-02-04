import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getNotebookLMService, trackAIEvent } from "@/lib/notebooklm";
import type { ApiResponse } from "@/types";

interface GeneratedQuizResponse {
  questions: Array<{
    question: string;
    options: Array<{
      text: string;
      isCorrect: boolean;
    }>;
    explanation: string;
    difficulty: string;
  }>;
  generatedAt: string;
  cached: boolean;
}

/**
 * GET /api/ai/quiz/:lessonId - Get or generate quiz for a lesson
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
): Promise<NextResponse<ApiResponse<GeneratedQuizResponse>>> {
  try {
    // Require authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { lessonId } = await params;

    // Get lesson details
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        notebookId: true,
        published: true,
      },
    });

    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    if (!lesson.published) {
      return NextResponse.json(
        { success: false, error: "Lesson is not published" },
        { status: 404 }
      );
    }

    // Check for force regeneration
    const url = new URL(request.url);
    const forceRegenerate = url.searchParams.get("regenerate") === "true";

    // Get NotebookLM service
    const service = getNotebookLMService();
    const startTime = Date.now();

    // Get or generate quiz
    const quiz = await service.getQuiz(
      lesson.id,
      lesson.notebookId || "openbmc-docs",
      lesson.title,
      forceRegenerate
    );

    const latencyMs = Date.now() - startTime;

    // If no questions generated, try to get manual questions from database
    if (quiz.questions.length === 0) {
      const manualQuestions = await prisma.quizQuestion.findMany({
        where: { lessonId: lesson.id },
        select: {
          question: true,
          options: true,
          explanation: true,
        },
      });

      if (manualQuestions.length > 0) {
        // Track fallback to manual questions
        await trackAIEvent({
          userId: session.id,
          eventType: "FALLBACK",
          feature: "QUIZ",
          lessonId: lesson.id,
          success: true,
          latencyMs,
          cached: true,
          metadata: {
            questionCount: manualQuestions.length,
            source: "manual",
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            questions: manualQuestions.map((q) => ({
              question: q.question,
              options: q.options as Array<{ text: string; isCorrect: boolean }>,
              explanation: q.explanation || "",
              difficulty: "medium",
            })),
            generatedAt: new Date().toISOString(),
            cached: true,
          },
        });
      }
    }

    // Track quiz generation
    await trackAIEvent({
      userId: session.id,
      eventType: forceRegenerate ? "QUIZ_GEN" : "QUIZ_GEN",
      feature: "QUIZ",
      lessonId: lesson.id,
      success: true,
      latencyMs,
      cached: !forceRegenerate,
      metadata: {
        questionCount: quiz.questions.length,
        forceRegenerate,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        questions: quiz.questions,
        generatedAt: quiz.generatedAt.toISOString(),
        cached: !forceRegenerate,
      },
    });
  } catch (error) {
    // Track error
    const session = await getSession();
    await trackAIEvent({
      userId: session?.id,
      eventType: "ERROR",
      feature: "QUIZ",
      success: false,
      errorCode: error instanceof Error ? error.name : "UNKNOWN",
    });

    console.error("Get quiz error:", error);
    return NextResponse.json({ success: false, error: "Failed to get quiz" }, { status: 500 });
  }
}
