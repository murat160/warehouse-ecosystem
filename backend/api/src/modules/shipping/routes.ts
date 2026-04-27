import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';
import { transitionTask } from '../../lib/task-engine.js';
import { OrderStatus } from '@wms/shared-types';

export const shippingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/ready', async () => {
    return prisma.order.findMany({
      where: { status: OrderStatus.READY_FOR_DISPATCH },
      orderBy: { updatedAt: 'asc' }, take: 200,
    });
  });

  app.post('/handoff', async (req, reply) => {
    if (!['SHIPPING_OPERATOR', 'COURIER_DISPATCHER', 'SHIFT_SUPERVISOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = z.object({
      orderIds: z.array(z.string()).min(1),
      courierId: z.string(),
      vehicleNumber: z.string().optional(),
      route: z.string().optional(),
    }).parse(req.body);

    await prisma.$transaction(async (tx) => {
      for (const orderId of body.orderIds) {
        const o = await tx.order.findUnique({ where: { id: orderId } });
        if (!o) continue;
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.HANDED_TO_COURIER },
        });
        // Close any open LOAD tasks for this order
        const loadTasks = await tx.task.findMany({
          where: { orderId, type: 'LOAD', status: { in: ['CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] } },
        });
        for (const t of loadTasks) {
          await transitionTask(t.id, 'COMPLETED').catch(() => {});
        }
      }
    });

    await audit({
      userId: req.user.sub, action: 'shipping.handoff',
      payload: { ...body, count: body.orderIds.length },
    });
    return { ok: true, handed: body.orderIds.length };
  });

  app.get('/manifest/:courierId', async (req) => {
    const { courierId } = req.params as { courierId: string };
    // Stage-2 simplification: query handed orders globally, filter by courier.
    // Stage-3+: persist a Manifest entity.
    return { courierId, orders: await prisma.order.findMany({
      where: { status: OrderStatus.HANDED_TO_COURIER },
      orderBy: { updatedAt: 'desc' }, take: 100,
    })};
  });
};
