import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responsePayload = isHttpException
      ? exception.getResponse()
      : { message: "Internal server error" };

    const message =
      typeof responsePayload === "string"
        ? responsePayload
        : Array.isArray((responsePayload as { message?: unknown }).message)
          ? ((responsePayload as { message: string[] }).message.join(", ") as string)
          : ((responsePayload as { message?: string }).message ?? "Unexpected error");

    res.status(status).json({
      statusCode: status,
      path: req.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
