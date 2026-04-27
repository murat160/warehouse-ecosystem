import Fastify from 'fastify';
import { env, corsOrigins } from './env.js';
import { registerCors } from './plugins/cors.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';

import { healthRoutes } from './modules/health/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { usersRoutes } from './modules/users/routes.js';
import { rolesRoutes } from './modules/roles/routes.js';
import { warehousesRoutes } from './modules/warehouses/routes.js';
import { zonesRoutes } from './modules/zones/routes.js';
import { locationsRoutes } from './modules/locations/routes.js';
import { productsRoutes } from './modules/products/routes.js';
import { skusRoutes } from './modules/skus/routes.js';
import { inventoryRoutes } from './modules/inventory/routes.js';
import { inboundRoutes } from './modules/inbound/routes.js';
import { ordersRoutes } from './modules/orders/routes.js';
import { tasksRoutes } from './modules/tasks/routes.js';
import { pickingRoutes } from './modules/picking/routes.js';
import { packingRoutes } from './modules/packing/routes.js';
import { shippingRoutes } from './modules/shipping/routes.js';
import { returnsRoutes } from './modules/returns/routes.js';
import { replenishmentRoutes } from './modules/replenishment/routes.js';
import { cycleCountRoutes } from './modules/cycle-count/routes.js';
import { problemTasksRoutes } from './modules/problem-tasks/routes.js';
import { auditRoutes } from './modules/audit/routes.js';
import { devicesRoutes } from './modules/devices/routes.js';
import { hardwareRoutes } from './modules/hardware/routes.js';
import { kpiRoutes } from './modules/kpi/routes.js';
import { supervisorRoutes } from './modules/supervisor/routes.js';
import { scansRoutes } from './modules/scans/routes.js';

async function buildServer() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
      : true,
  });

  await registerCors(app, corsOrigins);
  await registerAuth(app);
  registerErrorHandler(app);

  // Mount all module routes under /api
  await app.register(async (api) => {
    await api.register(healthRoutes,        { prefix: '/health' });
    await api.register(authRoutes,          { prefix: '/auth' });
    await api.register(usersRoutes,         { prefix: '/users' });
    await api.register(rolesRoutes,         { prefix: '/roles' });
    await api.register(warehousesRoutes,    { prefix: '/warehouses' });
    await api.register(zonesRoutes,         { prefix: '/zones' });
    await api.register(locationsRoutes,     { prefix: '/locations' });
    await api.register(productsRoutes,      { prefix: '/products' });
    await api.register(skusRoutes,          { prefix: '/skus' });
    await api.register(inventoryRoutes,     { prefix: '/inventory' });
    await api.register(inboundRoutes,       { prefix: '/inbound' });
    await api.register(ordersRoutes,        { prefix: '/orders' });
    await api.register(tasksRoutes,         { prefix: '/tasks' });
    await api.register(pickingRoutes,       { prefix: '/picking' });
    await api.register(packingRoutes,       { prefix: '/packing' });
    await api.register(shippingRoutes,      { prefix: '/shipping' });
    await api.register(returnsRoutes,       { prefix: '/returns' });
    await api.register(replenishmentRoutes, { prefix: '/replenishment' });
    await api.register(cycleCountRoutes,    { prefix: '/cycle-count' });
    await api.register(problemTasksRoutes,  { prefix: '/problem-tasks' });
    await api.register(auditRoutes,         { prefix: '/audit' });
    await api.register(devicesRoutes,       { prefix: '/devices' });
    await api.register(hardwareRoutes,      { prefix: '/hardware' });
    await api.register(kpiRoutes,           { prefix: '/kpi' });
    await api.register(supervisorRoutes,    { prefix: '/supervisor' });
    await api.register(scansRoutes,         { prefix: '/scans' });
  }, { prefix: '/api' });

  return app;
}

async function start() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    app.log.info(`WMS API ready at http://${env.API_HOST}:${env.API_PORT}/api/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
