import { describe, expect, it } from "vitest"

import { SALARY, authed, createRule, createWallet, readyUser, signup } from "./helpers.js"

describe("wallets and split rules", () => {
  it("creates wallets with a target and refuses duplicate names", async () => {
    const user = await signup()
    const wallet = await createWallet(user.token, "Rent", { targetAmount: 100_000_00 })
    expect(wallet).toMatchObject({
      name: "Rent",
      balance: 0,
      targetAmount: 100_000_00,
      progressPercent: 0,
    })

    const dup = await authed(user.token)
      .post("/wallets")
      .send({ name: "Rent", categoryId: "housing", accentColor: "blue" })
      .expect(409)
    expect(dup.body.code).toBe("WALLET_NAME_TAKEN")

    const badCategory = await authed(user.token)
      .post("/wallets")
      .send({ name: "X", categoryId: "nope", accentColor: "blue" })
      .expect(422)
    expect(badCategory.body.code).toBe("CATEGORY_NOT_FOUND")
  })

  it("can't see or change another user's wallet", async () => {
    const owner = await signup()
    const other = await signup()
    const wallet = await createWallet(owner.token, "Private")
    await authed(other.token).get(`/wallets/${wallet.id}`).expect(404)
    await authed(other.token).delete(`/wallets/${wallet.id}`).expect(404)
  })

  it("needs income before rules, and keeps rules within the salary", async () => {
    const user = await signup()
    const rent = await createWallet(user.token, "Rent")
    const noIncome = await createRule(user.token, rent.id, {
      method: "percentage",
      value: 30,
    })
    expect(noIncome.status).toBe(422)
    expect(noIncome.body.code).toBe("INCOME_REQUIRED")

    await authed(user.token)
      .put("/setup/income")
      .send({ employerName: "Acme", monthlyAmount: SALARY, paydayDay: 28 })
      .expect(200)

    const ok = await createRule(user.token, rent.id, { method: "percentage", value: 60 })
    expect(ok.status).toBe(201)
    expect(ok.body.rule).toMatchObject({
      method: "percentage",
      value: 60,
      displayValue: "60%",
      plannedAmount: SALARY * 0.6,
      destination: { type: "wallet", id: rent.id, label: "Rent (wallet)" },
    })

    const again = await createRule(user.token, rent.id, { method: "fixed", value: 100 })
    expect(again.body.code).toBe("DESTINATION_HAS_RULE")

    const savings = await createWallet(user.token, "Savings")
    const tooMuch = await createRule(user.token, savings.id, {
      method: "percentage",
      value: 50,
    })
    expect(tooMuch.status).toBe(422)
    expect(tooMuch.body.code).toBe("ALLOCATION_EXCEEDS_SALARY")

    const badPercent = await createRule(user.token, savings.id, {
      method: "percentage",
      value: 10.123,
    })
    expect(badPercent.body.code).toBe("INVALID_RULE_VALUE")

    const beneficiary = await authed(user.token)
      .post("/split-rules")
      .send({
        name: "Mum",
        priority: 2,
        destinationType: "beneficiary",
        method: "fixed",
        value: 100,
      })
      .expect(422)
    expect(beneficiary.body.code).toBe("BENEFICIARIES_NOT_SUPPORTED")

    // A paused rule doesn't count towards the allocation.
    const paused = await authed(user.token)
      .patch(`/split-rules/${ok.body.rule.id}`)
      .send({ status: "paused" })
      .expect(200)
    expect(paused.body.status).toBe("paused")
    expect(
      (await createRule(user.token, savings.id, { method: "percentage", value: 50 }))
        .status
    ).toBe(201)

    const summary = await authed(user.token).get("/split-rules/summary").expect(200)
    expect(summary.body).toMatchObject({
      baselineSalary: SALARY,
      totalAllocated: SALARY * 0.5,
      allocatedPercent: 50,
      remainderPercent: 50,
      activeRules: 1,
      overAllocated: false,
    })
  })
})

