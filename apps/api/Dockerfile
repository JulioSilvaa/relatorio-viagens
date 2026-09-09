FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=development

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
	yarn install --frozen-lockfile --cache-folder /usr/local/share/.cache/yarn

COPY . .

RUN yarn prisma generate --schema prisma/schema.prisma

EXPOSE 3000

CMD ["yarn", "workspace", "@vdr/api", "dev"]