'use strict';
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('./database');
const { publishEvent } = require('./kafka/producer');

// ─── Chargement du proto ──────────────────────────────────────
const PROTO_PATH = path.join(__dirname, '../../proto/user.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const userProto = grpc.loadPackageDefinition(packageDef).user;

// ─── Implémentation des méthodes gRPC ────────────────────────

/** POST /users → CreateUser */
async function createUser(call, callback) {
  const { name, email, password } = call.request;

  if (!name || !email || !password) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'Les champs name, email et password sont obligatoires'
    });
  }

  try {
    const db = getDatabase();
    const id = uuidv4();
    const hashedPwd = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    db.prepare(
      'INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, email, hashedPwd, createdAt);

    // Événement Kafka : user-registered → Notification Service
    await publishEvent('user-registered', { userId: id, name, email, createdAt });

    callback(null, {
      success: true,
      message: 'Utilisateur créé avec succès',
      user: { id, name, email, created_at: createdAt }
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return callback({ code: grpc.status.ALREADY_EXISTS, message: 'Email déjà utilisé' });
    }
    console.error('[UserService] createUser:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne du serveur' });
  }
}

/** GET /users/:id → GetUser */
function getUser(call, callback) {
  const { id } = call.request;
  try {
    const db = getDatabase();
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(id);

    if (!user) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Utilisateur introuvable' });
    }
    callback(null, { success: true, message: 'Utilisateur trouvé', user });
  } catch (err) {
    console.error('[UserService] getUser:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne du serveur' });
  }
}

/** PUT /users/:id → UpdateUser */
function updateUser(call, callback) {
  const { id, name, email } = call.request;
  try {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!existing) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Utilisateur introuvable' });
    }

    const newName  = name  || existing.name;
    const newEmail = email || existing.email;

    db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(newName, newEmail, id);

    callback(null, {
      success: true,
      message: 'Utilisateur mis à jour',
      user: { id, name: newName, email: newEmail, created_at: existing.created_at }
    });
  } catch (err) {
    console.error('[UserService] updateUser:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne du serveur' });
  }
}

/** DELETE /users/:id → DeleteUser */
function deleteUser(call, callback) {
  const { id } = call.request;
  try {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);

    if (result.changes === 0) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Utilisateur introuvable' });
    }

    // Événement Kafka : user-deleted → Reservation Service (pour nettoyage)
    publishEvent('user-deleted', { userId: id }).catch(err => console.error('Kafka error:', err));

    callback(null, { success: true, message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error('[UserService] deleteUser:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne du serveur' });
  }
}

/** GET /users → ListUsers */
function listUsers(call, callback) {
  try {
    const db = getDatabase();
    const users = db.prepare('SELECT id, name, email, created_at FROM users').all();
    callback(null, { success: true, users });
  } catch (err) {
    console.error('[UserService] listUsers:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne du serveur' });
  }
}

/** POST /users/login → LoginUser */
async function loginUser(call, callback) {
  const { email, password } = call.request;
  try {
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Identifiants invalides' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return callback({ code: grpc.status.UNAUTHENTICATED, message: 'Identifiants invalides' });
    }

    callback(null, {
      success: true,
      message: 'Connexion réussie',
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at }
    });
  } catch (err) {
    console.error('[UserService] loginUser:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Erreur interne du serveur' });
  }
}

// ─── Création du serveur gRPC ─────────────────────────────────
function createGrpcServer() {
  const server = new grpc.Server();

  server.addService(userProto.UserService.service, {
    CreateUser: createUser,
    GetUser: getUser,
    UpdateUser: updateUser,
    DeleteUser: deleteUser,
    ListUsers: listUsers,
    LoginUser: loginUser
  });

  return server;
}

module.exports = { createGrpcServer };
