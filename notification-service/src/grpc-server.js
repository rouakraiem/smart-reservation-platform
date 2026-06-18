'use strict';
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { insertNotification, findByUserId, markAsRead, findById } = require('./database');

// ─── Chargement du proto ──────────────────────────────────────
const PROTO_PATH = path.join(__dirname, '../../proto/notification.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const notifProto = grpc.loadPackageDefinition(packageDef).notification;

// ─── Convertisseur RxDB doc → objet proto ────────────────────
function docToProto(doc) {
  return {
    id:         doc.id,
    user_id:    doc.userId,
    type:       doc.type,
    message:    doc.message,
    is_read:    doc.isRead,
    created_at: doc.createdAt
  };
}

// ─── Implémentation des méthodes gRPC ────────────────────────

async function createNotification(call, callback) {
  const { user_id, type, message } = call.request;

  if (!user_id || !type || !message) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'user_id, type et message sont obligatoires'
    });
  }

  try {
    const doc = await insertNotification({
      id:        uuidv4(),
      userId:    user_id,
      type,
      message,
      isRead:    false,
      createdAt: new Date().toISOString()
    });

    callback(null, {
      success: true,
      message: 'Notification créée',
      notification: docToProto(doc)
    });
  } catch (err) {
    console.error('[NotificationService] createNotification:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

async function getNotifications(call, callback) {
  const { user_id } = call.request;

  if (!user_id) {
    return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'user_id est obligatoire' });
  }

  try {
    const docs = await findByUserId(user_id);
    const notifications = docs.map(docToProto);
    callback(null, { success: true, notifications });
  } catch (err) {
    console.error('[NotificationService] getNotifications:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

async function markNotifAsRead(call, callback) {
  const { id } = call.request;

  try {
    const updated = await markAsRead(id);
    if (!updated) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Notification introuvable' });
    }
    callback(null, { success: true, message: 'Notification marquée comme lue' });
  } catch (err) {
    console.error('[NotificationService] markAsRead:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne' });
  }
}

// ─── Création du serveur gRPC ─────────────────────────────────
function createGrpcServer() {
  const server = new grpc.Server();

  server.addService(notifProto.NotificationService.service, {
    CreateNotification: createNotification,
    GetNotifications:   getNotifications,
    MarkAsRead:         markNotifAsRead
  });

  return server;
}

module.exports = { createGrpcServer };
