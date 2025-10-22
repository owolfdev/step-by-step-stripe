/**
 * Centralized logging utility for Stripe + Supabase application
 * Provides structured logging with consistent formatting and context
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  userId?: string;
  stripeCustomerId?: string;
  stripeEventId?: string;
  operation?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return logEntry;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    const logEntry = this.formatLog(level, message, context, error);

    // In production, you might want to send to external logging service
    // For now, we'll use console with structured output
    const prefix = `[${logEntry.timestamp}] [${level.toUpperCase()}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    const errorStr = error ? ` Error: ${error.message}` : "";

    console.log(`${prefix} ${message}${contextStr}${errorStr}`);

    // In development, also log the full structured object
    if (process.env.NODE_ENV === "development") {
      console.log("Structured log:", JSON.stringify(logEntry, null, 2));
    }
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log("error", message, context, error);
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", message, context);
    }
  }

  // Specialized logging methods for common operations
  webhookEvent(eventType: string, eventId: string, context?: LogContext): void {
    this.info(`Webhook event received: ${eventType}`, {
      ...context,
      stripeEventId: eventId,
      operation: "webhook",
    });
  }

  webhookError(
    eventType: string,
    eventId: string,
    error: Error,
    context?: LogContext
  ): void {
    this.error(
      `Webhook processing failed: ${eventType}`,
      {
        ...context,
        stripeEventId: eventId,
        operation: "webhook",
      },
      error
    );
  }

  apiRequest(method: string, endpoint: string, context?: LogContext): void {
    this.info(`API request: ${method} ${endpoint}`, {
      ...context,
      operation: "api_request",
    });
  }

  apiError(
    method: string,
    endpoint: string,
    error: Error,
    context?: LogContext
  ): void {
    this.error(
      `API error: ${method} ${endpoint}`,
      {
        ...context,
        operation: "api_error",
      },
      error
    );
  }

  databaseOperation(
    operation: string,
    table: string,
    context?: LogContext
  ): void {
    this.debug(`Database operation: ${operation} on ${table}`, {
      ...context,
      operation: "database",
      table,
    });
  }

  databaseError(
    operation: string,
    table: string,
    error: Error,
    context?: LogContext
  ): void {
    this.error(
      `Database error: ${operation} on ${table}`,
      {
        ...context,
        operation: "database_error",
        table,
      },
      error
    );
  }

  stripeOperation(
    operation: string,
    resourceId: string,
    context?: LogContext
  ): void {
    this.info(`Stripe operation: ${operation}`, {
      ...context,
      stripeResourceId: resourceId,
      operation: "stripe",
    });
  }

  stripeError(
    operation: string,
    resourceId: string,
    error: Error,
    context?: LogContext
  ): void {
    this.error(
      `Stripe error: ${operation}`,
      {
        ...context,
        stripeResourceId: resourceId,
        operation: "stripe_error",
      },
      error
    );
  }
}

// Export singleton instance
export const logger = new Logger();

// Helper function to create context from common parameters
export function createLogContext(params: {
  userId?: string;
  stripeCustomerId?: string;
  stripeEventId?: string;
  stripeResourceId?: string;
  operation?: string;
  [key: string]: unknown;
}): LogContext {
  return {
    userId: params.userId,
    stripeCustomerId: params.stripeCustomerId,
    stripeEventId: params.stripeEventId,
    stripeResourceId: params.stripeResourceId,
    operation: params.operation,
    ...Object.fromEntries(
      Object.entries(params).filter(
        ([key]) =>
          ![
            "userId",
            "stripeCustomerId",
            "stripeEventId",
            "stripeResourceId",
            "operation",
          ].includes(key)
      )
    ),
  };
}
