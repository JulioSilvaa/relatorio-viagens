FROM node:24-slim AS deps

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/

RUN corepack enable \
    && yarn install --frozen-lockfile


FROM node:24-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock
COPY --from=deps /app/apps/api/package.json ./apps/api/package.json

COPY apps/api ./apps/api
COPY prisma ./prisma

ENV NODE_ENV=production

RUN yarn prisma generate --schema prisma/schema.prisma
RUN yarn workspace @vdr/api build


FROM node:24-slim AS runner

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

LABEL org.opencontainers.image.source="https://github.com/JulioSilvaa/relatorio-viagens"
LABEL org.opencontainers.image.title="vaiefecha - API"
LABEL org.opencontainers.image.licenses="UNLICENSED"

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "apps/api/dist/server.js"]
