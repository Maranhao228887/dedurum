const API_URL = '/api/filmes';
const API_KEY = 'sua_chave_copiada_aqui';
const APP_PUBLIC_URL = window.APP_PUBLIC_URL || window.location.origin;
let listaFilmesCache = [];
let filtroAtual = 'todos';
let ordenacaoAtual = 'recentes';
let timeoutId; // Para debounce da busca em tempo real

// ===== BUSCA EM TEMPO REAL COM DROPDOWN =====
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const savedMoviesSection = document.getElementById('savedMoviesSection');
const clearSearchBtn = document.getElementById('clearSearchBtn');

function updateSearchClearButton() {
  if (!clearSearchBtn || !searchInput) return;
  const hasValue = searchInput.value.trim().length > 0;
  clearSearchBtn.classList.toggle('visible', hasValue);
}

function clearSearch() {
  if (!searchInput) return;
  searchInput.value = '';
  searchResults.style.display = 'none';
  searchResults.innerHTML = '';
  if (savedMoviesSection) savedMoviesSection.classList.remove('hidden');
  updateSearchClearButton();
  searchInput.focus();
}

function showToast(message) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, 2200);
}

function compartilharAvaliacao(tituloFilme, nota, comentario = '', reviewUrl = '') {
  const textoAvaliacao = comentario
    ? `Eu avaliei ${tituloFilme} com nota ${nota}/5. Comentário: "${comentario}"`
    : `Eu avaliei ${tituloFilme} com nota ${nota}/5.`;

  if (!reviewUrl) {
    showToast('Link da avaliação não disponível.');
    return;
  }

  if (navigator.share) {
    navigator.share({
      title: `Minha avaliação de ${tituloFilme}`,
      text: textoAvaliacao,
      url: reviewUrl,
    }).catch((err) => console.log('Erro ao compartilhar:', err));
    return;
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(reviewUrl)
      .then(() => {
        showToast('Link da avaliação copiado para a área de transferência!');
      })
      .catch(() => {
        showToast('Não foi possível copiar o link da avaliação.');
      });
    return;
  }

  showToast('Compartilhamento não disponível neste navegador.');
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    updateSearchClearButton();

    if (query.length > 0) {
      if (savedMoviesSection) savedMoviesSection.classList.add('hidden');
    } else {
      if (savedMoviesSection) savedMoviesSection.classList.remove('hidden');
    }

    clearTimeout(timeoutId);

    if (query.length < 2) {
      searchResults.style.display = 'none';
      searchResults.innerHTML = '';
      return;
    }

    timeoutId = setTimeout(() => {
      fetchMoviesRealtime(query);
    }, 300);
  });

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearch);
  }

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });

  updateSearchClearButton();
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && movieModal) {
    movieModal.classList.remove('active');
  }
});

async function fetchMoviesRealtime(query) {
  try {
    const response = await fetch(`${API_URL}/buscar?nome=${encodeURIComponent(query)}&lista=true`);
    const data = await response.json();

    displayRealtimeResults(data);
  } catch (error) {
    console.error('Erro ao buscar filmes em tempo real:', error);
  }
}

