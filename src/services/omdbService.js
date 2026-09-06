import axios from 'axios';

export async function buscarFilmeOmdb(titulo) {
  const apiKey = process.env.OMDB_API_KEY;
  const baseUrl = process.env.OMDB_BASE_URL || 'http://www.omdbapi.com/';

  if (!apiKey) {
    console.error('OMDB_API_KEY não configurada. Defina a chave no arquivo .env.');
    return null;
  }

  try {
    const buscaExata = await axios.get(baseUrl, {
      params: {
        t: titulo,
        apikey: apiKey,
        type: 'movie'
      }
    });

    if (buscaExata.data?.Response === 'True') {
      return buscaExata.data;
    }

    const buscaGeral = await axios.get(baseUrl, {
      params: {
        s: titulo,
        apikey: apiKey,
        type: 'movie'
      }
    });

    if (buscaGeral.data?.Response === 'True' && Array.isArray(buscaGeral.data.Search)) {
      return buscaGeral.data.Search[0];
    }

    return null;
  } catch (error) {
    console.error(`Erro ao consultar API OMDb: ${error.message}`);
    return null;
  }
}