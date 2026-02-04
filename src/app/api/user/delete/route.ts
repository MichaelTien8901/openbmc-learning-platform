import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, destroySession, verifyPassword } from "@/lib/auth";
import { z } from "zod";
import type { ApiResponse } from "@/types";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmation: z.literal("DELETE MY ACCOUNT"),
});

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const result = deleteAccountSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const isValidPassword = await verifyPassword(result.data.password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 });
    }

    // Delete user (cascades to related records)
    await prisma.user.delete({
      where: { id: session.id },
    });

    // Destroy session
    await destroySession();

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
