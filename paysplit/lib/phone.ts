type DialCountry = { code: string; dialCode: string }

const FALLBACK_DIAL_CODE = "+234"

/**
 * Splits a stored international number (+2348031234567) into the dial code
 * and the local digits the phone field shows (08031234567).
 */
export function splitPhoneNumber(
  phoneNumber: string | null,
  countryCode: string | null,
  countries: DialCountry[]
) {
  const raw = phoneNumber ?? ""
  // The longest prefix wins, so +1 doesn't shadow a longer code like +1876.
  const fromNumber = countries
    .map((c) => c.dialCode)
    .filter((code) => code && raw.startsWith(code))
    .sort((a, b) => b.length - a.length)[0]
  const dialCode =
    countries.find((c) => c.code === countryCode)?.dialCode ??
    fromNumber ??
    FALLBACK_DIAL_CODE
  const phone = raw.startsWith(dialCode)
    ? `0${raw.slice(dialCode.length)}`
    : raw
  return { dialCode, phone }
}
