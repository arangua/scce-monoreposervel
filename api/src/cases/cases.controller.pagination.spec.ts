import { parsePagination } from "./cases.controller";

describe("parsePagination", () => {
  it("defaults to take=20 and skip=0", () => {
    expect(parsePagination()).toEqual({ take: 20, skip: 0 });
  });

  it("caps limit at 100 and normalizes offset floor to 0", () => {
    expect(parsePagination("999", "-3")).toEqual({ take: 100, skip: 0 });
  });

  it("normalizes non-numeric values to defaults", () => {
    expect(parsePagination("foo", "bar")).toEqual({ take: 20, skip: 0 });
  });
});
