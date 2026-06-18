'use strict';
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # ─── Types ────────────────────────────────────────────────────
  type User {
    id:         String!
    name:       String!
    email:      String!
    created_at: String!
  }

  type Resource {
    id:          String!
    name:        String!
    type:        String!
    capacity:    Int!
    description: String
  }

  type Reservation {
    id:          String!
    user_id:     String!
    resource_id: String!
    date:        String!
    start_time:  String!
    end_time:    String!
    status:      String!
    notes:       String
    created_at:  String!
  }

  type Notification {
    id:         String!
    user_id:    String!
    type:       String!
    message:    String!
    is_read:    Boolean!
    created_at: String!
  }

  type TimeSlot {
    start_time: String!
    end_time:   String!
    available:  Boolean!
  }

  type AuthPayload {
    success: Boolean!
    message: String!
    user:    User
  }

  type DeletePayload {
    success: Boolean!
    message: String!
  }

  # ─── Queries ──────────────────────────────────────────────────
  type Query {
    "Récupère un utilisateur par son identifiant"
    user(id: String!): User

    "Liste tous les utilisateurs"
    users: [User!]!

    "Récupère une réservation par son identifiant"
    reservation(id: String!): Reservation

    "Liste les réservations – filtrable par userId"
    reservations(userId: String): [Reservation!]!

    "Liste toutes les ressources réservables"
    resources: [Resource!]!

    "Créneaux disponibles pour une ressource à une date donnée"
    availableSlots(resourceId: String!, date: String!): [TimeSlot!]!

    "Notifications d'un utilisateur"
    notifications(userId: String!): [Notification!]!
  }

  # ─── Mutations ────────────────────────────────────────────────
  type Mutation {
    "Inscription d'un nouvel utilisateur"
    createUser(name: String!, email: String!, password: String!): User!

    "Mise à jour du profil utilisateur"
    updateUser(id: String!, name: String, email: String): User!

    "Suppression d'un utilisateur"
    deleteUser(id: String!): DeletePayload!

    "Authentification"
    login(email: String!, password: String!): AuthPayload!

    "Ajout d'une ressource réservable"
    createResource(name: String!, type: String!, capacity: Int, description: String): Resource!

    "Création d'une réservation"
    createReservation(
      userId:     String!
      resourceId: String!
      date:       String!
      startTime:  String!
      endTime:    String!
      notes:      String
    ): Reservation!

    "Modification d'une réservation existante"
    updateReservation(
      id:        String!
      date:      String
      startTime: String
      endTime:   String
      notes:     String
    ): Reservation!

    "Annulation d'une réservation"
    cancelReservation(id: String!): DeletePayload!

    "Marquer une notification comme lue"
    markNotificationRead(id: String!): DeletePayload!
  }
`;

module.exports = typeDefs;
