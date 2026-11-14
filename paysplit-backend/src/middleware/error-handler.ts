import type { ErrorRequestHandler, RequestHandler } from "express"
import multer from "multer"

import { Prisma } from "../generated/prisma/client.js"
import { AppError } from "../lib/errors.js"
import { logger } from "../lib/logger.js"

export const notFoundHandler: RequestHandler = (req) => {
  throw new AppError(404, `Cannot ${req.method} ${req.path}`, "ROUTE_NOT_FOUND")
}

/** Converts anything thrown into the standard error body. */
function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE")
      return new AppError(413, "File is too large (max 5MB)", "FILE_TOO_LARGE")
    return new AppError(400, `Upload error: ${error.message}`, "UPLOAD_ERROR")
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return new AppError(409, "That record already exists", "DUPLICATE")
    if (error.code === "P2025") return new AppError(404, "Not found", "NOT_FOUND")
  }

  // body-parser: malformed JSON or an oversized body
  if (typeof error === "object" && error !== null && "type" in error) {
    const type = (error as { type: string }).type
    if (type === "entity.parse.failed")
      return new AppError(400, "Request body is not valid JSON", "INVALID_JSON")
    if (type === "entity.too.large")
      return new AppError(413, "Request body is too large", "PAYLOAD_TOO_LARGE")
  }

  return new AppError(500, "Something went wrong. Please try again.", "INTERNAL_ERROR")
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = toAppError(error)
  if (appError.statusCode >= 500) {
    logger.error({ err: error, method: req.method, path: req.path }, "Unhandled error")
  }
  res.status(appError.statusCode).json(appError.toBody())
}
