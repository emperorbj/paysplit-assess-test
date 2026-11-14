import { randomUUID } from "node:crypto"

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

import { env } from "../config/env.js"
import { serviceUnavailable } from "./errors.js"
import { logger } from "./logger.js"

/**
 * Neon Object Storage (S3-compatible, path-style). The bucket is public-read,
 * so a stored key becomes a stable public URL; we store the key in Postgres.
 */
const client = env.storageEnabled
  ? new S3Client({
      region: env.AWS_REGION,
      endpoint: env.AWS_ENDPOINT_URL_S3,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function requireClient(): S3Client {
  if (!client)
    throw serviceUnavailable("File storage is not configured", "STORAGE_DISABLED")
  return client
}

/** Upload to a new, unique key (so CDNs/browsers never serve a stale image). */
export async function uploadPublicImage(
  prefix: string,
  body: Buffer,
  contentType: string
) {
  const key = `${prefix}/${randomUUID()}.${EXTENSIONS[contentType] ?? "bin"}`
  await requireClient().send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  )
  return key
}

/** Best effort: a leftover object is harmless, a failed request shouldn't be. */
export async function deleteObject(key: string) {
  if (!client) return
  try {
    await client.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }))
  } catch (error) {
    logger.warn({ err: error, key }, "Failed to delete stored object")
  }
}

export function publicUrl(key: string | null | undefined): string | null {
  if (!key) return null
  const base = (
    env.STORAGE_PUBLIC_URL || `${env.AWS_ENDPOINT_URL_S3}/${env.STORAGE_BUCKET}`
  ).replace(/\/+$/, "")
  return `${base}/${key}`
}
