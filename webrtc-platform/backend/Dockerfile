FROM node:20-slim AS base
WORKDIR /usr/src/app
COPY package*.json ./

FROM base AS development
# Install required build dependencies
RUN apt-get update && apt-get install -y \
    netcat-openbsd \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
RUN npm install
COPY . .

FROM base AS production
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-slim AS production-run
WORKDIR /usr/src/app
COPY --from=production /usr/src/app/dist ./dist
COPY --from=production /usr/src/app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
