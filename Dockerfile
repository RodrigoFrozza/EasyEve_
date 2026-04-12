FROM node:20-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Global build optimizations for low-resource VPS (1 Core / 4GB RAM)
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV npm_config_jobs=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOME=/root

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Using npm ci with memory-saving flags
RUN npm ci --legacy-peer-deps --no-audit --no-fund --prefer-offline && \
    npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client and Build Next.js
# Note: Global NODE_OPTIONS and NEXT_TELEMETRY_DISABLED set in base stage
ENV NODE_ENV=production
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1

# Generate prisma client and perform build in one layer to save space
# Generate prisma client and perform build in separate steps to reduce peak RAM usage
RUN npm run db:generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80
ENV HOSTNAME="0.0.0.0"
ENV HOME=/home/nextjs
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs -m -d /home/nextjs -s /bin/bash nextjs

# Set correct permissions proactively during COPY
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 80

# Final command to run the app
# Use node binary for prisma to avoid npx downloading it
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node server.js"]
