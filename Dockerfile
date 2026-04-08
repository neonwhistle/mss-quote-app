# Production image for DigitalOcean App Platform, Droplets, or any Docker host.
# Build: docker build -t mss-quote .
# Run:  docker run -p 3000:3000 mss-quote

FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# Coolify’s healthcheck uses curl; Alpine’s node image has none. Also avoids wget → localhost → ::1
# while Next bound only 0.0.0.0 (connection refused).
RUN apk add --no-cache curl
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
# Override Docker’s HOSTNAME (container id). Use :: so IPv4 + IPv6 localhost healthchecks work.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["/bin/sh", "-c", "exec env HOSTNAME=:: node server.js"]
