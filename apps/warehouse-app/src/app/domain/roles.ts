/**
 * 8 ролей сотрудников склада + матрица прав.
 */

export const ROLES = [
  'warehouse_admin',
  'shift_manager',
  'warehouse_worker',
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
  warehouse_worker:     'Складчик',
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
  | 'cancel_task' | 'reassign_task' | 'override_block'
  | 'claims' | 'supplier_media' | 'supplier_disputes' | 'damage_report';

const ALL: Permission[] = [
  'view_dashboard','view_tasks','view_audit','view_reports',
  'manage_shift','manage_workers','configure_shift',
  'pick','sort','pack','handoff',
  'receive','inventory','count','move','returns',
  'problems','documents','scanner',
  'cancel_task','reassign_task','override_block',
  'claims','supplier_media','supplier_disputes','damage_report',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  warehouse_admin: ALL,
  shift_manager: [
    'view_dashboard','view_tasks','view_audit','view_reports',
    'manage_shift','manage_workers','configure_shift',
    'pick','sort','pack','handoff','receive','inventory','count','move','returns',
    'problems','documents','scanner',
    'cancel_task','reassign_task','override_block',
    'claims','supplier_media','supplier_disputes','damage_report',
  ],
  warehouse_worker: ['view_dashboard','view_tasks','pick','scanner','problems','documents','claims'],
  picker: ['view_dashboard','view_tasks','pick','sort','scanner','problems','claims'],
  packer: ['view_dashboard','view_tasks','pack','sort','scanner','problems','documents','claims'],
  receiver: ['view_dashboard','view_tasks','receive','scanner','problems','documents','inventory','supplier_media','supplier_disputes','damage_report','claims'],
  inventory_controller: ['view_dashboard','view_tasks','inventory','count','move','scanner','problems','documents','view_reports','claims'],
  returns_operator: ['view_dashboard','view_tasks','returns','scanner','problems','documents','claims'],
  dispatcher: ['view_dashboard','view_tasks','handoff','scanner','problems','documents','claims'],
};

export function can(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(perm);
}
