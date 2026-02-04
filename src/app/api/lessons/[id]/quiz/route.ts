import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestionResponse {
  id: string;
  question: string;
  options: string[]; // Only return option text, not isCorrect
}

// GET /api/lessons/[id]/quiz - Get quiz questions for a lesson
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find lesson by slug or id
    const lesson = await prisma.lesson.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    // Get quiz questions
    const questions = await prisma.quizQuestion.findMany({
      where: { lessonId: lesson.id },
      orderBy: { createdAt: "asc" },
    });

    if (questions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          available: false,
          message: "No quiz available for this lesson",
          questions: [],
        },
      });
    }

    // Transform questions - hide correct answers
    const quizQuestions: QuizQuestionResponse[] = questions.map((q) => {
      const options = q.options as unknown as QuizOption[];
      return {
        id: q.id,
        question: q.question,
        options: options.map((o) => o.text),
      };
    });

    // Shuffle questions for variety
    const shuffled = quizQuestions.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      success: true,
      data: {
        available: true,
        lessonId: lesson.id,
        totalQuestions: shuffled.length,
        questions: shuffled,
      },
    });
  } catch (error) {
    console.error("Get quiz error:", error);
    return NextResponse.json({ success: false, error: "Failed to get quiz" }, { status: 500 });
  }
}

interface SubmitAnswer {
  questionId: string;
  selectedOption: number;
}

interface SubmitQuizBody {
  answers: SubmitAnswer[];
}

// POST /api/lessons/[id]/quiz - Submit quiz answers
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body: SubmitQuizBody = await request.json();

    if (!body.answers || !Array.isArray(body.answers) || body.answers.length === 0) {
      return NextResponse.json({ success: false, error: "Answers are required" }, { status: 400 });
    }

    // Find lesson by slug or id
    const lesson = await prisma.lesson.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!lesson) {
      return NextResponse.json({ success: false, error: "Lesson not found" }, { status: 404 });
    }

    // Get all questions to validate answers
    const questionIds = body.answers.map((a) => a.questionId);
    const questions = await prisma.quizQuestion.findMany({
      where: {
        id: { in: questionIds },
        lessonId: lesson.id,
      },
    });

    if (questions.length !== body.answers.length) {
      return NextResponse.json({ success: false, error: "Invalid question IDs" }, { status: 400 });
    }

    // Calculate results
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    let correctCount = 0;
    const answerResults: {
      questionId: string;
      selectedOption: number;
      isCorrect: boolean;
      correctOption: number;
      explanation: string | null;
    }[] = [];

    for (const answer of body.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const options = question.options as unknown as QuizOption[];
      const correctIndex = options.findIndex((o) => o.isCorrect);
      const isCorrect = answer.selectedOption === correctIndex;

      if (isCorrect) correctCount++;

      answerResults.push({
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isCorrect,
        correctOption: correctIndex,
        explanation: question.explanation,
      });
    }

    const score = Math.round((correctCount / questions.length) * 100);

    // Create quiz attempt record
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: session.id,
        lessonId: lesson.id,
        score,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        completedAt: new Date(),
        answers: {
          create: answerResults.map((ar) => ({
            questionId: ar.questionId,
            selectedOption: ar.selectedOption,
            isCorrect: ar.isCorrect,
          })),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        score,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        results: answerResults,
      },
    });
  } catch (error) {
    console.error("Submit quiz error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit quiz" }, { status: 500 });
  }
}
