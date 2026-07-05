# Phase 7: Single-Port Infrastructure (Docker Multi-stage)

# Stage 1: Build Frontend
FROM node:20-alpine as frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Final Image
FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm install --prefix backend --production
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 5005
CMD ["node", "backend/server.js"]
