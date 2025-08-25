const app = require('./app');

const port = Number(process.env.PORT) || 5000;

// Hacer que escuche en 0.0.0.0 para que otros dispositivos en la red lo vean
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server escuchando en: http://0.0.0.0:${port}`);
  console.log(`🌐 Acceso desde otra máquina: http://<TU_IP_LOCAL>:${port}`);
});