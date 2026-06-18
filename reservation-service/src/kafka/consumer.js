'use strict';
/**
 * Consumer Kafka du Reservation Service.
 * Topic écouté : (aucun pour l'instant – placeholder pour extension future)
 * Ce service est PRODUCTEUR sur reservation-* et pourrait, par exemple,
 * consommer des événements "user-deleted" pour annuler ses réservations.
 */
const { Kafka, logLevel } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'reservation-service-consumer',
  brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')],
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 300, retries: 5 }
});

const consumer = kafka.consumer({ groupId: 'reservation-group' });
let started = false;

async function startConsumer(handlers = {}) {
  try {
    await consumer.connect();

    // Exemple : écouter les suppressions d'utilisateur
    if (handlers['user-deleted']) {
      await consumer.subscribe({ topic: 'user-deleted', fromBeginning: false });
    }

    if (!Object.keys(handlers).length) {
      console.log('[ReservationService] Aucun topic à consommer – consumer en attente');
      return;
    }

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          console.log(`[ReservationService] 📥 Message reçu ← ${topic}`, payload);
          if (handlers[topic]) await handlers[topic](payload);
        } catch (err) {
          console.error('[ReservationService] Erreur traitement message :', err.message);
        }
      }
    });

    started = true;
    console.log('[ReservationService] ✅ Kafka consumer démarré');
  } catch (err) {
    console.warn('[ReservationService] ⚠️  Kafka consumer indisponible :', err.message);
  }
}

async function stopConsumer() {
  if (started) { await consumer.disconnect(); started = false; }
}

module.exports = { startConsumer, stopConsumer };
