import { randomBytes, randomInt } from "node:crypto"

import { lagosYmd } from "./dates.js"

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O, 1/I

function randomCode(length: number): string {
  const bytes = randomBytes(length)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")
}

/** Transaction reference, e.g. "PAY-261114-7KQ3M9XA". */
export function transactionReference(now = new Date()): string {
  const { year, month, day } = lagosYmd(now)
  const date = `${String(year).slice(2)}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`
  return `PAY-${date}-${randomCode(8)}`
}

/** Simulated bank/session references for receipts. */
export function settlementReference(): string {
  return `STL${Date.now()}${randomInt(100_000, 999_999)}`
}

/** 10-digit NUBAN-style account number (simulated bank). */
export function accountNumber(): string {
  return `9${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`
}

export function maskAccountNumber(value: string): string {
  return `******${value.slice(-4)}`
}

/** "22222222222" → "*******2222" */
export function maskIdNumber(value: string): string {
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`
}
