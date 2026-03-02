import { UnauthorizedException } from "@nestjs/common";
import { CasesController } from "./cases.controller";

describe("CasesController", () => {
  it("throws UnauthorizedException when POST /cases has no userId", async () => {
    const casesService = {
      create: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      getEvents: jest.fn(),
      addEvent: jest.fn(),
    };

    const controller = new CasesController(casesService as never);

    expect(() =>
      controller.create(
        {
          summary: "s",
          regionCode: "13",
          communeCode: "13101",
          localCode: "L1",
        },
        { contextType: "OPERACION", contextId: "ctx" },
        {}
      )
    ).toThrow(UnauthorizedException);
  });
});
