# --- deps: install dependencies with a locked, reproducible install ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Retry config hardens the install against transient registry network resets.
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci

# --- builder: build the production bundle ---
# API_URL is read at build time for the static prerender of / and /underwriter.
# Those pages tolerate a fetch failure with a fallback UI, so the backend does
# not need to be reachable during `docker compose build`.
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV API_URL=http://backend:8000
RUN npm run build

# --- runner: minimal runtime image ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

# Read again at runtime for SSR fetches issued on each request.
ENV API_URL=http://backend:8000
EXPOSE 3000

CMD ["npm", "start"]
