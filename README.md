# 🏨 Plateforme de Réservation Intelligente — Microservices

> Mini-projet SoA & Microservices | Dr. Salah Gontara | A.U. 2025-26

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                 │
│                   (REST & GraphQL / HTTP 1.1 + JSON)                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY  :3000                          │
│         REST (Express)  +  GraphQL (Apollo Server)                  │
└──────────┬──────────────────┬──────────────────┬────────────────────┘
           │ gRPC/HTTP2       │ gRPC/HTTP2        │ gRPC/HTTP2
           │ Protobuf         │ Protobuf          │ Protobuf
           ▼                  ▼                   ▼
  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
  │  USER SVC   │    │ RESERVATION  │    │  NOTIFICATION    │
  │   :50051    │    │  SVC :50052  │    │   SVC :50053     │
  │             │    │              │    │                  │
  │  SQLite3    │    │  SQLite3     │    │  RxDB (LokiJS)   │
  │  (SQL)      │    │  (SQL)       │    │  (NoSQL)         │
  └──────┬──────┘    └──────┬───────┘    └────────┬─────────┘
         │                  │                      │
         │    Kafka Producer │    Kafka Producer    │  Kafka Consumer
         └──────────┬────────┘                     │
                    │                              │
                    ▼                              │
          ┌──────────────────────────────────────┐ │
          │           KAFKA BROKER :9092          │◄┘
          │                                      │
          │  Topics :                            │
          │  • user-registered                   │
          │  • reservation-created               │
          │  • reservation-cancelled             │
          │  • reservation-updated               │
          └──────────────────────────────────────┘
```

---

## 🗂️ Structure du projet

```
smart-reservation-platform/
├── proto/                         
│   ├── user.proto
│   ├── reservation.proto
│   └── notification.proto
│
├── api-gateway/                   
│   └── src/
│       ├── grpc/                  
│       ├── routes/                 
│       └── graphql/               
│
├── user-service/                   
│   └── src/
│       ├── database.js            
│       ├── grpc-server.js          
│       └── kafka/producer.js       
│
├── reservation-service/           
│   └── src/
│       ├── database.js            
│       ├── grpc-server.js          
│       └── kafka/
│           ├── producer.js         
│           └── consumer.js        
│
├── notification-service/           
│   └── src/
│       ├── database.js             
│       ├── grpc-server.js          
│       └── kafka/consumer.js      
│
├── tests/
│   ├── api.http                  
│   ├── graphql-queries.graphql     
│   └── test-e2e.js                 
│
├── docker-compose.yml              
└── README.md
```

---

## ⚙️ Technologies utilisées

| Couche            | Technologie           | Rôle                                        |
|-------------------|-----------------------|---------------------------------------------|
| Runtime           | Node.js 20            | Tous les microservices                      |
| Communication     | gRPC + Protobuf       | API Gateway ↔ Microservices (HTTP/2)       |
| API Client        | REST (Express)        | Opérations CRUD standard                   |
| API Client        | GraphQL (Apollo)      | Requêtes flexibles et agrégées             |
| Messagerie        | Apache Kafka          | Communication asynchrone entre services    |
| DB SQL            | SQLite3               | User Service + Reservation Service         |
| DB NoSQL          | RxDB / LokiJS         | Notification Service                       |
| Conteneurisation  | Docker + Compose      | Déploiement de la stack complète           |

---

## 📋 Kafka — Topics et flux d'événements

| Topic                   | Producteur          | Consommateur        | Déclencheur                     |
|-------------------------|---------------------|---------------------|----------------------------------|
| `user-registered`       | User Service        | Notification Service| Inscription d'un utilisateur   |
| `reservation-created`   | Reservation Service | Notification Service| Nouvelle réservation confirmée |
| `reservation-cancelled` | Reservation Service | Notification Service| Annulation d'une réservation   |
| `reservation-updated`   | Reservation Service | Notification Service| Modification d'une réservation |

---

## 🧪 Tests (Postman & E2E)

### Postman
Une collection Postman est disponible dans le dossier `tests/`. Elle inclut les requêtes **REST** et **GraphQL**.
Pour les tests **gRPC**, utilisez l'interface gRPC de Postman en important les fichiers du dossier `proto/`.

### Script E2E
Vous pouvez lancer un test complet automatisé :
```bash
node tests/test-e2e.js
```

---

## 🚀 Démarrage

### Prérequis
- Node.js ≥ 20
- Docker & Docker Compose
- npm

### Option A — Avec Docker (recommandé)

```bash
# 1. Cloner le projet et entrer dans le dossier
cd smart-reservation-platform

