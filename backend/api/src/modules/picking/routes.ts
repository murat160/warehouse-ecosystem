import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';
import { transitionTask, createTask, pickWorker } from '../../lib/task-engine.js';
import { TaskType, OrderStatus } from '@wms/shared-types';

export const pickingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /** GET /picking — pickers see only their own picks */
  app.get('/', async (req) => {
    const where: any = { type: TaskType.PICK };
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(req.user.role)) {
      where.assignedToId = req.user.sub;
    }
    return prisma.task.findMany({
      where, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: { order: { select: { id: true, code: true, priority: true } } },
    });
  });

  /**
   * POST /picking/:taskId/scan
   * Picker scans bin, SKU, tote. Backend validates and updates picked counter.
   */
  app.post('/:taskId/scan', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };
    const body = z.object({
      locationBarcode: z.string(),
      skuBarcode: z.string(),
      toteId: z.string(),
      qty: z.number().int().positive().default(1),
    }).parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { order: { include: { items: true } } },
    });
    if (!task || task.type !== 'PICK') {
      return reply.status(404).send({ error: 'Pick task not found', code: 'NOT_FOUND' });
    }

    const sku = await prisma.sKU.findUnique({ where: { barcode: body.skuBarcode } });
    if (!sku) {
      await prisma.scanLog.create({
        data: { userId: req.user.sub, scanType: 'SKU', value: body.skuBarcode, taskId, result: 'ERROR', errorCode: 'INVALID_SKU' },
      });
      return reply.status(400).send({ error: 'SKU barcode invalid', code: 'INVALID_SKU' });
    }

    // Find the order item
    const orderItem = task.order?.items.find(i => i.skuId === sku.id);
    if (!orderItem) {
      await prisma.scanLog.create({
        data: { userId: req.user.sub, scanType: 'SKU', value: body.skuBarcode, taskId, result: 'ERROR', errorCode: 'WRONG_SKU' },
      });
      return reply.status(400).send({ error: 'SKU not in this order', code: 'WRONG_SKU' });
    }
    if (orderItem.picked + body.qty > orderItem.quantity) {
      return reply.status(400).send({ error: 'Over-picked', code: 'OVER_PICK' });
    }

    const location = await prisma.location.findUnique({ where: { barcode: body.locationBarcode } });
    if (!location) return reply.status(400).send({ error: 'Bin barcode invalid', code: 'INVALID_LOCATION' });

    // Decrement available stock & release reservation
    const inv = await prisma.inventoryItem.findFirst({
      where: { skuId: sku.id, locationId: location.id, status: 'AVAILABLE' },
    });
    if (!inv || inv.quantity < body.qty) {
      return reply.status(400).send({ error: 'No stock at this location', code: 'NO_STOCK' });
    }

    await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: inv.id },
        data: { quantity: inv.quantity - body.qty, reserved: Math.max(0, inv.reserved - body.qty) },
      }),
      prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { picked: orderItem.picked + body.qty },
      }),
      prisma.scanLog.create({
        data: { userId: req.user.sub, scanType: 'PICK', value: `${body.locationBarcode}|${body.skuBarcode}|${body.toteId}`, taskId, result: 'OK' },
      }),
    ]);

    await audit({ userId: req.user.sub, action: 'pick.scan', entity: 'Task', entityId: taskId, payload: body });

    // If all items in the order are fully picked → mark task complete and create PACK task
    const fresh = await prisma.order.findUnique({ where: { id: task.orderId! }, include: { items: true } });
    if (fresh && fresh.items.every(i => i.picked >= i.quantity)) {
      await transitionTask(taskId, 'IN_PROGRESS').catch(() => {});
      await transitionTask(taskId, 'COMPLETED');
      await prisma.order.update({ where: { id: fresh.id }, data: { status: OrderStatus.PICKED } });
      const packerId = await pickWorker({ roleName: 'PACKER' });
      await createTask({
        type: TaskType.PACK,
        orderId: fresh.id,
        payload: { orderCode: fresh.code, toteId: body.toteId },
        assignedToId: packerId ?? undefined,
      });
      return { ok: true, complete: true };
    }
    return { ok: true, complete: false };
  });
};
