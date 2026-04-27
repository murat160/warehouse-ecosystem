// ============================================================
//  Partner API — placeholder routes for external retail networks.
//
//  Purpose:
//    Large chains (BIM, Biedronka, supermarket networks) plug into the
//    platform via a partner API key + webhook URL, NOT via a duplicated
//    seller-app instance. This module reserves the contract surface so
//    we never have to break URLs once endpoints are implemented.
//
//  Status:
//    All routes return 501 Not Implemented with a stable shape so
//    integrators can already wire their HTTP clients and tests.
//    Auth check is in place: every call must carry header
//      X-Partner-Key: <key>
//    The key validation itself is a TODO (see lib/partner-auth.ts).
//
//  Spec reference: docs/PARTNER_API.md
// ============================================================

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

interface PartnerRequest extends FastifyRequest {
  partner?: { id: string; name: string; externalId: string | null };
}

/**
 * Lightweight pre-handler: reads X-Partner-Key, attaches a stub partner
 * record, and 401s if the header is missing. Real key lookup against
 * a PartnerApiKey table is wired in Stage 6+.
 */
async function partnerAuth(req: PartnerRequest, reply: FastifyReply) {
  const key = req.headers['x-partner-key'];
  if (!key || typeof key !== 'string' || key.length < 8) {
    return reply.status(401).send({
      error: 'Missing or malformed X-Partner-Key header',
      code: 'PARTNER_KEY_REQUIRED',
    });
  }
  // TODO Stage 6+: look up key in DB, attach real partner row.
  req.partner = { id: 'stub', name: 'partner-stub', externalId: null };
}

const NOT_IMPLEMENTED = (route: string) => ({
  ok: false,
  error: `Partner endpoint ${route} is reserved but not yet implemented`,
  code: 'NOT_IMPLEMENTED',
  spec: '/docs/PARTNER_API.md',
});

export const partnerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', partnerAuth);

  // Catalog sync ---------------------------------------------------------
  app.post('/products/sync', async (_req, reply) =>
    reply.status(501).send(NOT_IMPLEMENTED('POST /api/partner/products/sync')));

  app.post('/inventory/sync', async (_req, reply) =>
    reply.status(501).send(NOT_IMPLEMENTED('POST /api/partner/inventory/sync')));

  // Branch / store sync --------------------------------------------------
  app.post('/branches/sync', async (_req, reply) =>
    reply.status(501).send(NOT_IMPLEMENTED('POST /api/partner/branches/sync')));

  // Order flow -----------------------------------------------------------
  app.post('/orders/accept', async (_req, reply) =>
    reply.status(501).send(NOT_IMPLEMENTED('POST /api/partner/orders/accept')));

  app.post('/orders/status', async (_req, reply) =>
    reply.status(501).send(NOT_IMPLEMENTED('POST /api/partner/orders/status')));

  app.post('/returns/status', async (_req, reply) =>
    reply.status(501).send(NOT_IMPLEMENTED('POST /api/partner/returns/status')));

  // Webhook subscription -------------------------------------------------
  app.post('/webhooks/register', async (_req, reply) =>
    reply.status(501).send(NOT_IMPLEMENTED('POST /api/partner/webhooks/register')));

  // Healthcheck for partner integrators (always 200 once the key is OK)
  app.get('/health', async (req: PartnerRequest) => ({
    ok: true,
    partner: req.partner?.name ?? 'unknown',
    apiVersion: 'v0',
    note: 'Stage-6+ endpoints planned; see /docs/PARTNER_API.md',
  }));
};
