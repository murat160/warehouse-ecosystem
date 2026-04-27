import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';
import { createTask, transitionTask } from '../../lib/task-engine.js';
import { TaskType } from '@wms/shared-types';

export const replenishmentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const where: any = { type: TaskType.REPLENISHMENT };
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(req.user.role)) {
      where.assignedToId = req.user.sub;
    }
    return prisma.task.findMany({ where, orderBy: { createdAt: 'asc' } });
  });

  app.post('/', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = z.object({
      skuId: z.string(), fromLocationId: z.string(), toLocationId: z.string(),
      qty: z.number().int().positive(),
    }).parse(req.body);
    const task = await createTask({
      type: TaskType.REPLENISHMENT,
      payload: body,
    });
    await audit({ userId: req.user.sub, action: 'replenishment.create', entity: 'Task', entityId: task.id });
    return reply.status(201).send(task);
  });

  app.post('/:taskId/confirm', async (req) => {
    const { taskId } = req.params as { taskId: string };
    const t = await transitionTask(taskId, 'COMPLETED');
    await audit({ userId: req.user.sub, action: 'replenishment.confirm', entity: 'Task', entityId: taskId });
    return t;
  });
};
