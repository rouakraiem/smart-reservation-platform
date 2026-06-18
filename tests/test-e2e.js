/**
 * Script de test end-to-end de la Plateforme de Réservation Intelligente.
 * Nécessite que l'API Gateway soit démarrée sur localhost:3000.
 *
 * Usage : node tests/test-e2e.js
 */
'use strict';

const BASE_URL = 'http://localhost:3000/api';

let userId1 = null;
let userId2 = null;
let resourceId = null;
let reservationId = null;

// ─── Utilitaire HTTP simple ──────────────────────────────────
async function http(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function log(label, status, data) {
  const ok = status >= 200 && status < 300;
  const icon = ok ? '✅' : '❌';
  console.log(`\n${icon} [${status}] ${label}`);
  console.log('   →', JSON.stringify(data, null, 2).split('\n').join('\n   '));
}

// ─── Tests séquentiels ──────────────────────────────────────
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║        TESTS END-TO-END – RESERVATION PLATFORM   ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // ── 1. Santé ──────────────────────────────────────────────
  const health = await fetch('http://localhost:3000/health').then(r => r.json());
  console.log('🏥 Health :', health.status);

  // ── 2. Créer des utilisateurs ─────────────────────────────
  let r = await http('POST', '/users', { name: 'Alice Test', email: `alice_${Date.now()}@test.com`, password: 'pass123' });
  log('Créer utilisateur Alice', r.status, r.data);
  userId1 = r.data.user?.id;

  r = await http('POST', '/users', { name: 'Bob Test', email: `bob_${Date.now()}@test.com`, password: 'pass456' });
  log('Créer utilisateur Bob', r.status, r.data);
  userId2 = r.data.user?.id;

  // ── 3. Lister les utilisateurs ────────────────────────────
  r = await http('GET', '/users');
  log(`Lister utilisateurs (${r.data.users?.length} trouvés)`, r.status, { count: r.data.users?.length });

  // ── 4. Obtenir un utilisateur ────────────────────────────
  r = await http('GET', `/users/${userId1}`);
  log('Obtenir Alice par ID', r.status, r.data.user);

  // ── 5. Login ─────────────────────────────────────────────
  // (email stocké ci-dessus, on suppose alice@test.com)
  console.log('\n⚠️  Test login ignoré (email dynamique) – testez manuellement avec api.http');

  // ── 6. Créer des ressources ───────────────────────────────
  r = await http('POST', '/resources', { name: 'Salle Jasmin', type: 'salle_reunion', capacity: 8 });
  log('Créer ressource Salle Jasmin', r.status, r.data);
  resourceId = r.data.resource?.id;

  r = await http('POST', '/resources', { name: 'Bureau 101', type: 'bureau', capacity: 1 });
  log('Créer ressource Bureau 101', r.status, r.data);

  // ── 7. Lister les ressources ──────────────────────────────
  r = await http('GET', '/resources');
  log(`Lister ressources (${r.data.resources?.length} trouvées)`, r.status, r.data.resources?.map(x => x.name));

  // ── 8. Créneaux disponibles ───────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  r = await http('GET', `/resources/${resourceId}/slots?date=${today}`);
  log(`Créneaux pour Salle Jasmin le ${today}`, r.status, r.data.slots?.filter(s => s.available).map(s => `${s.start_time}-${s.end_time}`));

  // ── 9. Créer une réservation ──────────────────────────────
  r = await http('POST', '/reservations', {
    user_id: userId1,
    resource_id: resourceId,
    date: today,
    start_time: '09:00',
    end_time: '10:00',
    notes: 'Test automatique'
  });
  log('Créer réservation (Alice, Salle Jasmin)', r.status, r.data);
  reservationId = r.data.reservation?.id;

  // ── 10. Conflit de réservation ────────────────────────────
  r = await http('POST', '/reservations', {
    user_id: userId2,
    resource_id: resourceId,
    date: today,
    start_time: '09:00',
    end_time: '10:00',
    notes: 'Doit échouer – créneau pris'
  });
  log('Conflit réservation (doit échouer 409)', r.status, r.data);

  // ── 11. Lister les réservations ───────────────────────────
  r = await http('GET', `/reservations?userId=${userId1}`);
  log(`Réservations d'Alice (${r.data.reservations?.length})`, r.status, r.data.reservations?.map(x => `${x.date} ${x.start_time}-${x.end_time} [${x.status}]`));

  // ── 12. Modifier la réservation ───────────────────────────
  r = await http('PUT', `/reservations/${reservationId}`, {
    start_time: '10:00',
    end_time: '11:00',
    notes: 'Réunion déplacée'
  });
  log('Modifier réservation', r.status, r.data.reservation);

  // ── 13. Notifications (auto-générées par Kafka) ───────────
  console.log('\n⏳ Attente 2s pour propagation Kafka…');
  await new Promise(r => setTimeout(r, 2000));

  r = await http('GET', `/notifications?userId=${userId1}`);
  log(`Notifications d'Alice (${r.data.notifications?.length})`, r.status, r.data.notifications?.map(n => `[${n.type}] ${n.message.substring(0, 60)}…`));

  // ── 14. Marquer notification comme lue ───────────────────
  const notifId = r.data.notifications?.[0]?.id;
  if (notifId) {
    r = await http('PATCH', `/notifications/${notifId}/read`);
    log('Marquer notification comme lue', r.status, r.data);
  }

  // ── 15. Annuler la réservation ────────────────────────────
  r = await http('DELETE', `/reservations/${reservationId}`);
  log('Annuler réservation', r.status, r.data);

  // ── 16. Vérification post-annulation ─────────────────────
  r = await http('GET', `/reservations/${reservationId}`);
  log('Vérification statut annulé', r.status, { status: r.data.reservation?.status });

  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║         TESTS TERMINÉS ✅             ║');
  console.log('╚═══════════════════════════════════════╝\n');
}

runTests().catch(err => {
  console.error('\n❌ Erreur fatale :', err.message);
  console.error('Assurez-vous que l\'API Gateway est démarrée (npm start dans api-gateway/)');
  process.exit(1);
});
