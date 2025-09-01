import express from 'express';
import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  getDefaultCategories,
  initializeDefaultCategories
} from '../controllers/categoryController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import {
  validateCategory,
  validateObjectId
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.get('/defaults', optionalAuth, getDefaultCategories);

// Protected routes
router.use(protect);

// GET /api/categories/initialize-defaults - Must be before /:id route
router.post('/initialize-defaults', initializeDefaultCategories);

// Main CRUD routes
router.route('/')
  .get(getCategories)
  .post(validateCategory, createCategory);

router.route('/:id')
  .get(validateObjectId, getCategory)
  .put([validateObjectId, validateCategory], updateCategory)
  .delete(validateObjectId, deleteCategory);

export default router;
