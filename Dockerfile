# Image de production FOGEKO (Next.js standalone + Prisma), pour Dokploy.
# Données persistantes : volume monté sur /app/uploads (photos). Base : PostgreSQL via DATABASE_URL.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Dépendances (sharp, prisma… compilés pour Alpine)
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# 2. Build Next.js (aucune base de données nécessaire à cette étape)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# 3. Outils de démarrage : migrations + données initiales (communes, textes, premier admin)
FROM base AS tools
WORKDIR /tools
RUN npm init -y >/dev/null \
 && npm i --no-audit --no-fund prisma@7.10.0 @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg@8.23.1 dotenv@18.0.6 tsx@4.23.15
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src/lib/db.ts src/lib/password.ts src/lib/permissions.ts ./src/lib/
COPY scripts/admin.ts ./scripts/
COPY --from=builder /app/src/generated ./src/generated

# 4. Image finale
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=tools --chown=nextjs:nodejs /tools ./tools
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN mkdir -p /app/uploads /app/.next/cache && chown -R nextjs:nodejs /app/uploads /app/.next/cache
USER nextjs
EXPOSE 3000
VOLUME ["/app/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1
CMD ["sh", "/app/docker-entrypoint.sh"]
