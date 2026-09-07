import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDb() {
  const db = await open({
    filename: path.join(__dirname, 'catalog.db'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS filmes (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      tituloEn TEXT,
      tituloTraduzido TEXT,
      ano TEXT,
      genero TEXT,
      capaUrl TEXT,
      status TEXT,
      notaPessoal INTEGER,
      comentario TEXT,
      criadoEm TEXT
    )
  `);

  const colunas = await db.all('PRAGMA table_info(filmes)');
  const nomesColunas = colunas.map((coluna) => coluna.name);

  if (!nomesColunas.includes('notaPessoal')) {
    await db.exec('ALTER TABLE filmes ADD COLUMN notaPessoal INTEGER');
  }

  if (!nomesColunas.includes('comentario')) {
    await db.exec('ALTER TABLE filmes ADD COLUMN comentario TEXT');
  }

  if (!nomesColunas.includes('tituloEn')) {
    await db.exec('ALTER TABLE filmes ADD COLUMN tituloEn TEXT');
  }

  if (!nomesColunas.includes('tituloTraduzido')) {
    await db.exec('ALTER TABLE filmes ADD COLUMN tituloTraduzido TEXT');
  }

  return db;
}