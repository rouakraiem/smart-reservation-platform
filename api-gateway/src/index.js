'use strict';
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const { ApolloServer } = require('apollo-server-express');

const typeDefs  = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

const reservationsRouter  = require('./routes/reservations');
const resourcesRouter     = require('./routes/resources');
const notificationsRouter = require('./routes/notifications');

const PORT = process.env.GATEWAY_PORT || 3000;

async function startServer() {
  const app = express();

  // ─── Middlewares globaux ─────────────────────────────────────
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      service: 'API Gateway – Plateforme de Réservation Intelligente',
      timestamp: new Date().toISOString(),
      endpoints: {
        rest:    `http://localhost:${PORT}/api`,
        graphql: `http://localhost:${PORT}/graphql`,
        health:  `http://localhost:${PORT}/health`
      }
    });
  });

  // ─── Apollo GraphQL Server ───────────────────────────────────
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    context: ({ req }) => ({ headers: req.headers })
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: '/graphql' });

  // ─── Démarrage ───────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║      🏨  PLATEFORME DE RÉSERVATION INTELLIGENTE       ║');
    console.log('║              API GATEWAY  — port ' + PORT + '                ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  🌐  REST     →  http://localhost:' + PORT + '/api');
    console.log('  📊  GraphQL  →  http://localhost:' + PORT + '/graphql');
    console.log('  ❤️   Health   →  http://localhost:' + PORT + '/health');
    console.log('');
    console.log('  Endpoints REST :');
    console.log('  ┌─ Utilisateurs');
    console.log('  │  POST   /api/users');
    console.log('  │  GET    /api/users');
    console.log('  │  GET    /api/users/:id');
    console.log('  │  PUT    /api/users/:id');
    console.log('  │  DELETE /api/users/:id');
    console.log('  │  POST   /api/users/login');
    console.log('  ├─ Ressources');
    console.log('  │  POST   /api/resources');
    console.log('  │  GET    /api/resources');
    console.log('  │  GET    /api/resources/:id/slots?date=YYYY-MM-DD');
    console.log('  ├─ Réservations');
    console.log('  │  POST   /api/reservations');
    console.log('  │  GET    /api/reservations[?userId=]');
    console.log('  │  GET    /api/reservations/:id');
    console.log('  │  PUT    /api/reservations/:id');
    console.log('  │  DELETE /api/reservations/:id');
    console.log('  └─ Notifications');
    console.log('     GET    /api/notifications?userId=…');
    console.log('     PATCH  /api/notifications/:id/read');
    console.log('');
  });
}

startServer().catch((err) => {
  console.error('[API Gateway] ❌ Erreur fatale :', err);
  process.exit(1);
});
