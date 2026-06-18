'use strict';
const express = require('express');
const router  = express.Router();
const userClient = require('../grpc/user-client');

/**
 * Convertit une erreur gRPC en réponse HTTP.
 */
function handleGrpcError(err, res) {
  const statusMap = { 3: 400, 5: 404, 6: 409, 16: 401 };
  const httpStatus = statusMap[err.code] || 500;
  res.status(httpStatus).json({ success: false, message: err.details || err.message });
}

// POST /api/users – Créer un utilisateur
router.post('/', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const result = await userClient.createUser({ name, email, password });
    res.status(201).json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// GET /api/users – Lister tous les utilisateurs
router.get('/', async (req, res) => {
  try {
    const result = await userClient.listUsers({});
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// GET /api/users/:id – Obtenir un utilisateur
router.get('/:id', async (req, res) => {
  try {
    const result = await userClient.getUser({ id: req.params.id });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// PUT /api/users/:id – Mettre à jour un utilisateur
router.put('/:id', async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await userClient.updateUser({ id: req.params.id, name, email });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// DELETE /api/users/:id – Supprimer un utilisateur
router.delete('/:id', async (req, res) => {
  try {
    const result = await userClient.deleteUser({ id: req.params.id });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

// POST /api/users/login – Authentification
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await userClient.loginUser({ email, password });
    res.json(result);
  } catch (err) { handleGrpcError(err, res); }
});

module.exports = router;
