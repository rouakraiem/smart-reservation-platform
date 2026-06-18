'use strict';
/**
 * Consumer Kafka du Notification Service.
 *
 * Topics écoutés :
 *  ┌─────────────────────────┬────────────────────────────────┐
 *  │ Topic                   │ Déclencheur                    │
 *  ├─────────────────────────┼────────────────────────────────┤
 *  │ user-registered         │ Inscription d'un nouvel utilis │
 *  │ reservation-created     │ Nouvelle réservation           │
 *  │ reservation-cancelled   │ Annulation d'une réservation   │
 *  │ reservation-updated     │ Modification d'une réservation │
 *  └─────────────────────────┴────────────────────────────────┘
 */
const { Kafka, logLevel } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
const { insertNotification } = require('../database');

const kafka = new Kafka({
  clientId: 'notification-service-consumer',
  brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')],
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 300, retries: 5 }
});

const consumer = kafka.consumer({ groupId: 'notification-group' });
let started = false;

// ─── Handlers par topic ───────────────────────────────────────
async function handleUserRegistered(payload) {
  await insertNotification({
    id:        uuidv4(),
    userId:    payload.userId,
    type:      'welcome',
    message:   `Bienvenue ${payload.name} ! Votre compte a été créé avec succès.`,
    isRead:    false,
    createdAt: new Date().toISOString()
  });
  console.log('[NotificationService] 🔔 Notification "welcome" créée pour', payload.userId);
}

async function handleReservationCreated(payload) {
  await insertNotification({
    id:        uuidv4(),
    userId:    payload.user_id,
    type:      'reservation_created',
    message:   `Votre réservation du ${payload.date} de ${payload.start_time} à ${payload.end_time} a été confirmée.`,
    isRead:    false,
    createdAt: new Date().toISOString()
  });
  console.log('[NotificationService] 🔔 Notification "reservation_created" créée pour', payload.user_id);
}

async function handleReservationCancelled(payload) {
  await insertNotification({
    id:        uuidv4(),
    userId:    payload.userId,
    type:      'reservation_cancelled',
    message:   `Votre réservation du ${payload.date} a été annulée.`,
    isRead:    false,
    createdAt: new Date().toISOString()
  });
  console.log('[NotificationService] 🔔 Notification "reservation_cancelled" créée pour', payload.userId);
}

async function handleReservationUpdated(payload) {
  await insertNotification({
    id:        uuidv4(),
    userId:    payload.user_id,
    type:      'reservation_updated',
    message:   `Votre réservation a été modifiée : nouveau créneau le ${payload.date} de ${payload.start_time} à ${payload.end_time}.`,
    isRead:    false,
    createdAt: new Date().toISOString()
  });
  console.log('[NotificationService] 🔔 Notification "reservation_updated" créée pour', payload.user_id);
}

const TOPIC_HANDLERS = {
  'user-registered':       handleUserRegistered,
  'reservation-created':   handleReservationCreated,
  'reservation-cancelled': handleReservationCancelled,
  'reservation-updated':   handleReservationUpdated
};

// ─── Démarrage du consumer ────────────────────────────────────
async function startConsumer() {
  try {
    await consumer.connect();

    for (const topic of Object.keys(TOPIC_HANDLERS)) {
      await consumer.subscribe({ topic, fromBeginning: true });
    }

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          console.log(`[NotificationService] 📥 Événement reçu ← ${topic}`);
          const handler = TOPIC_HANDLERS[topic];
          if (handler) await handler(payload);
        } catch (err) {
          console.error('[NotificationService] Erreur traitement message :', err.message);
        }
      }
    });

    started = true;
    console.log('[NotificationService] ✅ Kafka consumer démarré – topics :', Object.keys(TOPIC_HANDLERS).join(', '));
  } catch (err) {
    console.warn('[NotificationService] ⚠️  Kafka indisponible :', err.message);
  }
}

async function stopConsumer() {
  if (started) { await consumer.disconnect(); started = false; }
}

module.exports = { startConsumer, stopConsumer };
