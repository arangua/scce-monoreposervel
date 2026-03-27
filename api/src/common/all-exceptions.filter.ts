import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionsFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === "string" ? body : (body as any).message ?? message;

    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      code = exception.code;
      // P2022 = columna no existe, P2002 = unique constraint, P2025 = not found
      if (exception.code === "P2025") {
        status = HttpStatus.NOT_FOUND;
        message = "Registro no encontrado";
      } else if (exception.code === "P2002") {
        status = HttpStatus.CONFLICT;
        message = "Conflicto: registro duplicado";
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = `Error de base de datos [${exception.code}]`;
      }
      // Log completo para debugging
      this.logger.error(
        `Prisma ${exception.code} en ${req.method} ${req.url} — ${exception.message}`,
        exception.stack,
      );

    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = "Error de validación en consulta de base de datos";
      this.logger.error(
        `PrismaValidationError en ${req.method} ${req.url}`,
        (exception as Error).stack,
      );

    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error en ${req.method} ${req.url} — ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`Unknown exception en ${req.method} ${req.url}`, String(exception));
    }

    res.status(status).json({
      statusCode: status,
      message,
      ...(code ? { code } : {}),
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
