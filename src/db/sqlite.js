const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/quini6.db' 
  : path.resolve(__dirname, '../../quini6.db');
const db = new Database(dbPath);

const initDb = () => {
  const createTable = `
    CREATE TABLE IF NOT EXISTS sorteos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE,
      titulo TEXT,
      fecha TEXT,
      link TEXT,
      resultados TEXT,
      fecha_scrapeo DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.prepare(createTable).run();
};

initDb();

const guardarSorteo = (sorteo) => {
  const existe = db.prepare('SELECT id FROM sorteos WHERE numero = ?').get(sorteo.numero);
  const resultadosString = JSON.stringify(sorteo.resultados);

  if (existe) {
    const stmt = db.prepare(`
      UPDATE sorteos
      SET titulo = ?, fecha = ?, link = ?, resultados = ?, fecha_scrapeo = CURRENT_TIMESTAMP
      WHERE numero = ?
    `);
    stmt.run(sorteo.titulo, sorteo.fecha, sorteo.link, resultadosString, sorteo.numero);
  } else {
    const stmt = db.prepare(`
      INSERT INTO sorteos (numero, titulo, fecha, link, resultados)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(sorteo.numero, sorteo.titulo, sorteo.fecha, sorteo.link, resultadosString);
  }
};

const obtenerSorteoPorNumero = (numero) => {
  const row = db.prepare('SELECT * FROM sorteos WHERE numero = ?').get(numero);
  if (row) {
    return {
      ...row,
      resultados: JSON.parse(row.resultados),
    };
  }
  return null;
};

const limpiarSorteosAntiguos = () => {
  const stmt = db.prepare(`
    DELETE FROM sorteos 
    WHERE id NOT IN (
      SELECT id FROM sorteos 
      ORDER BY CAST(numero AS INTEGER) DESC 
      LIMIT 10
    )
  `);
  stmt.run();
};

const obtenerTodosSorteosBD = () => {
  const stmt = db.prepare('SELECT * FROM sorteos ORDER BY CAST(numero AS INTEGER) DESC');
  return stmt.all();
};

module.exports = { db, guardarSorteo, obtenerSorteoPorNumero, limpiarSorteosAntiguos, obtenerTodosSorteosBD };