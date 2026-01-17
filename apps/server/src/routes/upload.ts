import { Router } from 'express';
import multer from 'multer';
import {
  uploadMedia,
  uploadMultipleMedia,
  deleteUploadedMedia,
} from '../controllers/uploadController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (video)
    files: 10, // Max 10 files at once
  },
  fileFilter: (_req, file, cb) => {
    // Accept images, audio, and video
    const allowedMimes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/x-m4a',
      // Video
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支援的檔案格式: ${file.mimetype}`));
    }
  },
});

// POST /upload - Upload single file (teachers only)
router.post(
  '/',
  authenticate,
  authorize('teacher', 'admin'),
  upload.single('file'),
  uploadMedia
);

// POST /upload/multiple - Upload multiple files (teachers only)
router.post(
  '/multiple',
  authenticate,
  authorize('teacher', 'admin'),
  upload.array('files', 10),
  uploadMultipleMedia
);

// DELETE /upload/:publicId - Delete uploaded file (teachers only)
router.delete(
  '/:publicId(*)', // (*) allows slashes in publicId
  authenticate,
  authorize('teacher', 'admin'),
  deleteUploadedMedia
);

export default router;
