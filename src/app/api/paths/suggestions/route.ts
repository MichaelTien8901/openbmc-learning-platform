import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface SuggestedPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  lessonCount: number;
  reason: string;
}

// GET /api/paths/suggestions - Get suggested next paths for the user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's completed paths
    const completedEnrollments = await prisma.pathEnrollment.findMany({
      where: {
        userId: session.id,
        completedAt: { not: null },
      },
      select: { pathId: true },
    });
    const completedPathIds = new Set(completedEnrollments.map((e) => e.pathId));

    // Get user's in-progress paths
    const inProgressEnrollments = await prisma.pathEnrollment.findMany({
      where: {
        userId: session.id,
        completedAt: null,
      },
      select: { pathId: true },
    });
    const inProgressPathIds = new Set(inProgressEnrollments.map((e) => e.pathId));

    // Get all published paths
    const allPaths = await prisma.learningPath.findMany({
      where: { published: true },
      include: {
        lessons: {
          select: { id: true },
        },
        prerequisites: {
          select: { prerequisiteId: true },
        },
      },
      orderBy: { order: "asc" },
    });

    const suggestions: SuggestedPath[] = [];

    for (const path of allPaths) {
      // Skip completed paths
      if (completedPathIds.has(path.id)) continue;

      // Skip already enrolled paths (in progress)
      if (inProgressPathIds.has(path.id)) continue;

      // Check if prerequisites are met
      const prereqsMet = path.prerequisites.every((p) => completedPathIds.has(p.prerequisiteId));

      if (!prereqsMet) continue;

      // Determine reason for suggestion
      let reason = "";
      if (path.prerequisites.length > 0) {
        reason = "You've completed the prerequisites";
      } else if (path.difficulty === "BEGINNER") {
        reason = "Great for beginners";
      } else if (completedPathIds.size === 0) {
        reason = "Start your learning journey";
      } else {
        reason = "Recommended for you";
      }

      suggestions.push({
        id: path.id,
        slug: path.slug,
        title: path.title,
        description: path.description,
        difficulty: path.difficulty,
        estimatedHours: path.estimatedHours,
        lessonCount: path.lessons.length,
        reason,
      });
    }

    // Sort: beginner paths first, then by order
    suggestions.sort((a, b) => {
      const diffOrder = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };
      const aDiff = diffOrder[a.difficulty as keyof typeof diffOrder] ?? 1;
      const bDiff = diffOrder[b.difficulty as keyof typeof diffOrder] ?? 1;
      return aDiff - bDiff;
    });

    // Return top 5 suggestions
    return NextResponse.json({
      success: true,
      data: suggestions.slice(0, 5),
    });
  } catch (error) {
    console.error("Get suggestions error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