function displayRealtimeResults(movies) {
  searchResults.innerHTML = '';

  if (!Array.isArray(movies) || movies.length === 0) {
    searchResults.style.display = 'none';
    return;
  }

  movies.slice(0, 10).forEach((movie) => {
    const posterPath = movie.Poster !== 'N/A'
      ? movie.Poster
      : 'https://via.placeholder.com/45x68?text=Sem+Capa';
    
    const titulo = movie.TituloTraduzido || movie.Title || 'Título não informado';

    const item = document.createElement('div');
    item.classList.add('result-item');
    item.innerHTML = `
      <img src="${posterPath}" alt="${titulo}">
      <div class="result-info">
        <h4>${titulo}</h4>
        <span>${movie.Year || 'N/A'}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      searchInput.value = movie.OriginalTitle || movie.Title;
      searchResults.style.display = 'none';
      buscarFilme();
    });

    searchResults.appendChild(item);
  });
  searchResults.style.display = 'block';
}

function displaySearchMovies(movies) {
  const container = document.getElementById('searchResult');

  if (!Array.isArray(movies) || movies.length === 0) {
    container.innerHTML = '<p style="color: #f87171;">Nenhum filme encontrado.</p>';
    return;
  }

  container.innerHTML = `
    <div class="search-movies-grid">
      ${movies.slice(0, 10).map((movie) => {
        const posterPath = movie.Poster !== 'N/A'
          ? movie.Poster
          : 'https://via.placeholder.com/180x260?text=Sem+Capa';
        const title = movie.TituloTraduzido || movie.Title || 'Título não informado';
        const titleForSearch = movie.OriginalTitle || movie.Title;

        return `
          <button class="search-movie-card" type="button" data-title="${titleForSearch.replace(/"/g, '&quot;')}">
            <img src="${posterPath}" alt="Capa de ${title}">
            <span class="search-movie-info">
              <strong>${title}</strong>
              <small>${movie.Year || 'N/A'}</small>
            </span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.search-movie-card').forEach((card) => {
    card.addEventListener('click', () => {
      searchInput.value = card.dataset.title;
      buscarFilme();
    });
  });
}

// Função para exibir múltiplos resultados (para APIs que retornam array)
function displayResults(movies) {
  searchResults.innerHTML = '';

  if (!movies || movies.length === 0) {
    searchResults.style.display = 'none';
    return;
  }

  movies.slice(0, 5).forEach(movie => {
    // Suporta tanto TMDB (poster_path) quanto OMDb (Poster)
    const posterPath = movie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : (movie.Poster && movie.Poster !== 'N/A' 
        ? movie.Poster 
        : 'https://via.placeholder.com/45x65?text=Sem+Capa');

    const title = movie.TituloTraduzido || movie.title || movie.Title;
    const year = movie.release_date 
      ? movie.release_date.split('-')[0]
      : (movie.Year || 'N/A');

    const item = document.createElement('div');
    item.classList.add('result-item');
    item.innerHTML = `
      <img src="${posterPath}" alt="${title}">
      <div class="result-info">
        <h4>${title}</h4>
        <span>${year}</span>
      </div>
    `;

    // Ao clicar no filme do dropdown
    item.addEventListener('click', () => {
      searchInput.value = title;
      searchResults.style.display = 'none';
      buscarFilme();
    });

    searchResults.appendChild(item);
  });

  searchResults.style.display = 'block';
}

// ===== FIM BUSCA EM TEMPO REAL =====

// ===== TRAILERS E CARDS COM TMDB =====
// Função para buscar a chave do trailer no TMDb
async function getMovieTrailerKey(movieId) {
  const url = `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${API_KEY}&language=pt-BR`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Procura por um vídeo do tipo "Trailer" no YouTube
    const trailer = data.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') || data.results[0];
    return trailer ? trailer.key : null;
  } catch (error) {
    console.error('Erro ao buscar trailer:', error);
    return null;
  }
}

// ===== MODAL DE DETALHES DO FILME =====
// Referências dos elementos do Modal
const movieModal = document.getElementById('movieModal');
const closeModal = document.getElementById('closeModal');

// Fechar modal no botão X ou ao clicar no fundo escuro
if (closeModal && movieModal) {
  closeModal.addEventListener('click', () => movieModal.classList.remove('active'));
  movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) movieModal.classList.remove('active');
  });
}

// Função para buscar TODOS os detalhes do filme e abrir o modal
async function openMovieDetails(movieId) {
  const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=pt-BR&append_to_response=credits`;

  try {
    const response = await fetch(url);
    const movie = await response.json();

    // 1. Capa
    document.getElementById('modalImg').src = movie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
      : 'https://via.placeholder.com/220x330?text=Sem+Capa';

    // 2. Título
    document.getElementById('modalTitle').textContent = movie.title;

    // 3. Metadados (Data, Duração, Nota)
    const releaseDate = movie.release_date 
      ? new Date(movie.release_date).toLocaleDateString('pt-BR') 
      : 'N/A';
    document.getElementById('modalDate').textContent = `📅 ${releaseDate}`;
    document.getElementById('modalRuntime').textContent = `⏱️ ${movie.runtime || '--'} min`;
    document.getElementById('modalRating').textContent = `⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}/10`;

    // 4. Gêneros
    const genresContainer = document.getElementById('modalGenres');
    genresContainer.innerHTML = '';
    if (movie.genres && movie.genres.length > 0) {
      movie.genres.forEach(g => {
        const badge = document.createElement('span');
        badge.classList.add('genre-badge');
        badge.textContent = g.name;
        genresContainer.appendChild(badge);
      });
    }

    // 5. Sinopse
    document.getElementById('modalOverview').textContent = movie.overview || 'Sinopse não disponível para este filme.';

    // 6. Diretor e Elenco
    const director = movie.credits?.crew?.find(c => c.job === 'Director');
    document.getElementById('modalDirector').textContent = director ? director.name : 'Não informado';

    const topCast = movie.credits?.cast?.slice(0, 4).map(c => c.name).join(', ');
    document.getElementById('modalCast').textContent = topCast || 'Não informado';

    // 7. Orçamento e Receita
    document.getElementById('modalBudget').textContent = movie.budget 
      ? `$ ${movie.budget.toLocaleString('en-US')}` 
      : 'Não informado';
    document.getElementById('modalRevenue').textContent = movie.revenue 
      ? `$ ${movie.revenue.toLocaleString('en-US')}` 
      : 'Não informado';

    // Exibe o modal adicionando a classe "active"
    movieModal.classList.add('active');

  } catch (error) {
    console.error('Erro ao buscar detalhes do filme:', error);
  }
}
// ===== FIM MODAL DE DETALHES DO FILME =====

// Função para criar o Card com evento de Hover para o Trailer
function createMovieCard(movie) {
  const card = document.createElement('div');
  card.classList.add('movie-card');

  const posterPath = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : 'https://via.placeholder.com/200x280?text=Sem+Capa';

  card.innerHTML = `
    <div class="media-container">
      <img src="${posterPath}" alt="${movie.title}">
      <iframe src="" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    </div>
    <div class="movie-info" style="padding: 10px;">
      <h4 style="margin: 0; color: #fff;">${movie.title}</h4>
      <span style="font-size: 12px; color: #888;">${movie.release_date ? movie.release_date.split('-')[0] : ''}</span>
      <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
        <button class="btn btn-want">+ Quero Assistir</button>
        <button class="btn btn-watched">✓ Já Assistido</button>
      </div>
    </div>
  `;

  const mediaContainer = card.querySelector('.media-container');
  const iframe = card.querySelector('iframe');
  let trailerKey = null;

  // 1. Clique na imagem/container para abrir o Modal de Detalhes
  mediaContainer.addEventListener('click', (e) => {
    openMovieDetails(movie.id);
  });

  // 2. Eventos de HOVER para o Trailer
  card.addEventListener('mouseenter', async () => {
    if (!trailerKey) {
      trailerKey = await getMovieTrailerKey(movie.id);
    }
    if (trailerKey) {
      iframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}`;
      card.classList.add('playing');
    }
  });

  card.addEventListener('mouseleave', () => {
    iframe.src = '';
    card.classList.remove('playing');
  });

  // 3. Impede que o clique nos botões abra o modal sem querer
  const buttons = card.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evita acionar o clique da imagem/card
    });
  });

  return card;
}
// ===== FIM TRAILERS E CARDS COM TMDB =====


function trocarAba(aba) {
  document.getElementById('searchSection').classList.toggle('active', aba === 'search');
  document.getElementById('listSection').classList.toggle('active', aba === 'list');
  document.getElementById('tabSearchBtn').classList.toggle('active', aba === 'search');
  document.getElementById('tabListBtn').classList.toggle('active', aba === 'list');

  if (aba === 'list') {
    carregarMinhaLista();
  }
}

// 2. Buscar Filme na OMDb
async function buscarFilmes() {
  const input = document.getElementById('searchInput');
  const query = input.value.trim();
  const container = document.getElementById('searchResult');

  if (!query) return;

  searchResults.style.display = 'none';
  container.innerHTML = '<p style="color: #94a3b8;">Buscando filmes...</p>';

  try {
    const res = await fetch(`${API_URL}/buscar?nome=${encodeURIComponent(query)}&lista=true`);
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<p style="color: #f87171;">${data.mensagem}</p>`;
      return;
    }

    displaySearchMovies(data);
  } catch (error) {
    console.error('Erro na busca:', error);
    container.innerHTML = '<p style="color: #f87171;">Erro ao conectar com o servidor.</p>';
  }
}

async function buscarFilme() {
  const input = document.getElementById('searchInput');
  const query = input.value.trim();
  const container = document.getElementById('searchResult');

  if (!query) return;

  container.innerHTML = '<p style="color: #94a3b8;">Buscando...</p>';

  try {
    const res = await fetch(`${API_URL}/buscar?nome=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<p style="color: #f87171;">${data.mensagem}</p>`;
      return;
    }

    container.innerHTML = `
      <div class="movie-card">
        <img src="${data.Poster !== 'N/A' ? data.Poster : 'https://via.placeholder.com/180x260?text=Sem+Capa'}" class="movie-poster" alt="${data.Title}">
        <div class="movie-info">
          <h3 class="movie-title">${data.Title}</h3>
          <p style="font-size: 0.75rem; color: #94a3b8;">${data.Year} • ${data.Genre}</p>
          <div class="btn-status-group">
            <button class="btn-add" onclick="salvarFilme('${data.Title.replace(/'/g, "\\'")}', 'Quero Assistir')">+ Quero Assistir</button>
            <button class="btn-add" onclick="salvarFilme('${data.Title.replace(/'/g, "\\'")}', 'Já Assistido')">✓ Já Assistido</button>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Erro na busca:', error);
    container.innerHTML = '<p style="color: #f87171;">Erro ao conectar com o servidor.</p>';
  }
}

function checarEnter(e) {
  if (e.key === 'Enter') buscarFilme();
}

// 3. Salvar Filme na Lista
async function salvarFilme(nome, status) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, status })
    });

    const data = await res.json();

    if (res.ok) {
      showToast(`Filme adicionado como "${status}".`);
      trocarAba('list');
    } else {
      showToast(data.mensagem || 'Não foi possível salvar o filme.');
    }
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showToast('Erro de conexão ao tentar salvar o filme.');
  }
}

// 4. Carregar Minha Lista
async function carregarMinhaLista() {
  try {
    const res = await fetch(API_URL);
    listaFilmesCache = await res.json();
    renderizarLista();
  } catch (error) {
    console.error('Erro ao carregar lista:', error);
  }
}

// 5. Renderizar Lista na Tela
function renderizarLista() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const filmesFiltrados = listaFilmesCache.filter(f =>
    filtroAtual === 'todos' ? true : f.status === filtroAtual
  );

  filmesFiltrados.sort((filmeA, filmeB) => {
    if (ordenacaoAtual === 'titulo') {
      return filmeA.titulo.localeCompare(filmeB.titulo, 'pt-BR');
    }

    const dataA = new Date(filmeA.criadoEm).getTime();
    const dataB = new Date(filmeB.criadoEm).getTime();
    return ordenacaoAtual === 'antigos' ? dataA - dataB : dataB - dataA;
  });

  if (filmesFiltrados.length === 0) {
    grid.innerHTML = '<div class="empty-state"><strong>Nenhum filme nesta categoria.</strong><span>Adicione um título à sua coleção para começar.</span></div>';
    return;
  }

  filmesFiltrados.forEach(filme => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const statusClass = filme.status === 'Já Assistido' ? 'badge-assistido' : 'badge-quero';

    card.innerHTML = `
      <div class="options-menu" id="menu-${filme.id}">
        <button class="dots-btn" onclick="toggleMenu(event, '${filme.id}')">⋮</button>
        <div class="dropdown-content">
          <button onclick="alterarStatus('${filme.id}', 'Quero Assistir')">Quero Assistir</button>
          <button onclick="compartilharAvaliacao('${(filme.tituloTraduzido || filme.titulo).replace(/'/g, "\\'")}', ${Number(filme.notaPessoal) || 0}, '${(filme.comentario || '').replace(/'/g, "\\'").replace(/\n/g, ' ')}', '${APP_PUBLIC_URL}/api/filmes/avaliacao/${filme.id}')">Compartilhar avaliação</button>
          <button onclick="alterarStatus('${filme.id}', 'Já Assistido')">Já Assistido</button>
          <button class="danger" onclick="deletarFilme('${filme.id}')">Excluir</button>
        </div>
      </div>
      <img src="${filme.capaUrl || 'https://via.placeholder.com/180x260?text=Sem+Capa'}" class="movie-poster" alt="${filme.tituloTraduzido || filme.titulo}">
      <div class="movie-info">
        <h3 class="movie-title">${filme.tituloTraduzido || filme.titulo}</h3>
        <p style="font-size: 0.75rem; color: #94a3b8;">${filme.ano || 'N/A'}</p>
        <span class="badge ${statusClass}">${filme.status}</span>
        ${filme.status === 'Já Assistido' ? `
          <form class="rating-form" data-id="${filme.id}">
            <fieldset>
              <legend>Sua avaliação</legend>
              <div class="star-rating" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
                ${[5, 4, 3, 2, 1].map((nota) => `
                  <input id="star-${filme.id}-${nota}" type="radio" name="nota-${filme.id}" value="${nota}" ${Number(filme.notaPessoal) === nota ? 'checked' : ''}>
                  <label for="star-${filme.id}-${nota}" title="${nota} estrela${nota > 1 ? 's' : ''}">★</label>
                `).join('')}
              </div>
            </fieldset>
            <textarea name="comentario" maxlength="500" placeholder="Escreva um comentário sobre o filme...">${filme.comentario || ''}</textarea>
            <button class="btn-save-rating" type="submit">Salvar avaliação</button>
          </form>
        ` : ''}
      </div>
    `;
    grid.appendChild(card);

    const ratingForm = card.querySelector('.rating-form');
    if (ratingForm) {
      ratingForm.addEventListener('submit', (event) => salvarAvaliacao(event, filme.id));
    }
  });
}

// 6. Menu Dropdown & Ações da Lista
function toggleMenu(e, id) {
  e.stopPropagation();
  document.querySelectorAll('.options-menu').forEach(m => {
    if (m.id !== `menu-${id}`) m.classList.remove('active');
  });
  document.getElementById(`menu-${id}`).classList.toggle('active');
}

document.addEventListener('click', () => {
  document.querySelectorAll('.options-menu').forEach(m => m.classList.remove('active'));
});

async function alterarStatus(id, novoStatus) {
  try {
    await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus })
    });
    showToast(`Status atualizado para "${novoStatus}".`);
    carregarMinhaLista();
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    showToast('Não foi possível atualizar o status.');
  }
}

async function salvarAvaliacao(event, id) {
  event.preventDefault();
  const form = event.currentTarget;
  const nota = form.querySelector('input[name^="nota-"]:checked');
  const comentario = form.elements.comentario.value.trim();

  if (!nota) {
    showToast('Selecione uma nota de 1 a 5 estrelas.');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaPessoal: Number(nota.value), comentario })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.mensagem || 'Não foi possível salvar a avaliação.');
      return;
    }

    showToast('Avaliação salva com sucesso.');
    await carregarMinhaLista();
  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    showToast('Não foi possível salvar a avaliação.');
  }
}

async function deletarFilme(id) {
  const confirmar = window.confirm('Remover filme da lista?');
  if (!confirmar) return;

  try {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    showToast('Filme removido da lista.');
    carregarMinhaLista();
  } catch (error) {
    console.error('Erro ao deletar filme:', error);
    showToast('Não foi possível remover o filme.');
  }
}

function filtrarLista(status) {
  filtroAtual = status;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.includes(status) || (status === 'todos' && btn.innerText === 'Todos'));
  });
  renderizarLista();
}

function ordenarLista(ordenacao) {
  ordenacaoAtual = ordenacao;
  renderizarLista();
}

// REGISTRO GLOBAL DAS FUNÇÕES PARA O HTML
window.trocarAba = trocarAba;
window.buscarFilme = buscarFilme;
window.checarEnter = checarEnter;
window.salvarFilme = salvarFilme;
window.toggleMenu = toggleMenu;
window.alterarStatus = alterarStatus;
window.salvarAvaliacao = salvarAvaliacao;
window.deletarFilme = deletarFilme;
window.filtrarLista = filtrarLista;
window.ordenarLista = ordenarLista;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  carregarMinhaLista();
});