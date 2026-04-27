import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
});

export const warehousesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async () => prisma.warehouse.findMany({ orderBy: { code: 'asc' } }));

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const w = await prisma.warehouse.findUnique({
      where: { id },
      include: { zones: true },
    });
    if (!w) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return w;
  });

  app.post('/', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = createSchema.parse(req.body);
    const w = await prisma.warehouse.create({ data: body });
    await audit({ userId: req.user.sub, action: 'warehouse.create', entity: 'Warehouse', entityId: w.id });
    return reply.status(201).send(w);
  });

  app.patch('/:id', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { id } = req.params as { id: string };
    const body = createSchema.partial().parse(req.body);
    const w = await prisma.warehouse.update({ where: { id }, data: body });
    await audit({ userId: req.user.sub, action: 'warehouse.update', entity: 'Warehouse', entityId: id });
    return w;
  });
};
