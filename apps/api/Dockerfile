FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=development

COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/

RUN yarn install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["yarn", "workspace", "@vdr/api", "dev"]