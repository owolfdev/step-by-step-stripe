/**
 * Centralized error handling utilities
 * Provides consistent error responses and user-friendly messages
 */

import { NextResponse } from "next/server";
import { logger, createLogContext } from "./logging";

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  userMessage: string;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    userMessage: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    this.details = details;
  }
}

// Common error types
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation errors
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_PRICE_ID: "INVALID_PRICE_ID",

  // Stripe errors
  STRIPE_CUSTOMER_NOT_FOUND: "STRIPE_CUSTOMER_NOT_FOUND",
  STRIPE_SUBSCRIPTION_NOT_FOUND: "STRIPE_SUBSCRIPTION_NOT_FOUND",
  STRIPE_PAYMENT_FAILED: "STRIPE_PAYMENT_FAILED",
  STRIPE_WEBHOOK_INVALID: "STRIPE_WEBHOOK_INVALID",

  // Database errors
  DATABASE_CONNECTION_FAILED: "DATABASE_CONNECTION_FAILED",
  RECORD_NOT_FOUND: "RECORD_NOT_FOUND",
  DUPLICATE_RECORD: "DUPLICATE_RECORD",

  // System errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

// Error factory functions
export function createError(
  code: keyof typeof ERROR_CODES,
  message: string,
  userMessage: string,
  statusCode: number = 500,
  details?: Record<string, unknown>
): AppError {
  return new AppError(
    message,
    ERROR_CODES[code],
    statusCode,
    userMessage,
    details
  );
}

// Common error creators
export const Errors = {
  unauthorized: (message = "Authentication required") =>
    createError("UNAUTHORIZED", message, "Please log in to continue", 401),

  missingField: (field: string) =>
    createError(
      "MISSING_REQUIRED_FIELD",
      `Missing required field: ${field}`,
      `Please provide ${field}`,
      400,
      { field }
    ),

  invalidPriceId: (priceId: string) =>
    createError(
      "INVALID_PRICE_ID",
      `Invalid price ID: ${priceId}`,
      "The selected plan is not available",
      400,
      { priceId }
    ),

  invalidInput: (message: string) =>
    createError("INVALID_INPUT", message, "Invalid input provided", 400),

  stripeCustomerNotFound: (customerId: string) =>
    createError(
      "STRIPE_CUSTOMER_NOT_FOUND",
      `Stripe customer not found: ${customerId}`,
      "Your account needs to be set up for billing",
      400,
      { customerId }
    ),

  databaseError: (operation: string, error: unknown) =>
    createError(
      "DATABASE_CONNECTION_FAILED",
      `Database error during ${operation}`,
      "A database error occurred. Please try again.",
      500,
      { operation, originalError: error }
    ),

  stripeError: (operation: string, error: unknown) =>
    createError(
      "STRIPE_PAYMENT_FAILED",
      `Stripe error during ${operation}`,
      "Payment processing failed. Please try again.",
      500,
      { operation, originalError: error }
    ),

  internalError: (message: string, details?: Record<string, unknown>) =>
    createError(
      "INTERNAL_SERVER_ERROR",
      message,
      "An unexpected error occurred. Please try again.",
      500,
      details
    ),

  createError: (
    code: keyof typeof ERROR_CODES,
    message: string,
    userMessage: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) => createError(code, message, userMessage, statusCode, details),
};

// Error response handler
export function handleApiError(
  error: unknown,
  context?: Record<string, unknown>
): NextResponse {
  // Log the error
  logger.error(
    "API Error occurred",
    createLogContext({
      operation: "api_error_handling",
      ...context,
    }),
    error instanceof Error ? error : new Error(String(error))
  );

  // Handle known AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.userMessage,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Handle unknown errors
  const appError = Errors.internalError(
    error instanceof Error ? error.message : String(error),
    context
  );

  return NextResponse.json(
    {
      error: appError.userMessage,
      code: appError.code,
    },
    { status: appError.statusCode }
  );
}

// Validation helpers
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (
      !data[field] ||
      (typeof data[field] === "string" && data[field].trim() === "")
    ) {
      throw Errors.missingField(field);
    }
  }
}

export function validatePriceId(priceId: string): void {
  const validPriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BABY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO,
  ].filter(Boolean);

  if (!validPriceIds.includes(priceId)) {
    throw Errors.invalidPriceId(priceId);
  }
}

// Safe async wrapper for API routes
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  context?: Record<string, unknown>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}
