import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/auth";
import { z } from "zod";
import type { ApiResponse, SessionUser } from "@/types";

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
});

export async function GET(): Promise<NextResponse<ApiResponse<SessionUser>>> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        emailVerified: true,
        createdAt: true,
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
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<SessionUser>>> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        displayName: result.data.displayName,
      },
    });

    const updatedSession: SessionUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    // Update the session with new user data
    await createSession(updatedSession);

    return NextResponse.json({
      success: true,
      data: updatedSession,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
