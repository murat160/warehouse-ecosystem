// ============================================================
//  Generic scan endpoint used by ScannerService on the frontend.
//  Validates a scanned barcode against expected value (if provided),
//  writes a ScanLog row and — on mismatch — auto-creates a ProblemTask.
// ============================================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { audit } from '../../lib/audit.js';

const scanSchema = z.object({
  scanType: z.enum(['BIN', 'SKU', 'TOTE', 'BOX', 'PALLET', 'ORDER', 'COURIER', 'VEHICLE', 'DOCK', 'OTHER']),
  value: z.string().min(1),
  taskId: z.string().optional(),
  expected: z.string().optional(),
  reason: z.string().optional(),
});

export const scansRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * POST /api/scans
   *   Logs every scan and returns whether it matches expected (when provided).
   *   On mismatch — creates a problem-task linked to taskId.
   */
  app.post('/', async (req) => {
    const body = scanSchema.parse(req.body);

    let valid = true;
    let entity: any = null;

    // Resolve scanned value to entity (sanity check existence)
    if (body.scanType === 'SKU') {
      entity = await prisma.sKU.findFirst({
        where: { OR: [{ barcode: body.value }, { code: body.value }] },
      });
      if (!entity) valid = false;
    } else if (body.scanType === 'BIN') {
      entity = await prisma.location.findUnique({ where: { barcode: body.value } });
      if (!entity || entity.status !== 'ACTIVE') valid = false;
    }

    // Compare against expected (when provided)
    let matchesExpected = true;
    if (body.expected && entity) {
      matchesExpected =
        body.expected === entity.id ||
        body.expected === entity.barcode ||
        body.expected === entity.code;
    }
    const ok = valid && matchesExpected;

    await prisma.scanLog.create({
      data: {
        userId: req.user.sub,
        scanType: body.scanType,
        value: body.value,
        taskId: body.taskId ?? null,
        result: ok ? 'OK' : 'ERROR',
        errorCode: !valid ? 'NOT_FOUND' : !matchesExpected ? 'MISMATCH' : null,
      },
    });

    // Auto-create problem-task on mismatch (only if taskId provided)
    if (!ok && body.taskId) {
      const reason = !valid
        ? (body.scanType === 'SKU' ? 'WRONG_SKU' : 'LOCATION_BLOCKED')
        : (body.scanType === 'SKU' ? 'WRONG_SKU' : 'LOCATION_BLOCKED');
      await prisma.task.update({
        where: { id: body.taskId },
        data: { status: 'BLOCKED' },
      }).catch(() => {});
      await prisma.problemTask.create({
        data: {
          taskId: body.taskId,
          reason,
          notes: `${body.scanType} scan failed: got "${body.value}", expected "${body.expected ?? '?'}"`,
          reportedById: req.user.sub,
          status: 'OPEN',
        },
      }).catch(() => {});
      await audit({
        userId: req.user.sub, action: 'scan.fail', entity: 'Task', entityId: body.taskId,
        payload: { scanType: body.scanType, value: body.value, expected: body.expected },
      });
    }

    return {
      ok,
      scanType: body.scanType,
      value: body.value,
      entityId: entity?.id ?? null,
      reason: !valid ? 'NOT_FOUND_OR_BLOCKED' : !matchesExpected ? 'MISMATCH' : null,
    };
  });
};
