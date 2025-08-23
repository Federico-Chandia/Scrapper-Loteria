const appModule = require('./app');
const server = appModule.default;

const port = Number(process.env.PORT) || 5000;

// Hacer que escuche en 0.0.0.0 para que otros dispositivos en la red lo vean
server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server escuchando en: http://0.0.0.0:${port}`);
  console.log(`🌐 Acceso desde otra máquina: http://<TU_IP_LOCAL>:${port}`);
});
