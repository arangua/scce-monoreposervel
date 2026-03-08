import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class TerritoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listRegions(): Promise<{ code: string; name: string }[]> {
    const rows = await this.prisma.region.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    return rows.map((r) => ({ code: r.id, name: r.name }));
  }

  async listProvincesByRegion(regionCode: string): Promise<{ code: string; name: string; regionCode: string }[]> {
    const rows = await this.prisma.province.findMany({
      where: { regionId: regionCode },
      orderBy: { id: "asc" },
      select: { id: true, name: true, regionId: true },
    });
    return rows.map((p) => ({ code: p.id, name: p.name, regionCode: p.regionId }));
  }

  async listCommunesByProvince(provinceCode: string): Promise<{ code: string; name: string; provinceCode: string; regionCode: string }[]> {
    const rows = await this.prisma.commune.findMany({
      where: { provinceId: provinceCode },
      orderBy: { id: "asc" },
      select: { id: true, name: true, provinceId: true, province: { select: { regionId: true } } },
    });
    return rows.map((c) => ({
      code: c.id,
      name: c.name,
      provinceCode: c.provinceId,
      regionCode: c.province.regionId,
    }));
  }
}
