const config = require('../config');
const { logger } = require('../utils/logger');

class QueueProducer {
  async connect() {
    if (this._channel) return;

    if (!config.rabbitmq.enabled) {
      return;
    }

    try {
      const amqp = require('amqplib');
      this._connection = await amqp.connect(config.rabbitmq.url);
      this._channel = await this._connection.createChannel();
      this._channel.on('error', (err) => logger.error('RabbitMQ channel error', { error: err.message }));
    } catch (error) {
      logger.warn('RabbitMQ no disponible', { error: error.message });
    }
  }

  async publish(queue, message) {
    await this.connect();
    if (!this._channel) return false;

    try {
      await this._channel.assertQueue(queue, { durable: true });
      this._channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
      return true;
    } catch (error) {
      logger.error('Error publicando mensaje', { error: error.message, queue });
      return false;
    }
  }

  async close() {
    if (this._channel) await this._channel.close();
    if (this._connection) await this._connection.close();
  }
}

module.exports = new QueueProducer();
