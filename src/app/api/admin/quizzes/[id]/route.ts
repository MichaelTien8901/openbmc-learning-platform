import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/quizzes/[id] - Get a single quiz question
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const question = await prisma.quizQuestion.findUnique({
      where: { id },
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

    if (!question) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: question.id,
        lessonId: question.lessonId,
        question: question.question,
        options: question.options,
        explanation: question.explanation,
        source: question.source,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
        lesson: question.lesson,
      },
    });
  } catch (error) {
    console.error("Get quiz question error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get quiz question" },
      { status: 500 }
    );
  }
}

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

// PUT /api/admin/quizzes/[id] - Update a quiz question
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { lessonId, question, options, explanation } = body;

    // Check if question exists
    const existing = await prisma.quizQuestion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    // Validate options if provided
    if (options !== undefined) {
      if (!Array.isArray(options) || options.length < 2) {
        return NextResponse.json(
          { success: false, error: "At least 2 options are required" },
          { status: 400 }
        );
      }

      const hasCorrectAnswer = options.some((opt: QuizOption) => opt.isCorrect === true);
      if (!hasCorrectAnswer) {
        return NextResponse.json(
          { success: false, error: "At least one option must be marked as correct" },
          { status: 400 }
        );
      }
    }

    // Check if new lesson exists
    if (lessonId && lessonId !== existing.lessonId) {
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
      if (!lesson) {
        return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
      }
    }

    const updatedQuestion = await prisma.quizQuestion.update({
      where: { id },
      data: {
        lessonId: lessonId ?? existing.lessonId,
        question: question ?? existing.question,
        options: options ?? existing.options,
        explanation: explanation !== undefined ? explanation : existing.explanation,
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
        id: updatedQuestion.id,
        lessonId: updatedQuestion.lessonId,
        question: updatedQuestion.question,
        options: updatedQuestion.options,
        explanation: updatedQuestion.explanation,
        source: updatedQuestion.source,
        createdAt: updatedQuestion.createdAt,
        updatedAt: updatedQuestion.updatedAt,
        lesson: updatedQuestion.lesson,
      },
    });
  } catch (error) {
    console.error("Update quiz question error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update quiz question" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/quizzes/[id] - Delete a quiz question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if question exists
    const existing = await prisma.quizQuestion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    await prisma.quizQuestion.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Question deleted" });
  } catch (error) {
    console.error("Delete quiz question error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete quiz question" },
      { status: 500 }
    );
  }
}
