FROM node:24-slim AS deps

WORKDIR /app

COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN corepack enable \
    && yarn config set registry https://registry.npmjs.org \
    && yarn config set network-concurrency 1 \
    && yarn install --frozen-lockfile --network-timeout 300000

FROM node:24-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock
COPY --from=deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=deps /app/apps/web/package.json ./apps/web/package.json

COPY apps/web ./apps/web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_INTERNAL_URL=http://api:3000

RUN yarn workspace @vdr/web build


FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_INTERNAL_URL=http://api:3000

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3001

CMD ["node", "apps/web/server.js"]
