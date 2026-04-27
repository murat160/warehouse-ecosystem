import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

export const problemTasksRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { status } = req.query as { status?: string };
    return prisma.problemTask.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' }, take: 200,
      include: {
        task: { select: { id: true, code: true, type: true, status: true } },
        reportedBy: { select: { id: true, fullName: true, employeeId: true } },
      },
    });
  });

  app.post('/:id/resolve', async (req, reply) => {
    if (!['SHIFT_SUPERVISOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { id } = req.params as { id: string };
    const body = z.object({ notes: z.string().optional() }).parse(req.body);
    const updated = await prisma.problemTask.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedById: req.user.sub, resolvedAt: new Date(), notes: body.notes ?? undefined },
    });
    await audit({ userId: req.user.sub, action: 'problem-task.resolve', entity: 'ProblemTask', entityId: id });
    return updated;
  });

  app.post('/:id/escalate', async (req) => {
    const { id } = req.params as { id: string };
    const updated = await prisma.problemTask.update({
      where: { id }, data: { status: 'ESCALATED' },
    });
    await audit({ userId: req.user.sub, action: 'problem-task.escalate', entity: 'ProblemTask', entityId: id });
    return updated;
  });
};
