import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import filmeRoutes from './routes/filmeRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Permite que a API leia requisições em formato JSON
app.use(express.json());

// Serve os arquivos estáticos do frontend (HTML, CSS e JS do cliente)
app.use(express.static(path.join(__dirname, 'public')));

// Registra as rotas de filmes com o prefixo /api/filmes
app.use('/api/filmes', filmeRoutes);

export default app;