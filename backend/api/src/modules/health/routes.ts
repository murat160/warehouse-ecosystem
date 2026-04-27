import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../prisma.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    let dbOk = true;
    try { await prisma.$queryRaw`SELECT 1`; } catch { dbOk = false; }
    return {
      status: dbOk ? 'ok' : 'degraded',
      service: 'wms-api',
      time: new Date().toISOString(),
      database: dbOk ? 'up' : 'down',
      uptime: Math.round(process.uptime()),
    };
  });
};
