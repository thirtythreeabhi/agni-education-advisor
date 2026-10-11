import { describe, expect, it } from "vitest";
import { isCatalogAdmin } from "./authorization";

describe("catalog authorization", () => {
  it("allows only the admin role", () => {
    expect(isCatalogAdmin("admin")).toBe(true);
    expect(isCatalogAdmin("user")).toBe(false);
    expect(isCatalogAdmin(undefined)).toBe(false);
  });
});
