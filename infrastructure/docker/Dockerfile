# Shared, multi-stage Dockerfile for every backend app (§4) — parameterized
# by APP_NAME so one file builds all seven instead of near-duplicating it
# per service. Build context is `backend/`.
ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package*.json nest-cli.json tsconfig*.json ./
RUN npm ci
COPY apps ./apps
COPY libs ./libs
ARG APP_NAME
RUN npx nest build ${APP_NAME}

FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
ARG APP_NAME
ENV APP_NAME=${APP_NAME}
COPY --from=build /app/dist/apps/${APP_NAME} ./dist
EXPOSE 3000 4000
CMD ["node", "dist/main.js"]
