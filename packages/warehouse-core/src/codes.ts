// ============================================================
//  Code generators for human-readable IDs.
//  Used both on backend (when creating entities) and frontend
//  (for optimistic UI / preview).
// ============================================================

import { TaskType } from '@wms/shared-types';

const TASK_PREFIX: Record<TaskType, string> = {
  [TaskType.RECEIVE]: 'RCV',
  [TaskType.QC_CHECK]: 'QC',
  [TaskType.PUTAWAY]: 'PUT',
  [TaskType.PICK]: 'PICK',
  [TaskType.PACK]: 'PACK',
  [TaskType.SORT]: 'SORT',
  [TaskType.LOAD]: 'LOAD',
  [TaskType.RETURN_CHECK]: 'RET',
  [TaskType.REPACK]: 'RPK',
  [TaskType.CYCLE_COUNT]: 'CC',
  [TaskType.REPLENISHMENT]: 'REPL',
  [TaskType.MOVE_BIN]: 'MOV',
  [TaskType.DAMAGE_CHECK]: 'DMG',
  [TaskType.SECURITY_CHECK]: 'SEC',
  [TaskType.DEVICE_ISSUE]: 'DEV',
};

export function makeTaskCode(type: TaskType, seq: number): string {
  return `${TASK_PREFIX[type]}-${String(seq).padStart(6, '0')}`;
}

export function makeOrderCode(year: number, seq: number): string {
  return `ORD-${year}-${String(seq).padStart(5, '0')}`;
}

export function makeASNCode(year: number, seq: number): string {
  return `INB-${year}-${String(seq).padStart(5, '0')}`;
}

export function makeRMACode(year: number, seq: number): string {
  return `RMA-${year}-${String(seq).padStart(5, '0')}`;
}

export function makeLocationCode(parts: {
  warehouse: string; zone: string; aisle?: string;
  rack?: string; section?: string; shelf?: string; bin?: string;
}): string {
  return [parts.warehouse, parts.zone, parts.aisle, parts.rack, parts.section, parts.shelf, parts.bin]
    .filter(Boolean)
    .join('-');
}
