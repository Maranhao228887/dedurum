import { initDb } from '../database/db.js';
import { buscarFilmeOmdb } from '../services/omdbService.js';

// 1. Pesquisar filme na API OMDb (sem salvar no banco)
export async function pesquisarFilmesOmdb(req, res) {
  try {
    const { nome } = req.query;

    if (!nome) {
      return res.status(400).json({ mensagem: 'Informe o nome do filme para pesquisar.' });
    }

    const dadosOmdb = await buscarFilmeOmdb(nome);

    if (!dadosOmdb) {
      return res.status(404).json({ mensagem: 'Filme não encontrado na base de dados do OMDb.' });
    }

    res.json(dadosOmdb);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao consultar o serviço de busca.' });
  }
}

// 2. Listar todos os filmes salvos na Minha Lista
export async function listarFilmes(req, res) {
  try {
    const db = await initDb();
    const filmes = await db.all('SELECT * FROM filmes ORDER BY criadoEm DESC');
    res.json(filmes);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar filmes no banco de dados.' });
  }
}

// 3. Buscar filme por ID
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

// 4. Cadastrar filme na Minha Lista (Quero Assistir ou Já Assistido)
export async function criarFilme(req, res) {
  try {
    const { nome, status } = req.body;

    if (!nome) {
      return res.status(400).json({ mensagem: 'O nome do filme é obrigatório.' });
    }

    // Busca os detalhes do filme no OMDb
    const dadosOmdb = await buscarFilmeOmdb(nome);

    const novoFilme = {
      id: String(Date.now()),
      titulo: dadosOmdb ? dadosOmdb.Title : nome,
      ano: dadosOmdb ? dadosOmdb.Year : 'N/A',
      genero: dadosOmdb ? dadosOmdb.Genre : 'N/A',
      capaUrl: (dadosOmdb && dadosOmdb.Poster !== 'N/A') ? dadosOmdb.Poster : '',
      status: status || 'Quero Assistir',
      criadoEm: new Date().toISOString()
    };

    const db = await initDb();
    await db.run(
      `INSERT INTO filmes (id, titulo, ano, genero, capaUrl, status, criadoEm) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [novoFilme.id, novoFilme.titulo, novoFilme.ano, novoFilme.genero, novoFilme.capaUrl, novoFilme.status, novoFilme.criadoEm]
    );

    res.status(201).json(novoFilme);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: 'Erro ao salvar filme na lista.' });
  }
}

// 5. Atualizar apenas o status do filme (via menu de 3 pontinhos)
export async function atualizarFilme(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const db = await initDb();
    const filmeExistente = await db.get('SELECT * FROM filmes WHERE id = ?', [id]);

    if (!filmeExistente) {
      return res.status(404).json({ mensagem: 'Filme não encontrado.' });
    }

    const novoStatus = status !== undefined ? status : filmeExistente.status;

    await db.run(
      'UPDATE filmes SET status = ? WHERE id = ?',
      [novoStatus, id]
    );

    res.json({ ...filmeExistente, status: novoStatus });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar status do filme.' });
  }
}

// 6. Deletar filme da lista
export async function deletarFilme(req, res) {
  try {
    const { id } = req.params;
    const db = await initDb();

    const resultado = await db.run('DELETE FROM filmes WHERE id = ?', [id]);

    if (resultado.changes === 0) {
      return res.status(404).json({ mensagem: 'Filme não encontrado.' });
    }

    res.json({ mensagem: 'Filme removido da lista com sucesso.' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao deletar filme.' });
  }
}