import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth";
import type { ApiResponse, SessionUser } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<SessionUser>>> {
  try {
    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const { email, password, displayName } = result.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email already exists",
        },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        displayName: displayName || null,
      },
    });

    // Create session user object
    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    // Create session (sets cookies)
    await createSession(sessionUser);

    return NextResponse.json(
      {
        success: true,
        data: sessionUser,
        message: "Account created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during registration",
      },
      { status: 500 }
    );
  }
}
