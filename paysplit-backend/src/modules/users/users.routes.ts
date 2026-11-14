import { Router } from "express"
import { z } from "zod"

import { mountRoutes, route } from "../../lib/http.js"
import { imageUpload, requireFile } from "../../middleware/upload.js"
import { CHANNELS, TOPICS } from "./notification-preferences.js"
import * as users from "./users.service.js"

const TAG = "Users"

export const usersRouter = Router()

const updateMeSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\+\d{8,15}$/, "Use international format, e.g. +2348031234567")
      .optional(),
  })
  .openapi("UpdateMeDto")

const topicsSchema = z
  .object(Object.fromEntries(TOPICS.map((topic) => [topic, z.boolean().optional()])))
  .strict()

const preferencesSchema = z
  .object(
    Object.fromEntries(CHANNELS.map((channel) => [channel, topicsSchema.optional()]))
  )
  .strict()
  .openapi("UpdateNotificationPreferencesDto")

mountRoutes(usersRouter, "/users", [
  route({
    method: "get",
    path: "/me/profile",
    tag: TAG,
    summary: "Full profile: user, tier, salary account, income, preferences, onboarding",
    handler: ({ userId }) => users.getProfile(userId),
  }),
  route({
    method: "patch",
    path: "/me",
    tag: TAG,
    summary: "Update personal details (names lock after KYC)",
    body: updateMeSchema,
    errors: { 409: "NAMES_LOCKED" },
    handler: ({ userId, body }) => users.updateMe(userId, body),
  }),
  route({
    method: "get",
    path: "/me/notification-preferences",
    tag: TAG,
    summary: "Notification preferences per channel and topic",
    handler: ({ userId }) => users.getNotificationPreferences(userId),
  }),
  route({
    method: "put",
    path: "/me/notification-preferences",
    tag: TAG,
    summary: "Partially update notification preferences",
    description:
      'Send only what changed, e.g. `{ "push": { "splitCompleted": false } }`.',
    body: preferencesSchema,
    handler: ({ userId, body }) =>
      users.updateNotificationPreferences(
        userId,
        body as Parameters<typeof users.updateNotificationPreferences>[1]
      ),
  }),
  route({
    method: "put",
    path: "/me/profile-image",
    tag: TAG,
    summary: "Upload a profile photo (PNG/JPG/WebP, max 5MB)",
    multipart: { image: { type: "file" } },
    errors: {
      413: "FILE_TOO_LARGE",
      415: "UNSUPPORTED_FILE_TYPE",
      503: "STORAGE_DISABLED",
    },
    middleware: [imageUpload.single("image")],
    handler: ({ userId, req }) =>
      users.uploadProfileImage(userId, requireFile(req.file, "image")),
  }),
  route({
    method: "delete",
    path: "/me/profile-image",
    tag: TAG,
    summary: "Remove the profile photo",
    handler: ({ userId }) => users.removeProfileImage(userId),
  }),
])
