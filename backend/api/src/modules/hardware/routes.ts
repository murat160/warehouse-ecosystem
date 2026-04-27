// ============================================================
//  Hardware mock services. Real hardware integrations replace
//  these implementations later. API contracts stay stable.
//
//  Endpoints:
//    POST /scan        — barcode scanner read (mock returns input)
//    POST /weigh       — scale read (mock returns deterministic weight)
//    POST /print       — print label (mock returns label URL)
//    POST /photo       — capture photo (mock returns dummy URL)
//    POST /rfid        — RFID gate read (mock)
//    GET  /devices     — list registered hardware
// ============================================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const hardwareRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.post('/scan', async (req) => {
    const { barcode, deviceId } = z.object({
      barcode: z.string().min(1), deviceId: z.string().optional(),
    }).parse(req.body);
    return { ok: true, barcode, deviceId, scannedAt: new Date().toISOString() };
  });

  app.post('/weigh', async (req) => {
    const { expectedKg } = z.object({
      expectedKg: z.number().positive().optional(),
    }).parse(req.body);
    // Mock: return expected ±2%, otherwise 1.0kg
    const value = expectedKg ? +(expectedKg * (0.98 + Math.random() * 0.04)).toFixed(3) : 1.0;
    return { ok: true, weightKg: value, weighedAt: new Date().toISOString() };
  });

  app.post('/print', async (req) => {
    const { labelType, payload } = z.object({
      labelType: z.string(), payload: z.record(z.unknown()).optional(),
    }).parse(req.body);
    return {
      ok: true, labelType,
      labelUrl: `mock://label/${labelType}/${Date.now()}`,
      printedAt: new Date().toISOString(),
      payload,
    };
  });

  app.post('/photo', async () => {
    return { ok: true, photoUrl: `mock://photo/${Date.now()}.jpg`, capturedAt: new Date().toISOString() };
  });

  app.post('/rfid', async (req) => {
    const { gateId } = z.object({ gateId: z.string() }).parse(req.body);
    return {
      ok: true, gateId, tags: [`mock-tag-${Date.now()}-1`, `mock-tag-${Date.now()}-2`],
      readAt: new Date().toISOString(),
    };
  });
};
