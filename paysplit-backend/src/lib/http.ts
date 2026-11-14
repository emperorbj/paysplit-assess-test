import type { Request, RequestHandler, Response, Router } from "express"
import type { ResponseConfig, RouteConfig } from "@asteasolutions/zod-to-openapi"
import type { z } from "zod"

import { authenticate } from "../middleware/auth.js"
import { ErrorSchema, bearerAuth, registry } from "./openapi.js"
import { parse } from "./validation.js"

type Method = "get" | "post" | "put" | "patch" | "delete"
type AnySchema = z.ZodType

export type HandlerContext<B, Q, P> = {
  req: Request
  res: Response
  body: B
  query: Q
  params: P
  /** Set on authenticated routes. */
  userId: string
}

type Infer<S> = S extends AnySchema ? z.output<S> : undefined

export type RouteDefinition<
  B extends AnySchema | undefined = undefined,
  Q extends AnySchema | undefined = undefined,
  P extends AnySchema | undefined = undefined,
> = {
  method: Method
  /** Express-style path relative to the router, e.g. "/wallets/:id". */
  path: string
  tag: string
  summary: string
  description?: string
  /** Defaults to true. */
  auth?: boolean
  body?: B
  query?: Q
  params?: P
  /** Documents a multipart/form-data body (validated by the handler itself). */
  multipart?: Record<
    string,
    { type: "file" | "string"; required?: boolean; enum?: string[] }
  >
  /** Success status, default 200. */
  status?: number
  /** Response body schema for the docs (optional). */
  response?: AnySchema
  /** Extra documented error responses, e.g. { 409: "DESTINATION_HAS_RULE" }. */
  errors?: Record<number, string>
  /** Middleware that runs after auth and before validation (rate limits, uploads). */
  middleware?: RequestHandler[]
  /** Return the JSON body. Return `undefined` if the handler already responded. */
  handler: (
    ctx: HandlerContext<Infer<B>, Infer<Q>, Infer<P>>
  ) => Promise<unknown> | unknown
}

/** A route with its schema types erased, so routes of different shapes fit in one list. */
export type AnyRoute = RouteDefinition<
  AnySchema | undefined,
  AnySchema | undefined,
  AnySchema | undefined
>

/** Type-checks the handler against its own schemas, then erases the types. */
export function route<
  B extends AnySchema | undefined = undefined,
  Q extends AnySchema | undefined = undefined,
  P extends AnySchema | undefined = undefined,
>(definition: RouteDefinition<B, Q, P>): AnyRoute {
  return definition as unknown as AnyRoute
}

const toOpenApiPath = (path: string) => path.replace(/:(\w+)/g, "{$1}")

function document(prefix: string, def: AnyRoute) {
  const auth = def.auth ?? true
  const status = def.status ?? 200
  const responses: Record<string, ResponseConfig> = {
    [status]: {
      description: "Success",
      ...(def.response
        ? { content: { "application/json": { schema: def.response } } }
        : {}),
    },
  }
  const errorResponse = (description: string): ResponseConfig => ({
    description,
    content: { "application/json": { schema: ErrorSchema } },
  })
  if (def.body || def.query || def.params || def.multipart)
    responses[400] = errorResponse("Validation failed (VALIDATION_ERROR)")
  if (auth) responses[401] = errorResponse("Missing, invalid or revoked token")
  for (const [code, description] of Object.entries(def.errors ?? {}))
    responses[code] = errorResponse(description)

  const request: RouteConfig["request"] = {}
  if (def.params) request.params = def.params as never
  if (def.query) request.query = def.query as never
  if (def.body)
    request.body = {
      content: { "application/json": { schema: def.body } },
      required: true,
    }
  if (def.multipart) {
    const properties: Record<string, unknown> = {}
    const required: string[] = []
    for (const [name, field] of Object.entries(def.multipart)) {
      properties[name] =
        field.type === "file"
          ? { type: "string", format: "binary" }
          : { type: "string", ...(field.enum ? { enum: field.enum } : {}) }
      if (field.required !== false) required.push(name)
    }
    request.body = {
      required: true,
      content: {
        "multipart/form-data": {
          schema: { type: "object", properties, required } as never,
        },
      },
    }
  }

  registry.registerPath({
    method: def.method,
    path: toOpenApiPath(prefix + def.path).replace(/(.)\/$/, "$1"),
    tags: [def.tag],
    summary: def.summary,
    ...(def.description ? { description: def.description } : {}),
    ...(auth ? { security: [{ [bearerAuth.name]: [] }] } : {}),
    request,
    responses,
  })
}

/**
 * Mounts route definitions on a router and documents them. Each handler gets
 * validated `body`, `query` and `params`; whatever it returns is sent as JSON.
 * Express 5 forwards rejected promises to the error handler.
 */
export function mountRoutes(router: Router, docsPrefix: string, definitions: AnyRoute[]) {
  for (const def of definitions) {
    document(docsPrefix, def)

    const handler: RequestHandler = async (req, res) => {
      const ctx = {
        req,
        res,
        body: def.body ? parse(def.body, req.body ?? {}) : undefined,
        query: def.query ? parse(def.query, req.query) : undefined,
        params: def.params ? parse(def.params, req.params) : undefined,
        userId: req.auth?.userId ?? "",
      }
      const result = await def.handler(ctx as never)
      if (res.headersSent) return
      if (result === undefined) {
        res.status(def.status ?? 204).end()
        return
      }
      res.status(def.status ?? 200).json(result)
    }

    const chain: RequestHandler[] = [
      ...((def.auth ?? true) ? [authenticate] : []),
      ...(def.middleware ?? []),
      handler,
    ]
    router[def.method](def.path, ...chain)
  }
}
