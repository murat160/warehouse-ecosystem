import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

const createSchema = z.object({
  productId: z.string().min(1),
  code: z.string().min(1),
  barcode: z.string().min(1),
  color: z.string().optional(),
  size: z.string().optional(),
  weight: z.number().positive().optional(),
  storageType: z.enum(['FOLDED', 'HANGING', 'SHOES', 'ACCESSORIES']).default('FOLDED'),
});

export const skusRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { productId, q } = req.query as { productId?: string; q?: string };
    return prisma.sKU.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(q ? { OR: [{ code: { contains: q } }, { barcode: { contains: q } }] } : {}),
      },
      include: { product: true },
      take: 200,
    });
  });

  app.get('/by-barcode/:barcode', async (req, reply) => {
    const { barcode } = req.params as { barcode: string };
    const sku = await prisma.sKU.findUnique({
      where: { barcode },
      include: { product: true, inventory: { include: { location: true } } },
    });
    if (!sku) return reply.status(404).send({ error: 'SKU not found', code: 'NOT_FOUND' });
    return sku;
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const sku = await prisma.sKU.findUnique({
      where: { id },
      include: { product: true, inventory: { include: { location: true } } },
    });
    if (!sku) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return sku;
  });

  app.post('/', async (req, reply) => {
    const body = createSchema.parse(req.body);
    const sku = await prisma.sKU.create({ data: body });
    await audit({ userId: req.user.sub, action: 'sku.create', entity: 'SKU', entityId: sku.id });
    return reply.status(201).send(sku);
  });
};
