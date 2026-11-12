# PaySplit (frontend) — Next.js standalone image for Cloud Run.
#
# No BuildKit-only syntax: Cloud Build's gcr.io/cloud-builders/docker step uses the classic builder.
#
#   docker build -t paysplit-frontend --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 .
#   docker run --rm -p 8080:8080 paysplit-frontend

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS build

# Pin Yarn explicitly so corepack doesn't fall back to Yarn 1.
ARG YARN_VERSION=4.18.1
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN corepack enable && corepack prepare yarn@${YARN_VERSION} --activate

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

COPY . .

# NEXT_PUBLIC_* is inlined into the client bundle at build time, so it is a build arg, not a Cloud Run env var.
# Optional for now (the app still runs on mock data); once integrations start, make this fail like other projects.
ARG NEXT_PUBLIC_API_BASE_URL=""
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN test -n "$NEXT_PUBLIC_API_BASE_URL" || \
        echo "WARNING: NEXT_PUBLIC_API_BASE_URL is empty (Cloud Build: set _API_BASE_URL on the trigger when the API is ready)." >&2

RUN yarn build


FROM node:${NODE_VERSION} AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 8080

CMD ["node", "server.js"]
