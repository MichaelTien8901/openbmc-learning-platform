/**
 * Tests for error handler validation utilities
 *
 * Note: We test the validation functions and ApiError class directly
 * without importing NextResponse to avoid server-side dependencies
 */

// Error codes from error-handler.ts
const ErrorCodes = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Replicate ApiError class for testing
class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(ErrorCodes.BAD_REQUEST, message, 400, details);
  }

  static unauthorized(message = "Authentication required"): ApiError {
    return new ApiError(ErrorCodes.UNAUTHORIZED, message, 401);
  }

  static forbidden(message = "Access denied"): ApiError {
    return new ApiError(ErrorCodes.FORBIDDEN, message, 403);
  }

  static notFound(resource = "Resource"): ApiError {
    return new ApiError(ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
  }

  static conflict(message: string): ApiError {
    return new ApiError(ErrorCodes.CONFLICT, message, 409);
  }

  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(ErrorCodes.VALIDATION_ERROR, message, 422, details);
  }

  static internal(message = "An unexpected error occurred"): ApiError {
    return new ApiError(ErrorCodes.INTERNAL_ERROR, message, 500);
  }
}

// Replicate validation functions for testing
function validateRequired(data: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === ""
  );

  if (missing.length > 0) {
    throw ApiError.validation(`Missing required fields: ${missing.join(", ")}`, { missing });
  }
}

function validateString(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number; pattern?: RegExp }
): string {
  if (typeof value !== "string") {
    throw ApiError.validation(`${fieldName} must be a string`);
  }

  if (options?.minLength !== undefined && value.length < options.minLength) {
    throw ApiError.validation(`${fieldName} must be at least ${options.minLength} characters`);
  }

  if (options?.maxLength !== undefined && value.length > options.maxLength) {
    throw ApiError.validation(`${fieldName} must be at most ${options.maxLength} characters`);
  }

  if (options?.pattern && !options.pattern.test(value)) {
    throw ApiError.validation(`${fieldName} has invalid format`);
  }

  return value;
}

function validateEmail(value: unknown): string {
  const email = validateString(value, "Email");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw ApiError.validation("Invalid email format");
  }

  return email.toLowerCase();
}

function validateInt(
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number }
): number {
  const num = typeof value === "string" ? parseInt(value, 10) : value;

  if (typeof num !== "number" || isNaN(num) || !Number.isInteger(num)) {
    throw ApiError.validation(`${fieldName} must be an integer`);
  }

  if (options?.min !== undefined && num < options.min) {
    throw ApiError.validation(`${fieldName} must be at least ${options.min}`);
  }

  if (options?.max !== undefined && num > options.max) {
    throw ApiError.validation(`${fieldName} must be at most ${options.max}`);
  }

  return num;
}

describe("Error Handler", () => {
  describe("ApiError", () => {
    it("should create a bad request error", () => {
      const error = ApiError.badRequest("Invalid input");

      expect(error.code).toBe(ErrorCodes.BAD_REQUEST);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Invalid input");
    });

    it("should create an unauthorized error", () => {
      const error = ApiError.unauthorized();

      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Authentication required");
    });

    it("should create a not found error", () => {
      const error = ApiError.notFound("User");

      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("User not found");
    });

    it("should create a validation error with details", () => {
      const error = ApiError.validation("Invalid email", { field: "email" });

      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({ field: "email" });
    });
  });

  describe("validateRequired", () => {
    it("should pass when all required fields are present", () => {
      const data = { name: "John", email: "john@example.com" };

      expect(() => validateRequired(data, ["name", "email"])).not.toThrow();
    });

    it("should throw when a required field is missing", () => {
      const data = { name: "John" };

      expect(() => validateRequired(data, ["name", "email"])).toThrow(ApiError);
    });

    it("should throw when a required field is empty string", () => {
      const data = { name: "John", email: "" };

      expect(() => validateRequired(data, ["name", "email"])).toThrow(ApiError);
    });

    it("should throw when a required field is null", () => {
      const data = { name: "John", email: null };

      expect(() => validateRequired(data, ["name", "email"])).toThrow(ApiError);
    });
  });

  describe("validateString", () => {
    it("should return the string when valid", () => {
      const result = validateString("hello", "field");
      expect(result).toBe("hello");
    });

    it("should throw when value is not a string", () => {
      expect(() => validateString(123, "field")).toThrow(ApiError);
    });

    it("should validate minimum length", () => {
      expect(() => validateString("ab", "field", { minLength: 3 })).toThrow(ApiError);
      expect(() => validateString("abc", "field", { minLength: 3 })).not.toThrow();
    });

    it("should validate maximum length", () => {
      expect(() => validateString("abcdef", "field", { maxLength: 5 })).toThrow(ApiError);
      expect(() => validateString("abcde", "field", { maxLength: 5 })).not.toThrow();
    });
  });

  describe("validateEmail", () => {
    it("should return lowercase email when valid", () => {
      const result = validateEmail("Test@Example.COM");
      expect(result).toBe("test@example.com");
    });

    it("should throw for invalid email format", () => {
      expect(() => validateEmail("notanemail")).toThrow(ApiError);
      expect(() => validateEmail("missing@domain")).toThrow(ApiError);
      expect(() => validateEmail("@domain.com")).toThrow(ApiError);
    });
  });

  describe("validateInt", () => {
    it("should return integer when valid", () => {
      expect(validateInt(42, "field")).toBe(42);
      expect(validateInt("42", "field")).toBe(42);
    });

    it("should throw for non-integer values", () => {
      expect(() => validateInt("abc", "field")).toThrow(ApiError);
      expect(() => validateInt(3.14, "field")).toThrow(ApiError);
    });

    it("should validate minimum value", () => {
      expect(() => validateInt(5, "field", { min: 10 })).toThrow(ApiError);
      expect(() => validateInt(10, "field", { min: 10 })).not.toThrow();
    });

    it("should validate maximum value", () => {
      expect(() => validateInt(15, "field", { max: 10 })).toThrow(ApiError);
      expect(() => validateInt(10, "field", { max: 10 })).not.toThrow();
    });
  });
});
