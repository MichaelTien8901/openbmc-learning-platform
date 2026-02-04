import { NextResponse } from "next/server";

// GET /api/health/live - Simple liveness probe
// Returns 200 if the server is running (no dependency checks)
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
}
