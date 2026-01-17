import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  // Teacher/Admin controllers
  getAllMaps,
  getMapById,
  createMap,
  updateMap,
  deleteMap,
  updateMapLayers,
  addMapObject,
  updateMapObject,
  removeMapObject,
  // Student controllers
  getStudentMaps,
  enterMap,
  updatePosition,
  interactWithObject,
  completeBattle,
  saveGameTime,
} from '../controllers/gameMapController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== Student Routes ====================

// Get available maps for student
router.get('/student', authorize('student'), getStudentMaps);

// Enter a map
router.post('/student/:mapId/enter', authorize('student'), enterMap);

// Update position
router.put('/student/:mapId/position', authorize('student'), updatePosition);

// Interact with object
router.post('/student/:mapId/objects/:objectId/interact', authorize('student'), interactWithObject);

// Complete battle
router.post('/student/:mapId/objects/:objectId/complete-battle', authorize('student'), completeBattle);

// Save game time
router.post('/student/:mapId/save-time', authorize('student'), saveGameTime);

// ==================== Teacher/Admin Routes ====================

// Get all maps
router.get('/', authorize('teacher', 'admin'), getAllMaps);

// Get single map
router.get('/:mapId', authorize('teacher', 'admin'), getMapById);

// Create map
router.post('/', authorize('teacher', 'admin'), createMap);

// Update map
router.put('/:mapId', authorize('teacher', 'admin'), updateMap);

// Delete map
router.delete('/:mapId', authorize('teacher', 'admin'), deleteMap);

// Update map layers
router.put('/:mapId/layers', authorize('teacher', 'admin'), updateMapLayers);

// Add object to map
router.post('/:mapId/objects', authorize('teacher', 'admin'), addMapObject);

// Update map object
router.put('/:mapId/objects/:objectId', authorize('teacher', 'admin'), updateMapObject);

// Remove map object
router.delete('/:mapId/objects/:objectId', authorize('teacher', 'admin'), removeMapObject);

export default router;
