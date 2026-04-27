// Specialized aggregations for the Supervisor Panel.
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../prisma.js';

const SUPERVISOR_ROLES = ['SHIFT_SUPERVISOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'SUPER_ADMIN'];

export const supervisorRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', async (req, reply) => {
    if (!SUPERVISOR_ROLES.includes(req.user.role)) {
      reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
  });

  /** GET /supervisor/shift — workers + their open tasks in supervisor's warehouse */
  app.get('/shift', async (req) => {
    const where = req.user.warehouseId ? { warehouseId: req.user.warehouseId } : {};
    const workers = await prisma.user.findMany({
      where: { ...where, status: 'ACTIVE' },
      include: {
        role: { select: { name: true } },
        _count: {
          select: {
            tasksAssigned: { where: { status: { in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'BLOCKED'] } } },
          },
        },
      },
    });
    return workers.map(w => ({
      id: w.id, employeeId: w.employeeId, fullName: w.fullName,
      role: w.role.name, zoneId: w.zoneId, status: w.status,
      openTasks: w._count.tasksAssigned,
    }));
  });

  /** GET /supervisor/problems — open problem-tasks in scope */
  app.get('/problems', async () => {
    return prisma.problemTask.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: {
        task: { select: { code: true, type: true } },
        reportedBy: { select: { fullName: true, employeeId: true } },
      },
    });
  });
};