# 2. Lancer toute la stack
docker-compose up --build

# L'API Gateway sera disponible sur http://localhost:3000
```

### Option B — Sans Docker (développement local)

**Étape 1 : Démarrer Kafka**
```bash
# Avec Docker pour Kafka uniquement
docker-compose up zookeeper kafka -d
```

**Étape 2 : Installer les dépendances**
```bash
cd user-service        && npm install && cd ..
cd reservation-service && npm install && cd ..
cd notification-service && npm install && cd ..
cd api-gateway         && npm install && cd ..
```

**Étape 3 : Configurer les variables d'environnement**
```bash
cp .env.example api-gateway/.env
cp .env.example user-service/.env
cp .env.example reservation-service/.env
cp .env.example notification-service/.env
```

**Étape 4 : Démarrer chaque service dans un terminal séparé**
```bash
# Terminal 1
cd user-service && npm start

# Terminal 2
cd reservation-service && npm start

# Terminal 3
cd notification-service && npm start

# Terminal 4
cd api-gateway && npm start
```

---

## 🌐 Endpoints REST

### Utilisateurs
| Méthode | Endpoint              | Description                  |
|---------|-----------------------|------------------------------|
| POST    | `/api/users`          | Créer un utilisateur         |
| GET     | `/api/users`          | Lister tous les utilisateurs |
| GET     | `/api/users/:id`      | Obtenir un utilisateur       |
| PUT     | `/api/users/:id`      | Modifier un utilisateur      |
| DELETE  | `/api/users/:id`      | Supprimer un utilisateur     |
| POST    | `/api/users/login`    | Authentification             |

### Ressources
| Méthode | Endpoint                           | Description                     |
|---------|------------------------------------|---------------------------------|
| POST    | `/api/resources`                   | Créer une ressource             |
| GET     | `/api/resources`                   | Lister les ressources           |
| GET     | `/api/resources/:id/slots?date=…`  | Créneaux disponibles à une date |

### Réservations
| Méthode | Endpoint                   | Description                      |
|---------|----------------------------|----------------------------------|
| POST    | `/api/reservations`        | Créer une réservation            |
| GET     | `/api/reservations`        | Lister (filtre `?userId=`)       |
| GET     | `/api/reservations/:id`    | Obtenir une réservation          |
| PUT     | `/api/reservations/:id`    | Modifier une réservation         |
| DELETE  | `/api/reservations/:id`    | Annuler une réservation          |

### Notifications
| Méthode | Endpoint                          | Description                    |
|---------|-----------------------------------|--------------------------------|
| GET     | `/api/notifications?userId=…`     | Notifications d'un utilisateur |
| PATCH   | `/api/notifications/:id/read`     | Marquer comme lue              |
| POST    | `/api/notifications`              | Créer une notification (admin) |

---

## 📊 GraphQL

**URL :** `http://localhost:3000/graphql`

### Exemple de requête combinée (avantage GraphQL)
```graphql
query Dashboard {
  user(id: "USER_ID") { id name email }
  reservations(userId: "USER_ID") { date start_time end_time status }
  notifications(userId: "USER_ID") { type message is_read }
}
```

Voir `tests/graphql-queries.graphql` pour tous les exemples.

---

## 🧪 Tests

```bash
# Test automatique end-to-end (API Gateway doit être démarrée)
node tests/test-e2e.js

# Tests REST manuels → ouvrir tests/api.http dans VS Code avec l'extension REST Client
# Tests GraphQL → ouvrir http://localhost:3000/graphql (playground Apollo)
```

---

## 🗄️ Bases de données

| Service              | Type   | Moteur        | Fichier                             |
|----------------------|--------|---------------|-------------------------------------|
| User Service         | SQL    | SQLite3       | `user-service/data/users.db`        |
| Reservation Service  | SQL    | SQLite3       | `reservation-service/data/reservations.db` |
| Notification Service | NoSQL  | RxDB / LokiJS | `notification-service/data/notifications.db` |

---

## 📌 Fichiers .proto

Les contrats gRPC se trouvent dans le dossier `proto/` :
- `proto/user.proto` — Service utilisateurs (6 méthodes)
- `proto/reservation.proto` — Service réservations + ressources (8 méthodes)
- `proto/notification.proto` — Service notifications (3 méthodes)

---

## 👥 Auteurs

- **Roua Kraiem**
- **Nawres khalifa ** 

Encadrant : Dr. Salah Gontara | SoA et Microservices 
