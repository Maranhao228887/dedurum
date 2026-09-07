import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import filmeRoutes from './routes/filmeRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const publicUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/config.js', (_, res) => {
  res.type('application/javascript');
  res.send(`window.APP_PUBLIC_URL = ${JSON.stringify(publicUrl)};`);
});
app.use('/api/filmes', filmeRoutes);

export default app;