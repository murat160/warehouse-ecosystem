/**
 * Роли сотрудников ПВЗ + матрица прав.
 *
 * 5 ролей:
 *  - pvz_manager      — Руководитель ПВЗ (всё в рамках своего ПВЗ)
 *  - pvz_operator     — Оператор ПВЗ (приёмка, размещение, выдача)
 *  - returns_operator — Оператор возвратов (только возвраты + проблемы по ним)
 *  - cashier          — Кассир ПВЗ (касса, инкассация)
 *  - handoff_operator — Оператор приёма от курьера
 */

export const ROLES = [
  'pvz_manager',
  'pvz_operator',
  'returns_operator',
  'cashier',
  'handoff_operator',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  pvz_manager:      'Руководитель ПВЗ',
  pvz_operator:     'Оператор ПВЗ',
  returns_operator: 'Оператор возвратов',
  cashier:          'Кассир ПВЗ',
  handoff_operator: 'Приём от курьера',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  pvz_manager:      'Управляет ПВЗ, сотрудниками, сменами, кассой, возвратами, документами и отчётами',
  pvz_operator:     'Принимает заказы, размещает в ячейках, выдаёт клиентам, фиксирует проблемы',
  returns_operator: 'Принимает возвраты от клиентов, оформляет фото/видео, отправляет на склад/продавцу',
  cashier:          'Ведёт кассу, принимает оплаты, оформляет возвраты денег, инкассацию',
  handoff_operator: 'Принимает партии заказов от курьера, фиксирует расхождения',
};

export type Permission =
  | 'view_dashboard'
  | 'view_shift'        | 'manage_shift'    | 'configure_pvz'
  | 'receive_batch'     | 'view_orders'     | 'place_in_cell'
  | 'issue_to_customer' | 'manage_cells'
  | 'view_returns'      | 'create_return'   | 'approve_return'
  | 'view_problems'     | 'create_problem'  | 'escalate_problem'
  | 'use_scanner'
  | 'courier_handoff'
  | 'view_cash'         | 'cash_in'         | 'cash_out'        | 'collection'
  | 'view_documents'    | 'upload_documents'
  | 'view_reports'      | 'export_reports'
  | 'use_chat'
  | 'manage_employees';

const ALL: Permission[] = [
  'view_dashboard',
  'view_shift', 'manage_shift', 'configure_pvz',
  'receive_batch', 'view_orders', 'place_in_cell',
  'issue_to_customer', 'manage_cells',
  'view_returns', 'create_return', 'approve_return',
  'view_problems', 'create_problem', 'escalate_problem',
  'use_scanner',
  'courier_handoff',
  'view_cash', 'cash_in', 'cash_out', 'collection',
  'view_documents', 'upload_documents',
  'view_reports', 'export_reports',
  'use_chat',
  'manage_employees',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  pvz_manager: ALL,

  pvz_operator: [
    'view_dashboard',
    'view_shift',
    'receive_batch', 'view_orders', 'place_in_cell',
    'issue_to_customer', 'manage_cells',
    'view_returns', 'create_return',
    'view_problems', 'create_problem',
    'use_scanner',
    'view_documents', 'upload_documents',
    'use_chat',
    'view_reports',
  ],

  returns_operator: [
    'view_dashboard',
    'view_shift',
    'view_orders',
    'view_returns', 'create_return', 'approve_return',
    'view_problems', 'create_problem',
    'use_scanner',
    'view_documents', 'upload_documents',
    'use_chat',
  ],

  cashier: [
    'view_dashboard',
    'view_shift',
    'view_cash', 'cash_in', 'cash_out', 'collection',
    'view_problems', 'create_problem',
    'view_documents', 'upload_documents',
    'view_reports',
    'use_chat',
  ],

  handoff_operator: [
    'view_dashboard',
    'view_shift',
    'receive_batch', 'view_orders',
    'courier_handoff',
    'use_scanner',
    'view_problems', 'create_problem',
    'view_documents', 'upload_documents',
    'use_chat',
  ],
};

export function can(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(perm);
}
