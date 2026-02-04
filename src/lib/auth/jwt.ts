import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { SessionUser } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret-change-in-production"
);

const JWT_ISSUER = "openbmc-learning-platform";
const JWT_AUDIENCE = "openbmc-learning-platform";

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  displayName: string | null;
  role: "LEARNER" | "EDITOR" | "ADMIN";
  type: "access" | "refresh";
}

export async function createAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function createRefreshToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

export async function verifyAccessToken(token: string): Promise<SessionUser | null> {
  const payload = await verifyToken(token);
  if (!payload || payload.type !== "access") {
    return null;
  }
  return {
    id: payload.userId,
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
  };
}

export async function verifyRefreshToken(token: string): Promise<SessionUser | null> {
  const payload = await verifyToken(token);
  if (!payload || payload.type !== "refresh") {
    return null;
  }
  return {
    id: payload.userId,
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
  };
}

export function getTokenExpiry(type: "access" | "refresh"): Date {
  const now = new Date();
  if (type === "access") {
    return new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  }
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
}
