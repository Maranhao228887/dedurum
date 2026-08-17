import { Router } from 'express';
import {
  pesquisarFilmesOmdb,
  listarFilmes,
  buscarFilmePorId,
  criarFilme,
  atualizarFilme,
  deletarFilme
} from '../controllers/filmeController.js';

const router = Router();

// /buscar DEVE vir antes de /:id
router.get('/buscar', pesquisarFilmesOmdb);
router.get('/', listarFilmes);
router.get('/:id', buscarFilmePorId);
router.post('/', criarFilme);
router.put('/:id', atualizarFilme);
router.delete('/:id', deletarFilme);

export default router;