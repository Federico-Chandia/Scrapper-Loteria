const express = require('express');
const quini6resultados = require('../controllers/quini6resultados');
const tujugada = require('../controllers/tujugada');
const { quini6Oficial } = require('../controllers/quini6oficial');
const { obtenerTodosSorteosBD } = require('../db/sqlite');

const app = express.Router();
app.get('/oficial', quini6Oficial);

// Endpoint para consultar la base de datos
app.get('/bd', (req, res) => {
  try {
    const sorteos = obtenerTodosSorteosBD();
    res.json({
      message: 'Sorteos en base de datos',
      cantidad: sorteos.length,
      data: sorteos
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// Endpoint para forzar scraping de los últimos sorteos
app.get('/scraping', async (req, res) => {
  try {
    const { obtenerTodosLosSorteos } = require('../controllers/quini6resultados');
    await obtenerTodosLosSorteos();
    
    const sorteos = obtenerTodosSorteosBD();
    res.json({
      message: 'Scraping completado',
      cantidad: sorteos.length,
      data: sorteos
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en el scraping', details: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido - API - Resultados Quini 6',
  });
});

app.get('/ping', (req, res) => {
  res.json({
    message: 'API - Resultados Quini 6',
    test: process.env.NODE_ENV,
  });
});

// https://www.quini-6-resultados.com.ar/
app.use('/q6r', quini6resultados);

// https://www.tujugada.com.ar/quini6.asp
app.use('/tuju', tujugada);

module.exports = app;