'use strict';
require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const { createGrpcServer } = require('./grpc-server');
const { connectProducer, disconnectProducer } = require('./kafka/producer');

const PORT = process.env.USER_SERVICE_PORT || 50051;

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║        USER SERVICE  (port', PORT, ')  ║');
  console.log('╚══════════════════════════════════════╝');

  // 1. Connexion Kafka (non bloquant)
  await connectProducer();

  // 2. Démarrage du serveur gRPC
  const server = createGrpcServer();

  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('[UserService] ❌ Échec du démarrage :', err.message);
        process.exit(1);
      }
      console.log(`[UserService] 🚀 gRPC actif sur le port ${boundPort}`);
    }
  );
}

// Arrêt propre
process.on('SIGINT', async () => {
  console.log('\n[UserService] Arrêt en cours…');
  await disconnectProducer();
  process.exit(0);
});

main().catch((err) => {
  console.error('[UserService] Erreur fatale :', err);
  process.exit(1);
});
