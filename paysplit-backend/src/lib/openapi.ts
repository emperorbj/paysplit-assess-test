import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi"
import { z } from "zod"

extendZodWithOpenApi(z)

/** Every route registers itself here (see lib/http.ts), so docs never drift. */
export const registry = new OpenAPIRegistry()

export const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
})

export const ErrorSchema = registry.register(
  "Error",
  z.object({
    statusCode: z.number().int().openapi({ example: 422 }),
    message: z
      .union([z.string(), z.array(z.string())])
      .openapi({ example: "Your rules would allocate more than your monthly salary" }),
    error: z.string().openapi({ example: "Unprocessable Entity" }),
    code: z.string().optional().openapi({ example: "ALLOCATION_EXCEEDS_SALARY" }),
  })
)

export function buildOpenApiDocument(serverUrl: string) {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "PaySplit API",
      version: "1.0.0",
      description: [
        "Salary splitting into savings wallets.",
        "",
        "- **Money** is always integer **kobo** (₦1 = 100).",
        "- **Auth:** `Authorization: Bearer <accessToken>` from signup/login.",
        "- **Errors:** `{ statusCode, message, error, code? }`; `message` is a string[] for validation errors.",
        "- **Lists:** `{ data, pagination: { total, page, limit, pages } }`.",
        "- **Dates:** filters take `YYYY-MM-DD` in Lagos time (WAT).",
        "- **KYC** runs against the Dojah sandbox: BVN `22222222222`, NIN `70123456789`.",
      ].join("\n"),
    },
    servers: [{ url: serverUrl }],
  })
}
