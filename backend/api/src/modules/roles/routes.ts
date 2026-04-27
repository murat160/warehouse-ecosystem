import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../prisma.js';

export const rolesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async () => {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    return roles.map(r => ({
      id: r.id, name: r.name, permissions: JSON.parse(r.permissions),
    }));
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const r = await prisma.role.findUnique({ where: { id } });
    if (!r) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return { id: r.id, name: r.name, permissions: JSON.parse(r.permissions) };
  });
};
