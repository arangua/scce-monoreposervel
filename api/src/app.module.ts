import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma.module";
import { ContextsController } from "./contexts.controller";
import { CasesModule } from "./cases/cases.module";

@Module({
  imports: [PrismaModule, AuthModule, CasesModule],
  controllers: [AppController, HealthController, ContextsController],
  providers: [AppService],
})
export class AppModule {}
