import { Router } from 'express';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getStats,
  listUsersValidation,
  createUserValidation,
  updateUserValidation,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/v1/admin/stats - Get dashboard statistics
router.get('/stats', getStats);

// GET /api/v1/admin/users - List users with pagination
router.get('/users', listUsersValidation, listUsers);

// GET /api/v1/admin/users/:id - Get single user
router.get('/users/:id', getUser);

// POST /api/v1/admin/users - Create new user
router.post('/users', createUserValidation, createUser);

// PATCH /api/v1/admin/users/:id - Update user
router.patch('/users/:id', updateUserValidation, updateUser);

// DELETE /api/v1/admin/users/:id - Delete user
router.delete('/users/:id', deleteUser);

export default router;
