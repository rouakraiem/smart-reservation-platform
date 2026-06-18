'use strict';
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../../proto/user.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const userProto = grpc.loadPackageDefinition(packageDef).user;

const USER_SERVICE_ADDR = `${process.env.USER_SERVICE_HOST || 'localhost'}:${process.env.USER_SERVICE_PORT || 50051}`;

const userClient = new userProto.UserService(
  USER_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

console.log('[API Gateway] 🔌 Client gRPC → User Service :', USER_SERVICE_ADDR);

/**
 * Wraps a gRPC unary call in a Promise.
 */
function callGrpc(method, request) {
  return new Promise((resolve, reject) => {
    userClient[method](request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

module.exports = {
  createUser:  (req) => callGrpc('CreateUser', req),
  getUser:     (req) => callGrpc('GetUser', req),
  updateUser:  (req) => callGrpc('UpdateUser', req),
  deleteUser:  (req) => callGrpc('DeleteUser', req),
  listUsers:   (req) => callGrpc('ListUsers', req),
  loginUser:   (req) => callGrpc('LoginUser', req)
};
