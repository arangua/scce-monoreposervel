import { Module } from "@nestjs/common";
import { TerritoryController } from "./territory.controller";
import { TerritoryService } from "./territory.service";
import { PrismaModule } from "../prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TerritoryController],
  providers: [TerritoryService],
})
export class TerritoryModule {}
