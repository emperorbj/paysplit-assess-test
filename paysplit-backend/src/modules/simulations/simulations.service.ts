import { Prisma } from "../../generated/prisma/client.js"
import { unprocessable } from "../../lib/errors.js"
import { formatNaira } from "../../lib/money.js"
import { prisma } from "../../lib/prisma.js"
import { settlementReference, transactionReference } from "../../lib/references.js"
import { notify } from "../notifications/notifications.service.js"
import { presentSalaryAccount } from "../salary-account/salary-account.presenter.js"
import { executeSplit } from "../split-runs/split-engine.js"
import { getRun } from "../split-runs/split-runs.service.js"
import {
  presentTransaction,
  transactionInclude,
} from "../transactions/transaction.presenter.js"

type CreditInput = {
  amount: number
  senderName?: string | undefined
  narration?: string | undefined
  autoSplit: boolean
}

async function result(userId: string, transactionId: string, replayed: boolean) {
  const [transaction, run, user] = await Promise.all([
    prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: transactionInclude,
    }),
    prisma.splitRun.findFirst({ where: { userId, creditTransactionId: transactionId } }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { salaryAccount: true },
    }),
  ])
  return {
    message: replayed
      ? "This credit was already applied."
      : run
        ? "Salary received and split into your wallets."
        : "Salary received.",
    replayed,
    transaction: presentTransaction(transaction, "salary"),
    splitRun: run ? await getRun(userId, run.id) : null,
    salaryAccount: presentSalaryAccount(user.salaryAccount, user),
  }
}

/**
 * Simulates an employer paying salary into the user's account, then (by
 * default) runs the split straight away, all in one database transaction.
 * An Idempotency-Key makes retries safe: the same key returns the first result.
 */
export async function simulateSalaryCredit(
  userId: string,
  input: CreditInput,
  idempotencyKey: string | undefined
) {
  if (idempotencyKey) {
    const existing = await prisma.transaction.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    })
    if (existing) return { status: 200, body: await result(userId, existing.id, true) }
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { salaryAccount: true, income: true },
  })
  if (user.salaryAccount?.status !== "active")
    throw unprocessable(
      "Complete KYC to get your salary account first",
      "SALARY_ACCOUNT_INACTIVE"
    )

  const amount = BigInt(input.amount)
  const sender = input.senderName ?? user.income?.employerName ?? "Employer"

  let transactionId: string
  try {
    transactionId = await prisma.$transaction(async (tx) => {
      await tx.salaryAccount.update({
        where: { userId },
        data: { balance: { increment: amount } },
      })
      const now = new Date()
      const credit = await tx.transaction.create({
        data: {
          userId,
          reference: transactionReference(now),
          type: "salary_credit",
          status: "success",
          amount,
          counterpartyName: sender,
          narration: input.narration ?? `Salary from ${sender}`,
          providerReference: `SIM-${now.getTime()}`,
          settlementReference: settlementReference(),
          idempotencyKey: idempotencyKey ?? null,
          completedAt: now,
        },
      })
      await notify(
        userId,
        {
          type: "salary_received",
          title: "Salary received",
          body: `${formatNaira(amount)} from ${sender} landed in your salary account.`,
          data: { transactionId: credit.id, amount: input.amount },
        },
        tx
      )
      const activeRules = await tx.splitRule.count({
        where: { userId, status: "active" },
      })
      if (input.autoSplit && activeRules > 0)
        await executeSplit(tx, userId, {
          trigger: "auto",
          baseAmount: amount,
          creditTransactionId: credit.id,
        })
      return credit.id
    })
  } catch (error) {
    // Two requests with the same key raced; the loser returns the winner's result.
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.transaction.findUniqueOrThrow({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      })
      return { status: 200, body: await result(userId, existing.id, true) }
    }
    throw error
  }
  return { status: 201, body: await result(userId, transactionId, false) }
}
