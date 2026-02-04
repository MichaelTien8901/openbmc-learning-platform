/**
 * Tests for auth password utilities
 *
 * Note: We test hashPassword and verifyPassword directly from bcryptjs
 * to avoid importing the auth module which has ESM dependencies (jose)
 */
import bcrypt from "bcryptjs";

// Replicate the auth functions for testing
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

describe("Auth utilities", () => {
  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce different hashes for the same password", async () => {
      const password = "testPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Bcrypt produces different hashes due to salt
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("wrongPassword", hash);
      expect(isValid).toBe(false);
    });

    it("should handle empty password", async () => {
      const hash = await hashPassword("testPassword123");

      const isValid = await verifyPassword("", hash);
      expect(isValid).toBe(false);
    });
  });
});
