# Imagen pineada a patch exacto, no al tag flotante `node:20-alpine`.
# Con el tag flotante, dos builds del mismo commit pueden salir con runtimes
# distintos: el build deja de ser reproducible y una regresion de Node entra sin
# aparecer en ningun diff. Se mantiene la MISMA linea LTS (Node 20) que ya estaba
# en uso: esto fija la resolucion, no cambia de version.
FROM node:20.20.2-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production

FROM node:20.20.2-alpine
WORKDIR /app
RUN apk add --no-cache curl && \
    addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "src/index.js"]
