export const ACCENT_COLORS = [
  { key: "green", hex: "#12B76A" },
  { key: "orange", hex: "#F79009" },
  { key: "purple", hex: "#7A5AF8" },
  { key: "blue", hex: "#33A7F5" },
  { key: "red", hex: "#F04438" },
  { key: "yellow", hex: "#FDB022" },
  { key: "teal", hex: "#15B79E" },
  { key: "pink", hex: "#EE46BC" },
] as const

export type AccentKey = (typeof ACCENT_COLORS)[number]["key"]

export const ACCENT_KEYS = ACCENT_COLORS.map((color) => color.key) as [
  AccentKey,
  ...AccentKey[],
]

export const accentHex = (key: string) =>
  ACCENT_COLORS.find((color) => color.key === key)?.hex ?? "#33A7F5"
