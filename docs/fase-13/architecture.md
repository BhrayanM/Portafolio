# FASE 13 — Escalabilidad

## Stack

| Componente | Tecnología | Puerto | Función |
|-----------|-----------|--------|---------|
| Cache | Redis 7 | 6379 | Sesiones, rate limit, datos calientes |
| Colas | RabbitMQ 3 | 5672 | Tareas asíncronas |
| Workers | Node.js (worker.js) | — | Procesamiento en background |

## Arquitectura

```
                    ┌──────────┐
                    │  Redis    │
                    │  Cache    │
                    └────┬─────┘
                         │
Request ──► API Server ──► RabbitMQ ──► Workers
                         │
                    ┌──────────┐
                    │ PostgreSQL│
                    └──────────┘
```

## Redis

### Casos de uso

- **Sesiones:** Almacenar sesiones JWT fuera de Node.js
- **Rate limit:** Contadores atómicos por IP/API Key
- **Cache:** Consultas frecuentes (stats, catálogo)
- **Cola temporal:** Datos calientes (últimos 100 leads)

### Configuración docker-compose

```yaml
redis:
  image: redis:7-alpine
  restart: always
  command: redis-server --requirepass ${REDIS_PASSWORD}
  volumes:
    - redis_data:/data
  networks:
    - portafolio-net
```

## RabbitMQ

### Casos de uso

- **Procesamiento de leads:** Clasificación IA en worker (no bloquea API)
- **Exportaciones:** Generar reportes CSV en background
- **Notificaciones:** Enviar emails/Slack sin bloquear respuesta
- **Webhooks salientes:** Llamadas a webhooks externos con reintentos

### Configuración docker-compose

```yaml
rabbitmq:
  image: rabbitmq:3-alpine
  restart: always
  environment:
    RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-admin}
    RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:?error}
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
  networks:
    - portafolio-net
```

## Worker

```javascript
// backend/src/worker.js
const amqp = require('amqplib');

async function start() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();
  await channel.assertQueue('lead_processing', { durable: true });

  channel.consume('lead_processing', async (msg) => {
    const lead = JSON.parse(msg.content.toString());
    console.log(`Processing lead: ${lead.email}`);
    // Clasificar con OpenAI, upsert a DB, notificar
    channel.ack(msg);
  });
}

start();
```

### Dockerfile para worker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm ci --production
COPY src/worker.js ./
CMD ["node", "worker.js"]
```

## docker-compose escalado

```yaml
services:
  api:
    build: ./backend
    deploy:
      replicas: 3
    depends_on:
      - redis
    networks:
      - portafolio-net

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    deploy:
      replicas: 2
    depends_on:
      - rabbitmq
      - redis
    networks:
      - portafolio-net
```

## Variables de Entorno

```bash
# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=changeme

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=changeme
RABBITMQ_URL=amqp://admin:changeme@rabbitmq:5672
```
