import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // FIX DEUDA-003: ExceptionFilter global — logs completos + respuestas estructuradas
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:4173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`Listening on port ${port}`);
}
bootstrap();
