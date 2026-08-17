import 'dotenv/config.js';
import app from './src/app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Base URL: http://localhost:${PORT}/api/filmes`);
});