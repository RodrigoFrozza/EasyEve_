# EasyEve Dockerfile - Next.js application
FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN rm -rf node_modules package-lock.json && npm install

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["npm", "start"]
