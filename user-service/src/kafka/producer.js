'use strict';
const { Kafka, logLevel } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')],
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 300, retries: 5 }
});

const producer = kafka.producer();
let connected = false;

/**
 * Connexion au broker Kafka (appelée au démarrage du service).
 */
async function connectProducer() {
  try {
    await producer.connect();
    connected = true;
    console.log('[UserService] ✅ Kafka producer connecté');
  } catch (err) {
    console.warn('[UserService] ⚠️  Kafka indisponible – les événements seront ignorés :', err.message);
  }
}

/**
 * Publie un événement JSON dans un topic Kafka.
 * @param {string} topic   - Nom du topic
 * @param {object} payload - Données à envoyer
 */
async function publishEvent(topic, payload) {
  if (!connected) {
    console.warn(`[UserService] Kafka non connecté – événement ignoré sur "${topic}"`);
    return;
  }
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }]
    });
    console.log(`[UserService] 📤 Événement publié → ${topic}`, payload);
  } catch (err) {
    console.error('[UserService] Erreur publication Kafka :', err.message);
  }
}

async function disconnectProducer() {
  if (connected) {
    await producer.disconnect();
    connected = false;
  }
}

module.exports = { connectProducer, publishEvent, disconnectProducer };
