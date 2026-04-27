import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../prisma.js';

export const auditRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { entity, entityId, userId, limit } = req.query as Record<string, string | undefined>;
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entity ? { entity } : {}),
        ...(entityId ? { entityId } : {}),
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit ?? '100', 10), 1000),
      include: { user: { select: { fullName: true, employeeId: true } } },
    });
    return logs.map(l => ({ ...l, payload: l.payload ? JSON.parse(l.payload) : null }));
  });
};
