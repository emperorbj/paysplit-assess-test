import { describe, expect, it } from "vitest"

import { toCashFlow } from "@/lib/dashboard"
import type { CashFlowResponse } from "@/types/api/dashboard"

const bucket = (period: string, toWallets: number) => ({
  period,
  inflow: 0,
  toWallets,
  toBeneficiaries: 0,
  movedBack: 0,
})

const RESPONSE: CashFlowResponse = {
  from: "2026-10-01",
  to: "2026-11-06",
  granularity: "month",
  buckets: [bucket("2026-10", 10000000), bucket("2026-11", 25000000)],
  totals: {
    inflow: 50000000,
    toWallets: 25000000,
    toBeneficiaries: 0,
    movedBack: 5000,
  },
  monthOverMonth: { current: 50000000, previous: 0, changePercent: null },
}

describe("toCashFlow", () => {
  it("converts buckets to naira points with ISO dates", () => {
    const flow = toCashFlow(RESPONSE)
    expect(flow.total).toBe(500000)
    expect(flow.change).toBeNull()
    expect(flow.points.map((p) => [p.date, p.wallets])).toEqual([
      ["2026-10-01T00:00:00Z", 100000],
      ["2026-11-01T00:00:00Z", 250000],
    ])
  })

  it("computes the change against the previous bucket", () => {
    const [first, second] = toCashFlow(RESPONSE).points
    expect(first.walletsChange).toBe(0)
    expect(second.walletsChange).toBe(150)
  })

  it("accepts daily buckets", () => {
    const daily = { ...RESPONSE, buckets: [bucket("2026-11-05", 0)] }
    expect(toCashFlow(daily).points[0].date).toBe("2026-11-05T00:00:00Z")
  })
})
