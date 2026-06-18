'use strict';
require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const { createGrpcServer } = require('./grpc-server');
const { getDatabase }      = require('./database');
const { startConsumer, stopConsumer } = require('./kafka/consumer');

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 50053;

async function main() {
  console.log('╔═════════════════════════════════════════════╗');
  console.log('║   NOTIFICATION SERVICE  (port', PORT, ')      ║');
  console.log('╚═════════════════════════════════════════════╝');

  // 1. Initialise RxDB (NoSQL)
  await getDatabase();

  // 2. Démarre le consumer Kafka
  await startConsumer();

  // 3. Lance le serveur gRPC
  const server = createGrpcServer();

  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('[NotificationService] ❌ Échec du démarrage :', err.message);
        process.exit(1);
      }
      console.log(`[NotificationService] 🚀 gRPC actif sur le port ${boundPort}`);
    }
  );
}

process.on('SIGINT', async () => {
  console.log('\n[NotificationService] Arrêt en cours…');
  await stopConsumer();
  process.exit(0);
});

main().catch((err) => {
  console.error('[NotificationService] Erreur fatale :', err);
  process.exit(1);
});
