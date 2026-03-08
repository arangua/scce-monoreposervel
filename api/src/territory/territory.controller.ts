import { Controller, Get, Param } from "@nestjs/common";
import { TerritoryService } from "./territory.service";

@Controller("territory")
export class TerritoryController {
  constructor(private readonly territory: TerritoryService) {}

  @Get("regions")
  getRegions() {
    return this.territory.listRegions();
  }

  @Get("regions/:regionCode/provinces")
  getProvincesByRegion(@Param("regionCode") regionCode: string) {
    return this.territory.listProvincesByRegion(regionCode);
  }

  @Get("provinces/:provinceCode/communes")
  getCommunesByProvince(@Param("provinceCode") provinceCode: string) {
    return this.territory.listCommunesByProvince(provinceCode);
  }
}
