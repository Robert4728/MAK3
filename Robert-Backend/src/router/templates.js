import express from 'express';
import templateController from '../controllers/templateController.js';

const router = express.Router();

router.get('/', templateController.getTemplates);
router.get('/categories', templateController.getCategories);
router.get('/search', templateController.searchTemplates);
router.get('/:id', templateController.getTemplateById);

export default router;