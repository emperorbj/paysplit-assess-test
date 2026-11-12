/** Naira a rule moves each payday for a given salary (form preview only). */
export function monthlyAllocation(
  rule: { method: "fixed" | "percentage"; value: number | null },
  salary: number
) {
  if (!rule.value) return 0
  return rule.method === "percentage"
    ? Math.round((salary * rule.value) / 100)
    : rule.value
}
