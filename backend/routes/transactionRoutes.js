import express from 'express';
import {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats,
  getMonthlySummary
} from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';
import {
  validateTransaction,
  validateDateRange,
  validateObjectId
} from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/transactions/stats - Must be before /:id route
router.get('/stats', validateDateRange, getTransactionStats);

// GET /api/transactions/monthly-summary
router.get('/monthly-summary', getMonthlySummary);

// Main CRUD routes
router.route('/')
  .get(validateDateRange, getTransactions)
  .post(validateTransaction, createTransaction);

router.route('/:id')
  .get(validateObjectId, getTransaction)
  .put([validateObjectId, validateTransaction], updateTransaction)
  .delete(validateObjectId, deleteTransaction);

export default router;
