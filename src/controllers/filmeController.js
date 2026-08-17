import { initDb } from '../database/db.js';
import { buscarFilmeOmdb } from '../services/omdbService.js';

// 1. Listar todos os filmes
export async function listarFilmes(req, res) {
  try {
    const db = await initDb();
    const filmes = await db.all('SELECT * FROM filmes ORDER BY criadoEm DESC');
    res.json(filmes);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar filmes no banco de dados.' });
  }
}

// 2. Buscar filme por ID
export async function buscarFilmePorId(req, res) {
  try {
    const { id } = req.params;
    const db = await initDb();
    const filme = await db.get('SELECT * FROM filmes WHERE id = ?', [id]);

    if (!filme) {
      return res.status(404).json({ mensagem: 'Filme não encontrado.' });
    }

    res.json(filme);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar filme.' });
  }
}

// 3. Cadastrar filme
export async function criarFilme(req, res) {
  try {
    const { nome, notaPessoal, status } = req.body;

    if (!nome) {
      return res.status(400).json({ mensagem: 'O nome do filme é obrigatório.' });
    }

    // Busca dados no OMDb
    const dadosOmdb = await buscarFilmeOmdb(nome);

    const novoFilme = {
      id: String(Date.now()),
      titulo: dadosOmdb ? dadosOmdb.Title : nome,
      ano: dadosOmdb ? dadosOmdb.Year : 'N/A',
      genero: dadosOmdb ? dadosOmdb.Genre : 'N/A',
      capaUrl: (dadosOmdb && dadosOmdb.Poster !== 'N/A') ? dadosOmdb.Poster : '',
      notaPessoal: Number(notaPessoal) || 0,
      status: status || 'Quero Assistir',
      criadoEm: new Date().toISOString()
    };

    const db = await initDb();
    await db.run(
      `INSERT INTO filmes (id, titulo, ano, genero, capaUrl, notaPessoal, status, criadoEm) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [novoFilme.id, novoFilme.titulo, novoFilme.ano, novoFilme.genero, novoFilme.capaUrl, novoFilme.notaPessoal, novoFilme.status, novoFilme.criadoEm]
    );

    res.status(201).json(novoFilme);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: 'Erro ao salvar filme.' });
  }
}

// 4. Atualizar nota ou status
export async function atualizarFilme(req, res) {
  try {
    const { id } = req.params;
    const { notaPessoal, status } = req.body;

    const db = await initDb();
    const filmeExistente = await db.get('SELECT * FROM filmes WHERE id = ?', [id]);

    if (!filmeExistente) {
      return res.status(404).json({ mensagem: 'Filme não encontrado.' });
    }

    const novaNota = notaPessoal !== undefined ? notaPessoal : filmeExistente.notaPessoal;
    const novoStatus = status !== undefined ? status : filmeExistente.status;

    await db.run(
      'UPDATE filmes SET notaPessoal = ?, status = ? WHERE id = ?',
      [novaNota, novoStatus, id]
    );

    res.json({ ...filmeExistente, notaPessoal: novaNota, status: novoStatus });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar filme.' });
  }
}

// 5. Deletar filme
export async function deletarFilme(req, res) {
  try {
    const { id } = req.params;
    const db = await initDb();

    const resultado = await db.run('DELETE FROM filmes WHERE id = ?', [id]);

    if (resultado.changes === 0) {
      return res.status(404).json({ mensagem: 'Filme não encontrado.' });
    }

    res.json({ mensagem: 'Filme removido com sucesso.' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao deletar filme.' });
  }
}