'use strict';
const express = require('express');
const router  = express.Router();
const notifClient = require('../grpc/notification-client');

function handleGrpcError(err, res) {
  const statusMap = { 3: 400, 5: 404 };
  const httpStatus = statusMap[err.code] || 500;
  res.status(httpStatus).json({ success: false, message: err.details || err.message });
}

// GET /api/notifications?userId=… – Récupérer les notifications d'un utilisateur
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, message: 'userId est requis' });
  try {
    const result = await notifClient.getNotifications({ user_id: userId });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// PATCH /api/notifications/:id/read – Marquer une notification comme lue
router.patch('/:id/read', async (req, res) => {
  try {
    const result = await notifClient.markAsRead({ id: req.params.id });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// POST /api/notifications – Créer une notification manuelle (admin)
router.post('/', async (req, res) => {
  const { user_id, type, message } = req.body;
  try {
    const result = await notifClient.createNotification({ user_id, type, message });
    res.status(201).json(result);
  } catch (err) { handleGrpcError(err, res); }
});

module.exports = router;
