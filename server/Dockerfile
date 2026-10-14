# Multi-stage Dockerfile for KisanSetu Backend Server
# Optimized for Google Cloud Run (sub-second cold start, minimal footprint)

# ----------------------------------------------------
# Stage 1: Build & Compile TypeScript
# ----------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/

RUN npm run build

# ----------------------------------------------------
# Stage 2: Production Runner
# ----------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist/db/migrations ./dist/db/migrations
COPY --from=builder /app/dist/db/seeds ./dist/db/seeds

# Create data directory for local SQLite fallback
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
