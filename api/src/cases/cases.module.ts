import { Module } from "@nestjs/common";
import { CasesController } from "./cases.controller";
import { CasesService } from "./cases.service";
import { ContextGuard } from "../auth/context.guard";

@Module({
  controllers: [CasesController],
  providers: [CasesService, ContextGuard],
})
export class CasesModule {}
