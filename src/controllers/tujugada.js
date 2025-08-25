const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

const scrapearTuJugadaSorteos = async () => {
  try {
    const response = await axios.get('https://www.tujugada.com.ar/quini6.asp');
    const $ = cheerio.load(response.data);
    const sorteos = [];

    $('.tabla-sorteos tr').each((index, element) => {
      if (index === 0) return; // Skip header
      
      const numero = $(element).find('td').eq(0).text().trim();
      const fecha = $(element).find('td').eq(1).text().trim();
      
      if (numero && fecha) {
        sorteos.push({
          numero,
          fecha,
          titulo: `Sorteo ${numero} - TuJugada`,
          link: `https://www.tujugada.com.ar/quini6.asp?sorteo=${numero}`
        });
      }
    });

    return sorteos.slice(0, 10);
  } catch (error) {
    console.error('Error scraping TuJugada sorteos:', error.message);
    return [];
  }
};

const scrapearTuJugadaResultados = async (numero) => {
  try {
    const response = await axios.get(`https://www.tujugada.com.ar/quini6.asp?sorteo=${numero}`);
    const $ = cheerio.load(response.data);
    
    const resultados = {
      primera: [],
      segunda: [],
      revancha: [],
      siempre_sale: []
    };

    $('.resultado-primera .numero').each((i, el) => {
      resultados.primera.push($(el).text().trim());
    });

    $('.resultado-segunda .numero').each((i, el) => {
      resultados.segunda.push($(el).text().trim());
    });

    $('.resultado-revancha .numero').each((i, el) => {
      resultados.revancha.push($(el).text().trim());
    });

    $('.resultado-siempre .numero').each((i, el) => {
      resultados.siempre_sale.push($(el).text().trim());
    });

    return resultados;
  } catch (error) {
    console.error(`Error scraping TuJugada sorteo ${numero}:`, error.message);
    return null;
  }
};

router.get('/sorteos', async (req, res) => {
  try {
    const sorteos = await scrapearTuJugadaSorteos();
    
    res.json({
      message: 'Lista de sorteos TuJugada',
      cantidad: sorteos.length,
      data: sorteos
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo sorteos TuJugada', details: error.message });
  }
});

router.get('/sorteo/:numero', async (req, res) => {
  try {
    const { numero } = req.params;
    const resultados = await scrapearTuJugadaResultados(numero);
    
    if (resultados) {
      res.json({
        message: `Sorteo ${numero} - TuJugada`,
        data: {
          numero,
          fecha: new Date().toLocaleDateString(),
          resultados
        }
      });
    } else {
      res.status(404).json({ error: `Sorteo ${numero} no encontrado en TuJugada` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo sorteo TuJugada', details: error.message });
  }
});

module.exports = router;