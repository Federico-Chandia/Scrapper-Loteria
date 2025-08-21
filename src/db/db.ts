import Database from 'better-sqlite3';

// Abrimos o creamos la base de datos (archivo en la raíz del proyecto)
const db = new Database('quini6_tickets.db');

// Crear tabla tickets si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_code TEXT UNIQUE,
    usuario TEXT,
    sorteo_numero INTEGER,
    fecha_compra TEXT,
    datos TEXT
  );
`);

// Función para insertar un ticket
export function guardarTicket(ticketCode: string, usuario: string, sorteoNumero: number, fechaCompra: string, datos: string) {
  const stmt = db.prepare(`INSERT INTO tickets (ticket_code, usuario, sorteo_numero, fecha_compra, datos) VALUES (?, ?, ?, ?, ?)`);
  try {
    const info = stmt.run(ticketCode, usuario, sorteoNumero, fechaCompra, datos);
    return info.lastInsertRowid;
  } catch (err) {
    if ((err as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Ticket duplicado');
    }
    throw err;
  }
}

// Función para obtener un ticket por código
export function obtenerTicketPorCodigo(ticketCode: string) {
  const stmt = db.prepare(`SELECT * FROM tickets WHERE ticket_code = ?`);
  return stmt.get(ticketCode);
}

// Ejemplo de uso (puedes borrar o comentar esta parte)
/*
const nuevoId = guardarTicket(
  'TICKET12345',
  'usuario1',
  3291,
  new Date().toISOString(),
  JSON.stringify({ numeros: [5,12,23,34,41,42] })
);
console.log('Ticket guardado con id:', nuevoId);

const ticket = obtenerTicketPorCodigo('TICKET12345');
console.log(ticket);
*/

export default db;
