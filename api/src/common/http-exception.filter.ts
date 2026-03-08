import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

const logger = new Logger("HttpExceptionFilter");

function messageFromUnknown(ex: unknown): string {
  if (ex === null) return "null";
  if (ex === undefined) return "undefined";
  if (typeof ex === "string") return ex;
  if (typeof ex === "number" || typeof ex === "boolean") return String(ex);
  if (typeof ex === "object") {
    try {
      return JSON.stringify(ex);
    } catch {
      return "[non-serializable error]";
    }
  }
  return "[unknown]";
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const isDev = process.env.NODE_ENV !== "production";

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message = typeof body === "object" && body !== null && "message" in body
        ? (body as { message?: unknown }).message
        : body;
      if (status >= 500) logger.error(message, exception.stack);
      res.status(status).json(typeof body === "object" ? body : { message: body });
      return;
    }

    const err = exception instanceof Error ? exception : new Error(messageFromUnknown(exception));
    logger.error(err.message, err.stack);

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: isDev ? err.message : "Internal server error",
    });
  }
}
