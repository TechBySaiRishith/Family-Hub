FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
# Alpine doesn't ship a C toolchain; better-sqlite3 / sharp need one to compile
# (or to land prebuilt binaries that expect glibc shims).
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
# pnpm 10+ rejects unapproved build scripts (ERR_PNPM_IGNORED_BUILDS) and the
# onlyBuiltDependencies config has shifted between releases. Skip lifecycle
# scripts on install and rebuild only the native modules we actually need.
RUN pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm rebuild better-sqlite3 sharp tesseract.js esbuild

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/app/data/location-manager.db

RUN mkdir -p /app/data && pnpm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/app/data/location-manager.db

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

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
