'use strict';
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('./database');
const { publishEvent } = require('./kafka/producer');

// ─── Chargement du proto ──────────────────────────────────────
const PROTO_PATH = path.join(__dirname, '../../proto/reservation.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const reservationProto = grpc.loadPackageDefinition(packageDef).reservation;

// ─── Créneaux horaires disponibles (9h-18h, 1h par slot) ─────
const TIME_SLOTS = [
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' },
  { start: '17:00', end: '18:00' }
];

// ─── Ressources ───────────────────────────────────────────────

function createResource(call, callback) {
  const { name, type, capacity, description } = call.request;

  if (!name || !type) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'Les champs name et type sont obligatoires'
    });
  }

  try {
    const db = getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    db.prepare(
      'INSERT INTO resources (id, name, type, capacity, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, type, capacity || 1, description || '', createdAt);

    callback(null, {
      success: true,
      message: 'Ressource créée',
      resource: { id, name, type, capacity: capacity || 1, description: description || '' }
    });
  } catch (err) {
    console.error('[ReservationService] createResource:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

function listResources(call, callback) {
  try {
    const db = getDatabase();
    const resources = db.prepare('SELECT id, name, type, capacity, description FROM resources').all();
    callback(null, { success: true, resources });
  } catch (err) {
    console.error('[ReservationService] listResources:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

function getAvailableSlots(call, callback) {
  const { resource_id, date } = call.request;

  if (!resource_id || !date) {
    return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'resource_id et date sont obligatoires' });
  }

  try {
    const db = getDatabase();
    // Récupère les créneaux déjà réservés pour ce jour
    const booked = db.prepare(
      "SELECT start_time, end_time FROM reservations WHERE resource_id = ? AND date = ? AND status = 'active'"
    ).all(resource_id, date);

    const bookedTimes = new Set(booked.map(r => `${r.start_time}-${r.end_time}`));

    const slots = TIME_SLOTS.map(slot => ({
      start_time: slot.start,
      end_time:   slot.end,
      available:  !bookedTimes.has(`${slot.start}-${slot.end}`)
    }));

    callback(null, { success: true, slots });
  } catch (err) {
    console.error('[ReservationService] getAvailableSlots:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

// ─── Réservations ─────────────────────────────────────────────

async function createReservation(call, callback) {
  const { user_id, resource_id, date, start_time, end_time, notes } = call.request;

  if (!user_id || !resource_id || !date || !start_time || !end_time) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'user_id, resource_id, date, start_time et end_time sont obligatoires'
    });
  }

  try {
    const db = getDatabase();

    // Vérification de la ressource
    const resource = db.prepare('SELECT id FROM resources WHERE id = ?').get(resource_id);
    if (!resource) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Ressource introuvable' });
    }

    // Vérification de disponibilité
    const conflict = db.prepare(`
      SELECT id FROM reservations
      WHERE resource_id = ? AND date = ? AND status = 'active'
        AND start_time < ? AND end_time > ?
    `).get(resource_id, date, end_time, start_time);

    if (conflict) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: 'Ce créneau est déjà réservé pour cette ressource'
      });
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO reservations (id, user_id, resource_id, date, start_time, end_time, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(id, user_id, resource_id, date, start_time, end_time, notes || '', createdAt);

    const reservation = { id, user_id, resource_id, date, start_time, end_time, status: 'active', notes: notes || '', created_at: createdAt };

    // Événement Kafka → Notification Service
    await publishEvent('reservation-created', { ...reservation, resourceName: resource.name });

    callback(null, { success: true, message: 'Réservation créée avec succès', reservation });
  } catch (err) {
    console.error('[ReservationService] createReservation:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

function getReservation(call, callback) {
  const { id } = call.request;
  try {
    const db = getDatabase();
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);

    if (!reservation) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Réservation introuvable' });
    }
    callback(null, { success: true, message: 'Réservation trouvée', reservation });
  } catch (err) {
    console.error('[ReservationService] getReservation:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

function updateReservation(call, callback) {
  const { id, date, start_time, end_time, notes } = call.request;
  try {
    const db = getDatabase();
    const existing = db.prepare("SELECT * FROM reservations WHERE id = ? AND status = 'active'").get(id);

    if (!existing) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Réservation introuvable ou annulée' });
    }

    const newDate      = date       || existing.date;
    const newStartTime = start_time || existing.start_time;
    const newEndTime   = end_time   || existing.end_time;
    const newNotes     = notes !== undefined ? notes : existing.notes;

    db.prepare(
      'UPDATE reservations SET date = ?, start_time = ?, end_time = ?, notes = ? WHERE id = ?'
    ).run(newDate, newStartTime, newEndTime, newNotes, id);

    const updated = { ...existing, date: newDate, start_time: newStartTime, end_time: newEndTime, notes: newNotes };

    publishEvent('reservation-updated', updated).catch(() => {});

    callback(null, { success: true, message: 'Réservation mise à jour', reservation: updated });
  } catch (err) {
    console.error('[ReservationService] updateReservation:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

async function cancelReservation(call, callback) {
  const { id } = call.request;
  try {
    const db = getDatabase();
    const existing = db.prepare("SELECT * FROM reservations WHERE id = ? AND status = 'active'").get(id);

    if (!existing) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Réservation introuvable ou déjà annulée' });
    }

    db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?").run(id);

    // Événement Kafka → Notification Service
    await publishEvent('reservation-cancelled', { reservationId: id, userId: existing.user_id, date: existing.date });

    callback(null, { success: true, message: 'Réservation annulée' });
  } catch (err) {
    console.error('[ReservationService] cancelReservation:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

function listReservations(call, callback) {
  const { user_id } = call.request;
  try {
    const db = getDatabase();
    let reservations;

    if (user_id) {
      reservations = db.prepare('SELECT * FROM reservations WHERE user_id = ? ORDER BY date, start_time').all(user_id);
    } else {
      reservations = db.prepare('SELECT * FROM reservations ORDER BY date, start_time').all();
    }

    callback(null, { success: true, reservations });
  } catch (err) {
    console.error('[ReservationService] listReservations:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

// ─── Création du serveur gRPC ─────────────────────────────────
function createGrpcServer() {
  const server = new grpc.Server();

  server.addService(reservationProto.ReservationService.service, {
    CreateReservation: createReservation,
    GetReservation:    getReservation,
    UpdateReservation: updateReservation,
    CancelReservation: cancelReservation,
    ListReservations:  listReservations,
    CreateResource:    createResource,
    ListResources:     listResources,
    GetAvailableSlots: getAvailableSlots
  });

  return server;
}

module.exports = { createGrpcServer };
