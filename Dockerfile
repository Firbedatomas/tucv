# ===========================================================================
# TuCV - Dockerfile (Next.js standalone)
# Build multi-stage con pnpm. Imagen final chica que corre `node server.js`.
# ===========================================================================

# ---- deps: instala dependencias ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: compila la app ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js "hornea" las variables NEXT_PUBLIC_* en el bundle durante el build,
# no en runtime -> tienen que llegar acá como build-arg, no solo en el .env
# que usa el contenedor `app` en ejecución.
ARG NEXT_PUBLIC_POCKETBASE_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_FEATURE_FILTERS_GENDER_AGE=false
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN=""
ARG NEXT_PUBLIC_PLAUSIBLE_SRC=""
ENV NEXT_PUBLIC_POCKETBASE_URL=${NEXT_PUBLIC_POCKETBASE_URL}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
ENV NEXT_PUBLIC_FEATURE_FILTERS_GENDER_AGE=${NEXT_PUBLIC_FEATURE_FILTERS_GENDER_AGE}
ENV NEXT_PUBLIC_PLAUSIBLE_DOMAIN=${NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
ENV NEXT_PUBLIC_PLAUSIBLE_SRC=${NEXT_PUBLIC_PLAUSIBLE_SRC}
RUN pnpm build

# ---- runner: imagen final ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario no root
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Artefactos del build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
