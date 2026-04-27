import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

const adjustSchema = z.object({
  skuId: z.string().min(1),
  locationId: z.string().min(1),
  delta: z.number().int(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'QUARANTINE', 'DAMAGED', 'RETURN_PENDING']).default('AVAILABLE'),
  reason: z.string().optional(),
});

export const inventoryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { skuId, locationId, status } = req.query as Record<string, string | undefined>;
    return prisma.inventoryItem.findMany({
      where: {
        ...(skuId ? { skuId } : {}),
        ...(locationId ? { locationId } : {}),
        ...(status ? { status } : {}),
      },
      include: { sku: { include: { product: true } }, location: { include: { zone: true } } },
      take: 500,
    });
  });

  app.get('/sku/:skuId/totals', async (req) => {
    const { skuId } = req.params as { skuId: string };
    const items = await prisma.inventoryItem.findMany({ where: { skuId } });
    const totals = items.reduce((acc, it) => {
      acc.total += it.quantity;
      acc.reserved += it.reserved;
      acc.byStatus[it.status] = (acc.byStatus[it.status] ?? 0) + it.quantity;
      return acc;
    }, { total: 0, reserved: 0, byStatus: {} as Record<string, number> });
    return { skuId, ...totals, available: totals.total - totals.reserved };
  });

  /**
   * Adjust inventory (used by putaway, cycle count, manual correction).
   * delta can be negative.
   */
  app.post('/adjust', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'INVENTORY_CONTROLLER',
          'PUTAWAY_OPERATOR', 'RECEIVER'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = adjustSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findUnique({
        where: {
          skuId_locationId_status: {
            skuId: body.skuId, locationId: body.locationId, status: body.status,
          },
        },
      });
      if (existing) {
        const newQty = existing.quantity + body.delta;
        if (newQty < 0) throw Object.assign(new Error('Insufficient stock'), { statusCode: 400, code: 'INSUFFICIENT_STOCK' });
        return tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: newQty },
        });
      }
      if (body.delta < 0) throw Object.assign(new Error('Cannot subtract from non-existent stock'), { statusCode: 400, code: 'INSUFFICIENT_STOCK' });
      return tx.inventoryItem.create({
        data: {
          skuId: body.skuId,
          locationId: body.locationId,
          status: body.status,
          quantity: body.delta,
        },
      });
    });

    await audit({
      userId: req.user.sub, action: 'inventory.adjust',
      entity: 'InventoryItem', entityId: result.id,
      payload: { delta: body.delta, reason: body.reason },
    });
    return result;
  });

  /**
   * Reserve stock for an order (used by orders flow).
   */
  app.post('/reserve', async (req, reply) => {
    const { skuId, qty } = z.object({ skuId: z.string(), qty: z.number().int().positive() }).parse(req.body);
    const items = await prisma.inventoryItem.findMany({
      where: { skuId, status: 'AVAILABLE' },
      orderBy: { quantity: 'desc' },
    });
    let need = qty;
    const updates: Promise<unknown>[] = [];
    for (const it of items) {
      if (need <= 0) break;
      const free = it.quantity - it.reserved;
      const take = Math.min(free, need);
      if (take <= 0) continue;
      updates.push(prisma.inventoryItem.update({
        where: { id: it.id }, data: { reserved: it.reserved + take },
      }));
      need -= take;
    }
    if (need > 0) {
      return reply.status(409).send({ error: 'Not enough stock', code: 'INSUFFICIENT_STOCK', details: { missing: need } });
    }
    await Promise.all(updates);
    await audit({ userId: req.user.sub, action: 'inventory.reserve', payload: { skuId, qty } });
    return { ok: true, reserved: qty };
  });
};
