# F20 — Ver nota en backend/Dockerfile: patch exacto en lugar del tag flotante
# `node:20-alpine`. Misma linea LTS (Node 20), misma que usa el backend para que
# las dos imagenes no diverjan de runtime.
FROM node:20.20.2-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# F22 R-03 — Las variables NEXT_PUBLIC_* se hornean EN TIEMPO DE BUILD.
#
# Sin estos ARG, `npm run build` corria sin ellas y el bundle quedaba con
# `process.env.NEXT_PUBLIC_API_URL` sin valor: `api.ts` resolvia
# `API_BASE = '' `, el navegador pedia rutas relativas (`/auth/login`) contra el
# origen del frontend y recibia 404, porque ahi solo hay paginas de Next.
#
# Es el mismo mecanismo que ya usa el CI del repositorio
# (.github/workflows/ci.yml: `env: NEXT_PUBLIC_API_URL` sobre `npm run build`).
# Aqui se expone como ARG para que docker-compose pueda inyectar el valor que
# corresponda a cada despliegue sin editar este fichero.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_REQUEST_TIMEOUT_MS
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_REQUEST_TIMEOUT_MS=$NEXT_PUBLIC_REQUEST_TIMEOUT_MS

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

# F22 R-10 — Sin esto, Next.js standalone escucha SOLO en la IP del contenedor.
# `server.js` hace `hostname = process.env.HOSTNAME || '0.0.0.0'`, y Docker fija
# HOSTNAME al ID corto del contenedor; Next lo resuelve y acaba enlazando unicamente
# a esa interfaz (verificado: `netstat -ltn` mostraba `172.22.0.3:3001`, y
# 127.0.0.1:3001 daba "Connection refused" desde dentro del propio contenedor).
# El proxy de nginx seguia funcionando —resuelve por nombre de servicio— pero
# ningun HEALTHCHECK por loopback era posible. Se alinea con el backend, que ya
# escucha en 0.0.0.0 via API_HOST.
ENV HOSTNAME=0.0.0.0

# F22 R-10 — El contenedor no tenia healthcheck: un Next colgado o sirviendo 500
# seguia apareciendo como "Up" y `restart: always` no lo reiniciaba nunca.
# `/login` es la ruta publica mas barata que ejerce el render real.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3001/login || exit 1

CMD ["node", "server.js"]
