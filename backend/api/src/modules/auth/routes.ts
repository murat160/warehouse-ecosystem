import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

const loginSchema = z.object({
  employeeId: z.string().min(1),
  pin: z.string().min(4),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (req, reply) => {
    const { employeeId, pin } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { employeeId },
      include: { role: true },
    });

    if (!user || user.status === 'BLOCKED') {
      await audit({ action: 'login.failed', payload: { employeeId, reason: 'not_found_or_blocked' } });
      return reply.status(401).send({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const ok = await bcrypt.compare(pin, user.pinHash);
    if (!ok) {
      await audit({ userId: user.id, action: 'login.failed', payload: { reason: 'wrong_pin' } });
      return reply.status(401).send({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const token = app.jwt.sign({
      sub: user.id,
      employeeId: user.employeeId,
      role: user.role.name,
      warehouseId: user.warehouseId,
    });

    await audit({ userId: user.id, action: 'login.ok' });

    return {
      token,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        warehouseId: user.warehouseId,
        zoneId: user.zoneId,
        status: user.status,
        shift: user.shift,
        createdAt: user.createdAt.toISOString(),
      },
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: JSON.parse(user.role.permissions),
      },
    };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });
    if (!user) return reply.status(404).send({ error: 'User not found', code: 'NOT_FOUND' });
    return {
      user: {
        id: user.id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        warehouseId: user.warehouseId,
        zoneId: user.zoneId,
        status: user.status,
        shift: user.shift,
        createdAt: user.createdAt.toISOString(),
      },
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: JSON.parse(user.role.permissions),
      },
    };
  });

  app.post('/logout', { preHandler: [app.authenticate] }, async (req) => {
    await audit({ userId: req.user.sub, action: 'logout' });
    return { ok: true };
  });

  /**
   * Public list of staff for the login screen — returns only the
   * minimum needed to render a worker-picker UI. No PIN, no email, no phone.
   * In production you might restrict this to LAN/CIDR via reverse-proxy.
   */
  app.get('/workers', async () => {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, employeeId: true, fullName: true,
        role: { select: { name: true } },
      },
      orderBy: { employeeId: 'asc' },
    });
    return users.map(u => ({
      id: u.id,
      employeeId: u.employeeId,
      fullName: u.fullName,
      roleName: u.role.name,
    }));
  });
};
