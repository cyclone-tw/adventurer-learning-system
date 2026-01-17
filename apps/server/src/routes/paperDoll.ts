import { Router } from 'express';
import {
  getStudentAvatar,
  getAvailableParts,
  updateAvatar,
  equipPart,
  unequipPart,
  adminGetParts,
  adminCreatePart,
  adminUpdatePart,
  adminDeletePart,
  getPartsValidation,
  updateAvatarValidation,
  equipPartValidation,
} from '../controllers/paperDollController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// ========== 學生 API ==========

// GET /api/v1/paper-doll/avatar - 取得學生角色
router.get('/avatar', authenticate, getStudentAvatar);

// GET /api/v1/paper-doll/parts - 取得可用部件
router.get('/parts', authenticate, getPartsValidation, getAvailableParts);

// PUT /api/v1/paper-doll/avatar - 更新角色設定（名稱、顏色）
router.put('/avatar', authenticate, updateAvatarValidation, updateAvatar);

// POST /api/v1/paper-doll/avatar/equip/:partId - 裝備部件
router.post('/avatar/equip/:partId', authenticate, equipPartValidation, equipPart);

// DELETE /api/v1/paper-doll/avatar/unequip/:category - 卸下部件
router.delete('/avatar/unequip/:category', authenticate, unequipPart);

// ========== 教師/管理 API ==========

// GET /api/v1/paper-doll/admin/parts - 取得所有部件（管理用）
router.get('/admin/parts', authenticate, authorize('teacher', 'admin'), adminGetParts);

// POST /api/v1/paper-doll/admin/parts - 新增部件
router.post('/admin/parts', authenticate, authorize('teacher', 'admin'), adminCreatePart);

// PUT /api/v1/paper-doll/admin/parts/:id - 更新部件
router.put('/admin/parts/:id', authenticate, authorize('teacher', 'admin'), adminUpdatePart);

// DELETE /api/v1/paper-doll/admin/parts/:id - 刪除部件
router.delete('/admin/parts/:id', authenticate, authorize('teacher', 'admin'), adminDeletePart);

export default router;
