// Re-export Prisma types
export * from "@/generated/prisma";

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth types
export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  role: "LEARNER" | "EDITOR" | "ADMIN";
}

export interface AuthSession {
  user: SessionUser;
  expiresAt: Date;
}
