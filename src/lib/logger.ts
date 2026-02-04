/**
 * Production Logger
 *
 * Structured logging for the application with support for
 * different log levels and JSON output for log aggregation.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
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

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
    this.isProduction = process.env.NODE_ENV === "production";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isProduction ? undefined : error.stack,
      };
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    const output = this.isProduction ? JSON.stringify(entry) : this.formatPretty(entry);

    switch (entry.level) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }

  private formatPretty(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[32m", // Green
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
    };
    const reset = "\x1b[0m";
    const color = levelColors[entry.level];

    let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}`;

    if (entry.context) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return output;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog("debug")) {
      this.output(this.formatEntry("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog("info")) {
      this.output(this.formatEntry("info", message, context));
    }
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog("warn")) {
      this.output(this.formatEntry("warn", message, context, error));
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog("error")) {
      this.output(this.formatEntry("error", message, context, error));
    }
  }

  /**
   * Log an HTTP request
   */
  request(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level: LogLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    if (this.shouldLog(level)) {
      this.output(
        this.formatEntry(level, `${method} ${path} ${statusCode} ${duration}ms`, {
          type: "http_request",
          method,
          path,
          statusCode,
          duration,
          ...context,
        })
      );
    }
  }

  /**
   * Log a database query
   */
  query(operation: string, model: string, duration: number, context?: LogContext): void {
    if (this.shouldLog("debug")) {
      this.output(
        this.formatEntry("debug", `DB ${operation} on ${model} (${duration}ms)`, {
          type: "db_query",
          operation,
          model,
          duration,
          ...context,
        })
      );
    }
  }

  /**
   * Log an external API call
   */
  external(
    service: string,
    method: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level: LogLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    if (this.shouldLog(level)) {
      this.output(
        this.formatEntry(level, `External ${service} ${method} ${statusCode} (${duration}ms)`, {
          type: "external_api",
          service,
          method,
          statusCode,
          duration,
          ...context,
        })
      );
    }
  }

  /**
   * Create a child logger with default context
   */
  child(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.defaultContext, ...context };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.parent.warn(message, this.mergeContext(context), error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.parent.error(message, this.mergeContext(context), error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types
export type { LogLevel, LogContext, LogEntry };
