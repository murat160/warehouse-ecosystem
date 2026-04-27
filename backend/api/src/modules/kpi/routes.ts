import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../prisma.js';

export const kpiRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/dashboard', async () => {
    const [orders, openTasks, problems, users, ordersReady] = await Promise.all([
      prisma.order.count(),
      prisma.task.count({ where: { status: { in: ['CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] } } }),
      prisma.problemTask.count({ where: { status: 'OPEN' } }),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count({ where: { status: 'READY_FOR_DISPATCH' } }),
    ]);
    return {
      orders, openTasks, problems, activeWorkers: users,
      ordersReadyForDispatch: ordersReady, generatedAt: new Date().toISOString(),
    };
  });

  app.get('/worker/:userId', async (req) => {
    const { userId } = req.params as { userId: string };
    const [completed, errors] = await Promise.all([
      prisma.task.count({ where: { assignedToId: userId, status: 'COMPLETED' } }),
      prisma.scanLog.count({ where: { userId, result: 'ERROR' } }),
    ]);
    return { userId, tasksCompleted: completed, scanErrors: errors };
  });
};
