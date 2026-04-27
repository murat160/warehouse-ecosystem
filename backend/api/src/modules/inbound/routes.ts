// ============================================================
//  Inbound flow: ASN → Receiving → QC → Putaway
//  Sub-paths under /api/inbound:
//    /asn         — list & create ASN
//    /asn/:id     — detail
//    /receive     — record received quantities (creates QC tasks)
//    /qc          — QC decision (creates PUTAWAY task)
//    /putaway     — confirm bin placement (updates inventory)
// ============================================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';
import { nextSeq } from '../../lib/codes.js';
import { makeASNCode } from '@wms/warehouse-core';
import { createTask, transitionTask } from '../../lib/task-engine.js';
import { TaskType } from '@wms/shared-types';

export const inboundRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // -------- ASN --------
  app.get('/asn', async (req) => {
    const { sellerId, status } = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (req.user.role === 'SELLER' && sellerId) where.sellerId = sellerId;
    else if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;
    return prisma.aSN.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 100,
      include: { seller: true, _count: { select: { items: true } } },
    });
  });

  app.post('/asn', async (req, reply) => {
    const body = z.object({
      sellerId: z.string(),
      expectedDate: z.string().datetime().optional(),
      vehicleNumber: z.string().optional(),
      driverInfo: z.string().optional(),
      boxCount: z.number().int().positive().optional(),
      items: z.array(z.object({
        skuId: z.string(),
        expectedQty: z.number().int().positive(),
      })).min(1),
    }).parse(req.body);

    const seq = await nextSeq('ASN');
    const code = makeASNCode(new Date().getFullYear(), seq);

    const asn = await prisma.aSN.create({
      data: {
        code, sellerId: body.sellerId,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        vehicleNumber: body.vehicleNumber, driverInfo: body.driverInfo,
        boxCount: body.boxCount, status: 'CREATED',
        items: { create: body.items },
      },
      include: { items: true },
    });
    await audit({ userId: req.user.sub, action: 'asn.create', entity: 'ASN', entityId: asn.id });
    return reply.status(201).send(asn);
  });

  app.get('/asn/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asn = await prisma.aSN.findUnique({
      where: { id },
      include: { seller: true, items: { include: { sku: { include: { product: true } } } } },
    });
    if (!asn) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return asn;
  });

  /** Lookup by human-readable ASN code (INB-2026-00001). */
  app.get('/asn/by-code/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const asn = await prisma.aSN.findUnique({
      where: { code },
      include: { seller: true, items: { include: { sku: { include: { product: true } } } } },
    });
    if (!asn) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return asn;
  });

  /** Lookup ASN linked to a given task (RECEIVE/QC_CHECK). */
  app.get('/asn/by-task/:taskId', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return reply.status(404).send({ error: 'Task not found', code: 'NOT_FOUND' });
    const payload = JSON.parse(task.payload || '{}');
    if (!payload.asnId) return reply.status(404).send({ error: 'Task has no ASN', code: 'NOT_FOUND' });
    const asn = await prisma.aSN.findUnique({
      where: { id: payload.asnId },
      include: { seller: true, items: { include: { sku: { include: { product: true } } } } },
    });
    if (!asn) return reply.status(404).send({ error: 'ASN not found', code: 'NOT_FOUND' });
    return asn;
  });

  // -------- Receiving --------
  app.post('/receive', async (req, reply) => {
    if (!['RECEIVER', 'SHIFT_SUPERVISOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = z.object({
      asnId: z.string(),
      items: z.array(z.object({
        asnItemId: z.string(),
        receivedQty: z.number().int().nonnegative(),
        damaged: z.boolean().optional(),
      })),
    }).parse(req.body);

    const asn = await prisma.aSN.findUnique({ where: { id: body.asnId }, include: { items: true } });
    if (!asn) return reply.status(404).send({ error: 'ASN not found', code: 'NOT_FOUND' });

    await prisma.$transaction(async (tx) => {
      for (const item of body.items) {
        await tx.aSNItem.update({
          where: { id: item.asnItemId },
          data: {
            receivedQty: item.receivedQty,
            status: item.damaged ? 'DAMAGED' : (item.receivedQty > 0 ? 'RECEIVED' : 'SHORT'),
          },
        });
      }
      await tx.aSN.update({ where: { id: body.asnId }, data: { status: 'RECEIVING' } });
    });

    // Auto-create QC tasks for each received line
    for (const item of body.items.filter(i => i.receivedQty > 0)) {
      const ai = asn.items.find(x => x.id === item.asnItemId);
      if (!ai) continue;
      await createTask({
        type: TaskType.QC_CHECK,
        priority: 'NORMAL',
        payload: { asnId: body.asnId, asnItemId: item.asnItemId, skuId: ai.skuId, qty: item.receivedQty },
      });
    }

    await audit({ userId: req.user.sub, action: 'inbound.receive', entity: 'ASN', entityId: body.asnId, payload: body });
    return { ok: true, qcTasksCreated: body.items.filter(i => i.receivedQty > 0).length };
  });

  // -------- QC --------
  app.post('/qc/:taskId/decide', async (req, reply) => {
    if (!['QC_INSPECTOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { taskId } = req.params as { taskId: string };
    const body = z.object({
      decision: z.enum(['QC_PASSED', 'QC_FAILED', 'REPACK_NEEDED', 'QUARANTINE', 'RETURN_TO_SELLER', 'DAMAGED']),
      notes: z.string().optional(),
    }).parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return reply.status(404).send({ error: 'Task not found', code: 'NOT_FOUND' });
    const payload = JSON.parse(task.payload || '{}');

    await transitionTask(taskId, 'IN_PROGRESS').catch(() => {});
    await transitionTask(taskId, 'COMPLETED');

    // Pass → create PUTAWAY task
    if (body.decision === 'QC_PASSED' || body.decision === 'REPACK_NEEDED') {
      await createTask({
        type: TaskType.PUTAWAY,
        payload: { skuId: payload.skuId, qty: payload.qty, asnId: payload.asnId },
      });
    }

    await audit({
      userId: req.user.sub, action: 'qc.decide', entity: 'Task', entityId: taskId,
      payload: { decision: body.decision, notes: body.notes },
    });
    return { ok: true, decision: body.decision };
  });

  // -------- Putaway --------
  app.post('/putaway/:taskId/confirm', async (req, reply) => {
    if (!['PUTAWAY_OPERATOR', 'RECEIVER', 'WAREHOUSE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { taskId } = req.params as { taskId: string };
    const body = z.object({
      locationBarcode: z.string(),
      skuBarcode: z.string(),
      qty: z.number().int().positive(),
    }).parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return reply.status(404).send({ error: 'Task not found', code: 'NOT_FOUND' });

    const location = await prisma.location.findUnique({ where: { barcode: body.locationBarcode } });
    if (!location) return reply.status(400).send({ error: 'Location barcode invalid', code: 'INVALID_LOCATION' });
    if (location.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Location is not active', code: 'LOCATION_BLOCKED' });
    }

    const sku = await prisma.sKU.findUnique({ where: { barcode: body.skuBarcode } });
    if (!sku) return reply.status(400).send({ error: 'SKU barcode invalid', code: 'INVALID_SKU' });

    const payload = JSON.parse(task.payload || '{}');
    if (payload.skuId && payload.skuId !== sku.id) {
      return reply.status(400).send({ error: 'Scanned SKU does not match task', code: 'WRONG_SKU' });
    }

    // Increment stock
    const existing = await prisma.inventoryItem.findUnique({
      where: { skuId_locationId_status: { skuId: sku.id, locationId: location.id, status: 'AVAILABLE' } },
    });
    if (existing) {
      await prisma.inventoryItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + body.qty } });
    } else {
      await prisma.inventoryItem.create({
        data: { skuId: sku.id, locationId: location.id, status: 'AVAILABLE', quantity: body.qty },
      });
    }

    await transitionTask(taskId, 'IN_PROGRESS').catch(() => {});
    await transitionTask(taskId, 'COMPLETED');
    await audit({
      userId: req.user.sub, action: 'putaway.confirm', entity: 'Task', entityId: taskId,
      payload: { locationId: location.id, skuId: sku.id, qty: body.qty },
    });
    return { ok: true };
  });
};
