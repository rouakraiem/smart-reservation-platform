'use strict';
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../../proto/reservation.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const reservationProto = grpc.loadPackageDefinition(packageDef).reservation;

const RESERVATION_SERVICE_ADDR = `${process.env.RESERVATION_SERVICE_HOST || 'localhost'}:${process.env.RESERVATION_SERVICE_PORT || 50052}`;

const reservationClient = new reservationProto.ReservationService(
  RESERVATION_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

console.log('[API Gateway] 🔌 Client gRPC → Reservation Service :', RESERVATION_SERVICE_ADDR);

function callGrpc(method, request) {
  return new Promise((resolve, reject) => {
    reservationClient[method](request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

module.exports = {
  createReservation: (req) => callGrpc('CreateReservation', req),
  getReservation:    (req) => callGrpc('GetReservation', req),
  updateReservation: (req) => callGrpc('UpdateReservation', req),
  cancelReservation: (req) => callGrpc('CancelReservation', req),
  listReservations:  (req) => callGrpc('ListReservations', req),
  createResource:    (req) => callGrpc('CreateResource', req),
  listResources:     (req) => callGrpc('ListResources', req),
  getAvailableSlots: (req) => callGrpc('GetAvailableSlots', req)
};
