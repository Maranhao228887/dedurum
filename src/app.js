import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import filmeRoutes from './routes/filmeRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

// Aponta para a pasta public dentro de src
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api/filmes', filmeRoutes);

export default app;