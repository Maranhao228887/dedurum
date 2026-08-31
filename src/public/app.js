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


// 1. Troca de Abas
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