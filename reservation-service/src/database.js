'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/reservations.db');

let db;

function getDatabase() {
  if (!db) {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    _initSchema(db);
    console.log('[ReservationService] ✅ SQLite3 initialisé :', DB_PATH);
  }
  return db;
}

function _initSchema(db) {
  db.exec(`
    -- Ressources réservables (salles, bureaux, terrains…)
    CREATE TABLE IF NOT EXISTS resources (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL,
      capacity    INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at  TEXT NOT NULL
    );

    -- Réservations
    CREATE TABLE IF NOT EXISTS reservations (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      date        TEXT NOT NULL,   -- YYYY-MM-DD
      start_time  TEXT NOT NULL,   -- HH:mm
      end_time    TEXT NOT NULL,   -- HH:mm
      status      TEXT NOT NULL DEFAULT 'active',
      notes       TEXT,
      created_at  TEXT NOT NULL,
      FOREIGN KEY (resource_id) REFERENCES resources(id)
    );

    CREATE INDEX IF NOT EXISTS idx_res_user     ON reservations(user_id);
    CREATE INDEX IF NOT EXISTS idx_res_resource ON reservations(resource_id, date);
  `);
}

module.exports = { getDatabase };