describe("salary credit and splitting", () => {
  it("credits the salary and splits it by priority in one go", async () => {
    const user = await readyUser()
    const as = authed(user.token)
    const rent = await createWallet(user.token, "Rent")
    const savings = await createWallet(user.token, "Savings")
    await createRule(user.token, rent.id, {
      method: "fixed",
      value: 150_000_00,
      priority: 1,
      name: "Rent",
    })
    await createRule(user.token, savings.id, {
      method: "percentage",
      value: 20,
      priority: 2,
      name: "Save",
    })

    const res = await as
      .post("/simulations/salary-credit")
      .send({ amount: SALARY })
      .expect(201)
    expect(res.body.transaction).toMatchObject({
      type: "salary_credit",
      direction: "in",
      amount: SALARY,
      signedAmount: SALARY,
      title: "Transfer from Acme Ltd",
    })
    expect(res.body.splitRun).toMatchObject({
      trigger: "auto",
      status: "completed",
      baseAmount: SALARY,
      toWallets: 150_000_00 + SALARY * 0.2,
      skipped: [],
    })
    expect(res.body.splitRun.transactions).toHaveLength(2)
    expect(res.body.salaryAccount.balance).toBe(SALARY - 150_000_00 - SALARY * 0.2)

    expect((await as.get(`/wallets/${rent.id}`).expect(200)).body).toMatchObject({
      balance: 150_000_00,
      stats: { totalAllocated: 150_000_00, totalMovedBack: 0 },
      linkedRule: { name: "Rent", allocatedThisMonth: 150_000_00 },
    })

    // Salary-account view: one credit in, two splits out.
    const ledger = await as.get("/transactions").expect(200)
    expect(ledger.body.pagination.total).toBe(3)
    const directions = ledger.body.data.map(
      (t: { type: string; direction: string }) => `${t.type}:${t.direction}`
    )
    expect(directions.sort()).toEqual(
      ["salary_credit:in", "wallet_allocation:out", "wallet_allocation:out"].sort()
    )

    // Wallet view of the same allocation is money in.
    const walletTx = await as.get(`/wallets/${rent.id}/transactions`).expect(200)
    expect(walletTx.body.data[0]).toMatchObject({
      title: "Allocated from salary",
      direction: "in",
      signedAmount: 150_000_00,
    })

    const notifications = await as.get("/notifications").expect(200)
    const types = notifications.body.data.map((n: { type: string }) => n.type)
    expect(types).toEqual(expect.arrayContaining(["salary_received", "split_completed"]))
    expect(notifications.body.unreadCount).toBeGreaterThan(0)
  })

  it("skips a rule that no longer fits instead of overdrawing", async () => {
    const user = await readyUser()
    const big = await createWallet(user.token, "Big")
    const small = await createWallet(user.token, "Small")
    await createRule(user.token, big.id, {
      method: "fixed",
      value: 400_000_00,
      priority: 1,
    })
    await createRule(user.token, small.id, {
      method: "fixed",
      value: 50_000_00,
      priority: 2,
    })

    const res = await authed(user.token)
      .post("/simulations/salary-credit")
      .send({ amount: 300_000_00 })
      .expect(201)
    expect(res.body.splitRun.toWallets).toBe(50_000_00)
    expect(res.body.splitRun.skipped).toEqual([
      expect.objectContaining({
        walletName: "Big",
        reason: "INSUFFICIENT_FUNDS",
        plannedAmount: 400_000_00,
      }),
    ])
    expect(res.body.salaryAccount.balance).toBe(250_000_00)
  })

  it("applies a credit once per Idempotency-Key", async () => {
    const user = await readyUser()
    const as = authed(user.token)
    const first = await as
      .post("/simulations/salary-credit")
      .set("Idempotency-Key", "pay-nov-2026")
      .send({ amount: 1_000_00, autoSplit: false })
      .expect(201)
    const replay = await as
      .post("/simulations/salary-credit")
      .set("Idempotency-Key", "pay-nov-2026")
      .send({ amount: 1_000_00, autoSplit: false })
      .expect(200)
    expect(replay.body.replayed).toBe(true)
    expect(replay.body.transaction.id).toBe(first.body.transaction.id)
    expect((await as.get("/salary-account").expect(200)).body.balance).toBe(1_000_00)
  })

  it("needs an active salary account to receive money", async () => {
    const user = await signup()
    const res = await authed(user.token)
      .post("/simulations/salary-credit")
      .send({ amount: 1_000_00 })
      .expect(422)
    expect(res.body.code).toBe("SALARY_ACCOUNT_INACTIVE")
  })

  it("moves money back, never below zero, and only deletes empty wallets", async () => {
    const user = await readyUser()
    const as = authed(user.token)
    const wallet = await createWallet(user.token, "Holiday")
    await createRule(user.token, wallet.id, { method: "fixed", value: 20_000_00 })
    await as.post("/simulations/salary-credit").send({ amount: 100_000_00 }).expect(201)

    const notEmpty = await as.delete(`/wallets/${wallet.id}`).expect(409)
    expect(notEmpty.body.code).toBe("WALLET_NOT_EMPTY")

    const tooMuch = await as
      .post(`/wallets/${wallet.id}/move`)
      .send({ amount: 20_000_01 })
      .expect(422)
    expect(tooMuch.body.code).toBe("INSUFFICIENT_BALANCE")

    const moved = await as
      .post(`/wallets/${wallet.id}/move`)
      .send({ amount: 20_000_00 })
      .expect(200)
    expect(moved.body.wallet.balance).toBe(0)
    expect(moved.body.transaction).toMatchObject({
      type: "wallet_withdrawal",
      direction: "out",
      title: "Moved to salary account",
    })
    expect((await as.get("/salary-account").expect(200)).body.balance).toBe(100_000_00)

    // Concurrent moves can't both succeed.
    await as.post("/split-runs").expect(201)
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        as.post(`/wallets/${wallet.id}/move`).send({ amount: 20_000_00 })
      )
    )
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    expect((await as.get(`/wallets/${wallet.id}`).expect(200)).body.balance).toBe(0)

    await as.delete(`/wallets/${wallet.id}`).expect(200)
    // History survives the wallet.
    const ledger = await as.get("/transactions?type=wallet").expect(200)
    expect(ledger.body.pagination.total).toBeGreaterThanOrEqual(3)
  })

  it("runs a manual split on the monthly salary", async () => {
    const user = await readyUser()
    const as = authed(user.token)
    const wallet = await createWallet(user.token, "Invest")
    await createRule(user.token, wallet.id, { method: "percentage", value: 10 })

    const empty = await as.post("/split-runs").expect(422)
    expect(empty.body.code).toBe("NO_FUNDS")

    await as
      .post("/simulations/salary-credit")
      .send({ amount: SALARY, autoSplit: false })
      .expect(201)
    const run = await as.post("/split-runs").expect(201)
    expect(run.body).toMatchObject({
      trigger: "manual",
      baseAmount: SALARY,
      toWallets: SALARY * 0.1,
    })

    const history = await as.get("/split-runs").expect(200)
    expect(history.body.data[0].id).toBe(run.body.id)
    await as.get(`/split-runs/${run.body.id}`).expect(200)
  })
})

