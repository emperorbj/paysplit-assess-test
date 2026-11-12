/** "#22A447" → "rgba(34, 164, 71, 0.12)": soft card tint from an accent colour. */
export function tint(hex: string, alpha = 0.12) {
  const value = hex.replace("#", "")
  const full = value.length === 3 ? value.replace(/./g, "$&$&") : value
  const n = Number.parseInt(full, 16)
  if (Number.isNaN(n)) return `rgba(51, 167, 245, ${alpha})`
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
