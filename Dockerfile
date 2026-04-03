# EasyEve Dockerfile - Next.js application
FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN rm -rf node_modules package-lock.json && npm install

COPY . .
RUN npx prisma generate
RUN npm run build
RUN mkdir -p node_modules/.bin && \
    ln -sf ../next/dist/bin/next node_modules/.bin/next

ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

CMD ["npm", "start"]
