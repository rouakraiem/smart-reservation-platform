'use strict';
const { Kafka, logLevel } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'reservation-service-producer',
  brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')],
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 300, retries: 5 }
});

const producer = kafka.producer();
let connected = false;

async function connectProducer() {
  try {
    await producer.connect();
    connected = true;
    console.log('[ReservationService] ✅ Kafka producer connecté');
  } catch (err) {
    console.warn('[ReservationService] ⚠️  Kafka indisponible :', err.message);
  }
}

async function publishEvent(topic, payload) {
  if (!connected) {
    console.warn(`[ReservationService] Kafka non connecté – événement ignoré sur "${topic}"`);
    return;
  }
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }]
    });
    console.log(`[ReservationService] 📤 Événement → ${topic}`, payload);
  } catch (err) {
    console.error('[ReservationService] Erreur publication Kafka :', err.message);
  }
}

async function disconnectProducer() {
  if (connected) { await producer.disconnect(); connected = false; }
}

module.exports = { connectProducer, publishEvent, disconnectProducer };
