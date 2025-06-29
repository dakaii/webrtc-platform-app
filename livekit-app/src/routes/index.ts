import { Router } from 'express';
import authRoutes from './auth.routes';
import roomRoutes from './room.routes';
import webhookRoutes from './webhook.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/webhooks', webhookRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;