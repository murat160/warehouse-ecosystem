import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

export const devicesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { type } = req.query as { type?: string };
    return prisma.device.findMany({
      where: type ? { type } : {},
      orderBy: { code: 'asc' },
    });
  });

  app.post('/', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = z.object({
      code: z.string(), name: z.string(),
      type: z.enum(['SCANNER', 'SCALE', 'PRINTER', 'CAMERA', 'RFID']),
      assignedTo: z.string().nullable().optional(),
    }).parse(req.body);
    const d = await prisma.device.create({ data: body });
    await audit({ userId: req.user.sub, action: 'device.create', entity: 'Device', entityId: d.id });
    return reply.status(201).send(d);
  });

  app.post('/:id/heartbeat', async (req) => {
    const { id } = req.params as { id: string };
    return prisma.device.update({ where: { id }, data: { lastSeenAt: new Date() } });
  });
};
