'use strict';
require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const { createGrpcServer } = require('./grpc-server');
const { connectProducer, disconnectProducer } = require('./kafka/producer');
const { startConsumer, stopConsumer } = require('./kafka/consumer');
const { getDatabase } = require('./database');

const PORT = process.env.RESERVATION_SERVICE_PORT || 50052;

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    RESERVATION SERVICE  (port', PORT, ')   ║');
  console.log('╚══════════════════════════════════════════╝');

  await connectProducer();
  
  // Handlers pour les événements Kafka consommés
  const handlers = {
    'user-deleted': async (payload) => {
      const { userId } = payload;
      try {
        const db = getDatabase();
        const result = db.prepare('UPDATE reservations SET status = \'cancelled\', notes = \'Auto-cancelled (User deleted)\' WHERE user_id = ? AND status = \'active\'').run(userId);
        console.log(`[ReservationService] 🧹 Nettoyage : ${result.changes} réservations annulées pour l'utilisateur supprimé ${userId}`);
      } catch (err) {
        console.error('[ReservationService] Erreur lors du nettoyage (user-deleted):', err.message);
      }
    }
  };

  await startConsumer(handlers);

  const server = createGrpcServer();

  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('[ReservationService] ❌ Échec du démarrage :', err.message);
        process.exit(1);
      }
      console.log(`[ReservationService] 🚀 gRPC actif sur le port ${boundPort}`);
    }
  );
}

process.on('SIGINT', async () => {
  console.log('\n[ReservationService] Arrêt en cours…');
  await disconnectProducer();
  await stopConsumer();
  process.exit(0);
});

main().catch((err) => {
  console.error('[ReservationService] Erreur fatale :', err);
  process.exit(1);
});
