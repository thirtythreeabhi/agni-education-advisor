import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export function normalizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export function normalizePhone(value: string, defaultCountry = "IN") {
  const parsed = parsePhoneNumberFromString(value.trim(), defaultCountry as CountryCode);
  return parsed?.isValid() ? parsed.number : null;
}

export function normalizeIdentifier(value: string) {
  const email = normalizeEmail(value);
  if (email) return { type: "email" as const, value: email };
  const phone = normalizePhone(value);
  if (phone) return { type: "phone" as const, value: phone };
  return null;
}
