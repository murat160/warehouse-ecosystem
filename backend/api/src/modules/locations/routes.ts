import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

const createSchema = z.object({
  zoneId: z.string().min(1),
  code: z.string().min(1),
  barcode: z.string().min(1),
  aisle: z.string().optional(),
  rack: z.string().optional(),
  section: z.string().optional(),
  shelf: z.string().optional(),
  bin: z.string().optional(),
  capacity: z.number().int().positive().optional(),
});

export const locationsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { zoneId, status } = req.query as { zoneId?: string; status?: string };
    return prisma.location.findMany({
      where: { ...(zoneId ? { zoneId } : {}), ...(status ? { status } : {}) },
      orderBy: { code: 'asc' },
      take: 500,
    });
  });

  app.get('/by-barcode/:barcode', async (req, reply) => {
    const { barcode } = req.params as { barcode: string };
    const loc = await prisma.location.findUnique({
      where: { barcode },
      include: {
        zone: true,
        inventory: { include: { sku: { include: { product: true } } } },
      },
    });
    if (!loc) return reply.status(404).send({ error: 'Location not found', code: 'NOT_FOUND' });
    return loc;
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const loc = await prisma.location.findUnique({
      where: { id },
      include: { zone: true, inventory: { include: { sku: true } } },
    });
    if (!loc) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return loc;
  });

  app.post('/', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = createSchema.parse(req.body);
    const loc = await prisma.location.create({ data: body });
    await audit({ userId: req.user.sub, action: 'location.create', entity: 'Location', entityId: loc.id });
    return reply.status(201).send(loc);
  });

  app.patch('/:id/status', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { id } = req.params as { id: string };
    const { status } = z.object({ status: z.enum(['ACTIVE', 'BLOCKED', 'MAINTENANCE']) }).parse(req.body);
    const loc = await prisma.location.update({ where: { id }, data: { status } });
    await audit({ userId: req.user.sub, action: 'location.status', entity: 'Location', entityId: id, payload: { status } });
    return loc;
  });
};
