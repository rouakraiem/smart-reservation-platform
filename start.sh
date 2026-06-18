#!/bin/bash
# ============================================================
#  start.sh — Démarrage de tous les microservices en local
#  Usage : chmod +x start.sh && ./start.sh
# ============================================================

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║      🏨  PLATEFORME DE RÉSERVATION INTELLIGENTE       ║"
echo "║                  Démarrage local                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Vérifie que npm est installé
command -v npm >/dev/null 2>&1 || { echo "❌ npm non trouvé. Installez Node.js ≥ 20."; exit 1; }

# Copie les .env si besoin
for dir in user-service reservation-service notification-service api-gateway; do
  if [ ! -f "$dir/.env" ]; then
    cp .env.example "$dir/.env"
    echo "📄 $dir/.env créé depuis .env.example"
  fi
done

# Installe les dépendances si node_modules manquants
for dir in user-service reservation-service notification-service api-gateway; do
  if [ ! -d "$dir/node_modules" ]; then
    echo "📦 Installation des dépendances : $dir"
    (cd "$dir" && npm install --silent)
  fi
done

echo ""
echo "🚀 Démarrage des microservices..."
echo "   (Ctrl+C pour arrêter tous les processus)"
echo ""

# Lance les 4 services en parallèle
(cd user-service        && echo "[UserService]        démarré" && npm start 2>&1 | sed 's/^/[user-svc]   /') &
PID1=$!

sleep 1
(cd reservation-service && echo "[ReservationService] démarré" && npm start 2>&1 | sed 's/^/[res-svc]    /') &
PID2=$!

sleep 1
(cd notification-service && echo "[NotifService]       démarré" && npm start 2>&1 | sed 's/^/[notif-svc]  /') &
PID3=$!

sleep 2
(cd api-gateway         && echo "[API Gateway]        démarré" && npm start 2>&1 | sed 's/^/[gateway]    /') &
PID4=$!

# Attend Ctrl+C et arrête proprement
trap "echo ''; echo 'Arrêt...'; kill $PID1 $PID2 $PID3 $PID4 2>/dev/null; exit 0" INT TERM

wait $PID1 $PID2 $PID3 $PID4
