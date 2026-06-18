'use strict';
const { ApolloError, UserInputError, AuthenticationError } = require('apollo-server-express');
const userClient        = require('../grpc/user-client');
const reservationClient = require('../grpc/reservation-client');
const notifClient       = require('../grpc/notification-client');

/**
 * Convertit une erreur gRPC en ApolloError appropriée.
 */
function mapGrpcError(err) {
  const msg = err.details || err.message;
  if (err.code === 3)  return new UserInputError(msg);
  if (err.code === 5)  return new ApolloError(msg, 'NOT_FOUND');
  if (err.code === 6)  return new ApolloError(msg, 'ALREADY_EXISTS');
  if (err.code === 16) return new AuthenticationError(msg);
  return new ApolloError(msg, 'INTERNAL_ERROR');
}

const resolvers = {
  // ─── Queries ────────────────────────────────────────────────
  Query: {
    user: async (_, { id }) => {
      try {
        const res = await userClient.getUser({ id });
        return res.user;
      } catch (err) { throw mapGrpcError(err); }
    },

    users: async () => {
      try {
        const res = await userClient.listUsers({});
        return res.users;
      } catch (err) { throw mapGrpcError(err); }
    },

    reservation: async (_, { id }) => {
      try {
        const res = await reservationClient.getReservation({ id });
        return res.reservation;
      } catch (err) { throw mapGrpcError(err); }
    },

    reservations: async (_, { userId }) => {
      try {
        const res = await reservationClient.listReservations({ user_id: userId || '' });
        return res.reservations;
      } catch (err) { throw mapGrpcError(err); }
    },

    resources: async () => {
      try {
        const res = await reservationClient.listResources({});
        return res.resources;
      } catch (err) { throw mapGrpcError(err); }
    },

    availableSlots: async (_, { resourceId, date }) => {
      try {
        const res = await reservationClient.getAvailableSlots({ resource_id: resourceId, date });
        return res.slots;
      } catch (err) { throw mapGrpcError(err); }
    },

    notifications: async (_, { userId }) => {
      try {
        const res = await notifClient.getNotifications({ user_id: userId });
        return res.notifications;
      } catch (err) { throw mapGrpcError(err); }
    }
  },

  // ─── Mutations ──────────────────────────────────────────────
  Mutation: {
    createUser: async (_, { name, email, password }) => {
      try {
        const res = await userClient.createUser({ name, email, password });
        return res.user;
      } catch (err) { throw mapGrpcError(err); }
    },

    updateUser: async (_, { id, name, email }) => {
      try {
        const res = await userClient.updateUser({ id, name: name || '', email: email || '' });
        return res.user;
      } catch (err) { throw mapGrpcError(err); }
    },

    deleteUser: async (_, { id }) => {
      try {
        return await userClient.deleteUser({ id });
      } catch (err) { throw mapGrpcError(err); }
    },

    login: async (_, { email, password }) => {
      try {
        const res = await userClient.loginUser({ email, password });
        return { success: res.success, message: res.message, user: res.user };
      } catch (err) { throw mapGrpcError(err); }
    },

    createResource: async (_, { name, type, capacity, description }) => {
      try {
        const res = await reservationClient.createResource({
          name, type, capacity: capacity || 1, description: description || ''
        });
        return res.resource;
      } catch (err) { throw mapGrpcError(err); }
    },

    createReservation: async (_, { userId, resourceId, date, startTime, endTime, notes }) => {
      try {
        const res = await reservationClient.createReservation({
          user_id:     userId,
          resource_id: resourceId,
          date,
          start_time:  startTime,
          end_time:    endTime,
          notes:       notes || ''
        });
        return res.reservation;
      } catch (err) { throw mapGrpcError(err); }
    },

    updateReservation: async (_, { id, date, startTime, endTime, notes }) => {
      try {
        const res = await reservationClient.updateReservation({
          id,
          date:       date       || '',
          start_time: startTime  || '',
          end_time:   endTime    || '',
          notes:      notes      || ''
        });
        return res.reservation;
      } catch (err) { throw mapGrpcError(err); }
    },

    cancelReservation: async (_, { id }) => {
      try {
        return await reservationClient.cancelReservation({ id });
      } catch (err) { throw mapGrpcError(err); }
    },

    markNotificationRead: async (_, { id }) => {
      try {
        return await notifClient.markAsRead({ id });
      } catch (err) { throw mapGrpcError(err); }
    }
  }
};

module.exports = resolvers;
