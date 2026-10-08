import { Router, Request, Response } from 'express';
import { SheetsRepo } from '../services/sheetsRepo';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { AuditLog } from '../types';

const router = Router();
router.use(authenticate);
router.use(requireRole('HR Manager'));

/**
 * Get audit logs with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { action, entity, actorId, limit } = req.query;
    let logs = await SheetsRepo.list<AuditLog>('AuditLog');

    if (action) logs = logs.filter(l => l.action === action);
    if (entity) logs = logs.filter(l => l.entity === entity);
    if (actorId) logs = logs.filter(l => l.actor_id === actorId);

    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const maxItems = limit ? parseInt(limit as string, 10) : 100;
    return res.json({ success: true, count: logs.length, logs: logs.slice(0, maxItems) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

export default router;
