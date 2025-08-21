import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { guardarSorteo, obtenerSorteoPorNumero } from '../db/sqlite'


export const quini6Oficial = async (req: Request, res: Response) => {
  try {
    const url = 'https://www.loteriasantafe.gov.ar/index.php/resultados/quini-6';
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    const resultados: any = [];

    $('.content-resultados .content-sorteo').each((_, el) => {
      const tipo = $(el).find('.title-sorteo').text().trim();
      const fecha = $(el).find('.fecha-sorteo').text().trim();
      const numeros = $(el).find('.bolillas .bolilla').map((_, b) => $(b).text().trim()).get();
      const premios: any[] = [];

      $(el).find('.tabla-premios tr').each((_, row) => {
        const columnas = $(row).find('td');
        if (columnas.length === 4) {
          premios.push({
            aciertos: $(columnas[0]).text().trim(),
            ganadores: $(columnas[1]).text().trim(),
            monto: $(columnas[2]).text().trim(),
            localidad: $(columnas[3]).text().trim()
          });
        }
      });

      resultados.push({
        tipo,
        fecha,
        numeros,
        premios
      });
    });

    res.json({
      origen: 'Lotería de Santa Fe',
      resultados,
    });

  } catch (error) {
    console.error('Error al obtener los datos:', error);
    res.status(500).json({ error: 'Error al obtener los resultados oficiales' });
  }
};
