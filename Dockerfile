FROM node:22-slim AS base
# Pin pnpm to v9 — v10 introduced strict build-script approval
# (ERR_PNPM_IGNORED_BUILDS) that breaks native modules without ceremony.
# Lockfile is v9.0, matches pnpm@9.
RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS deps
WORKDIR /app
# Build tools as a safety net. better-sqlite3 / sharp normally land as
# prebuilt binaries on linux-arm64-glibc (which node:22-slim provides),
# so most of the time these aren't used — but having them avoids a
# silent failure if a prebuild is missing for some package.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/app/data/location-manager.db

RUN mkdir -p /app/data && pnpm run build

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/app/data/location-manager.db

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Drizzle SQL migrations applied automatically on boot by src/lib/db/index.ts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
