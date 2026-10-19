import { describe, expect, it } from "vitest";
import { createPasswordResetToken, hashPasswordResetToken, PASSWORD_RESET_TTL_MS } from "./password-reset";

describe("password reset tokens", () => {
  it("creates a high-entropy token with a matching one-way hash", () => {
    const token = createPasswordResetToken();
    expect(token.rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(token.tokenHash).toBe(hashPasswordResetToken(token.rawToken));
    expect(token.tokenHash).not.toContain(token.rawToken);
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now() + PASSWORD_RESET_TTL_MS - 1000);
  });

  it("does not produce the same token twice", () => {
    expect(createPasswordResetToken().rawToken).not.toBe(createPasswordResetToken().rawToken);
  });
});
