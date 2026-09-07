import { initDb } from '../database/db.js';
import { buscarFilmeOmdb, buscarFilmesOmdb, buscarDadosTmdbPtBr } from '../services/omdbService.js';

// 1. Pesquisar filme na API OMDb (sem salvar no banco)
export async function pesquisarFilmesOmdb(req, res) {
  try {
    const { nome } = req.query;

    if (!nome) {
      return res.status(400).json({ mensagem: 'Informe o nome do filme para pesquisar.' });
    }

    if (req.query.lista === 'true') {
      const filmes = await buscarFilmesOmdb(nome);

      if (filmes.length === 0) {
        return res.status(404).json({ mensagem: 'Filme não encontrado na base de dados.' });
      }

      return res.json(filmes);
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

// 2.5. Atualizar tradução de filmes existentes
export async function atualizarTraducoes(req, res) {
  try {
    const db = await initDb();
    // Busca TODOS os filmes
    const filmes = await db.all('SELECT id, titulo FROM filmes');

    if (filmes.length === 0) {
      return res.json({ mensagem: 'Nenhum filme para atualizar.', atualizados: 0 });
    }

    let atualizados = 0;
    for (const filme of filmes) {
      try {
        const dadosTmdb = await buscarDadosTmdbPtBr(filme.titulo);
        
        if (dadosTmdb) {
          await db.run(
            'UPDATE filmes SET tituloTraduzido = ?, tituloEn = ?, capaUrl = ? WHERE id = ?',
            [dadosTmdb.tituloTraduzido, filme.titulo, dadosTmdb.poster, filme.id]
          );
          atualizados++;
          console.log(`✓ Atualizado: ${filme.titulo} → ${dadosTmdb.tituloTraduzido}`);
        }
      } catch (error) {
        console.error(`✗ Erro ao atualizar filme ${filme.id}:`, error.message);
      }
    }

    res.json({ 
      mensagem: `${atualizados}/${filmes.length} filme(s) atualizado(s) com sucesso.`,
      atualizados,
      total: filmes.length
    });
  } catch (error) {
    console.error('Erro ao atualizar traduções:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar traduções.' });
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

export async function mostrarAvaliacaoPublica(req, res) {
  try {
    const { id } = req.params;
    const db = await initDb();
    const filme = await db.get(
      'SELECT id, titulo, tituloTraduzido, notaPessoal, comentario, capaUrl FROM filmes WHERE id = ?',
      [id]
    );

    if (!filme) {
      return res.status(404).send('<h1>Avaliação não encontrada</h1>');
    }

    const nota = Number(filme.notaPessoal ?? 0);
    const comentario = filme.comentario ? String(filme.comentario).trim() : 'Sem comentário.';
    const titulo = String(filme.tituloTraduzido || filme.titulo || 'Filme');
    const capaUrl = filme.capaUrl || 'https://via.placeholder.com/180x260?text=Sem+Capa';

    const estrelas = '★'.repeat(nota) + '☆'.repeat(5 - nota);
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${titulo} - Avaliação</title>
          <style>
            :root {
              --bg: #0f172a;
              --bg-2: #111827;
              --panel: rgba(15, 23, 42, 0.9);
              --line: rgba(148, 163, 184, 0.25);
              --text: #f8fafc;
              --muted: #cbd5e1;
              --gold: #fbbf24;
              --gold-soft: #fde68a;
              --accent: #7c3aed;
            }

            * { box-sizing: border-box; }

            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: radial-gradient(circle at top, #1e293b 0%, var(--bg) 40%, var(--bg-2) 100%);
              color: var(--text);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 24px;
            }

            .card {
              max-width: 760px;
              width: 100%;
              background: var(--panel);
              border: 1px solid var(--line);
              border-radius: 24px;
              padding: 32px;
              box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
            }

            .header-section {
              display: flex;
              gap: 20px;
              align-items: flex-start;
              margin-bottom: 20px;
            }

            .poster {
              width: 120px;
              min-width: 120px;
              height: 180px;
              border-radius: 12px;
              object-fit: cover;
              border: 1px solid var(--line);
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            }

            .header-content {
              flex: 1;
            }

            .badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: rgba(251, 191, 36, 0.14);
              border: 1px solid rgba(251, 191, 36, 0.35);
              color: var(--gold-soft);
              border-radius: 999px;
              padding: 8px 14px;
              font-weight: 700;
              letter-spacing: 0.04em;
              margin-bottom: 18px;
            }

            h1 {
              margin: 0 0 12px;
              font-size: clamp(1.5rem, 3vw, 2.2rem);
              line-height: 1.1;
            }

            .stars {
              color: var(--gold);
              font-size: 1.7rem;
              letter-spacing: 0.06em;
              margin: 6px 0 18px;
            }

            .label {
              display: block;
              color: var(--muted);
              font-size: 0.8rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              margin-bottom: 10px;
            }

            .comment {
              background: rgba(148, 163, 184, 0.08);
              border: 1px solid rgba(148, 163, 184, 0.2);
              border-radius: 16px;
              padding: 18px 20px;
              font-size: 1.05rem;
              line-height: 1.8;
              color: #e2e8f0;
              white-space: pre-wrap;
            }

            .meta {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              margin-top: 28px;
              padding-top: 20px;
              border-top: 1px solid rgba(148, 163, 184, 0.2);
              color: var(--muted);
              font-size: 0.95rem;
            }

            .pill {
              background: rgba(124, 58, 237, 0.18);
              border: 1px solid rgba(168, 85, 247, 0.35);
              border-radius: 999px;
              padding: 6px 10px;
              color: #ddd6fe;
            }

            @media (max-width: 600px) {
              .header-section {
                flex-direction: column;
                align-items: center;
                text-align: center;
              }

              .poster {
                width: 100px;
                height: 150px;
              }

              h1 {
                font-size: 1.5rem;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header-section">
              <img src="${capaUrl}" alt="Pôster de ${titulo}" class="poster" />
              <div class="header-content">
                <div class="badge">🎬 Minha avaliação</div>
                <h1>${titulo}</h1>
                <div class="stars" aria-label="Nota ${nota} de 5">${estrelas}</div>
              </div>
            </div>
            <span class="label">Comentário</span>
            <div class="comment">${comentario}</div>
            <div class="meta">
              <span>Nota: ${nota}/5</span>
              <span class="pill">Cineflix</span>
            </div>
          </div>
        </body>
      </html>
    `;

    res.type('html').send(html);
  } catch (error) {
    console.error('Erro ao carregar avaliação pública:', error);
    res.status(500).send('<h1>Erro ao carregar avaliação.</h1>');
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
      titulo: dadosOmdb ? (dadosOmdb.TituloTraduzido || dadosOmdb.Title) : nome,
      tituloEn: dadosOmdb ? dadosOmdb.Title : nome,
      tituloTraduzido: dadosOmdb ? (dadosOmdb.TituloTraduzido || dadosOmdb.Title) : nome,
      ano: dadosOmdb ? dadosOmdb.Year : 'N/A',
      genero: dadosOmdb ? dadosOmdb.Genre : 'N/A',
      capaUrl: (dadosOmdb && dadosOmdb.Poster !== 'N/A') ? dadosOmdb.Poster : (dadosOmdb?.PosterUrl || ''),
      status: status || 'Quero Assistir',
      criadoEm: new Date().toISOString()
    };

    const db = await initDb();
    await db.run(
      `INSERT INTO filmes (id, titulo, tituloEn, tituloTraduzido, ano, genero, capaUrl, status, criadoEm) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [novoFilme.id, novoFilme.titulo, novoFilme.tituloEn, novoFilme.tituloTraduzido, novoFilme.ano, novoFilme.genero, novoFilme.capaUrl, novoFilme.status, novoFilme.criadoEm]
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
    const { status, notaPessoal, comentario } = req.body;

    const db = await initDb();
    const filmeExistente = await db.get('SELECT * FROM filmes WHERE id = ?', [id]);

    if (!filmeExistente) {
      return res.status(404).json({ mensagem: 'Filme não encontrado.' });
    }

    const novoStatus = status !== undefined ? status : filmeExistente.status;
    const atualizacaoAvaliacao = notaPessoal !== undefined || comentario !== undefined;

    if (atualizacaoAvaliacao && filmeExistente.status !== 'Já Assistido') {
      return res.status(400).json({ mensagem: 'A avaliação só pode ser adicionada a filmes já assistidos.' });
    }

    if (notaPessoal !== undefined && (!Number.isInteger(notaPessoal) || notaPessoal < 1 || notaPessoal > 5)) {
      return res.status(400).json({ mensagem: 'A nota deve ser um número inteiro entre 1 e 5.' });
    }

    await db.run(
      `UPDATE filmes
       SET status = ?,
           notaPessoal = COALESCE(?, notaPessoal),
           comentario = COALESCE(?, comentario)
       WHERE id = ?`,
      [novoStatus, notaPessoal ?? null, comentario ?? null, id]
    );

    const filmeAtualizado = await db.get('SELECT * FROM filmes WHERE id = ?', [id]);
    res.json(filmeAtualizado);
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