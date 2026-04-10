FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# We need devDependencies to build (Next.js, Prisma CLI)
RUN npm install --legacy-peer-deps && \
    npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client (only once)
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run db:generate

# Build Next.js with memory limits for KVM1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone output optimizes memory and size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Setup shared permissions
RUN mkdir -p /app/.next && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 80

CMD ["node", "server.js"]
