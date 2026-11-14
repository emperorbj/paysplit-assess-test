import bcrypt from "bcryptjs"
import { z } from "zod"

const ROUNDS = 12

/** Same rule the frontend shows: 8+ chars with upper, lower, digit and symbol. */
export const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password needs an uppercase letter")
  .regex(/[a-z]/, "Password needs a lowercase letter")
  .regex(/\d/, "Password needs a number")
  .regex(/[^A-Za-z0-9]/, "Password needs a symbol")

export const hashPassword = (password: string) => bcrypt.hash(password, ROUNDS)

export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash)

/** A real hash to compare against when the user doesn't exist (constant-ish time). */
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", ROUNDS)
