import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { HttpErrorFilter } from "./http-error.filter";

describe("HttpErrorFilter", () => {
  it("formats HttpException into a normalized payload", () => {
    const filter = new HttpErrorFilter();

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ url: "/cases/abc" }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new HttpException("No encontrado", HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        path: "/cases/abc",
        message: "No encontrado",
      })
    );
  });
});
