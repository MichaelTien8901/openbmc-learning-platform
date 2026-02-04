import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePasswordResetToken } from "@/lib/auth/verification";
import { resetPasswordRequestSchema } from "@/lib/validations/auth";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();

    const result = resetPasswordRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link",
      });
    }

    // Generate reset token
    const token = await generatePasswordResetToken(user.id);

    // In production, send email with reset link
    // For now, log the token (remove in production)
    console.log(`Password reset token for ${email}: ${token}`);
    console.log(`Reset URL: ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`);

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
