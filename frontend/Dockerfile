# F20 — Ver nota en backend/Dockerfile: patch exacto en lugar del tag flotante
# `node:20-alpine`. Misma linea LTS (Node 20), misma que usa el backend para que
# las dos imagenes no diverjan de runtime.
FROM node:20.20.2-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20.20.2-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER appuser
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.js"]
