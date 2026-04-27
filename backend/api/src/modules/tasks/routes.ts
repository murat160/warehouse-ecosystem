import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';
import { transitionTask, assignTask, reassignTask, createTask } from '../../lib/task-engine.js';
import { TaskStatus, TaskType } from '@wms/shared-types';

export const tasksRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /tasks — list. Default scope:
   *   workers see only their own
   *   supervisors see whole shift (warehouse + zone)
   *   admins see all
   */
  app.get('/', async (req) => {
    const { type, status, assignedToId, mine } = req.query as Record<string, string | undefined>;
    const role = req.user.role;
    const where: any = {};
    if (mine === 'true') where.assignedToId = req.user.sub;
    else if (assignedToId) where.assignedToId = assignedToId;
    else if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(role)) {
      where.assignedToId = req.user.sub;
    }
    if (type) where.type = type;
    if (status) where.status = status;

    return prisma.task.findMany({
      where, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 200,
      include: { assignedTo: { select: { id: true, employeeId: true, fullName: true } } },
    });
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: true, order: { include: { items: { include: { sku: { include: { product: true } } } } } },
        problem: true,
      },
    });
    if (!task) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return { ...task, payload: JSON.parse(task.payload || '{}') };
  });

  app.post('/', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = z.object({
      type: z.nativeEnum(TaskType),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
      orderId: z.string().optional(),
      payload: z.record(z.unknown()).optional(),
      assignedToId: z.string().optional(),
    }).parse(req.body);
    const t = await createTask(body);
    await audit({ userId: req.user.sub, action: 'task.create', entity: 'Task', entityId: t.id });
    return reply.status(201).send(t);
  });

  app.post('/:id/accept', async (req) => {
    const { id } = req.params as { id: string };
    const t = await transitionTask(id, 'ACCEPTED');
    await audit({ userId: req.user.sub, action: 'task.accept', entity: 'Task', entityId: id });
    return t;
  });

  app.post('/:id/start', async (req) => {
    const { id } = req.params as { id: string };
    const t = await transitionTask(id, 'IN_PROGRESS');
    await audit({ userId: req.user.sub, action: 'task.start', entity: 'Task', entityId: id });
    return t;
  });

  app.post('/:id/complete', async (req) => {
    const { id } = req.params as { id: string };
    const t = await transitionTask(id, 'COMPLETED');
    await audit({ userId: req.user.sub, action: 'task.complete', entity: 'Task', entityId: id });
    return t;
  });

  app.post('/:id/transition', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { to } = z.object({ to: z.nativeEnum(TaskStatus) }).parse(req.body);
    try {
      const t = await transitionTask(id, to as keyof typeof TaskStatus);
      await audit({ userId: req.user.sub, action: 'task.transition', entity: 'Task', entityId: id, payload: { to } });
      return t;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message, code: 'INVALID_TRANSITION' });
    }
  });

  app.post('/:id/assign', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { id } = req.params as { id: string };
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const t = await assignTask(id, userId);
    await audit({ userId: req.user.sub, action: 'task.assign', entity: 'Task', entityId: id, payload: { userId } });
    return t;
  });

  app.post('/:id/reassign', async (req, reply) => {
    if (!['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER', 'SHIFT_SUPERVISOR'].includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { id } = req.params as { id: string };
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const t = await reassignTask(id, userId);
    await audit({ userId: req.user.sub, action: 'task.reassign', entity: 'Task', entityId: id, payload: { userId } });
    return t;
  });

  /** Worker reports a problem with a task. Auto-transitions to BLOCKED. */
  app.post('/:id/problem', async (req) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      reason: z.string(),
      notes: z.string().optional(),
    }).parse(req.body);

    await prisma.task.update({ where: { id }, data: { status: 'BLOCKED' } });
    const problem = await prisma.problemTask.create({
      data: {
        taskId: id, reason: body.reason, notes: body.notes,
        reportedById: req.user.sub, status: 'OPEN',
      },
    });
    await audit({ userId: req.user.sub, action: 'task.problem', entity: 'Task', entityId: id, payload: body });
    return problem;
  });
};
