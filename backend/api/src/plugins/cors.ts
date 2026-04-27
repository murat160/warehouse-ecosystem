import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export async function registerCors(app: FastifyInstance, origins: string[]) {
  await app.register(cors, {
    origin: (origin, cb) => {
      // allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) return cb(null, true);
      if (origins.includes('*') || origins.includes(origin)) return cb(null, true);
      cb(new Error('Origin not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
}
