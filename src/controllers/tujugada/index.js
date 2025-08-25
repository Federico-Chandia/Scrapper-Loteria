const express = require('express');

const router = express.Router();

// Endpoint básico para sorteos
router.get('/sorteos', (req, res) => {
  res.json({
    message: 'TuJugada sorteos - En desarrollo',
    data: []
  });
});

// Endpoint básico para sorteo específico
router.get('/sorteo/:numero', (req, res) => {
  const { numero } = req.params;
  res.json({
    message: `TuJugada sorteo ${numero} - En desarrollo`,
    numero,
    data: {}
  });
});

module.exports = router;