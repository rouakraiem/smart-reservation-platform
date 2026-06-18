'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/users.db');

let db;

/**
 * Retourne l'instance singleton de la base de données SQLite3.
 * Crée le schéma à la première invocation.
 */
function getDatabase() {
  if (!db) {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);

    // Active les clés étrangères
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    _initSchema(db);
    console.log('[UserService] ✅ SQLite3 initialisé :', DB_PATH);
  }
  return db;
}

function _initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

module.exports = { getDatabase };