describe("transactions, export and dashboard", () => {
  it("filters, searches, exports CSV and summarises the dashboard", async () => {
    const user = await readyUser()
    const as = authed(user.token)
    const wallet = await createWallet(user.token, "Rent")
    await createRule(user.token, wallet.id, { method: "percentage", value: 40 })
    const credit = await as
      .post("/simulations/salary-credit")
      .send({ amount: SALARY, narration: '=HYPERLINK("http://evil")' })
      .expect(201)

    const outOnly = await as.get("/transactions?direction=out").expect(200)
    expect(
      outOnly.body.data.every((t: { direction: string }) => t.direction === "out")
    ).toBe(true)

    const byRef = await as
      .get(`/transactions?search=${credit.body.transaction.reference}`)
      .expect(200)
    expect(byRef.body.data).toHaveLength(1)

    expect(
      (await as.get("/transactions?type=beneficiary").expect(200)).body.data
    ).toEqual([])

    const receipt = await as
      .get(`/transactions/${credit.body.transaction.id}`)
      .expect(200)
    expect(receipt.body.recipient).toMatchObject({
      type: "salary_account",
      name: "Ada Obi",
    })
    expect(receipt.body.recipient.maskedAccountNumber).toMatch(/^\*{6}\d{4}$/)

    const csv = await as.get("/transactions/export").expect(200)
    expect(csv.headers["content-type"]).toMatch(/text\/csv/)
    expect(csv.headers["content-disposition"]).toMatch(
      /attachment; filename="?paysplit-statement-\d{4}-\d{2}-\d{2}\.csv/
    )
    expect(csv.text).toContain("Reference")
    // A cell starting with "=" would run as a formula in Excel: it's prefixed with '.
    expect(csv.text).toContain(`"'=HYPERLINK(""http://evil"")"`)

    const summary = await as.get("/dashboard/summary").expect(200)
    expect(summary.body).toMatchObject({
      firstName: "Ada",
      tier: 2,
      splitAllocation: { amount: SALARY * 0.4, activeRules: 1, percentOfSalary: 40 },
      wallets: { total: 1, activeCount: 1 },
      partition: {
        baselineSalary: SALARY,
        toWallets: SALARY * 0.4,
        remainingPercent: 60,
      },
      onboarding: { nextStep: "dashboard", progress: { percent: 100 } },
    })
    expect(summary.body.nextSplitRun.date).toMatch(/^\d{4}-\d{2}-28$/)

    const flow = await as.get("/dashboard/cash-flow").expect(200)
    expect(flow.body.granularity).toBe("month")
    expect(flow.body.buckets).toHaveLength(9)
    expect(flow.body.totals).toMatchObject({ inflow: SALARY, toWallets: SALARY * 0.4 })
    expect(flow.body.monthOverMonth).toMatchObject({
      current: SALARY,
      previous: 0,
      changePercent: null,
    })

    const daily = await as
      .get("/dashboard/cash-flow?from=2026-01-01&to=2026-01-31")
      .expect(200)
    expect(daily.body).toMatchObject({ granularity: "day" })
    expect(daily.body.buckets).toHaveLength(31)
  })

  it("marks notifications read", async () => {
    const user = await signup()
    const as = authed(user.token)
    const list = await as.get("/notifications").expect(200)
    const [welcome] = list.body.data
    expect(welcome).toMatchObject({ type: "welcome", read: false })
    expect(
      (await as.post(`/notifications/${welcome.id}/read`).expect(200)).body.read
    ).toBe(true)
    expect((await as.post("/notifications/read-all").expect(200)).body).toEqual({
      updated: 0,
    })
  })

  it("respects in-app notification preferences", async () => {
    const user = await readyUser()
    const as = authed(user.token)
    const prefs = await as
      .put("/users/me/notification-preferences")
      .send({ push: { salaryReceived: false } })
      .expect(200)
    expect(prefs.body.preferences.push).toMatchObject({
      salaryReceived: false,
      splitCompleted: true,
    })

    await as.post("/simulations/salary-credit").send({ amount: 1_000_00 }).expect(201)
    const types = (await as.get("/notifications?limit=50").expect(200)).body.data.map(
      (n: { type: string }) => n.type
    )
    expect(types).not.toContain("salary_received")
  })
})
