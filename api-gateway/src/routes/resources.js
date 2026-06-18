'use strict';
const express = require('express');
const router  = express.Router();
const reservationClient = require('../grpc/reservation-client');

function handleGrpcError(err, res) {
  const statusMap = { 3: 400, 5: 404, 6: 409 };
  const httpStatus = statusMap[err.code] || 500;
  res.status(httpStatus).json({ success: false, message: err.details || err.message });
}

// POST /api/resources – Créer une ressource
router.post('/', async (req, res) => {
  const { name, type, capacity, description } = req.body;
  try {
    const result = await reservationClient.createResource({ name, type, capacity, description });
    res.status(201).json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// GET /api/resources – Lister les ressources
router.get('/', async (req, res) => {
  try {
    const result = await reservationClient.listResources({});
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// GET /api/resources/:id/slots?date=YYYY-MM-DD – Créneaux disponibles
router.get('/:id/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, message: 'Le paramètre ?date=YYYY-MM-DD est requis' });
  try {
    const result = await reservationClient.getAvailableSlots({ resource_id: req.params.id, date });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

module.exports = router;
