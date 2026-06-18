'use strict';
/**
 * Base de données NoSQL avec RxDB (moteur LokiJS).
 * RxDB fournit un schéma typé, des requêtes réactives et une interface unifiée
 * sur différents backends de stockage.
 */
const { createRxDatabase, addRxPlugin } = require('rxdb');
const { getRxStorageLoki }               = require('rxdb/plugins/storage-lokijs');
const path  = require('path');
const fs    = require('fs');

// ─── Schéma RxDB pour la collection "notifications" ──────────
const notificationSchema = {
  title:      'notification',
  version:    0,
  primaryKey: 'id',
  type:       'object',
  properties: {
    id:        { type: 'string', maxLength: 36 },
    userId:    { type: 'string' },
    type:      { type: 'string' },   // "welcome" | "reservation_created" | …
    message:   { type: 'string' },
    isRead:    { type: 'boolean' },
    createdAt: { type: 'string' }
  },
  required: ['id', 'userId', 'type', 'message', 'isRead', 'createdAt'],
  indexes:  ['userId', 'isRead']
};

let _db = null;

/**
 * Initialise (ou retourne) l'instance singleton de RxDB.
 * Stockage : LokiJS (fichier JSON persistant sur disque).
 */
async function getDatabase() {
  if (_db) return _db;

  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dbName = path.join(dataDir, 'notifications');

  // Stockage LokiJS – fichier [dbName].db sauvegardé toutes les 5 s
  const storage = getRxStorageLoki({
    autosave:         true,
    autosaveInterval: 5000
  });

  _db = await createRxDatabase({
    name:            dbName,
    storage,
    ignoreDuplicate: true
  });

  await _db.addCollections({
    notifications: { schema: notificationSchema }
  });

  console.log('[NotificationService] ✅ RxDB (LokiJS/NoSQL) initialisé :', dbName);
  return _db;
}

/**
 * Crée une notification dans RxDB.
 */
async function insertNotification(doc) {
  const db = await getDatabase();
  return db.notifications.insert(doc);
}

/**
 * Retourne toutes les notifications d'un utilisateur.
 */
async function findByUserId(userId) {
  const db = await getDatabase();
  return db.notifications.find({
    selector: { userId: { $eq: userId } }
  }).exec();
}

/**
 * Marque une notification comme lue.
 */
async function markAsRead(id) {
  const db = await getDatabase();
  const doc = await db.notifications.findOne(id).exec();
  if (!doc) return null;
  return doc.patch({ isRead: true });
}

/**
 * Retourne une notification par son id.
 */
async function findById(id) {
  const db = await getDatabase();
  return db.notifications.findOne(id).exec();
}

module.exports = { getDatabase, insertNotification, findByUserId, markAsRead, findById };
