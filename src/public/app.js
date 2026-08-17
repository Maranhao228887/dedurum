const API_URL = '/api/filmes';

const filmeForm = document.getElementById('filmeForm');
const catalogGrid = document.getElementById('catalogGrid');

// 1. Carregar e exibir os filmes cadastrados ao abrir a página
async function carregarFilmes() {
  try {
    const response = await fetch(API_URL);
    const filmes = await response.json();
    renderizarFilmes(filmes);
  } catch (error) {
    console.error('Erro ao carregar filmes:', error);
  }
}

// 2. Renderizar os cards na tela
function renderizarFilmes(filmes) {
  catalogGrid.innerHTML = '';

  if (filmes.length === 0) {
    catalogGrid.innerHTML = `<p style="color: #94a3b8; grid-column: 1/-1;">Nenhum filme cadastrado ainda.</p>`;
    return;
  }

  filmes.forEach(filme => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const statusClass = filme.status === 'Já Assistido' ? 'badge-assistido' : 'badge-quero';

    card.innerHTML = `
      <img src="${filme.capaUrl || 'https://via.placeholder.com/200x280?text=Sem+Capa'}" alt="${filme.titulo}" class="movie-poster">
      <div class="movie-info">
        <h3 class="movie-title">${filme.titulo}</h3>
        <p class="movie-meta">${filme.ano || 'N/A'} • ${filme.genero || 'Gênero n/a'}</p>
        <span class="badge ${statusClass}">${filme.status}</span>
        <p style="font-size: 0.85rem; color: #f1c40f; margin-top: 0.3rem;">
          ${'⭐'.repeat(Number(filme.notaPessoal) || 0)}
        </p>
        <button class="btn-delete" onclick="deletarFilme('${filme.id}')">Excluir</button>
      </div>
    `;

    catalogGrid.appendChild(card);
  });
}

// 3. Cadastrar um novo filme (submit do formulário)
filmeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value;
  const notaPessoal = document.getElementById('notaPessoal').value;
  const status = document.getElementById('status').value;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nome, notaPessoal, status })
    });

    if (response.ok) {
      filmeForm.reset();
      carregarFilmes(); // Atualiza a lista na tela
    } else {
      const erro = await response.json();
      alert(`Erro: ${erro.mensagem}`);
    }
  } catch (error) {
    console.error('Erro ao salvar filme:', error);
  }
});

// 4. Deletar filme pelo ID
async function deletarFilme(id) {
  if (!confirm('Deseja realmente remover este filme?')) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      carregarFilmes(); // Atualiza a lista após remover
    }
  } catch (error) {
    console.error('Erro ao deletar filme:', error);
  }
}

// Inicializa a listagem ao carregar a página
carregarFilmes();