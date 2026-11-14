import multer from "multer"

import { AppError } from "../lib/errors.js"

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** Images held in memory (≤ 5MB each), never written to disk. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 2 },
  fileFilter: (_req, file, callback) => {
    if (IMAGE_TYPES.includes(file.mimetype)) return callback(null, true)
    callback(
      new AppError(
        415,
        "Only JPG, PNG or WebP images are allowed",
        "UNSUPPORTED_FILE_TYPE"
      )
    )
  },
})

export type UploadedFiles = Record<string, Express.Multer.File[] | undefined>

export function requireFile(file: Express.Multer.File | undefined, field: string) {
  if (!file)
    throw new AppError(400, [`${field}: An image file is required`], "VALIDATION_ERROR")
  return file
}
