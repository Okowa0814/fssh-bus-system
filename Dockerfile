FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY schema.prisma ./schema.prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npm install

# Build Environment
FROM base AS builder
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN
ENV NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=$NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Preview Environment：建置後的產物直接啟動（next build + next start），沒有即時編譯，
# 用來在本機檢查接近正式環境的速度；改程式後需重新 build
FROM builder AS preview
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npx next start"]

# Sync database schema
FROM base AS migrate
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY schema.prisma ./schema.prisma
COPY prisma.config.ts ./prisma.config.ts
CMD ["npx", "prisma", "db", "push"]

# Production Environment
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
