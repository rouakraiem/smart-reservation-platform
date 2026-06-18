'use strict';
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../../proto/notification.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const notifProto = grpc.loadPackageDefinition(packageDef).notification;

const NOTIFICATION_SERVICE_ADDR = `${process.env.NOTIFICATION_SERVICE_HOST || 'localhost'}:${process.env.NOTIFICATION_SERVICE_PORT || 50053}`;

const notifClient = new notifProto.NotificationService(
  NOTIFICATION_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

console.log('[API Gateway] 🔌 Client gRPC → Notification Service :', NOTIFICATION_SERVICE_ADDR);

function callGrpc(method, request) {
  return new Promise((resolve, reject) => {
    notifClient[method](request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

module.exports = {
  createNotification: (req) => callGrpc('CreateNotification', req),
  getNotifications:   (req) => callGrpc('GetNotifications', req),
  markAsRead:         (req) => callGrpc('MarkAsRead', req)
};
