# Etapa base: imagen oficial de Node.js 20 en Alpine
FROM node:20-alpine AS base 

# Etapa deps: instala dependencias necesarias para compilar dependencias de Node
FROM base AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Etapa builder: compila la app Next.js
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Etapa runner: producción
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
&& adduser --system --uid 1001 nextjs

# Copiar todo el standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
## Ensure su-exec is available to drop privileges at container runtime
RUN apk add --no-cache su-exec

# Copy possible pre-built uploads (if any) but runtime will chown the volume
COPY --from=builder /app/uploads ./uploads

# Create uploads and public/uploads and ensure correct ownership at runtime via entrypoint
RUN mkdir -p /app/uploads /app/public/uploads \
 && chown -R nextjs:nodejs /app/uploads /app/public/uploads || true

# Add an entrypoint that will chown the uploads directory (idempotente) and then exec as nextjs
COPY ./scripts/container-entrypoint.sh /usr/local/bin/container-entrypoint.sh
RUN chmod +x /usr/local/bin/container-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/container-entrypoint.sh"]

EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
