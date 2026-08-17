import axios from 'axios';

export async function buscarFilmeOmdb(titulo) {
  try {
    const apiKey = process.env.OMDB_API_KEY;
    const baseUrl = process.env.OMDB_BASE_URL;

    const response = await axios.get(baseUrl, {
      params: {
        t: titulo,
        apikey: apiKey
      }
    });

    if (response.data.Response === 'False') {
      return null;
    }

    return response.data;
  } catch (error) {
    console.error(`Erro ao consultar API OMDb: ${error.message}`);
    return null;
  }
}