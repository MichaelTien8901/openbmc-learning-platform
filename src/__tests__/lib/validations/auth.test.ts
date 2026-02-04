/**
 * Tests for auth validation schemas
 */
import {
  registerSchema,
  loginSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

describe("Auth Validation Schemas", () => {
  describe("registerSchema", () => {
    describe("email validation", () => {
      it("should accept valid email", () => {
        const result = registerSchema.safeParse({
          email: "test@example.com",
          password: "Password123",
        });
        expect(result.success).toBe(true);
      });

      it("should reject invalid email", () => {
        const result = registerSchema.safeParse({
          email: "notanemail",
          password: "Password123",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Invalid email address");
        }
      });

      it("should reject empty email", () => {
        const result = registerSchema.safeParse({
          email: "",
          password: "Password123",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("password validation", () => {
      it("should accept valid password", () => {
        const result = registerSchema.safeParse({
          email: "test@example.com",
          password: "SecurePass123",
        });
        expect(result.success).toBe(true);
      });

      it("should reject password shorter than 8 characters", () => {
        const result = registerSchema.safeParse({
          email: "test@example.com",
          password: "Pass1",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Password must be at least 8 characters");
        }
      });

      it("should reject password without uppercase letter", () => {
        const result = registerSchema.safeParse({
          email: "test@example.com",
          password: "password123",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Password must contain at least one uppercase letter"
          );
        }
      });

      it("should reject password without lowercase letter", () => {
        const result = registerSchema.safeParse({
          email: "test@example.com",
          password: "PASSWORD123",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Password must contain at least one lowercase letter"
          );
        }
      });

      it("should reject password without number", () => {
        const result = registerSchema.safeParse({
          email: "test@example.com",
          password: "PasswordABC",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Password must contain at least one number");
        }
      });
    });

    describe("displayName validation", () => {
      it("should accept valid display name", () => {
        const result = registerSchema.safeParse({
          email: "test@example.com",
          password: "Password123",
          displayName: "John Doe",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.displayName).toBe("John Doe");
        }
      });

      it("should allow missing display name", () => {
        const result = registerSchema.safeParse({
          email: "test@example.com",
          password: "Password123",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.displayName).toBeUndefined();
        }
      });

      it("should reject display name shorter than 2 characters", () => {
        const result = registerSchema.safeParse({
          email: "test@example.com",
          password: "Password123",
          displayName: "A",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Display name must be at least 2 characters");
        }
      });

      it("should reject display name longer than 50 characters", () => {
        const result = registerSchema.safeParse({
          email: "test@example.com",
          password: "Password123",
          displayName: "A".repeat(51),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Display name must be at most 50 characters");
        }
      });
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login credentials", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "anypassword",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = loginSchema.safeParse({
        email: "notanemail",
        password: "anypassword",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Password is required");
      }
    });

    it("should accept any non-empty password (no complexity requirements)", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "a", // Single character should be valid for login
      });
      expect(result.success).toBe(true);
    });
  });

  describe("resetPasswordRequestSchema", () => {
    it("should accept valid email", () => {
      const result = resetPasswordRequestSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = resetPasswordRequestSchema.safeParse({
        email: "notvalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("should accept valid token and password", () => {
      const result = resetPasswordSchema.safeParse({
        token: "valid-token-123",
        password: "NewPassword123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty token", () => {
      const result = resetPasswordSchema.safeParse({
        token: "",
        password: "NewPassword123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Token is required");
      }
    });

    it("should validate password complexity", () => {
      const result = resetPasswordSchema.safeParse({
        token: "valid-token",
        password: "weak",
      });
      expect(result.success).toBe(false);
    });

    it("should require uppercase in new password", () => {
      const result = resetPasswordSchema.safeParse({
        token: "valid-token",
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Password must contain at least one uppercase letter"
        );
      }
    });
  });
});
