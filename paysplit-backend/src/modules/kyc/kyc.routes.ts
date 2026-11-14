import { Router } from "express"
import { z } from "zod"

import { mountRoutes, route } from "../../lib/http.js"
import { parse } from "../../lib/validation.js"
import { sensitiveLimiter } from "../../middleware/rate-limit.js"
import { imageUpload, requireFile, type UploadedFiles } from "../../middleware/upload.js"
import { COUNTRIES } from "./countries.js"
import * as kyc from "./kyc.service.js"

const TAG = "KYC"

export const kycRouter = Router()

const profileSchema = z
  .object({
    countryCode: z.string().trim().length(2),
    phoneNumber: z.string().trim().min(7).max(20),
  })
  .openapi("UpdateKycProfileDto")

const nigeriaSchema = z
  .object({
    method: z.enum(["bvn", "nin"]),
    idNumber: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "Must be 11 digits"),
  })
  .openapi("NigeriaIdentityDto")

const documentTypeSchema = z.object({
  documentType: z.enum(["passport", "drivers_license"]),
})

const kycErrors = {
  409: "PROFILE_REQUIRED, IDENTITY_REQUIRED, WRONG_REGION or *_ALREADY_VERIFIED",
  429: "KYC_ATTEMPTS_EXCEEDED (3 failures locks the step for 1 hour)",
  503: "KYC_PROVIDER_UNAVAILABLE (no attempt used)",
}

mountRoutes(kycRouter, "/kyc", [
  route({
    method: "get",
    path: "/countries",
    tag: TAG,
    summary: "Supported countries, dial codes and accepted ID methods",
    auth: false,
    handler: () => COUNTRIES,
  }),
  route({
    method: "get",
    path: "/status",
    tag: TAG,
    summary: "KYC progress for the stepper",
    handler: ({ userId }) => kyc.getKycStatus(userId),
  }),
  route({
    method: "put",
    path: "/profile",
    tag: TAG,
    summary: "Step 1: country and phone number",
    description:
      "Phone may be local (`08031234567`) or international; it is stored as `+234…`.",
    body: profileSchema,
    errors: { 409: "COUNTRY_LOCKED" },
    handler: ({ userId, body }) => kyc.updateKycProfile(userId, body),
  }),
  route({
    method: "post",
    path: "/identity/nigeria",
    tag: TAG,
    summary: "Step 2 (Nigeria): verify a BVN or NIN with Dojah",
    description: "Sandbox test values: BVN `22222222222`, NIN `70123456789`.",
    body: nigeriaSchema,
    errors: { ...kycErrors, 422: "IDENTITY_NOT_FOUND or NAME_MISMATCH" },
    middleware: [sensitiveLimiter],
    handler: ({ userId, body }) => kyc.verifyNigeriaIdentity(userId, body),
  }),
  route({
    method: "post",
    path: "/identity/international",
    tag: TAG,
    summary: "Step 2 (other countries): passport or driver's licence photo",
    multipart: {
      documentType: { type: "string", enum: ["passport", "drivers_license"] },
      front: { type: "file" },
      back: { type: "file", required: false },
    },
    errors: { ...kycErrors, 415: "UNSUPPORTED_FILE_TYPE", 422: "DOCUMENT_INVALID" },
    middleware: [
      sensitiveLimiter,
      imageUpload.fields([
        { name: "front", maxCount: 1 },
        { name: "back", maxCount: 1 },
      ]),
    ],
    handler: ({ userId, req }) => {
      const { documentType } = parse(documentTypeSchema, req.body)
      const files = req.files as UploadedFiles | undefined
      const front = requireFile(files?.front?.[0], "front")
      return kyc.verifyInternationalIdentity(userId, {
        documentType,
        front: front.buffer,
        back: files?.back?.[0]?.buffer,
      })
    },
  }),
  route({
    method: "post",
    path: "/liveness",
    tag: TAG,
    summary: "Step 3: selfie liveness check (completes KYC)",
    multipart: { selfie: { type: "file" } },
    errors: {
      ...kycErrors,
      415: "UNSUPPORTED_FILE_TYPE",
      422: "NO_FACE_DETECTED, MULTIPLE_FACES or LIVENESS_FAILED",
    },
    middleware: [sensitiveLimiter, imageUpload.single("selfie")],
    handler: ({ userId, req }) =>
      kyc.submitLiveness(userId, requireFile(req.file, "selfie").buffer),
  }),
])
