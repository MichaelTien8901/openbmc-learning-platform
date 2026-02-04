import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

interface UserDetail {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: string;
  emailVerified: string | null;
  stats: {
    enrolledPaths: number;
    completedLessons: number;
    quizzesTaken: number;
  };
}

/**
 * GET /api/admin/users/:id - Get user details (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<UserDetail>>> {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        _count: {
          select: {
            enrollments: true,
            progress: { where: { status: "COMPLETED" } },
            quizAttempts: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        emailVerified: user.emailVerified?.toISOString() || null,
        stats: {
          enrolledPaths: user._count.enrollments,
          completedLessons: user._count.progress,
          quizzesTaken: user._count.quizAttempts,
        },
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ success: false, error: "Failed to get user" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/:id - Update user role (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ id: string; role: string }>>> {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    // Validate role
    if (!role || !["LEARNER", "EDITOR", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role. Must be LEARNER, EDITOR, or ADMIN" },
        { status: 400 }
      );
    }

    // Prevent demoting self
    if (id === session.id && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Update role
    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, role: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        role: updated.role,
      },
      message: `User role updated to ${role}`,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user role" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/:id - Delete user (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Prevent self-deletion via admin panel
    if (id === session.id) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own account from admin panel" },
        { status: 400 }
      );
    }

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Prevent deleting other admins
    if (user.role === "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Cannot delete admin users" },
        { status: 400 }
      );
    }

    // Delete user (cascades to related data)
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: null,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete user" }, { status: 500 });
  }
}
