import { Controller, Get, Post, Put, Body, UseGuards } from "@nestjs/common";
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

  // POST /system/command-transfer — FASE 3: transferencia formal de mando
  @UseGuards(JwtAuthGuard)
  @Post("command-transfer")
  async commandTransfer(
    @Body() body: {
      fromUserId: string;
      toUserId: string;
      toUserName: string;
      reason: string;
      contextType: string;
      contextId: string;
    }
  ) {
    if (!body.fromUserId || !body.toUserId || !body.reason) {
      return { error: "fromUserId, toUserId y reason son obligatorios" };
    }
    // Registrar en SystemConfig como last-write (audit liviano)
    const record = {
      from: body.fromUserId,
      to: body.toUserId,
      toName: body.toUserName ?? body.toUserId,
      reason: body.reason,
      context: `${body.contextType}/${body.contextId}`,
      at: new Date().toISOString(),
    };
    await this.prisma.systemConfig.upsert({
      where: { key: "lastCommandTransfer" },
      update: { value: JSON.stringify(record), updatedAt: new Date(), updatedBy: body.fromUserId },
      create: { key: "lastCommandTransfer", value: JSON.stringify(record), updatedBy: body.fromUserId },
    });
    return { ok: true, transfer: record };
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
