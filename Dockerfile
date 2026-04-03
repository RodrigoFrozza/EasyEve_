# EasyEve Dockerfile - Next.js application
FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm install next@14.1.0

ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

CMD ["node", "node_modules/next/dist/bin/next", "start"]
