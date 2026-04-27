import { prisma } from '../prisma.js';

/**
 * Atomically increments a counter and returns the new value.
 * Used to generate sequential codes (PICK-000981 etc.).
 */
export async function nextSeq(key: string): Promise<number> {
  // Upsert + increment in a single transaction.
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.counter.findUnique({ where: { key } });
    if (!current) {
      const created = await tx.counter.create({ data: { key, value: 1 } });
      return created.value;
    }
    const updated = await tx.counter.update({
      where: { key },
      data: { value: { increment: 1 } },
    });
    return updated.value;
  });
  return result;
}
