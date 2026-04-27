import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { env } from '../env.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;          // user id
      employeeId: string;
      role: string;
      warehouseId: string | null;
    };
    user: {
      sub: string;
      employeeId: string;
      role: string;
      warehouseId: string | null;
    };
  }
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  // Decorator: any route can call `await req.authenticate()` to require login
  app.decorate('authenticate', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw app.httpErrors?.unauthorized?.('Invalid or missing token') ??
        Object.assign(new Error('Unauthorized'), { statusCode: 401, code: 'UNAUTHORIZED' });
    }
  });

  // Decorator: require specific role(s)
  app.decorate('requireRole', (...roles: string[]) => {
    return async (req: FastifyRequest) => {
      await (app as any).authenticate(req);
      if (!roles.includes(req.user.role)) {
        throw Object.assign(new Error('Forbidden: insufficient role'), {
          statusCode: 403, code: 'FORBIDDEN',
        });
      }
    };
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest) => Promise<void>;
    requireRole: (...roles: string[]) => (req: FastifyRequest) => Promise<void>;
  }
}
