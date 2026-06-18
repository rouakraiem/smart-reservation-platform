'use strict';
const express = require('express');
const router  = express.Router();
const reservationClient = require('../grpc/reservation-client');

function handleGrpcError(err, res) {
  const statusMap = { 3: 400, 5: 404, 6: 409 };
  const httpStatus = statusMap[err.code] || 500;
  res.status(httpStatus).json({ success: false, message: err.details || err.message });
}

// POST /api/reservations – Créer une réservation
router.post('/', async (req, res) => {
  const { user_id, resource_id, date, start_time, end_time, notes } = req.body;
  try {
    const result = await reservationClient.createReservation({ user_id, resource_id, date, start_time, end_time, notes });
    res.status(201).json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// GET /api/reservations?userId=… – Lister les réservations
router.get('/', async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await reservationClient.listReservations({ user_id: userId || '' });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// GET /api/reservations/:id – Obtenir une réservation
router.get('/:id', async (req, res) => {
  try {
    const result = await reservationClient.getReservation({ id: req.params.id });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// PUT /api/reservations/:id – Modifier une réservation
router.put('/:id', async (req, res) => {
  const { date, start_time, end_time, notes } = req.body;
  try {
    const result = await reservationClient.updateReservation({ id: req.params.id, date, start_time, end_time, notes });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// DELETE /api/reservations/:id – Annuler une réservation
router.delete('/:id', async (req, res) => {
  try {
    const result = await reservationClient.cancelReservation({ id: req.params.id });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

module.exports = router;
