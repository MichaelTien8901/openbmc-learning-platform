import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

interface UserListItem {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: string;
  emailVerified: string | null;
}

interface UsersResponse {
  users: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * GET /api/admin/users - List all users (admin only)
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<UsersResponse>>> {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
    const search = url.searchParams.get("search") || "";
    const role = url.searchParams.get("role") || "";

    // Build where clause
    const where: {
      OR?: Array<{
        email?: { contains: string; mode: "insensitive" };
        displayName?: { contains: string; mode: "insensitive" };
      }>;
      role?: string;
    } = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role && ["LEARNER", "EDITOR", "ADMIN"].includes(role)) {
      where.role = role;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
          emailVerified: u.emailVerified?.toISOString() || null,
        })),
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({ success: false, error: "Failed to list users" }, { status: 500 });
  }
}
