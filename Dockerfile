FROM node:20 AS deps
WORKDIR /app
COPY package.json .
COPY pnpm-lock.yaml .
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY . /app
RUN pnpm build

FROM build AS app
WORKDIR /app
COPY ./entrypoint.sh /app/entrypoint.sh
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/.next /app/.next
ENTRYPOINT /app/entrypoint.sh
