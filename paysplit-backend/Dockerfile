# syntax=docker/dockerfile:1

# ── Build: install everything, generate the Prisma client, compile TypeScript ──
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npx prisma generate && npm run build && npm prune --omit=dev

# ── Runtime: compiled JS + production dependencies (incl. the Prisma CLI) ─────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts /app/package.json ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" || exit 1
# Apply pending migrations, then start. Safe to run on every deploy.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
