import { Controller, Get, Put, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./auth/jwt.guard";
import { PrismaService } from "./prisma.service";

export type OperationMode = "NORMAL" | "CONTINGENCIA" | "DEGRADADO";

@Controller("system")
export class SystemController {
  constructor(private prisma: PrismaService) {}

  // GET /system/config — lectura pública (cualquier usuario autenticado)
  @UseGuards(JwtAuthGuard)
  @Get("config")
  async getConfig() {
    const rows = await this.prisma.systemConfig.findMany();
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    // Asegurar que operationMode siempre esté presente
    if (!config["operationMode"]) config["operationMode"] = "NORMAL";
    return config;
  }

  // PUT /system/config/operation-mode — solo DR/Admin
  @UseGuards(JwtAuthGuard)
  @Put("config/operation-mode")
  async setOperationMode(
    @Body() body: { mode: OperationMode; updatedBy?: string }
  ) {
    const valid: OperationMode[] = ["NORMAL", "CONTINGENCIA", "DEGRADADO"];
    if (!valid.includes(body.mode)) {
      return { error: `Modo inválido. Use: ${valid.join(", ")}` };
    }
    await this.prisma.systemConfig.upsert({
      where: { key: "operationMode" },
      update: { value: body.mode, updatedAt: new Date(), updatedBy: body.updatedBy ?? null },
      create: { key: "operationMode", value: body.mode, updatedBy: body.updatedBy ?? null },
    });
    return { operationMode: body.mode, updatedAt: new Date().toISOString() };
  }
}
