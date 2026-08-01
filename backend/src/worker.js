// ═════════════════════════════════════════════════════════════
//  Worker de procesamiento — Cola de leads
//  Procesa leads de forma asíncrona via RabbitMQ
// ═════════════════════════════════════════════════════════════

require('dotenv').config();
const amqp = require('amqplib');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.POSTGRES_USER || 'n8n',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'n8n',
});

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:changeme@rabbitmq:5672';
const QUEUE = 'lead_processing';

async function processLead(lead) {
  console.log(`[Worker] Processing lead: ${lead.email}`);

  // Simular procesamiento (OpenAI, HubSpot, etc.)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Registrar en DB
  await pool.query(
    `INSERT INTO lead_log (email, name, source, status, ai_score)
     VALUES ($1, $2, $3, 'processed', $4)`,
    [lead.email, lead.name, lead.source || 'api', Math.floor(Math.random() * 100)]
  );

  console.log(`[Worker] Lead processed: ${lead.email}`);
}

async function start() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertQueue(QUEUE, { durable: true });
    channel.prefetch(1);

    console.log(`[Worker] Waiting for messages in ${QUEUE}...`);

    channel.consume(QUEUE, async (msg) => {
      if (msg === null) return;

      try {
        const lead = JSON.parse(msg.content.toString());
        await processLead(lead);
        channel.ack(msg);
      } catch (error) {
        console.error(`[Worker] Error processing message:`, error.message);
        channel.nack(msg, false, false); // Rechazar sin reencolar
      }
    });

    process.on('SIGINT', async () => {
      await channel.close();
      await conn.close();
      await pool.end();
      process.exit(0);
    });
  } catch (error) {
    console.error('[Worker] Failed to start:', error.message);
    process.exit(1);
  }
}

start();
