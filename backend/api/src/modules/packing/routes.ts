import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';
import { transitionTask, createTask, pickWorker } from '../../lib/task-engine.js';
import { TaskType, OrderStatus } from '@wms/shared-types';

const WEIGHT_TOLERANCE = 0.05; // ±5% accepted, otherwise blocked

export const packingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const where: any = { type: TaskType.PACK };
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(req.user.role)) {
      where.assignedToId = req.user.sub;
    }
    return prisma.task.findMany({
      where, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: { order: { select: { id: true, code: true } } },
    });
  });

  app.post('/:taskId/confirm', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };
    const body = z.object({
      scannedSkuIds: z.array(z.string()),
      actualWeightKg: z.number().positive(),
      packageType: z.string().optional(),
    }).parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { order: { include: { items: { include: { sku: true } } } } },
    });
    if (!task || task.type !== 'PACK' || !task.order) {
      return reply.status(404).send({ error: 'Pack task not found', code: 'NOT_FOUND' });
    }

    // Verify every SKU in order is scanned
    const expectedIds = new Set(task.order.items.map(i => i.skuId));
    const actualIds = new Set(body.scannedSkuIds);
    const missing = [...expectedIds].filter(id => !actualIds.has(id));
    if (missing.length > 0) {
      return reply.status(400).send({ error: 'Some SKUs not scanned', code: 'SKU_MISSING', details: { missing } });
    }

    // Weight check
    const expectedWeight = task.order.items.reduce(
      (sum, i) => sum + (i.sku.weight ?? 0) * i.quantity, 0
    );
    if (expectedWeight > 0) {
      const diff = Math.abs(body.actualWeightKg - expectedWeight) / expectedWeight;
      if (diff > WEIGHT_TOLERANCE) {
        await prisma.task.update({ where: { id: taskId }, data: { status: 'BLOCKED' } });
        return reply.status(400).send({
          error: `Weight mismatch (expected ${expectedWeight.toFixed(2)}kg, got ${body.actualWeightKg.toFixed(2)}kg)`,
          code: 'WEIGHT_MISMATCH',
        });
      }
    }

    // Mark items packed
    for (const it of task.order.items) {
      await prisma.orderItem.update({ where: { id: it.id }, data: { packed: it.quantity } });
    }

    await transitionTask(taskId, 'IN_PROGRESS').catch(() => {});
    await transitionTask(taskId, 'COMPLETED');
    await prisma.order.update({
      where: { id: task.order.id },
      data: { status: OrderStatus.PACKED },
    });

    // Create SHIPPING task
    const shipperId = await pickWorker({ roleName: 'SHIPPING_OPERATOR' });
    const shipTask = await createTask({
      type: TaskType.LOAD,
      orderId: task.order.id,
      payload: { orderCode: task.order.code, packageType: body.packageType, weightKg: body.actualWeightKg },
      assignedToId: shipperId ?? undefined,
    });
    await prisma.order.update({ where: { id: task.order.id }, data: { status: OrderStatus.READY_FOR_DISPATCH } });

    await audit({
      userId: req.user.sub, action: 'pack.confirm', entity: 'Task', entityId: taskId,
      payload: { weight: body.actualWeightKg, packageType: body.packageType, shipTaskId: shipTask.id },
    });
    return { ok: true, shipTaskId: shipTask.id };
  });
};
