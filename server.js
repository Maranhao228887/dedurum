import 'dotenv/config.js';
import app from './src/app.js';

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve(port);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(startServer(port + 1));
        return;
      }

      reject(error);
    });
  });
}

const preferredPort = Number(process.env.PORT) || 3000;

const PORT = await startServer(preferredPort);

console.log(`🚀 Servidor rodando na porta ${PORT}`);
console.log(`📍 Base URL: http://localhost:${PORT}/api/filmes`);