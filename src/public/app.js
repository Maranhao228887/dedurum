const API_URL = '/api/filmes';
const API_KEY = 'sua_chave_copiada_aqui';
let listaFilmesCache = [];
let filtroAtual = 'todos';
let timeoutId; // Para debounce da busca em tempo real

// ===== BUSCA EM TEMPO REAL COM DROPDOWN =====
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const savedMoviesSection = document.getElementById('savedMoviesSection');

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // Se o usuário estiver digitando (1 ou mais caracteres), esconde os filmes salvos
    if (query.length > 0) {
      savedMoviesSection.classList.add('hidden');
    } else {
      // Se apagar a pesquisa, mostra os filmes salvos novamente
      savedMoviesSection.classList.remove('hidden');
    }

    // Limpa o temporizador anterior
    clearTimeout(timeoutId);

    if (query.length < 2) {
      searchResults.style.display = 'none';
      searchResults.innerHTML = '';
      return;
    }

    // Aguarda 300ms após o usuário parar de digitar
    timeoutId = setTimeout(() => {
      fetchMoviesRealtime(query);
    }, 300);
  });

  // Esconde resultados ao clicar fora
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });
}

async function fetchMoviesRealtime(query) {
  try {
    const response = await fetch(`${API_URL}/buscar?nome=${encodeURIComponent(query)}`);
    const data = await response.json();

    displayRealtimeResults(data);
  } catch (error) {
    console.error('Erro ao buscar filmes em tempo real:', error);
  }
}

function displayRealtimeResults(movie) {
  searchResults.innerHTML = '';

  if (!movie || !movie.Title) {
    searchResults.style.display = 'none';
    return;
  }

  const posterPath = movie.Poster !== 'N/A' 
    ? movie.Poster 
    : 'https://via.placeholder.com/45x68?text=Sem+Capa';

  const year = movie.Year || 'N/A';

  const item = document.createElement('div');
  item.classList.add('result-item');
  item.innerHTML = `
    <img src="${posterPath}" alt="${movie.Title}">
    <div class="result-info">
      <h4>${movie.Title}</h4>
      <span>${year}</span>
    </div>
  `;

  // Ao clicar no filme do dropdown
  item.addEventListener('click', () => {
    searchInput.value = movie.Title;
    searchResults.style.display = 'none';
    buscarFilme(); // Carrega o filme completo
  });

  searchResults.appendChild(item);
  searchResults.style.display = 'block';
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
      ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
      : (movie.Poster && movie.Poster !== 'N/A' 
        ? movie.Poster 
        : 'https://via.placeholder.com/45x65?text=Sem+Capa');

    const title = movie.title || movie.Title;
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
        <button class="btn">+ Quero Assistir</button>
        <button class="btn">✓ Já Assistido</button>
      </div>
    </div>
  `;

  const iframe = card.querySelector('iframe');
  let trailerKey = null;

  // Evento quando o cursor ENTRA no card
  card.addEventListener('mouseenter', async () => {
    // Busca a chave do trailer apenas na primeira vez que o mouse passa por cima
    if (!trailerKey) {
      trailerKey = await getMovieTrailerKey(movie.id);
    }

    if (trailerKey) {
      // Insere o link de embed do YouTube com autoplay e áudio desativado (mute=1 facilita o autoplay)
      iframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}`;
      card.classList.add('playing');
    }
  });

  // Evento quando o cursor SAI do card
  card.addEventListener('mouseleave', () => {
    // Parar o vídeo limpando o src e voltar para a capa
    iframe.src = '';
    card.classList.remove('playing');
  });

  // Adicionar evento de clique na imagem para abrir detalhes
  const imgElement = card.querySelector('.media-container img');
  imgElement.style.cursor = 'pointer';
  imgElement.addEventListener('click', (e) => {
    e.stopPropagation();
    openMovieDetails(movie.id);
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
      alert(`Filme "${nome}" adicionado como "${status}"!`);
      trocarAba('list');
    } else {
      alert(`Erro: ${data.mensagem || 'Não foi possível salvar o filme.'}`);
    }
  } catch (error) {
    console.error('Erro ao salvar:', error);
    alert('Erro de conexão ao tentar salvar o filme.');
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

  if (filmesFiltrados.length === 0) {
    grid.innerHTML = `<p style="color: #94a3b8; grid-column: 1/-1;">Nenhum filme nesta categoria.</p>`;
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
          <button onclick="alterarStatus('${filme.id}', 'Já Assistido')">Já Assistido</button>
          <button class="danger" onclick="deletarFilme('${filme.id}')">Excluir</button>
        </div>
      </div>
      <img src="${filme.capaUrl || 'https://via.placeholder.com/180x260?text=Sem+Capa'}" class="movie-poster" alt="${filme.titulo}">
      <div class="movie-info">
        <h3 class="movie-title">${filme.titulo}</h3>
        <p style="font-size: 0.75rem; color: #94a3b8;">${filme.ano || 'N/A'}</p>
        <span class="badge ${statusClass}">${filme.status}</span>
      </div>
    `;
    grid.appendChild(card);
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
  await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: novoStatus })
  });
  carregarMinhaLista();
}

async function deletarFilme(id) {
  if (!confirm('Remover filme da lista?')) return;
  await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  carregarMinhaLista();
}

function filtrarLista(status) {
  filtroAtual = status;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.includes(status) || (status === 'todos' && btn.innerText === 'Todos'));
  });
  renderizarLista();
}

// REGISTRO GLOBAL DAS FUNÇÕES PARA O HTML
window.trocarAba = trocarAba;
window.buscarFilme = buscarFilme;
window.checarEnter = checarEnter;
window.salvarFilme = salvarFilme;
window.toggleMenu = toggleMenu;
window.alterarStatus = alterarStatus;
window.deletarFilme = deletarFilme;
window.filtrarLista = filtrarLista;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  carregarMinhaLista();
});