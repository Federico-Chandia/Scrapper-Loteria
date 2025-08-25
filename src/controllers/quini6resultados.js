const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { guardarSorteo, obtenerSorteoPorNumero, limpiarSorteosAntiguos, obtenerTodosSorteosBD } = require('../db/sqlite');

const router = express.Router();

const scrapearSorteos = async () => {
  try {
    const response = await axios.get('https://www.quini-6-resultados.com.ar/');
    const $ = cheerio.load(response.data);
    const sorteos = [];

    $('.sorteo-item').each((index, element) => {
      const numero = $(element).find('.numero').text().trim();
      const titulo = $(element).find('.titulo').text().trim();
      const fecha = $(element).find('.fecha').text().trim();
      const link = $(element).find('a').attr('href') || '';
      
      if (numero) {
        sorteos.push({ numero, titulo, fecha, link });
      }
    });

    return sorteos.slice(0, 10);
  } catch (error) {
    console.error('Error scraping sorteos:', error.message);
    return [];
  }
};

const scrapearResultadosSorteo = async (numero) => {
  try {
    const response = await axios.get(`https://www.quini-6-resultados.com.ar/sorteo/${numero}`);
    const $ = cheerio.load(response.data);
    
    const resultados = {
      primera: [],
      segunda: [],
      revancha: [],
      siempre_sale: []
    };

    $('.numeros-primera .numero').each((i, el) => {
      resultados.primera.push($(el).text().trim());
    });

    $('.numeros-segunda .numero').each((i, el) => {
      resultados.segunda.push($(el).text().trim());
    });

    $('.numeros-revancha .numero').each((i, el) => {
      resultados.revancha.push($(el).text().trim());
    });

    $('.numeros-siempre .numero').each((i, el) => {
      resultados.siempre_sale.push($(el).text().trim());
    });

    return resultados;
  } catch (error) {
    console.error(`Error scraping sorteo ${numero}:`, error.message);
    return null;
  }
};

const obtenerTodosLosSorteos = async () => {
  const sorteos = await scrapearSorteos();
  
  for (const sorteo of sorteos) {
    const resultados = await scrapearResultadosSorteo(sorteo.numero);
    if (resultados) {
      guardarSorteo({ ...sorteo, resultados });
    }
  }
  
  limpiarSorteosAntiguos();
  return sorteos;
};

router.get('/sorteos', async (req, res) => {
  try {
    let sorteos = obtenerTodosSorteosBD();
    
    if (sorteos.length === 0) {
      await obtenerTodosLosSorteos();
      sorteos = obtenerTodosSorteosBD();
    }
    
    res.json({
      message: 'Lista de sorteos',
      cantidad: sorteos.length,
      data: sorteos.map(s => ({
        numero: s.numero,
        titulo: s.titulo,
        fecha: s.fecha,
        link: s.link
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo sorteos', details: error.message });
  }
});

router.get('/sorteo/:numero', async (req, res) => {
  try {
    const { numero } = req.params;
    let sorteo = obtenerSorteoPorNumero(numero);
    
    if (!sorteo) {
      const resultados = await scrapearResultadosSorteo(numero);
      if (resultados) {
        const sorteoData = {
          numero,
          titulo: `Sorteo ${numero}`,
          fecha: new Date().toLocaleDateString(),
          link: `https://www.quini-6-resultados.com.ar/sorteo/${numero}`,
          resultados
        };
        guardarSorteo(sorteoData);
        sorteo = obtenerSorteoPorNumero(numero);
      }
    }
    
    if (sorteo) {
      res.json({
        message: `Sorteo ${numero}`,
        data: sorteo
      });
    } else {
      res.status(404).json({ error: `Sorteo ${numero} no encontrado` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo sorteo', details: error.message });
  }
});

router.get('/todoslosnumeros', async (req, res) => {
  try {
    let sorteos = obtenerTodosSorteosBD();
    
    if (sorteos.length === 0) {
      await obtenerTodosLosSorteos();
      sorteos = obtenerTodosSorteosBD();
    }
    
    const todosLosNumeros = sorteos.map(sorteo => {
      const resultados = typeof sorteo.resultados === 'string' 
        ? JSON.parse(sorteo.resultados) 
        : sorteo.resultados;
      
      return {
        numero: sorteo.numero,
        fecha: sorteo.fecha,
        resultados
      };
    });
    
    res.json({
      message: 'Últimos 10 sorteos con resultados',
      cantidad: todosLosNumeros.length,
      data: todosLosNumeros
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo todos los números', details: error.message });
  }
});

module.exports = router;
module.exports.obtenerTodosLosSorteos = obtenerTodosLosSorteos;