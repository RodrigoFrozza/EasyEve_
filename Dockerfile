FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm config set maxsockets 1 && \
    npm ci --no-audit --no-fund --cache /tmp/npm-cache && \
    rm -rf /tmp/npm-cache

COPY . .

# Ensure prisma binary is available for build
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

ENV NODE_ENV=production
ENV PORT=80
ENV HOSTNAME="0.0.0.0"

EXPOSE 80

CMD ["npm", "start"]
