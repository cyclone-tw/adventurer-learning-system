import { Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Class from '../models/Class.js';
import User from '../models/User.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

// Validation rules
export const createClassValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('請輸入班級名稱')
    .isLength({ max: 50 })
    .withMessage('班級名稱不能超過 50 字'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('班級描述不能超過 200 字'),
  body('academicYearId')
    .optional()
    .isMongoId()
    .withMessage('無效的學年度 ID'),
  body('maxStudents')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('學生人數上限必須在 1-200 之間'),
];

export const updateClassValidation = [
  param('classId').isMongoId().withMessage('無效的班級 ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('班級名稱不能為空')
    .isLength({ max: 50 })
    .withMessage('班級名稱不能超過 50 字'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('班級描述不能超過 200 字'),
  body('maxStudents')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('學生人數上限必須在 1-200 之間'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive 必須是布林值'),
];

export const listClassesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('頁碼必須為正整數'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每頁數量必須在 1-100 之間'),
];

export const joinClassValidation = [
  body('inviteCode')
    .trim()
    .notEmpty()
    .withMessage('請輸入邀請碼')
    .isLength({ min: 6, max: 8 })
    .withMessage('邀請碼格式不正確'),
];

export const manageStudentValidation = [
  param('classId').isMongoId().withMessage('無效的班級 ID'),
  param('studentId').isMongoId().withMessage('無效的學生 ID'),
];

export const addStudentsValidation = [
  param('classId').isMongoId().withMessage('無效的班級 ID'),
  body('studentIds')
    .isArray({ min: 1 })
    .withMessage('請至少選擇一位學生'),
  body('studentIds.*')
    .isMongoId()
    .withMessage('無效的學生 ID'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /classes - List classes for current teacher
export const listClasses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { teacherId: req.auth.userId };

    // Only show active classes by default
    if (req.query.showInactive !== 'true') {
      filter.isActive = true;
    }

    const [classes, total] = await Promise.all([
      Class.find(filter)
        .populate('academicYearId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Class.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    sendPaginated(res, classes, { page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
};

// GET /classes/:classId - Get class details
export const getClass = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { classId } = req.params;

    const classData = await Class.findOne({
      _id: classId,
      teacherId: req.auth.userId,
    })
      .populate('academicYearId', 'name')
      .populate('students', 'name email avatar studentProfile.level studentProfile.exp')
      .lean();

    if (!classData) {
      throw AppError.notFound('找不到班級', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    sendSuccess(res, classData);
  } catch (error) {
    next(error);
  }
};

// POST /classes - Create new class
export const createClass = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { name, description, academicYearId, maxStudents } = req.body;

    // Generate unique invite code
    const inviteCode = await (Class as any).generateInviteCode();

    const newClass = await Class.create({
      name,
      description,
      teacherId: req.auth.userId,
      academicYearId,
      maxStudents: maxStudents || 50,
      inviteCode,
    });

    sendSuccess(res, newClass, 201);
  } catch (error) {
    next(error);
  }
};

// PATCH /classes/:classId - Update class
export const updateClass = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { classId } = req.params;
    const { name, description, maxStudents, isActive } = req.body;

    const classData = await Class.findOne({
      _id: classId,
      teacherId: req.auth.userId,
    });

    if (!classData) {
      throw AppError.notFound('找不到班級', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Update fields
    if (name !== undefined) classData.name = name;
    if (description !== undefined) classData.description = description;
    if (maxStudents !== undefined) classData.maxStudents = maxStudents;
    if (isActive !== undefined) classData.isActive = isActive;

    await classData.save();

    sendSuccess(res, classData);
  } catch (error) {
    next(error);
  }
};

// DELETE /classes/:classId - Delete class
export const deleteClass = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { classId } = req.params;

    const classData = await Class.findOneAndDelete({
      _id: classId,
      teacherId: req.auth.userId,
    });

    if (!classData) {
      throw AppError.notFound('找不到班級', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    sendSuccess(res, { message: '班級已刪除' });
  } catch (error) {
    next(error);
  }
};

// POST /classes/:classId/regenerate-code - Regenerate invite code
export const regenerateInviteCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { classId } = req.params;

    const classData = await Class.findOne({
      _id: classId,
      teacherId: req.auth.userId,
    });

    if (!classData) {
      throw AppError.notFound('找不到班級', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const newCode = await (Class as any).generateInviteCode();
    classData.inviteCode = newCode;
    await classData.save();

    sendSuccess(res, { inviteCode: newCode });
  } catch (error) {
    next(error);
  }
};

// POST /classes/join - Student joins class with invite code
export const joinClass = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { inviteCode } = req.body;
    const studentId = req.auth.userId;

    // Find class by invite code
    const classData = await Class.findOne({
      inviteCode: inviteCode.toUpperCase(),
      isActive: true,
    });

    if (!classData) {
      throw AppError.notFound('邀請碼無效或班級已關閉', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if already in class
    if (classData.students.some(s => s.toString() === studentId)) {
      throw AppError.badRequest('你已經在此班級中', ErrorCodes.VALIDATION_ERROR);
    }

    // Check max students
    if (classData.students.length >= classData.maxStudents) {
      throw AppError.badRequest('班級人數已滿', ErrorCodes.VALIDATION_ERROR);
    }

    // Add student to class
    classData.students.push(new mongoose.Types.ObjectId(studentId));
    await classData.save();

    // Get class info for response
    const classInfo = await Class.findById(classData._id)
      .populate('teacherId', 'name')
      .select('name teacherId')
      .lean();

    sendSuccess(res, {
      message: `成功加入班級「${classData.name}」`,
      class: classInfo,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /classes/:classId/students/:studentId - Remove student from class
export const removeStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { classId, studentId } = req.params;

    const classData = await Class.findOne({
      _id: classId,
      teacherId: req.auth.userId,
    });

    if (!classData) {
      throw AppError.notFound('找不到班級', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Remove student
    const studentIndex = classData.students.findIndex(
      s => s.toString() === studentId
    );

    if (studentIndex === -1) {
      throw AppError.notFound('此學生不在班級中', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    classData.students.splice(studentIndex, 1);
    await classData.save();

    sendSuccess(res, { message: '已將學生移出班級' });
  } catch (error) {
    next(error);
  }
};

// GET /classes/my - Get student's classes
export const getMyClasses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const studentId = req.auth.userId;

    const classes = await Class.find({
      students: studentId,
      isActive: true,
    })
      .populate('teacherId', 'name email')
      .populate('academicYearId', 'name')
      .select('name description teacherId academicYearId studentCount')
      .lean();

    sendSuccess(res, classes);
  } catch (error) {
    next(error);
  }
};

// POST /classes/:classId/leave - Student leaves class
export const leaveClass = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { classId } = req.params;
    const studentId = req.auth.userId;

    const classData = await Class.findById(classId);

    if (!classData) {
      throw AppError.notFound('找不到班級', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const studentIndex = classData.students.findIndex(
      s => s.toString() === studentId
    );

    if (studentIndex === -1) {
      throw AppError.badRequest('你不在此班級中', ErrorCodes.VALIDATION_ERROR);
    }

    classData.students.splice(studentIndex, 1);
    await classData.save();

    sendSuccess(res, { message: '已退出班級' });
  } catch (error) {
    next(error);
  }
};

// POST /classes/:classId/students - Add multiple students to class (batch)
export const addStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { classId } = req.params;
    const { studentIds } = req.body as { studentIds: string[] };

    // Find class
    const classData = await Class.findOne({
      _id: classId,
      teacherId: req.auth.userId,
    });

    if (!classData) {
      throw AppError.notFound('找不到班級', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Verify all student IDs exist and are students
    const students = await User.find({
      _id: { $in: studentIds },
      role: 'student',
    }).select('_id');

    const validStudentIds = students.map(s => s._id.toString());
    const invalidIds = studentIds.filter(id => !validStudentIds.includes(id));

    if (invalidIds.length > 0) {
      throw AppError.badRequest(
        `部分學生 ID 無效: ${invalidIds.join(', ')}`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Filter out students already in the class
    const existingStudentIds = classData.students.map(s => s.toString());
    const newStudentIds = validStudentIds.filter(id => !existingStudentIds.includes(id));

    // Check if adding these students would exceed max
    const totalAfterAdd = classData.students.length + newStudentIds.length;
    if (totalAfterAdd > classData.maxStudents) {
      throw AppError.badRequest(
        `超過班級人數上限 (${classData.maxStudents})，目前 ${classData.students.length} 人，欲新增 ${newStudentIds.length} 人`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Add new students
    const addedCount = newStudentIds.length;
    const skippedCount = validStudentIds.length - newStudentIds.length;

    if (addedCount > 0) {
      classData.students.push(
        ...newStudentIds.map(id => new mongoose.Types.ObjectId(id))
      );
      await classData.save();
    }

    sendSuccess(res, {
      message: `成功新增 ${addedCount} 位學生${skippedCount > 0 ? `，${skippedCount} 位已在班級中` : ''}`,
      added: addedCount,
      skipped: skippedCount,
      total: classData.students.length,
    });
  } catch (error) {
    next(error);
  }
};
