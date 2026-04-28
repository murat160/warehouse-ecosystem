/**
 * 8 ролей сотрудников склада + матрица прав.
 */

export const ROLES = [
  'warehouse_admin',
  'shift_manager',
  'picker',
  'packer',
  'receiver',
  'inventory_controller',
  'returns_operator',
  'dispatcher',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  warehouse_admin:      'Warehouse Admin',
  shift_manager:        'Shift Manager',
  picker:               'Сборщик',
  packer:               'Упаковщик',
  receiver:             'Приёмщик',
  inventory_controller: 'Контроль остатков',
  returns_operator:     'Возвраты',
  dispatcher:           'Диспетчер выдачи',
};

export type Permission =
  | 'view_dashboard' | 'view_tasks' | 'view_audit' | 'view_reports'
  | 'manage_shift' | 'manage_workers' | 'configure_shift'
  | 'pick' | 'sort' | 'pack' | 'handoff'
  | 'receive' | 'inventory' | 'count' | 'move' | 'returns'
  | 'problems' | 'documents' | 'scanner'
  | 'cancel_task' | 'reassign_task' | 'override_block';

const ALL: Permission[] = [
  'view_dashboard','view_tasks','view_audit','view_reports',
  'manage_shift','manage_workers','configure_shift',
  'pick','sort','pack','handoff',
  'receive','inventory','count','move','returns',
  'problems','documents','scanner',
  'cancel_task','reassign_task','override_block',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  warehouse_admin: ALL,
  shift_manager: [
    'view_dashboard','view_tasks','view_audit','view_reports',
    'manage_shift','manage_workers','configure_shift',
    'pick','sort','pack','handoff','receive','inventory','count','move','returns',
    'problems','documents','scanner',
    'cancel_task','reassign_task','override_block',
  ],
  picker: ['view_dashboard','view_tasks','pick','sort','scanner','problems'],
  packer: ['view_dashboard','view_tasks','pack','sort','scanner','problems','documents'],
  receiver: ['view_dashboard','view_tasks','receive','scanner','problems','documents','inventory'],
  inventory_controller: ['view_dashboard','view_tasks','inventory','count','move','scanner','problems','documents','view_reports'],
  returns_operator: ['view_dashboard','view_tasks','returns','scanner','problems','documents'],
  dispatcher: ['view_dashboard','view_tasks','handoff','scanner','problems','documents'],
};

export function can(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(perm);
}
