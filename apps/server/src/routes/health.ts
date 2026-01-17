import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// GET /api/v1/health
router.get('/', (_req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const mongoStates: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoStates[mongoStatus] || 'unknown',
    },
  });
});

export default router;
