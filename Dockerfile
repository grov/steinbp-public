# ── Build ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder
ARG VITE_POCKETBASE_URL
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Serve ─────────────────────────────────────────────────────
FROM nginx:1.31.1-alpine3.23-slim
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
