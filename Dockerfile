FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

ENV NODE_ENV=production
ENV PORT=80
ENV HOSTNAME="0.0.0.0"

EXPOSE 80

CMD ["npm", "start"]
