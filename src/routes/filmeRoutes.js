import { Router } from 'express';
import {
  listarFilmes,
  buscarFilmePorId,
  criarFilme,
  atualizarFilme,
  deletarFilme
} from '../controllers/filmeController.js';

const router = Router();

// Rotas da API
router.get('/', listarFilmes);
router.get('/:id', buscarFilmePorId);
router.post('/', criarFilme);
router.put('/:id', atualizarFilme);
router.delete('/:id', deletarFilme);

export default router;