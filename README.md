<div align="center">

# Bhrayan Márquez — AI Automation Developer

**Diseño sistemas de automatización con IA, desde prototipos funcionales hasta sistemas preparados para producción.**
Webhook → IA → CRM → Notificación. Con persistencia real, human-in-the-loop y manejo de errores.

[![n8n](https://img.shields.io/badge/n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)](#stack)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](#stack)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](#stack)
[![OpenAI](https://img.shields.io/badge/LLM_Orchestration-412991?style=for-the-badge&logo=openai&logoColor=white)](#stack)
[![HubSpot](https://img.shields.io/badge/HubSpot-FF7A59?style=for-the-badge&logo=hubspot&logoColor=white)](#stack)
[![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white)](#stack)

[![Estado](https://img.shields.io/badge/arquitectura-documentada-2ea44f?style=flat-square)](#los-sistemas)
[![Idiomas](https://img.shields.io/badge/EN%20%2F%20ES-bilingüe-0aa?style=flat-square)](#los-sistemas)
[![Licencia](https://img.shields.io/badge/licencia-All_Rights_Reserved-red?style=flat-square)](./LICENSE)
[![Contacto](https://img.shields.io/badge/contacto-disponible-blue?style=flat-square)](./CONTACT.md)

</div>

---

## Qué encontrarás aquí

Este repositorio documenta **cómo están diseñados** cuatro sistemas de automatización que
construí — no cómo se copian.

> **Nota deliberada sobre el alcance.**
> No vas a encontrar workflows exportados, prompts de producción, umbrales de puntuación ni
> reglas de saneamiento. Eso es el método comercial y no se publica.
> Lo que sí vas a encontrar: **arquitectura, decisiones de ingeniería, trade-offs y
> resultados operativos** — que es exactamente lo que se evalúa al contratar a alguien.

| Si eres… | Ve directo a… |
|---|---|
| **Reclutador / Hiring manager** | [Decisiones de ingeniería](#decisiones-de-ingeniería-que-marcan-la-diferencia) · [Los sistemas](#los-sistemas) |
| **CTO / Lead técnico** | [El patrón reutilizable](./docs/patterns/webhook-ai-crm-notify.md) · [ADRs](./docs/adr/README.md) |
| **Empresa buscando implementación** | [CONTACT.md](./CONTACT.md) |

---

## Los sistemas

### 1. Lead Qualification Engine

Motor de calificación de leads con puntuación por IA, enrutamiento por categoría,
aprobación humana para leads calientes y doble persistencia.

![Lead Qualification Engine — arquitectura](./assets/lead-qualification-architecture.png)

<table>
<tr><td><b>Problema</b></td><td>Leads entrando por múltiples canales sin priorizar; el equipo comercial atendía por orden de llegada, no por valor.</td></tr>
<tr><td><b>Solución</b></td><td>Ingesta autenticada → saneamiento y defensa anti-inyección → puntuación IA (score + Hot/Warm/Cold + categoría) → enrutamiento → gate de aprobación humana en Slack para Hot → persistencia doble → upsert en CRM → seguimiento programado.</td></tr>
<tr><td><b>Lo difícil</b></td><td>Que un lead nunca se pierda ni se duplique, aunque el contenedor se reinicie a mitad de ejecución.</td></tr>
</table>

[![Ver arquitectura completa](https://img.shields.io/badge/📄_Ver_arquitectura_completa-1f6feb?style=for-the-badge)](./projects/lead-qualification/README.md)

`n8n` `Docker` `PostgreSQL` `Google Sheets` `HubSpot` `Slack` `LLM`

---

### 2. WhatsApp Conversational Agent

Agente conversacional con memoria, herramientas y escalado a humano sobre WhatsApp.

![WhatsApp Agent — arquitectura](./assets/whatsapp-agent-architecture.png)

<table>
<tr><td><b>Problema</b></td><td>Volumen de consultas por WhatsApp fuera de horario; respuestas tardías = leads perdidos.</td></tr>
<tr><td><b>Solución</b></td><td>Webhook entrante con <b>ACK inmediato</b>, deduplicación por message ID, agente IA con memoria conversacional y un conjunto acotado de herramientas (calificar, consultar CRM, escalar a humano).</td></tr>
<tr><td><b>Lo difícil</b></td><td>Los proveedores de mensajería reintentan si tardas en responder. Sin ACK rápido + dedup, el cliente recibe la misma respuesta tres veces.</td></tr>
</table>

[![Ver arquitectura completa](https://img.shields.io/badge/📄_Ver_arquitectura_completa-1f6feb?style=for-the-badge)](./projects/whatsapp-agent/README.md)

`n8n` `Docker` `WhatsApp Business API` `Twilio` `LLM + Memory + Tools` `CRM`

---

### 3. Appointment Automation

Automatización post-cita: sincronización con CRM, registro auditable y notificación.

<table>
<tr><td><b>Problema</b></td><td>Lo que pasaba después de una cita vivía en la cabeza de alguien: sin registro, sin seguimiento, sin trazabilidad.</td></tr>
<tr><td><b>Solución</b></td><td>Flujo disparado al cerrar la cita → normalización del resultado → <b>upsert</b> en CRM (nunca duplica contactos) → registro persistente → notificación al canal del equipo.</td></tr>
<tr><td><b>Lo difícil</b></td><td>Idempotencia: el mismo evento puede llegar dos veces y el CRM debe quedar igual.</td></tr>
</table>

[![Ver arquitectura completa](https://img.shields.io/badge/📄_Ver_arquitectura_completa-1f6feb?style=for-the-badge)](./projects/appointment-automation/README.md)

`n8n` `CRM (upsert)` `PostgreSQL` `Notificaciones`

---

### 4. Bilingual Voice Receptionist (EN/ES)

Diseño de recepcionista de voz bilingüe que detecta idioma, entiende intención y gestiona el calendario.

![Voice Receptionist — arquitectura](./assets/voice-receptionist-architecture.png)

<table>
<tr><td><b>Problema</b></td><td>Llamadas perdidas fuera de horario y una base de clientes mixta EN/ES atendida solo en un idioma.</td></tr>
<tr><td><b>Solución</b></td><td>Webhook de voz → detección de idioma → validación y reglas de intención → router de herramientas → motor de calendario (disponibilidad, crear, buscar, cancelar, reagendar) con escalado a humano.</td></tr>
<tr><td><b>Lo difícil</b></td><td>La voz no perdona latencia. Cada herramienta debe responder dentro del presupuesto de tiempo de la llamada o la conversación se rompe.</td></tr>
</table>

[![Ver arquitectura completa](https://img.shields.io/badge/📄_Ver_arquitectura_completa-1f6feb?style=for-the-badge)](./projects/voice-receptionist/README.md)

`n8n` `Voice AI` `Calendar API` `Shopify` `WhatsApp` `CRM`

---

## El patrón reutilizable

Los cuatro sistemas son la misma columna vertebral con distinta piel:

```mermaid
flowchart LR
    A["Canal de entrada<br/><i>form · WhatsApp · voz · evento</i>"] --> B["Borde autenticado<br/><i>API key · rate limit</i>"]
    B --> C["Saneamiento<br/>+ normalización"]
    C --> D["Capa de decisión IA<br/><i>score · intención · categoría</i>"]
    D --> E{"¿Necesita<br/>criterio humano?"}
    E -- Sí --> F["Human-in-the-loop<br/><i>aprobar / rechazar</i>"]
    E -- No --> G["Sistemas de registro<br/><i>CRM + base de datos</i>"]
    F --> G
    G --> H["Notificación<br/>al equipo"]
    G --> I["Seguimiento<br/>programado"]

    J["Error Workflow global"] -.captura fallos de<br/>cualquier etapa.-> K[("Tabla de errores<br/>en PostgreSQL")]

    style D fill:#412991,color:#fff
    style F fill:#EA4B71,color:#fff
    style G fill:#4169E1,color:#fff
    style J fill:#8b1a1a,color:#fff
    style K fill:#8b1a1a,color:#fff
```

**Por qué importa:** cuando un cliente nuevo llega con un caso distinto, no empiezo de cero.
Cambia el canal y las herramientas; el esqueleto de fiabilidad ya está probado.

📄 **[Documentación del patrón →](./docs/patterns/webhook-ai-crm-notify.md)**

---

## Decisiones de ingeniería que marcan la diferencia

Esto es lo que separa una automatización funcional de una diseñada para producción:

| Decisión | Qué resuelve |
|---|---|
| 🛡️ **Hardening anti-inyección en la entrada** | El texto que escribe un desconocido llega a un LLM. Se sanea y se acota **antes** de tocar el modelo, para que un lead no pueda reescribir las instrucciones del sistema. |
| 🗄️ **PostgreSQL, no SQLite** | Concurrencia real y durabilidad. SQLite bloquea bajo escrituras simultáneas y no sobrevive bien a un contenedor reiniciado. |
| 🔁 **Deduplicación por identidad de negocio** | Email en leads, message ID en mensajería. El mismo evento puede llegar dos veces; el sistema de registro no puede notarlo. |
| ✋ **Human-in-the-loop en lo que importa** | La IA prioriza; una persona aprueba los leads calientes. Automatizar el juicio comercial es donde se pierde dinero. |
| 🚨 **Error Workflow global con persistencia** | Todo fallo queda escrito en una tabla de errores con contexto. Nada se pierde en un log volátil que se borra al reiniciar. |
| ♻️ **Resiliencia a reinicios** | Contenedores con políticas de reinicio y estado fuera del contenedor. Reiniciar no debe costar datos. |
| 🔗 **Red permanente prod ↔ PostgreSQL** | Red Docker dedicada y estable en vez de IPs efímeras. Elimina toda una clase de fallos intermitentes de conexión. |
| ⚡ **Fast-ACK en canales que reintentan** | Se confirma la recepción primero y se procesa después. Sin esto, la mensajería duplica respuestas al usuario. |
| 📝 **ADRs + rollback documentado** | Cada decisión estructural queda escrita con su alternativa descartada. Volver atrás es un procedimiento, no una improvisación. |

📄 **[Registro de decisiones (ADRs) →](./docs/adr/README.md)**

---

## Stack

**Orquestación** · n8n autoalojado sobre Docker
**Datos** · PostgreSQL (sistema de registro) · Google Sheets (capa operativa para negocio)
**IA** · Orquestación de LLM, agentes con memoria y herramientas, salida estructurada
**CRM** · HubSpot (upsert idempotente)
**Canales** · WhatsApp Business API · Twilio · Voice AI · Webhooks HTTP · Slack
**Comercio** · Shopify (consulta de pedidos)
**Operación** · Docker Compose · redes Docker dedicadas · variables de entorno · workflows de error · versionado con ADRs

---

## Seguridad y alcance de este repositorio

Este repositorio se construyó con una regla de oro: **publicar valor, no receta.**

✅ **Sí contiene:** arquitectura, diagramas conceptuales, decisiones, trade-offs, resultados,
fragmentos ilustrativos genéricos.

❌ **No contiene ni contendrá:** workflows n8n exportados, prompts de producción, umbrales de
puntuación, ventanas de deduplicación, reglas de saneamiento, credenciales, URLs de webhook,
IDs de hojas/canales/instancias, cadenas de conexión ni datos de clientes.

📄 Ver [SECURITY.md](./SECURITY.md) · [LICENSE](./LICENSE)

---

<div align="center">

## ¿Necesitas uno de estos sistemas en tu empresa?

**[bhrayan.automation@gmail.com](mailto:bhrayan.automation@gmail.com)**

[![Contacto](https://img.shields.io/badge/Ver_vías_de_contacto-CONTACT.md-1f6feb?style=for-the-badge)](./CONTACT.md)

<sub>© 2026 Bhrayan Márquez · Todos los derechos reservados · Portafolio técnico, no software de código abierto</sub>

</div>

---

## La plataforma — AI Lead Automation Platform

Además de la documentación de arriba, este repositorio **contiene el código** de una plataforma
SaaS multi-tenant de captación y calificación de leads. Las capacidades descritas
han sido verificadas mediante ejecución local y pruebas automatizadas donde aplica.

### Arquitectura

```
Formulario · WhatsApp · Voz · API
        │
   NGINX  — TLS 1.2/1.3 · HSTS · rate limit 10 r/s · cabeceras de seguridad
        ├──────────────► Next.js 14  (dashboard, 12 rutas)
        └──────────────► Express      (API REST, 9 grupos de recursos)
                              │
                              ├── n8n  — workflows de automatización
                              │        └── LLM → HubSpot → Slack
                              └── PostgreSQL 15
                                     multi-tenant · RLS con FORCE · 16 migraciones
```

| Capa | Tecnología | Estado |
|---|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript estricto, Tailwind | 12 rutas, build en verde |
| **Backend** | Node.js 20, Express 4, API REST | 9 grupos de rutas, OpenAPI en `/api-docs` |
| **Base de datos** | PostgreSQL 15, multi-tenant | 16 migraciones + 2 seeds, **RLS activo con FORCE** |
| **Automatización** | n8n 2.31.6 autoalojado | 3 workflows de ejemplo, importados y ejecutados |
| **IA** | Orquestación de LLM vía HTTP | scoring con salida estructurada y router determinista |
| **CRM** | HubSpot | upsert idempotente |
| **Notificaciones** | Slack | webhook entrante |
| **Pagos** | Stripe | checkout + webhook con verificación de firma |
| **Infraestructura** | Docker Compose, NGINX | imágenes pineadas a patch exacto |
| **Testing** | Jest + Supertest | **98 tests**, CI con lint + typecheck + build + barrido de secretos |

### Seguridad

- **Sesión en cookie HttpOnly + Secure + SameSite** — el JWT no es accesible desde JavaScript.
- **Aislamiento multi-tenant impuesto por el motor.** `FORCE ROW LEVEL SECURITY` en las seis
  tablas multi-tenant y conexión con un rol sin privilegios de propietario. Sin contexto de
  tenant, una consulta devuelve cero filas; un `INSERT` con `tenant_id` ajeno se rechaza.
- **Arranque en fallo rápido** — en producción el proceso aborta si falta `JWT_SECRET`,
  `CORS_ORIGINS`, `POSTGRES_PASSWORD` o `STRIPE_WEBHOOK_SECRET`. No hay secretos por defecto.
- **Validación de entrada con Joi** en todas las rutas que escriben.
- Rate limit por IP, CORS con lista blanca, Helmet, y auditoría por triggers en base de datos.

### Requisitos

- Docker & Docker Compose v2+ · Node.js 20 LTS (para desarrollo local) · Git

### Inicio rápido — solo la infraestructura de automatización

```bash
git clone <este-repositorio> && cd Portafolio
cp .env.example .env      # editar; nunca se commitea

docker compose up -d      # n8n + PostgreSQL
# n8n → http://localhost:5678
```

| Servicio | Puerto | Imagen | Persistencia |
|---|---|---|---|
| n8n | 5678 | `n8nio/n8n:2.31.6` | volumen `n8n_data` |
| PostgreSQL | 5432 | `postgres:15.18-alpine` | volumen `postgres_data` |

### Inicio rápido — la plataforma completa

```bash
# 1. Esquema y datos iniciales
for f in database/migrations/*.sql database/seeds/*.sql; do
  docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 -f - < "$f" || { echo "fallo en $f"; break; }
done

# 2. Rol de aplicación — sin esto RLS no aísla nada (ver database/migrations/016)
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "ALTER ROLE app LOGIN PASSWORD '<generada>';"
# y en .env:  DB_USER=app  ·  DB_PASSWORD=<la misma>

# 3. Backend y dashboard
cd backend  && npm ci && npm run dev     # API   → http://localhost:3000
cd frontend && npm ci && npm run dev     # Panel → http://localhost:3001
```

> El `cat migrations/*.sql | psql` de toda la vida **no** sirve aquí: sin `ON_ERROR_STOP=1` un
> fallo no detiene el flujo y el operador ve un código de salida 0. El bucle de arriba comprueba
> cada fichero.

### Verificación

```bash
cd backend  && npm run lint && npm test        # 98 tests
cd frontend && npx tsc --noEmit && npm run build
docker compose -f docker-compose.prod.yml build
```

### Respaldo

```bash
./scripts/backup.sh
```

---

## Roadmap

Declarado aquí, y **no** presentado como implementado en ninguna otra parte del repositorio:

| Elemento | Estado real |
|---|---|
| Redis (caché / rate-limit distribuido) | `cache.service.js` existe; sin consumidor ni servicio en compose |
| RabbitMQ (procesamiento asíncrono) | configuración declarada; sin servicio ni productor |
| Google Sheets · Shopify | integraciones del sistema de producción; sin código en este repositorio |
| API keys con hash en reposo | hoy se almacenan en claro en `tenants.api_keys` |
| Firma HMAC en los webhooks de WhatsApp y Twilio | pendiente; hoy solo el handshake de verificación |
| Observabilidad (Prometheus · Grafana · Loki) | configuración en `monitoring/`; targets sin revalidar |
| Tests de frontend | ninguno |
| Tabla de control de migraciones | las migraciones son idempotentes, pero nada registra cuáles se aplicaron |

</div>
