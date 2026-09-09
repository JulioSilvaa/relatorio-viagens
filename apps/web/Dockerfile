FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=development

COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
	yarn install --frozen-lockfile --cache-folder /usr/local/share/.cache/yarn

COPY . .

EXPOSE 3001

CMD ["yarn", "workspace", "@vdr/web", "dev"]