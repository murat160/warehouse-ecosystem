import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';
import { nextSeq } from '../../lib/codes.js';
import { makeRMACode } from '@wms/warehouse-core';
import { RMAStatus, RMADecision } from '@wms/shared-types';
import { assertTransition, RMA_TRANSITIONS } from '@wms/warehouse-core';

export const returnsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { status, orderId } = req.query as Record<string, string | undefined>;
    return prisma.rMA.findMany({
      where: { ...(status ? { status } : {}), ...(orderId ? { orderId } : {}) },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
  });

  app.post('/', async (req, reply) => {
    const body = z.object({
      orderId: z.string(),
      reason: z.string(),
    }).parse(req.body);

    const seq = await nextSeq('RMA');
    const code = makeRMACode(new Date().getFullYear(), seq);
    const rma = await prisma.rMA.create({
      data: { code, orderId: body.orderId, reason: body.reason, status: RMAStatus.CREATED },
    });
    await audit({ userId: req.user.sub, action: 'rma.create', entity: 'RMA', entityId: rma.id });
    return reply.status(201).send(rma);
  });

  app.post('/:id/receive', async (req, reply) => {
    if (!['RETURNS_OPERATOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { id } = req.params as { id: string };
    const rma = await prisma.rMA.findUnique({ where: { id } });
    if (!rma) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    assertTransition(RMA_TRANSITIONS, rma.status as any, RMAStatus.RECEIVED as any, 'rma');
    const updated = await prisma.rMA.update({
      where: { id }, data: { status: RMAStatus.RECEIVED, receivedAt: new Date() },
    });
    await audit({ userId: req.user.sub, action: 'rma.receive', entity: 'RMA', entityId: id });
    return updated;
  });

  app.post('/:id/decide', async (req, reply) => {
    if (!['RETURNS_OPERATOR', 'QC_INSPECTOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { id } = req.params as { id: string };
    const body = z.object({ decision: z.nativeEnum(RMADecision) }).parse(req.body);

    const rma = await prisma.rMA.findUnique({ where: { id } });
    if (!rma) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    const updated = await prisma.rMA.update({
      where: { id },
      data: {
        decision: body.decision,
        status: RMAStatus.DECIDED,
        decidedAt: new Date(),
        decidedBy: req.user.sub,
      },
    });
    await audit({ userId: req.user.sub, action: 'rma.decide', entity: 'RMA', entityId: id, payload: body });
    return updated;
  });
};
