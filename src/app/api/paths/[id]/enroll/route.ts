import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Find the path
    const path = await prisma.learningPath.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        published: true,
      },
      include: {
        prerequisites: {
          include: {
            prerequisite: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    if (!path) {
      return NextResponse.json(
        { success: false, error: "Learning path not found" },
        { status: 404 }
      );
    }

    // Note: Prerequisites are recommendations only, not enforced
    // Users can enroll in any path they want

    // Check if already enrolled
    const existingEnrollment = await prisma.pathEnrollment.findUnique({
      where: {
        userId_pathId: {
          userId: session.id,
          pathId: path.id,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json({
        success: true,
        message: "Already enrolled in this path",
      });
    }

    // Create enrollment
    await prisma.pathEnrollment.create({
      data: {
        userId: session.id,
        pathId: path.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully enrolled in learning path",
    });
  } catch (error) {
    console.error("Enroll error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
