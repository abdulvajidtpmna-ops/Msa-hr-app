import { SheetsRepo } from './sheetsRepo';
import { AuditLog } from '../types';

export class AuditService {
  static async log(
    actorId: string,
    action: string,
    entity: string,
    entityId: string,
    beforeState?: any,
    afterState?: any,
    ip?: string
  ): Promise<void> {
    // Non-blocking background execution: Never stall the user response
    setImmediate(async () => {
      try {
        await SheetsRepo.create<AuditLog>(
          'AuditLog',
          {
            actor_id: actorId || 'system',
            action,
            entity,
            entity_id: entityId,
            before_json: beforeState ? JSON.stringify(beforeState) : '',
            after_json: afterState ? JSON.stringify(afterState) : '',
            ip: ip || '',
            timestamp: new Date().toISOString()
          },
          actorId || 'system'
        );
      } catch (err) {
        console.warn('[AuditService] Background audit log write notice:', (err as any)?.message);
      }
    });
    return Promise.resolve();
  }
}

