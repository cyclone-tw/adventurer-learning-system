import { Router } from 'express';
import multer from 'multer';
import {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getRandomQuestions,
  createQuestionValidation,
  updateQuestionValidation,
  listQuestionsValidation,
} from '../controllers/questionsController.js';
import {
  downloadTemplate,
  importQuestions,
} from '../controllers/importController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept Excel and CSV files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/csv',
    ];

    if (allowedMimes.includes(file.mimetype) ||
        file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('僅支援 Excel (.xlsx, .xls) 或 CSV 檔案'));
    }
  },
});

// Public route - Get random questions for students
router.get('/random', authenticate, getRandomQuestions);

// Download import template - Teachers only
router.get('/template', authenticate, authorize('teacher', 'admin'), downloadTemplate);

// Import questions from Excel/CSV - Teachers only
router.post(
  '/import',
  authenticate,
  authorize('teacher', 'admin'),
  upload.single('file'),
  importQuestions
);

// List questions with filters - Teachers only
router.get(
  '/',
  authenticate,
  authorize('teacher', 'admin'),
  listQuestionsValidation,
  listQuestions
);

// Get single question - Teachers only (for editing)
router.get(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  getQuestion
);

// Create question - Teachers only
router.post(
  '/',
  authenticate,
  authorize('teacher', 'admin'),
  createQuestionValidation,
  createQuestion
);

// Update question - Teachers only
router.put(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  updateQuestionValidation,
  updateQuestion
);

// Delete question (soft delete) - Teachers only
router.delete(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  deleteQuestion
);

export default router;
