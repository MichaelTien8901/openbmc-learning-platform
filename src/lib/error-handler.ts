import { NextResponse } from "next/server";

/**
 * Standard API error codes
 */
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",

  // Server errors (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
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

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log error with context
 */
function logError(
  error: Error | ApiError,
  context: {
    requestId: string;
    path?: string;
    method?: string;
    userId?: string;
  }
): void {
  const errorInfo = {
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    path: context.path,
    method: context.method,
    userId: context.userId,
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      code: error instanceof ApiError ? error.code : ErrorCodes.INTERNAL_ERROR,
    },
  };

  // In production, this would send to a logging service
  console.error("[API Error]", JSON.stringify(errorInfo, null, 2));
}

/**
 * Create error response
 */
export function createErrorResponse(
  error: Error | ApiError,
  context?: { path?: string; method?: string; userId?: string }
): NextResponse<ApiErrorResponse> {
  const requestId = generateRequestId();

  // Log the error
  logError(error, { requestId, ...context });

  // Determine status code and error details
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const code = error instanceof ApiError ? error.code : ErrorCodes.INTERNAL_ERROR;

  // Don't expose internal error details in production
  const message =
    error instanceof ApiError || process.env.NODE_ENV === "development"
      ? error.message
      : "An unexpected error occurred";

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details: error instanceof ApiError ? error.details : undefined,
    },
    requestId,
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandler<T>(
  handler: (request: Request, context?: T) => Promise<NextResponse>
) {
  return async (request: Request, context?: T): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      const errorContext = {
        path: request.url,
        method: request.method,
      };

      if (error instanceof ApiError) {
        return createErrorResponse(error, errorContext);
      }

      // Handle Prisma errors
      if (error instanceof Error) {
        // Prisma unique constraint violation
        if (error.message.includes("Unique constraint")) {
          return createErrorResponse(
            ApiError.conflict("A record with this value already exists"),
            errorContext
          );
        }

        // Prisma record not found
        if (error.message.includes("Record to update not found")) {
          return createErrorResponse(ApiError.notFound(), errorContext);
        }
      }

      // Generic error
      return createErrorResponse(
        error instanceof Error ? error : new Error("Unknown error"),
        errorContext
      );
    }
  };
}

/**
 * Validate required fields
 */
export function validateRequired(data: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === ""
  );

  if (missing.length > 0) {
    throw ApiError.validation(`Missing required fields: ${missing.join(", ")}`, { missing });
  }
}

/**
 * Validate string field
 */
export function validateString(
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

/**
 * Validate email
 */
export function validateEmail(value: unknown): string {
  const email = validateString(value, "Email");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw ApiError.validation("Invalid email format");
  }

  return email.toLowerCase();
}

/**
 * Validate integer
 */
export function validateInt(
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
