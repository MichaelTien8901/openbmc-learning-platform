import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await destroySession();

    // Get the origin from the request for proper redirect
    const origin = request.headers.get("origin") || request.nextUrl.origin;

    // Redirect to login page after logout
    return NextResponse.redirect(new URL("/login", origin), { status: 303 });
  } catch (error) {
    console.error("Logout error:", error);
    // Even on error, redirect to login
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    return NextResponse.redirect(new URL("/login", origin), { status: 303 });
  }
}
