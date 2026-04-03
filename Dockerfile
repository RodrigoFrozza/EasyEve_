# EasyEve Dockerfile - Next.js application
FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN rm -rf node_modules package-lock.json && npm install

COPY . .
RUN npx prisma generate
RUN npm run build

RUN mkdir -p .next/standalone/.next/static && \
    cp -r .next/static/.next .next/standalone/.next/ && \
    cp -r public .next/standalone/

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app/.next/standalone
COPY --from=0 /app/.next/standalone .

EXPOSE 3000

CMD ["node", "server.js"]
