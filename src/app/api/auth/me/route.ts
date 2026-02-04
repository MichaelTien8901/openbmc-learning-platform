import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { ApiResponse, SessionUser } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<SessionUser>>> {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred",
      },
      { status: 500 }
    );
  }
}
