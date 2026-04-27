import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

const createSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  category: z.string().optional(),
  gender: z.string().optional(),
  season: z.string().optional(),
  material: z.string().optional(),
  country: z.string().optional(),
  description: z.string().optional(),
  sellerId: z.string().nullable().optional(),
});

export const productsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { sellerId, q } = req.query as { sellerId?: string; q?: string };
    // Sellers see only their own products
    const where: any = {};
    if (req.user.role === 'SELLER') {
      // Look up seller record by user email convention or sellerId in payload — for Stage 2
      // we just allow only sellerId in query when role is seller.
      if (!sellerId) return [];
      where.sellerId = sellerId;
    } else if (sellerId) {
      where.sellerId = sellerId;
    }
    if (q) where.name = { contains: q };
    return prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = await prisma.product.findUnique({
      where: { id },
      include: { variants: true, seller: true },
    });
    if (!p) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return p;
  });

  app.post('/', async (req, reply) => {
    const body = createSchema.parse(req.body);
    const p = await prisma.product.create({ data: body });
    await audit({ userId: req.user.sub, action: 'product.create', entity: 'Product', entityId: p.id });
    return reply.status(201).send(p);
  });
};
