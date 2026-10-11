import { describe, expect, it } from "vitest";
import { hasValidAgniSecret, stripRecordingAccessTokens } from "./security";

describe("Agni webhook security", () => {
  it("uses the configured shared secret", () => {
    process.env.AGNI_WEBHOOK_SECRET = "secret-value";
    process.env.AGNI_WEBHOOK_HEADER_NAME = "x-agni-secret";
    expect(hasValidAgniSecret(new Headers({ "x-agni-secret": "secret-value" }))).toBe(true);
    expect(hasValidAgniSecret(new Headers({ "x-agni-secret": "wrong" }))).toBe(false);
  });

  it("excludes recording URLs and access tokens", () => {
    const clean = stripRecordingAccessTokens({ recording_url: "https://example.test/recording?access_token=secret", text: "safe" });
    expect(clean).toEqual({ text: "safe" });
    expect(JSON.stringify(clean)).not.toContain("secret");
  });
});
