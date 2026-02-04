import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  limit: number; // Max requests per interval
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (for development/single-server)
// In production, use Redis or similar distributed store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from headers (for proxied requests)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

  return ip;
}

/**
 * Check if request is rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): { limited: boolean; remaining: number; resetIn: number } {
  const clientId = getClientId(request);
  const key = `${clientId}:${request.nextUrl.pathname}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetTime: now + options.interval,
    };
    rateLimitStore.set(key, entry);

    return {
      limited: false,
      remaining: options.limit - 1,
      resetIn: options.interval,
    };
  }

  entry.count++;

  if (entry.count > options.limit) {
    return {
      limited: true,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  return {
    limited: false,
    remaining: options.limit - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetIn: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": Math.max(0, remaining).toString(),
    "X-RateLimit-Reset": Math.ceil(resetIn / 1000).toString(),
  };
}

/**
 * Rate limit response
 */
export function rateLimitResponse(resetIn: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil(resetIn / 1000),
    },
    {
      status: 429,
      headers: {
        "Retry-After": Math.ceil(resetIn / 1000).toString(),
      },
    }
  );
}

/**
 * Rate limit wrapper for API routes
 * Usage:
 *   export const GET = withRateLimit(handler, { interval: 60000, limit: 60 });
 */
export function withRateLimit<T extends NextRequest>(
  handler: (request: T, context?: unknown) => Promise<NextResponse>,
  options: RateLimitOptions = { interval: 60000, limit: 60 }
) {
  return async (request: T, context?: unknown): Promise<NextResponse> => {
    const { limited, remaining, resetIn } = checkRateLimit(request, options);

    if (limited) {
      return rateLimitResponse(resetIn);
    }

    const response = await handler(request, context);

    // Add rate limit headers to response
    const headers = getRateLimitHeaders(options.limit, remaining, resetIn);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    return response;
  };
}

// Preset rate limit configurations
export const RateLimits = {
  // Standard API: 60 requests per minute
  standard: { interval: 60000, limit: 60 },

  // Auth endpoints: 10 requests per minute (prevent brute force)
  auth: { interval: 60000, limit: 10 },

  // AI/NotebookLM: 20 requests per hour
  ai: { interval: 3600000, limit: 20 },

  // Export: 5 requests per minute
  export: { interval: 60000, limit: 5 },

  // Strict: 5 requests per minute (for sensitive operations)
  strict: { interval: 60000, limit: 5 },
};
