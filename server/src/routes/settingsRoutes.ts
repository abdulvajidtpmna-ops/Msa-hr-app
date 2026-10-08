import { Router, Request, Response } from 'express';
import { SheetsRepo } from '../services/sheetsRepo';
import { AuditService } from '../services/auditService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { Setting } from '../types';

const router = Router();
router.use(authenticate);

/**
 * Get all settings
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const list = await SheetsRepo.list<Setting>('Settings');
    const settingsMap: Record<string, string> = {};
    list.forEach(item => {
      settingsMap[item.key] = item.value;
    });

    return res.json({ success: true, settings: settingsMap });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

/**
 * Update settings (HR Manager only)
 */
router.post('/', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const newSettings: Record<string, string> = req.body;
    const existingList = await SheetsRepo.list<Setting>('Settings');

    for (const [key, value] of Object.entries(newSettings)) {
      const existing = existingList.find(s => s.key === key);
      if (existing) {
        await SheetsRepo.update<Setting>('Settings', existing.id, { value: String(value) }, req.user!.employeeId);
      } else {
        await SheetsRepo.create<Setting>('Settings', { key, value: String(value) }, req.user!.employeeId);
      }
    }

    await AuditService.log(req.user!.employeeId, 'UPDATE_SETTINGS', 'Settings', 'global', undefined, newSettings, req.ip);

    return res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

export default router;
