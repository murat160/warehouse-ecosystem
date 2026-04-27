import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';
import { nextSeq } from '../../lib/codes.js';
import { makeOrderCode } from '@wms/warehouse-core';
import { createTask, pickWorker } from '../../lib/task-engine.js';
import { TaskType, OrderStatus } from '@wms/shared-types';
import { assertTransition, ORDER_TRANSITIONS } from '@wms/warehouse-core';

const createSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  shippingAddr: z.string().optional(),
  city: z.string().optional(),
  zone: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  items: z.array(z.object({
    skuId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
});

export const ordersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { status, priority } = req.query as Record<string, string | undefined>;
    return prisma.order.findMany({
      where: { ...(status ? { status } : {}), ...(priority ? { priority } : {}) },
      orderBy: { createdAt: 'desc' }, take: 200,
      include: { _count: { select: { items: true, tasks: true } } },
    });
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { sku: { include: { product: true } } } },
        tasks: true,
      },
    });
    if (!order) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return order;
  });

  /** Lookup by human-readable order code (ORD-2026-00001). */
  app.get('/by-code/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const order = await prisma.order.findUnique({
      where: { code },
      include: {
        items: { include: { sku: { include: { product: true } } } },
        tasks: true,
      },
    });
    if (!order) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return order;
  });

  /** Lookup the order linked to a given task (PICK/PACK/LOAD). */
  app.get('/by-task/:taskId', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task?.orderId) return reply.status(404).send({ error: 'Task has no order', code: 'NOT_FOUND' });
    const order = await prisma.order.findUnique({
      where: { id: task.orderId },
      include: { items: { include: { sku: { include: { product: true } } } }, tasks: true },
    });
    if (!order) return reply.status(404).send({ error: 'Order not found', code: 'NOT_FOUND' });
    return order;
  });

  app.post('/', async (req, reply) => {
    const body = createSchema.parse(req.body);
    const seq = await nextSeq('ORDER');
    const code = makeOrderCode(new Date().getFullYear(), seq);

    const order = await prisma.order.create({
      data: {
        code, status: OrderStatus.NEW, priority: body.priority,
        customerName: body.customerName, customerPhone: body.customerPhone,
        shippingAddr: body.shippingAddr, city: body.city, zone: body.zone,
        items: { create: body.items },
      },
      include: { items: true },
    });
    await audit({ userId: req.user.sub, action: 'order.create', entity: 'Order', entityId: order.id });
    return reply.status(201).send(order);
  });

  /**
   * Reserve stock and release order to picking.
   * Tries to reserve every item; if any fails — order goes to PROBLEM.
   */
  app.post('/:id/release', async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    assertTransition(ORDER_TRANSITIONS, order.status as any, OrderStatus.INVENTORY_CHECKING as any, 'order');

    await prisma.order.update({ where: { id }, data: { status: OrderStatus.INVENTORY_CHECKING } });

    let allReserved = true;
    for (const item of order.items) {
      const stock = await prisma.inventoryItem.findMany({
        where: { skuId: item.skuId, status: 'AVAILABLE' },
      });
      let need = item.quantity;
      for (const s of stock) {
        if (need <= 0) break;
        const free = s.quantity - s.reserved;
        const take = Math.min(free, need);
        if (take <= 0) continue;
        await prisma.inventoryItem.update({ where: { id: s.id }, data: { reserved: s.reserved + take } });
        need -= take;
      }
      if (need > 0) allReserved = false;
    }

    if (!allReserved) {
      await prisma.order.update({ where: { id }, data: { status: OrderStatus.PROBLEM } });
      return reply.status(409).send({ error: 'Insufficient stock', code: 'INSUFFICIENT_STOCK' });
    }

    await prisma.order.update({ where: { id }, data: { status: OrderStatus.RESERVED } });
    await prisma.order.update({ where: { id }, data: { status: OrderStatus.RELEASED } });

    // Create PICK task and try to assign to a free picker
    const assignedToId = await pickWorker({ roleName: 'PICKER' });
    const task = await createTask({
      type: TaskType.PICK,
      orderId: id,
      priority: order.priority as any,
      payload: { orderCode: order.code },
      assignedToId: assignedToId ?? undefined,
    });
    await prisma.order.update({
      where: { id },
      data: { status: assignedToId ? OrderStatus.PICKING_ASSIGNED : OrderStatus.RELEASED },
    });

    await audit({ userId: req.user.sub, action: 'order.release', entity: 'Order', entityId: id, payload: { taskId: task.id } });
    return { ok: true, taskId: task.id, assigned: !!assignedToId };
  });

  app.post('/:id/cancel', async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    // Release reservations
    for (const it of order.items) {
      const stock = await prisma.inventoryItem.findMany({ where: { skuId: it.skuId, reserved: { gt: 0 } } });
      for (const s of stock) {
        const release = Math.min(s.reserved, it.quantity);
        await prisma.inventoryItem.update({ where: { id: s.id }, data: { reserved: s.reserved - release } });
      }
    }
    await prisma.order.update({ where: { id }, data: { status: OrderStatus.CANCELLED } });
    await audit({ userId: req.user.sub, action: 'order.cancel', entity: 'Order', entityId: id });
    return { ok: true };
  });
};
