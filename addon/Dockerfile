# ──────────────────────────────────────────────────────────────
# Home Assistant Addon — Production Dockerfile
# Builds frontend + backend in a single container
# ──────────────────────────────────────────────────────────────

# Stage 1: Build React frontend
FROM node:24-alpine AS frontend-build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Compile TypeScript backend
FROM node:24-alpine AS backend-build
WORKDIR /build
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build

# Stage 3: Lean production runtime
FROM node:24-alpine
LABEL \
  io.hass.name="Pokemon Library" \
  io.hass.description="Personal Pokémon TCG collection catalog with AI identification" \
  io.hass.arch="aarch64|amd64" \
  io.hass.type="addon" \
  io.hass.version="0.1.17"

WORKDIR /app

# Install only production dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled backend and built frontend
COPY --from=backend-build /build/dist ./dist
COPY --from=frontend-build /build/dist ./public

ENV NODE_ENV=production \
    PORT=8099 \
    FRONTEND_DIR=/app/public

EXPOSE 8099

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:8099/api/health || exit 1

CMD ["node", "dist/index.js"]
