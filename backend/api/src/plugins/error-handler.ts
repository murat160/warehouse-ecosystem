import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.flatten(),
      });
    }

    const status = (err as any).statusCode ?? 500;
    const code = (err as any).code ?? 'INTERNAL_ERROR';

    if (status >= 500) {
      req.log.error({ err }, 'Unhandled error');
    }

    reply.status(status).send({
      error: err instanceof Error ? err.message : 'Internal server error',
      code,
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: `Route ${req.method} ${req.url} not found`,
      code: 'NOT_FOUND',
    });
  });
}
