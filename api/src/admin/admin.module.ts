import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { ContextGuard } from "../auth/context.guard";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, ContextGuard],
})
export class AdminModule {}
