import axios from 'axios';

async function buscarNaOmdb(parametros, baseUrl, apiKey) {
  const resposta = await axios.get(baseUrl, {
    params: {
      ...parametros,
      apikey: apiKey,
      type: 'movie'
    }
  });

  return resposta.data;
}

async function buscarTituloOriginalNoTmdb(titulo) {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) return null;

  try {
    const resposta = await axios.get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: apiKey,
        query: titulo,
        language: 'pt-BR',
        include_adult: false
      }
    });

    const filme = resposta.data?.results?.[0];
    return filme?.original_title || null;
  } catch (error) {
    console.error(`Erro ao consultar títulos em português no TMDb: ${error.message}`);
    return null;
  }
}

export async function buscarDadosTmdbPtBr(titulo) {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) return null;

  try {
    const resposta = await axios.get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: apiKey,
        query: titulo,
        language: 'pt-BR',
        include_adult: false
      }
    });

    const filme = resposta.data?.results?.[0];
    if (!filme) return null;

    return {
      tituloTraduzido: filme.title,
      tituloOriginal: filme.original_title,
      ano: filme.release_date?.slice(0, 4) || 'N/A',
      poster: filme.poster_path
        ? `https://image.tmdb.org/t/p/w500${filme.poster_path}`
        : 'N/A'
    };
  } catch (error) {
    console.error(`Erro ao consultar dados em português no TMDb: ${error.message}`);
    return null;
  }
}

async function buscarFilmesNoTmdb(titulo) {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) return [];

  try {
    const resposta = await axios.get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: apiKey,
        query: titulo,
        language: 'pt-BR',
        include_adult: false
      }
    });

    return (resposta.data?.results || []).slice(0, 10).map((filme) => ({
      Title: filme.title || filme.original_title,
      OriginalTitle: filme.original_title,
      Year: filme.release_date?.slice(0, 4) || 'N/A',
      Poster: filme.poster_path
        ? `https://image.tmdb.org/t/p/w500${filme.poster_path}`
        : 'N/A'
    }));
  } catch (error) {
    console.error(`Erro ao consultar filmes em português no TMDb: ${error.message}`);
    return [];
  }
}

export async function buscarFilmesOmdb(titulo) {
  const apiKey = process.env.OMDB_API_KEY;
  const baseUrl = process.env.OMDB_BASE_URL || 'http://www.omdbapi.com/';

  if (!apiKey) return [];

  try {
    const buscaGeral = await buscarNaOmdb({ s: titulo }, baseUrl, apiKey);

    if (buscaGeral?.Response === 'True' && Array.isArray(buscaGeral.Search)) {
      // Enriquecer resultados com traduções do TMDB
      const filmesComTraducao = await Promise.all(
        buscaGeral.Search.map(async (filme) => {
          const dadosTmdb = await buscarDadosTmdbPtBr(filme.Title);
          return {
            ...filme,
            TituloTraduzido: dadosTmdb?.tituloTraduzido || filme.Title,
            Poster: dadosTmdb?.poster !== 'N/A' && dadosTmdb?.poster ? dadosTmdb.poster : (filme.Poster !== 'N/A' ? filme.Poster : 'N/A')
          };
        })
      );
      return filmesComTraducao;
    }

    return await buscarFilmesNoTmdb(titulo);
  } catch (error) {
    console.error(`Erro ao consultar lista de filmes: ${error.message}`);
    return [];
  }
}

export async function buscarFilmeOmdb(titulo) {
  const apiKey = process.env.OMDB_API_KEY;
  const baseUrl = process.env.OMDB_BASE_URL || 'http://www.omdbapi.com/';

  if (!apiKey) {
    console.error('OMDB_API_KEY não configurada. Defina a chave no arquivo .env.');
    return null;
  }

  try {
    const buscaExata = await buscarNaOmdb({ t: titulo }, baseUrl, apiKey);

    if (buscaExata?.Response === 'True') {
      // Busca tradução no TMDB
      const dadosTmdb = await buscarDadosTmdbPtBr(buscaExata.Title);
      return {
        ...buscaExata,
        TituloTraduzido: dadosTmdb?.tituloTraduzido || buscaExata.Title,
        PosterUrl: (dadosTmdb?.poster !== 'N/A' && dadosTmdb?.poster) || buscaExata.Poster
      };
    }

    const buscaGeral = await buscarNaOmdb({ s: titulo }, baseUrl, apiKey);

    if (buscaGeral?.Response === 'True' && Array.isArray(buscaGeral.Search)) {
      const filmeOmdb = buscaGeral.Search[0];
      // Busca tradução no TMDB
      const dadosTmdb = await buscarDadosTmdbPtBr(filmeOmdb.Title);
      return {
        ...filmeOmdb,
        TituloTraduzido: dadosTmdb?.tituloTraduzido || filmeOmdb.Title,
        PosterUrl: (dadosTmdb?.poster !== 'N/A' && dadosTmdb?.poster) || filmeOmdb.Poster
      };
    }

    const filmesTmdb = await buscarFilmesNoTmdb(titulo);
    if (filmesTmdb.length > 0) {
      const filmeTmdb = filmesTmdb[0];
      return {
        ...filmeTmdb,
        PosterUrl: filmeTmdb.Poster
      };
    }

    const tituloOriginal = await buscarTituloOriginalNoTmdb(titulo);

    if (tituloOriginal && tituloOriginal.toLowerCase() !== titulo.toLowerCase()) {
      const buscaTraduzida = await buscarNaOmdb({ t: tituloOriginal }, baseUrl, apiKey);

      if (buscaTraduzida?.Response === 'True') {
        // Busca tradução no TMDB
        const dadosTmdb = await buscarDadosTmdbPtBr(buscaTraduzida.Title);
        return {
          ...buscaTraduzida,
          TituloTraduzido: dadosTmdb?.tituloTraduzido || buscaTraduzida.Title,
          PosterUrl: (dadosTmdb?.poster !== 'N/A' && dadosTmdb?.poster) || buscaTraduzida.Poster
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Erro ao consultar API OMDb: ${error.message}`);
    return null;
  }
}