FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Using npm ci for faster, more reliable builds on VPS
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client and Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Skip Prisma postinstall since we generate it manually later
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
# Optimized for stability on low-RAM VPS environments
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Generate prisma client and perform build in one layer to save space
RUN npm run db:generate && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80
ENV HOSTNAME="0.0.0.0"
ENV HOME=/home/nextjs
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs --home /home/nextjs --create-home nextjs

# Set correct permissions proactively during COPY
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 80

# Final command to run the app
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
