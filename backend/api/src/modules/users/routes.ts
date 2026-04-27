import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

const createSchema = z.object({
  employeeId: z.string().min(1),
  pin: z.string().min(4),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  roleId: z.string().min(1),
  warehouseId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  shift: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ pin: true }).extend({
  status: z.enum(['ACTIVE', 'BLOCKED', 'ON_BREAK', 'OFFLINE']).optional(),
});

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'WAREHOUSE_MANAGER'];

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    // Non-admins see only themselves.
    const isAdmin = ADMIN_ROLES.includes(req.user.role);
    const where = isAdmin ? {} : { id: req.user.sub };
    const users = await prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(u => ({
      id: u.id,
      employeeId: u.employeeId,
      fullName: u.fullName,
      phone: u.phone, email: u.email,
      roleId: u.roleId, roleName: u.role.name,
      warehouseId: u.warehouseId, zoneId: u.zoneId,
      status: u.status, shift: u.shift,
      createdAt: u.createdAt.toISOString(),
    }));
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!ADMIN_ROLES.includes(req.user.role) && req.user.sub !== id) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const u = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!u) return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return {
      id: u.id, employeeId: u.employeeId, fullName: u.fullName,
      phone: u.phone, email: u.email,
      roleId: u.roleId, roleName: u.role.name,
      warehouseId: u.warehouseId, zoneId: u.zoneId,
      status: u.status, shift: u.shift,
      createdAt: u.createdAt.toISOString(),
    };
  });

  app.post('/', async (req, reply) => {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const body = createSchema.parse(req.body);
    const pinHash = await bcrypt.hash(body.pin, 10);
    const user = await prisma.user.create({
      data: { ...body, pin: undefined, pinHash } as any,
    });
    await audit({ userId: req.user.sub, action: 'user.create', entity: 'User', entityId: user.id });
    return reply.status(201).send({ id: user.id, employeeId: user.employeeId });
  });

  app.patch('/:id', async (req, reply) => {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id }, data: body as any });
    await audit({ userId: req.user.sub, action: 'user.update', entity: 'User', entityId: id, payload: body });
    return { id: user.id };
  });

  app.delete('/:id', async (req, reply) => {
    if (req.user.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { id } = req.params as { id: string };
    await prisma.user.update({ where: { id }, data: { status: 'BLOCKED' } });
    await audit({ userId: req.user.sub, action: 'user.block', entity: 'User', entityId: id });
    return { ok: true };
  });
};
