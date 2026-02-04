import { cookies } from "next/headers";
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getTokenExpiry,
} from "./jwt";
import type { SessionUser } from "@/types";

const ACCESS_TOKEN_COOKIE = "auth_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function createSession(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(user),
    createRefreshToken(user),
  ]);

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...COOKIE_OPTIONS,
    expires: getTokenExpiry("access"),
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...COOKIE_OPTIONS,
    expires: getTokenExpiry("refresh"),
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken) {
    const user = await verifyAccessToken(accessToken);
    if (user) {
      return user;
    }
  }

  // Try to verify using refresh token (read-only, no cookie modification)
  // Token refresh is handled by middleware or route handlers, not here
  // This prevents "cookies can only be modified in Server Action" errors
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    const user = await verifyRefreshToken(refreshToken);
    if (user) {
      // Return the user but don't refresh cookies here
      // The client should call /api/auth/refresh if needed
      return user;
    }
  }

  return null;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireRole(
  allowedRoles: Array<"LEARNER" | "EDITOR" | "ADMIN">
): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
