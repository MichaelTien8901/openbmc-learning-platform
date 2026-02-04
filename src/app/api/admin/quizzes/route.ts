import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/quizzes - List all quiz questions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId");

    const where = lessonId ? { lessonId } : {};

    const questions = await prisma.quizQuestion.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
      orderBy: [{ lessonId: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: questions.map((q) => ({
        id: q.id,
        lessonId: q.lessonId,
        question: q.question,
        options: q.options,
        explanation: q.explanation,
        source: q.source,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        lesson: q.lesson,
      })),
    });
  } catch (error) {
    console.error("List quiz questions error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list quiz questions" },
      { status: 500 }
    );
  }
}

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

// POST /api/admin/quizzes - Create a new quiz question
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, question, options, explanation } = body;

    if (!lessonId) {
      return NextResponse.json({ success: false, error: "Lesson ID is required" }, { status: 400 });
    }

    if (!question || typeof question !== "string") {
      return NextResponse.json({ success: false, error: "Question is required" }, { status: 400 });
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { success: false, error: "At least 2 options are required" },
        { status: 400 }
      );
    }

    // Validate options format
    const hasCorrectAnswer = options.some((opt: QuizOption) => opt.isCorrect === true);
    if (!hasCorrectAnswer) {
      return NextResponse.json(
        { success: false, error: "At least one option must be marked as correct" },
        { status: 400 }
      );
    }

    // Check if lesson exists
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    const newQuestion = await prisma.quizQuestion.create({
      data: {
        lessonId,
        question,
        options,
        explanation: explanation || null,
        source: "MANUAL",
      },
      include: {
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newQuestion.id,
        lessonId: newQuestion.lessonId,
        question: newQuestion.question,
        options: newQuestion.options,
        explanation: newQuestion.explanation,
        source: newQuestion.source,
        createdAt: newQuestion.createdAt,
        updatedAt: newQuestion.updatedAt,
        lesson: newQuestion.lesson,
      },
    });
  } catch (error) {
    console.error("Create quiz question error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create quiz question" },
      { status: 500 }
    );
  }
}
