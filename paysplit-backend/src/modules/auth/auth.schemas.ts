import { z } from "zod"

import { strongPassword } from "../../lib/password.js"

const name = z.string().trim().min(1, "Required").max(60)
const email = z.email().trim().toLowerCase().max(254)

export const signupSchema = z
  .object({
    firstName: name,
    lastName: name,
    email,
    password: strongPassword,
    confirmPassword: z.string(),
    rememberMe: z.boolean().optional().default(false),
  })
  .refine((body) => body.password === body.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .openapi("SignupDto")

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, "Required").max(128),
    rememberMe: z.boolean().optional().default(false),
  })
  .openapi("LoginDto")

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required").max(128),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((body) => body.newPassword === body.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((body) => body.newPassword !== body.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current one",
  })
  .openapi("ChangePasswordDto")
