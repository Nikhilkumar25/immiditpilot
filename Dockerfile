# ---------- Base ----------
FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache openssl

# ---------- Install server deps ----------
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci

# ---------- Copy source ----------
WORKDIR /app
COPY server ./server
COPY shared ./shared

# ---------- Build ----------
WORKDIR /app/server
RUN npx prisma generate
RUN npm run build

# ---------- Production Image ----------
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# Copy built server
COPY --from=base /app/server/dist ./dist

# Copy server node_modules
COPY --from=base /app/server/node_modules ./node_modules

# Copy Prisma schema
COPY --from=base /app/server/prisma ./prisma

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/server/src/index.js"]
