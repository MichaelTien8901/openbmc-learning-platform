import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(): Promise<NextResponse<ApiResponse>> {
  try {
    await destroySession();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during logout",
      },
      { status: 500 }
    );
  }
}
