FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo

# Copy monorepo files
FROM base AS builder
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/

# Install all deps
RUN npm ci

# Copy source
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY tsconfig.base.json ./

# Generate Prisma client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build
RUN npm run build --filter=api

# Production image
FROM node:20-alpine AS runner
RUN apk add --no-cache curl
WORKDIR /app

ENV NODE_ENV production

# Copy built output
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
