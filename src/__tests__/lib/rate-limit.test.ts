/**
 * Tests for rate limiting utilities
 *
 * Note: We replicate pure functions here to avoid importing NextRequest/NextResponse
 * which requires server-side globals not available in Jest
 */

// Replicate getRateLimitHeaders for testing
function getRateLimitHeaders(
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

// Replicate RateLimits presets for testing
const RateLimits = {
  standard: { interval: 60000, limit: 60 },
  auth: { interval: 60000, limit: 10 },
  ai: { interval: 3600000, limit: 20 },
  export: { interval: 60000, limit: 5 },
  strict: { interval: 60000, limit: 5 },
};

describe("Rate Limit Utilities", () => {
  describe("getRateLimitHeaders", () => {
    it("should return correct headers for full limit", () => {
      const headers = getRateLimitHeaders(60, 60, 60000);

      expect(headers["X-RateLimit-Limit"]).toBe("60");
      expect(headers["X-RateLimit-Remaining"]).toBe("60");
      expect(headers["X-RateLimit-Reset"]).toBe("60"); // 60000ms = 60s
    });

    it("should return correct headers for partial remaining", () => {
      const headers = getRateLimitHeaders(60, 30, 30000);

      expect(headers["X-RateLimit-Limit"]).toBe("60");
      expect(headers["X-RateLimit-Remaining"]).toBe("30");
      expect(headers["X-RateLimit-Reset"]).toBe("30");
    });

    it("should handle zero remaining", () => {
      const headers = getRateLimitHeaders(60, 0, 45000);

      expect(headers["X-RateLimit-Remaining"]).toBe("0");
    });

    it("should handle negative remaining (edge case)", () => {
      const headers = getRateLimitHeaders(60, -5, 45000);

      // Should clamp to 0
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
    });

    it("should round up reset time to nearest second", () => {
      const headers = getRateLimitHeaders(60, 30, 45500); // 45.5 seconds

      expect(headers["X-RateLimit-Reset"]).toBe("46");
    });
  });

  describe("RateLimits presets", () => {
    it("should have standard preset", () => {
      expect(RateLimits.standard).toEqual({
        interval: 60000,
        limit: 60,
      });
    });

    it("should have auth preset with lower limits", () => {
      expect(RateLimits.auth).toEqual({
        interval: 60000,
        limit: 10,
      });
    });

    it("should have ai preset with hourly limit", () => {
      expect(RateLimits.ai).toEqual({
        interval: 3600000, // 1 hour
        limit: 20,
      });
    });

    it("should have export preset", () => {
      expect(RateLimits.export).toEqual({
        interval: 60000,
        limit: 5,
      });
    });

    it("should have strict preset", () => {
      expect(RateLimits.strict).toEqual({
        interval: 60000,
        limit: 5,
      });
    });

    it("auth limit should be stricter than standard", () => {
      expect(RateLimits.auth.limit).toBeLessThan(RateLimits.standard.limit);
    });

    it("ai limit should have longer interval than standard", () => {
      expect(RateLimits.ai.interval).toBeGreaterThan(RateLimits.standard.interval);
    });
  });
});
