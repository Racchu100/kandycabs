/**
 * Centralized Structured Logger for Kandy Cabs
 * Outputs structured JSON logs suitable for Datadog / Sentry / CloudWatch
 */

export interface LogContext {
  route?: string;
  userId?: string;
  bookingId?: string;
  driverId?: string;
  action?: string;
  [key: string]: any;
}

export class Logger {
  private static formatLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: LogContext, error?: Error | any) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || {},
      error: error
        ? {
            name: error.name || 'Error',
            message: error.message || String(error),
            stack: error.stack,
          }
        : undefined,
    });
  }

  public static info(message: string, context?: LogContext) {
    console.log(this.formatLog('INFO', message, context));
  }

  public static warn(message: string, context?: LogContext) {
    console.warn(this.formatLog('WARN', message, context));
  }

  public static error(message: string, error?: Error | any, context?: LogContext) {
    console.error(this.formatLog('ERROR', message, context, error));

    // If Sentry DSN is configured, forward automatically
    if (typeof (globalThis as any).Sentry !== 'undefined') {
      try {
        (globalThis as any).Sentry.captureException(error, { extra: context });
      } catch {
        // Ignore Sentry dispatch error
      }
    }
  }
}
