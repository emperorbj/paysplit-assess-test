import { pino } from "pino"

import { env } from "../config/env.js"

export const logger = pino({
  level: env.isTest ? "silent" : env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.confirmPassword",
      "*.currentPassword",
      "*.newPassword",
      "*.idNumber",
    ],
    censor: "[redacted]",
  },
  ...(env.isProduction
    ? {}
    : { transport: { target: "pino-pretty", options: { singleLine: true } } }),
})
