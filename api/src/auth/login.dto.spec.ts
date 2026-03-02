import { validate } from "class-validator";
import { LoginDto } from "./login.dto";

describe("LoginDto", () => {
  it("fails validation for invalid email", async () => {
    const dto = new LoginDto();
    dto.email = "invalid-email";
    dto.password = "12345678";

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "email")).toBe(true);
  });

  it("fails validation for short password", async () => {
    const dto = new LoginDto();
    dto.email = "user@example.com";
    dto.password = "123";

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "password")).toBe(true);
  });
});
