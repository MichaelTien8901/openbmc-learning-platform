import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { verifyPasswordResetToken, consumePasswordResetToken } from "@/lib/auth/verification";
import { resetPasswordSchema } from "@/lib/validations/auth";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();

    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Verify token
    const verification = await verifyPasswordResetToken(token);
    if (!verification.success || !verification.userId) {
      return NextResponse.json(
        { success: false, error: verification.error || "Invalid token" },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: verification.userId },
      data: { passwordHash },
    });

    // Consume the token
    await consumePasswordResetToken(token);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
