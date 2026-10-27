# syntax=docker/dockerfile:1

FROM node:26-bookworm-slim AS build
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma
COPY prisma7.config.ts ./
# Lets `prisma generate` load its config. The real URL is provided at runtime.
ENV DATABASE_URL="postgresql://xmigas:xmigas@127.0.0.1:5432/xmigas"
RUN pnpm install --frozen-lockfile

COPY . .
# Public client config, inlined by Vite at build time.
ARG VITE_UMAMI_SCRIPT_URL=""
ARG VITE_UMAMI_WEBSITE_ID=""
RUN pnpm exec prisma generate && pnpm build

FROM node:26-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma7.config.ts ./prisma7.config.ts
COPY --from=build /app/.output ./.output
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
