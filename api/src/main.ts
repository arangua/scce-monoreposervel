import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { HttpErrorFilter } from "./common/http-error.filter";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
