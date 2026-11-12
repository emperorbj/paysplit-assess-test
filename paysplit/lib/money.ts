// The API sends and expects money in kobo (₦850,000 = 85000000).
// Convert at the edges: forms and formatNaira() work in naira.

export function koboToNaira(kobo: number | null | undefined) {
  return kobo == null ? null : kobo / 100
}

export function nairaToKobo(naira: number | null | undefined) {
  return naira == null ? null : Math.round(naira * 100)
}
