import { Response, NextFunction } from 'express';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import {
  uploadFromBuffer,
  deleteMedia,
  isCloudinaryConfigured,
  MediaType,
} from '../services/cloudinary.js';

// Allowed MIME types mapping
const MIME_TO_TYPE: Record<string, MediaType> = {
  // Images
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  // Audio
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/m4a': 'audio',
  'audio/x-m4a': 'audio',
  // Video
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
};

// Max file sizes (in bytes)
const MAX_SIZES: Record<MediaType, number> = {
  image: 10 * 1024 * 1024, // 10MB
  audio: 50 * 1024 * 1024, // 50MB
  video: 100 * 1024 * 1024, // 100MB
};

// POST /upload - Upload single media file
export const uploadMedia = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    if (!isCloudinaryConfigured()) {
      throw AppError.badRequest(
        'Cloudinary 尚未設定，請聯繫管理員',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (!req.file) {
      throw AppError.badRequest('請上傳檔案', ErrorCodes.VALIDATION_ERROR);
    }

    // Determine media type from MIME
    const mediaType = MIME_TO_TYPE[req.file.mimetype];
    if (!mediaType) {
      throw AppError.badRequest(
        `不支援的檔案格式: ${req.file.mimetype}`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Check file size
    if (req.file.size > MAX_SIZES[mediaType]) {
      const maxMB = MAX_SIZES[mediaType] / 1024 / 1024;
      throw AppError.badRequest(
        `檔案大小超過限制 (${mediaType}: 最大 ${maxMB}MB)`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Upload to Cloudinary
    const result = await uploadFromBuffer(
      req.file.buffer,
      mediaType,
      req.file.originalname
    );

    sendSuccess(res, {
      type: mediaType,
      url: result.secureUrl,
      publicId: result.publicId,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration,
      bytes: result.bytes,
    });
  } catch (error) {
    next(error);
  }
};

// POST /upload/multiple - Upload multiple media files
export const uploadMultipleMedia = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    if (!isCloudinaryConfigured()) {
      throw AppError.badRequest(
        'Cloudinary 尚未設定，請聯繫管理員',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw AppError.badRequest('請上傳檔案', ErrorCodes.VALIDATION_ERROR);
    }

    if (files.length > 10) {
      throw AppError.badRequest(
        '一次最多上傳 10 個檔案',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const mediaType = MIME_TO_TYPE[file.mimetype];
        if (!mediaType) {
          errors.push({
            filename: file.originalname,
            error: `不支援的檔案格式: ${file.mimetype}`,
          });
          continue;
        }

        if (file.size > MAX_SIZES[mediaType]) {
          const maxMB = MAX_SIZES[mediaType] / 1024 / 1024;
          errors.push({
            filename: file.originalname,
            error: `檔案大小超過限制 (最大 ${maxMB}MB)`,
          });
          continue;
        }

        const result = await uploadFromBuffer(
          file.buffer,
          mediaType,
          file.originalname
        );

        results.push({
          filename: file.originalname,
          type: mediaType,
          url: result.secureUrl,
          publicId: result.publicId,
          format: result.format,
          width: result.width,
          height: result.height,
          duration: result.duration,
          bytes: result.bytes,
        });
      } catch (err: any) {
        errors.push({
          filename: file.originalname,
          error: err.message || '上傳失敗',
        });
      }
    }

    sendSuccess(res, {
      uploaded: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: files.length,
        success: results.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /upload/:publicId - Delete media file
export const deleteUploadedMedia = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!publicId) {
      throw AppError.badRequest('請提供 publicId', ErrorCodes.VALIDATION_ERROR);
    }

    // Decode the publicId (it might be URL encoded)
    const decodedPublicId = decodeURIComponent(publicId);

    const success = await deleteMedia(
      decodedPublicId,
      resourceType as 'image' | 'video'
    );

    if (success) {
      sendSuccess(res, { message: '檔案已刪除' });
    } else {
      throw AppError.badRequest('刪除失敗', ErrorCodes.VALIDATION_ERROR);
    }
  } catch (error) {
    next(error);
  }
};
