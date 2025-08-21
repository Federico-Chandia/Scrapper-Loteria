import express, { Request, Response, Router } from 'express'
import * as cheerio from 'cheerio';
import { Sorteo } from '../../interfaces/Sorteo';
import { ResultadoSorteo } from '../../interfaces/ResultadosSorteo';
import { Numero, TodosLosNumeros } from '../../interfaces/TodosLosNumeros';
import { guardarSorteo, obtenerSorteoPorNumero, limpiarSorteosAntiguos } from '../../db/sqlite';


const axios = require('axios').default;
const router: Router = express.Router();

const obtenerListaSorteos = async (): Promise<Sorteo[]> => {
  const url = 'https://www.quini-6-resultados.com.ar/quini6/sorteos-anteriores.aspx';
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const sorteos: Sorteo[] = [];
    $('div.col-md-3 p a').each((i, el) => {
      const tit = $(el).text().split('del ');
      sorteos[i] = {
        numero: tit[0].replace('Sorteo ', ''),
        titulo: tit[0],
        fecha: tit[1].replace(/-/g, '/').trim(),
        link: $(el).attr('href') || '',
      };
    });
    return sorteos;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Función helper para parsear un bloque de resultados de sorteo
const parsearBloqueSorteo = (
  $: cheerio.CheerioAPI,
  tituloBusqueda: string,
  tituloResultado: string,
  selectorFilasPremios: string
) => {
  const numerosRaw = $(`h3:contains("${tituloBusqueda}")`).next().text().trim();
  const numeros = numerosRaw.replace(/-/g, ',').replace(/\s/g, '');

  const premios: { aciertos: string; ganadores: string; premio: string }[] = [];

  $(selectorFilasPremios).nextUntil('tr.verde').each((_, el) => {
    const tds = $(el).find('td').toArray();
    premios.push({
      aciertos: $(tds[0]).text().trim(),
      ganadores: $(tds[1]).text().trim(),
      premio: $(tds[2]).text().trim(),
    });
  });

  return {
    titulo: tituloResultado,
    numeros,
    premios,
  };
};

const obtenerResultadoSorteo = async (nroSorteo: number): Promise<ResultadoSorteo> => {
  // Primero verificar si existe en la base de datos
  const sorteoEnBD = obtenerSorteoPorNumero(nroSorteo.toString());
  if (sorteoEnBD) {
    return {
      infoSorteo: [{
        numero: sorteoEnBD.numero,
        titulo: sorteoEnBD.titulo,
        fecha: sorteoEnBD.fecha,
        link: sorteoEnBD.link
      }],
      resultados: sorteoEnBD.resultados
    };
  }

  // Si no existe, hacer scraping
  const listaSorteos = await obtenerListaSorteos();
  const resBusca = listaSorteos.find((s) => s.numero === nroSorteo.toString());

  if (!resBusca) throw new Error(`Sorteo número ${nroSorteo} no encontrado`);

  const url2Get = resBusca.link;
  const retorno: ResultadoSorteo = {
    infoSorteo: [resBusca],
    resultados: [],
  };

  const response = await axios.get(url2Get);
  const $ = cheerio.load(response.data);

  retorno.resultados.push(
    parsearBloqueSorteo($, 'SORTEO TRADICIONAL', 'SORTEO TRADICIONAL', 'tr.verde:contains("SORTEO TRADICIONAL")'),
    parsearBloqueSorteo($, 'LA SEGUNDA DEL QUINI', 'LA SEGUNDA DEL QUINI', 'tr.verde:contains("LA SEGUNDA DEL QUINI 6")'),
    parsearBloqueSorteo($, 'SORTEO REVANCHA', 'SORTEO REVANCHA', 'tr.verde:contains("LA SEGUNDA DEL QUINI 6 REVANCHA")'),
    parsearBloqueSorteo($, 'QUE SIEMPRE SALE', 'SIEMPRE SALE', 'tr.verde:contains("EL QUINI QUE SIEMPRE SALE")')
  );

  // POZO EXTRA tiene formato distinto, lo armamos aparte
  const pozoExtraPremios: { aciertos: string; ganadores: string; premio: string }[] = [];
  $('tr.verde:contains("QUINI 6 POZO EXTRA")').nextUntil('tr.verde').each((_, el) => {
    const tds = $(el).find('td').toArray();
    pozoExtraPremios.push({
      aciertos: $(tds[0]).text().trim(),
      ganadores: $(tds[1]).text().trim(),
      premio: $(tds[2]).text().trim(),
    });
  });
  retorno.resultados.push({
    titulo: 'POZO EXTRA',
    numeros: 'Se reparte entre los que tengan seis aciertos contando los tres primeros sorteos. Los números repetidos se cuentan solo una vez.',
    premios: pozoExtraPremios,
  });

  // Guardar en base de datos
  guardarSorteo({
    numero: resBusca.numero,
    titulo: resBusca.titulo,
    fecha: resBusca.fecha,
    link: resBusca.link,
    resultados: retorno.resultados
  });
  
  // Limpiar sorteos antiguos, mantener solo los últimos 10
  limpiarSorteosAntiguos();

  return retorno;
};

const obtenerTodosLosSorteos = async (): Promise<ResultadoSorteo[]> => {
  const listaSorteos = await obtenerListaSorteos();
  listaSorteos.sort((a, b) => parseInt(b.numero) - parseInt(a.numero)); // Descendente
  
  // Solo obtener los últimos 10 sorteos
  const ultimos10 = listaSorteos.slice(0, 10);
  return Promise.all(ultimos10.map((item) => obtenerResultadoSorteo(parseInt(item.numero))));
};

router.get('/', (_req, res) => {
  res.send('🎯 API de Quini 6 funcionando correctamente');
});

router.get('/sorteos', async (_req, res) => {
  try {
    const datos = await obtenerListaSorteos();
    datos.sort((a, b) => parseInt(b.numero) - parseInt(a.numero));
    res.status(200).json({
      message: 'Sorteos obtenidos exitosamente',
      cantidad: datos.length,
      data: datos,
    });
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

router.get('/sorteo/:sorteoNro', (async (_req: Request, res: Response) => {
  const { sorteoNro } = _req.params;
  if (!sorteoNro) {
    return res.status(500).json({ status: 500, message: 'Debe enviar el parametro sorteoNro' });
  }
  try {
    const datos = await obtenerResultadoSorteo(parseInt(sorteoNro));
    return res.status(200).json({ message: 'Resultados del sorteo obtenidos exitosamente', data: datos });
  } catch (error) {
    return res.status(400).json({ message: error });
  }
}) as unknown as express.RequestHandler);


router.get('/todoslosnumeros', async (_req, res) => {
  try {
    const datos = await obtenerTodosLosSorteos();

    const datosFinales: TodosLosNumeros = { tiposorteo: [] };

    const numerosTradicional: Numero[] = [];
    const numerosSegunda: Numero[] = [];
    const numerosRevancha: Numero[] = [];
    const numerosSiempreSale: Numero[] = [];
    const numArre: string[] = [];

    for (const dataSorteo of datos) {
      for (const resultado of dataSorteo.resultados) {
        if (resultado.titulo === 'POZO EXTRA') continue;

        switch (resultado.titulo) {
          case 'SORTEO TRADICIONAL':
            numerosTradicional.push({
              fecha: dataSorteo.infoSorteo[0].fecha,
              numero: dataSorteo.infoSorteo[0].numero,
              numeros: resultado.numeros,
            });
            break;
          case 'LA SEGUNDA DEL QUINI':
            numerosSegunda.push({
              fecha: dataSorteo.infoSorteo[0].fecha,
              numero: dataSorteo.infoSorteo[0].numero,
              numeros: resultado.numeros,
            });
            break;
          case 'SORTEO REVANCHA':
            numerosRevancha.push({
              fecha: dataSorteo.infoSorteo[0].fecha,
              numero: dataSorteo.infoSorteo[0].numero,
              numeros: resultado.numeros,
            });
            break;
          case 'SIEMPRE SALE':
            numerosSiempreSale.push({
              fecha: dataSorteo.infoSorteo[0].fecha,
              numero: dataSorteo.infoSorteo[0].numero,
              numeros: resultado.numeros,
            });
            break;
        }
        numArre.push(resultado.numeros);
      }
    }

    datosFinales.tiposorteo.push(
      { titulo: 'SORTEO TRADICIONAL', numeros: numerosTradicional },
      { titulo: 'LA SEGUNDA DEL QUINI', numeros: numerosSegunda },
      { titulo: 'SORTEO REVANCHA', numeros: numerosRevancha },
      { titulo: 'SIEMPRE SALE', numeros: numerosSiempreSale }
    );

    res.status(200).json({
      message: 'Todos los números históricos obtenidos exitosamente',
      data: datosFinales,
      todosLosNumerosEver: numArre,
    });
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

export default router;
