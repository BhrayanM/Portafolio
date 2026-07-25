require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const amqp = require('amqplib');
const { Pool } = require('pg');
const { logger } = require('./utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.POSTGRES_USER || 'n8n',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'n8n',
});

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:rabbitpass@rabbitmq:5672';
const QUEUE = 'lead_processing';

async function processLead(lead) {
  logger.info('Worker processing lead', { email: lead.email, source: lead.source });

  await pool.query(
    `INSERT INTO lead_log (email, name, source, status, ai_score)
     VALUES ($1, $2, $3, 'processed', $4)`,
    [lead.email, lead.name || '', lead.source || 'api', null]
  );

  logger.info('Worker lead processed', { email: lead.email });
}

async function start() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertQueue(QUEUE, { durable: true });
    channel.prefetch(1);

    logger.info('Worker started', { queue: QUEUE });

    channel.consume(QUEUE, async (msg) => {
      if (msg === null) return;

      try {
        const lead = JSON.parse(msg.content.toString());
        await processLead(lead);
        channel.ack(msg);
      } catch (error) {
        logger.error('Worker error processing message', { error: error.message });
        channel.nack(msg, false, false);
      }
    });

    process.on('SIGINT', async () => {
      await channel.close();
      await conn.close();
      await pool.end();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Worker failed to start', { error: error.message });
    process.exit(1);
  }
}

start();
