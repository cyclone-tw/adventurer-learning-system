import { Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Announcement from '../models/Announcement.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// Validation rules
export const createAnnouncementValidation = [
  body('title').notEmpty().trim().withMessage('請提供公告標題'),
  body('content').notEmpty().trim().withMessage('請提供公告內容'),
  body('type').optional().isIn(['info', 'event', 'promotion']).withMessage('無效的公告類型'),
  body('icon').optional().isString(),
  body('startDate').optional().isISO8601().toDate(),
  body('endDate').optional().isISO8601().toDate(),
  body('discount.type').optional().isIn(['percentage', 'fixed']).withMessage('無效的折扣類型'),
  body('discount.value').optional().isFloat({ min: 1 }).withMessage('折扣值必須大於 0'),
  body('isPinned').optional().isBoolean(),
  body('showInShop').optional().isBoolean(),
];

export const updateAnnouncementValidation = [
  param('id').isMongoId().withMessage('無效的公告 ID'),
  body('title').optional().trim(),
  body('content').optional().trim(),
  body('type').optional().isIn(['info', 'event', 'promotion']).withMessage('無效的公告類型'),
  body('startDate').optional().isISO8601().toDate(),
  body('endDate').optional().isISO8601().toDate(),
  body('discount.type').optional().isIn(['percentage', 'fixed']).withMessage('無效的折扣類型'),
  body('discount.value').optional().isFloat({ min: 1 }).withMessage('折扣值必須大於 0'),
  body('isPinned').optional().isBoolean(),
  body('showInShop').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /announcements - List announcements (for teachers/admin)
export const listAnnouncements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, includeInactive } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (includeInactive !== 'true') filter.isActive = true;

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'displayName')
      .populate('discount.itemIds', 'name icon')
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    sendSuccess(res, announcements);
  } catch (error) {
    next(error);
  }
};

// GET /announcements/active - Get active announcements for students
export const getActiveAnnouncements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();

    // Get active info announcements
    const infoAnnouncements = await Announcement.find({
      type: 'info',
      isActive: true,
    })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(10)
      .lean();

    // Get active events/promotions within date range
    const eventAnnouncements = await Announcement.find({
      type: { $in: ['event', 'promotion'] },
      isActive: true,
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: null, endDate: null },
      ],
    })
      .populate('discount.itemIds', 'name icon')
      .sort({ isPinned: -1, startDate: -1 })
      .lean();

    sendSuccess(res, {
      announcements: [...infoAnnouncements, ...eventAnnouncements],
      promotions: eventAnnouncements.filter((a) => a.type === 'promotion'),
    });
  } catch (error) {
    next(error);
  }
};

// GET /announcements/promotions/active - Get active promotions for shop
export const getActivePromotions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();

    const promotions = await Announcement.find({
      type: 'promotion',
      isActive: true,
      showInShop: true,
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: null, endDate: null },
      ],
    })
      .populate('discount.itemIds', 'name icon price')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, promotions);
  } catch (error) {
    next(error);
  }
};

// GET /announcements/:id - Get single announcement
export const getAnnouncement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id)
      .populate('createdBy', 'displayName')
      .populate('discount.itemIds', 'name icon price')
      .lean();

    if (!announcement) {
      throw AppError.notFound('找不到此公告', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    sendSuccess(res, announcement);
  } catch (error) {
    next(error);
  }
};

// POST /announcements - Create announcement
export const createAnnouncement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const {
      title,
      content,
      type,
      icon,
      imageUrl,
      startDate,
      endDate,
      discount,
      isPinned,
      showInShop,
    } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      type: type || 'info',
      icon: icon || '📢',
      imageUrl,
      startDate,
      endDate,
      discount,
      isPinned: isPinned || false,
      showInShop: showInShop || false,
      createdBy: req.auth.userId,
    });

    sendSuccess(res, announcement, 201);
  } catch (error) {
    next(error);
  }
};

// PATCH /announcements/:id - Update announcement
export const updateAnnouncement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { id } = req.params;
    const updates = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('discount.itemIds', 'name icon price');

    if (!announcement) {
      throw AppError.notFound('找不到此公告', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    sendSuccess(res, announcement);
  } catch (error) {
    next(error);
  }
};

// DELETE /announcements/:id - Delete announcement
export const deleteAnnouncement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) {
      throw AppError.notFound('找不到此公告', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    sendSuccess(res, { message: '公告已刪除' });
  } catch (error) {
    next(error);
  }
};
