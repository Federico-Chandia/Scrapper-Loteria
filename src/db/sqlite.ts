import Database from 'better-sqlite3';
import path from 'path';

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

const guardarSorteo = (sorteo: {
  numero: string;
  titulo: string;
  fecha: string;
  link: string;
  resultados: any; // lo guardamos stringificado
}) => {
  const existe = db.prepare('SELECT id FROM sorteos WHERE numero = ?').get(sorteo.numero);

  const resultadosString = JSON.stringify(sorteo.resultados);

  if (existe) {
    // Actualizar
    const stmt = db.prepare(`
      UPDATE sorteos
      SET titulo = ?, fecha = ?, link = ?, resultados = ?, fecha_scrapeo = CURRENT_TIMESTAMP
      WHERE numero = ?
    `);
    stmt.run(sorteo.titulo, sorteo.fecha, sorteo.link, resultadosString, sorteo.numero);
  } else {
    // Insertar
    const stmt = db.prepare(`
      INSERT INTO sorteos (numero, titulo, fecha, link, resultados)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(sorteo.numero, sorteo.titulo, sorteo.fecha, sorteo.link, resultadosString);
  }
};

const obtenerSorteoPorNumero = (numero: string) => {
  const row = db.prepare('SELECT * FROM sorteos WHERE numero = ?').get(numero) as any;
  if (row) {
    return {
      ...row,
      resultados: JSON.parse(row.resultados),
    };
  }
  return null;
};

const limpiarSorteosAntiguos = () => {
  // Mantener solo los últimos 10 sorteos
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

export { db, guardarSorteo, obtenerSorteoPorNumero, limpiarSorteosAntiguos, obtenerTodosSorteosBD };
