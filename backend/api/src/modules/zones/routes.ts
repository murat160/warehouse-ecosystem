import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

const createSchema = z.object({
  warehouseId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
});

export const zonesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { warehouseId } = req.query as { warehouseId?: string };
    return prisma.zone.findMany({
      where: warehouseId ? { warehouseId } : {},
      orderBy: { code: 'asc' },
    });
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const z = await prisma.zone.findUnique({
      where: { id },
      include: { locations: true, _count: { select: { users: true } } },
    });
    if (!z) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return z;
  });

  app.post('/', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = createSchema.parse(req.body);
    const z = await prisma.zone.create({ data: body });
    await audit({ userId: req.user.sub, action: 'zone.create', entity: 'Zone', entityId: z.id });
    return reply.status(201).send(z);
  });
};
