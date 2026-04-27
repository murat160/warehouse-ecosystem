import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';
import { createTask, transitionTask } from '../../lib/task-engine.js';
import { TaskType } from '@wms/shared-types';

export const cycleCountRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const where: any = { type: TaskType.CYCLE_COUNT };
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(req.user.role)) {
      where.assignedToId = req.user.sub;
    }
    return prisma.task.findMany({ where, orderBy: { createdAt: 'asc' } });
  });

  app.post('/schedule', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'INVENTORY_CONTROLLER'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = z.object({ locationIds: z.array(z.string()).min(1) }).parse(req.body);
    const tasks = await Promise.all(body.locationIds.map(id =>
      createTask({ type: TaskType.CYCLE_COUNT, payload: { locationId: id } })
    ));
    await audit({ userId: req.user.sub, action: 'cycle-count.schedule', payload: { count: tasks.length } });
    return reply.status(201).send({ created: tasks.length });
  });

  app.post('/:taskId/submit', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };
    const body = z.object({
      locationId: z.string(), skuId: z.string(), countedQty: z.number().int().nonnegative(),
    }).parse(req.body);

    const inv = await prisma.inventoryItem.findFirst({
      where: { skuId: body.skuId, locationId: body.locationId, status: 'AVAILABLE' },
    });
    const expected = inv?.quantity ?? 0;
    const diff = body.countedQty - expected;

    await transitionTask(taskId, 'IN_PROGRESS').catch(() => {});
    await transitionTask(taskId, diff === 0 ? 'COMPLETED' : 'WAITING_SUPERVISOR');

    if (diff !== 0 && inv) {
      // record discrepancy as audit entry; supervisor will adjust manually via /inventory/adjust
      await audit({
        userId: req.user.sub, action: 'cycle-count.discrepancy',
        entity: 'InventoryItem', entityId: inv.id,
        payload: { expected, counted: body.countedQty, diff },
      });
    }
    return { ok: true, expected, counted: body.countedQty, diff };
  });
};
