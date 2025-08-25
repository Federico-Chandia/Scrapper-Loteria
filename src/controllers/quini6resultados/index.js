const express = require('express');

const router = express.Router();

// Endpoint básico para sorteos
router.get('/sorteos', (req, res) => {
  res.json({
    message: 'Endpoint de sorteos - En desarrollo',
    data: []
  });
});

// Endpoint básico para sorteo específico
router.get('/sorteo/:numero', (req, res) => {
  const { numero } = req.params;
  res.json({
    message: `Sorteo ${numero} - En desarrollo`,
    numero,
    data: {}
  });
});

// Endpoint básico para todos los números
router.get('/todoslosnumeros', (req, res) => {
  res.json({
    message: 'Todos los números - En desarrollo',
    data: []
  });
});

module.exports = router;