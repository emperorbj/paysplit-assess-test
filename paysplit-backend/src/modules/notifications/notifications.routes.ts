import { Router } from "express"
import { z } from "zod"

import { mountRoutes, route } from "../../lib/http.js"
import { pageQuerySchema, queryBoolean } from "../../lib/pagination.js"
import { listNotifications, markAllRead, markRead } from "./notifications.service.js"

const TAG = "Notifications"

export const notificationsRouter = Router()

mountRoutes(notificationsRouter, "/notifications", [
  route({
    method: "get",
    path: "/",
    tag: TAG,
    summary: "List in-app notifications (newest first) with the unread count",
    query: pageQuerySchema.extend({ unreadOnly: queryBoolean.optional() }),
    handler: ({ userId, query }) => listNotifications(userId, query),
  }),
  route({
    method: "post",
    path: "/read-all",
    tag: TAG,
    summary: "Mark every notification as read",
    handler: ({ userId }) => markAllRead(userId),
  }),
  route({
    method: "post",
    path: "/:id/read",
    tag: TAG,
    summary: "Mark one notification as read",
    params: z.object({ id: z.uuid() }),
    errors: { 404: "NOTIFICATION_NOT_FOUND" },
    handler: ({ userId, params }) => markRead(userId, params.id),
  }),
])
