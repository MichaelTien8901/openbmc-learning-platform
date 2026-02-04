import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: { status: string; latency?: number; error?: string };
    memory: { status: string; used: number; total: number; percentage: number };
  };
}

const startTime = Date.now();

// GET /api/health - Health check endpoint
export async function GET(): Promise<NextResponse<HealthStatus>> {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Check database connection
  let dbStatus: HealthStatus["checks"]["database"];
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    dbStatus = {
      status: latency < 100 ? "healthy" : latency < 500 ? "degraded" : "slow",
      latency,
    };
  } catch (error) {
    dbStatus = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Database connection failed",
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

  const memStatus: HealthStatus["checks"]["memory"] = {
    status: memPercentage < 80 ? "healthy" : memPercentage < 95 ? "warning" : "critical",
    used: memUsed,
    total: memTotal,
    percentage: memPercentage,
  };

  // Determine overall status
  let overallStatus: HealthStatus["status"] = "healthy";
  if (dbStatus.status === "unhealthy") {
    overallStatus = "unhealthy";
  } else if (dbStatus.status === "degraded" || memStatus.status === "warning") {
    overallStatus = "degraded";
  }

  const health: HealthStatus = {
    status: overallStatus,
    timestamp,
    version: process.env.npm_package_version || "1.0.0",
    uptime,
    checks: {
      database: dbStatus,
      memory: memStatus,
    },
  };

  const statusCode = overallStatus === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, { status: statusCode });
}
