// ============================================================
//  Task Engine — central place that creates, assigns and
//  transitions tasks. Used by inbound/orders/returns flows.
// ============================================================

import { prisma } from '../prisma.js';
import { nextSeq } from './codes.js';
import { makeTaskCode } from '@wms/warehouse-core';
import { TaskStatus, type TaskType, type Priority } from '@wms/shared-types';
import { assertTransition, TASK_TRANSITIONS } from '@wms/warehouse-core';

interface CreateTaskInput {
  type: TaskType;
  priority?: Priority;
  orderId?: string;
  payload?: Record<string, unknown>;
  assignedToId?: string;
}

export async function createTask(input: CreateTaskInput) {
  const seq = await nextSeq(`TASK_${input.type}`);
  const code = makeTaskCode(input.type, seq);

  return prisma.task.create({
    data: {
      code,
      type: input.type,
      priority: input.priority ?? 'NORMAL',
      orderId: input.orderId ?? null,
      payload: JSON.stringify(input.payload ?? {}),
      assignedToId: input.assignedToId ?? null,
      status: input.assignedToId ? 'ASSIGNED' : 'CREATED',
    },
  });
}

export async function transitionTask(
  taskId: string,
  toStatus: keyof typeof TaskStatus
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404, code: 'TASK_NOT_FOUND' });

  assertTransition(TASK_TRANSITIONS, task.status as any, TaskStatus[toStatus] as any, 'task');

  const data: any = { status: TaskStatus[toStatus] };
  if (toStatus === 'IN_PROGRESS' && !task.startedAt) data.startedAt = new Date();
  if (toStatus === 'COMPLETED') data.completedAt = new Date();

  return prisma.task.update({ where: { id: taskId }, data });
}

export async function assignTask(taskId: string, userId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: { assignedToId: userId, status: TaskStatus.ASSIGNED },
  });
}

export async function reassignTask(taskId: string, newUserId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: { assignedToId: newUserId, status: TaskStatus.REASSIGNED },
  });
}

/**
 * Auto-pick the best worker for a task.
 * Stage-2 simple version: any active user with the matching role
 * in the same warehouse, with the fewest open tasks.
 * Stage-7+: smarter (zone proximity, skill, error rate, SLA).
 */
export async function pickWorker(opts: {
  roleName: string;
  warehouseId?: string | null;
  zoneId?: string | null;
}): Promise<string | null> {
  const candidates = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      role: { name: opts.roleName },
      ...(opts.warehouseId ? { warehouseId: opts.warehouseId } : {}),
      ...(opts.zoneId ? { zoneId: opts.zoneId } : {}),
    },
    include: {
      _count: {
        select: {
          tasksAssigned: {
            where: { status: { in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] } },
          },
        },
      },
    },
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a._count.tasksAssigned - b._count.tasksAssigned);
  return candidates[0].id;
}
