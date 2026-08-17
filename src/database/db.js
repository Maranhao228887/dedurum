import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Abre (ou cria) o arquivo de banco de dados
export async function initDb() {
  const db = await open({
    filename: path.join(__dirname, 'catalog.db'),
    driver: sqlite3.Database
  });

  // Cria a tabela de filmes se não existir
  await db.exec(`
    CREATE TABLE IF NOT EXISTS filmes (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      ano TEXT,
      genero TEXT,
      capaUrl TEXT,
      notaPessoal INTEGER,
      status TEXT,
      criadoEm TEXT
    )
  `);

  return db;
}