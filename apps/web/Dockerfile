FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=development

COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/

RUN yarn install --frozen-lockfile

COPY . .

EXPOSE 3001

CMD ["yarn", "workspace", "@vdr/web", "dev"]