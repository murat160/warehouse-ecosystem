/**
 * Permission system. Какая роль что может делать.
 * Используется для Guard'ов в роутах и для скрытия кнопок в UI.
 */
import type { WorkerRole } from '../data/mockData';

export type Permission =
  // Просмотры
  | 'view_dashboard'
  | 'view_kpi'
  | 'view_warehouse_map'
  | 'view_inventory'
  | 'view_audit_log'
  | 'view_alerts'
  | 'view_incidents'
  // Inbound
  | 'receive_asn' | 'qc_inspect' | 'putaway_item'
  // Outbound
  | 'pick_order' | 'pack_order' | 'sort_order' | 'load_courier'
  // Returns
  | 'inspect_rma' | 'repack_item'
  // Inventory
  | 'cycle_count' | 'replenish' | 'move_bin'
  // Supervisor
  | 'reassign_task'
  | 'block_task'
  | 'view_all_workers'
  | 'modify_zones'
  | 'force_complete_task'
  | 'create_incident_report'
  // Manager
  | 'manage_workers'
  | 'view_full_audit'
  | 'export_reports'
  | 'admin_panel';

const BASE_VIEW: Permission[] = ['view_dashboard', 'view_alerts', 'view_inventory', 'view_warehouse_map'];

export const ROLE_PERMISSIONS: Record<WorkerRole, Permission[]> = {
  receiver: [...BASE_VIEW, 'receive_asn'],
  qc_inspector: [...BASE_VIEW, 'qc_inspect'],
  putaway: [...BASE_VIEW, 'putaway_item'],
  picker: [...BASE_VIEW, 'pick_order'],
  packer: [...BASE_VIEW, 'pack_order'],
  sorter: [...BASE_VIEW, 'sort_order'],
  shipper: [...BASE_VIEW, 'load_courier'],
  returns: [...BASE_VIEW, 'inspect_rma'],
  repack: [...BASE_VIEW, 'repack_item'],
  inventory_controller: [...BASE_VIEW, 'cycle_count'],
  replenishment: [...BASE_VIEW, 'replenish'],
  forklift: [...BASE_VIEW, 'move_bin', 'putaway_item'],
  maintenance: [...BASE_VIEW, 'view_incidents'],
  security: [...BASE_VIEW, 'view_audit_log', 'view_incidents'],
  shift_supervisor: [
    ...BASE_VIEW, 'view_kpi', 'view_audit_log', 'view_incidents',
    'receive_asn','qc_inspect','putaway_item','pick_order','pack_order','sort_order','load_courier',
    'inspect_rma','repack_item','cycle_count','replenish','move_bin',
    'reassign_task','block_task','view_all_workers','force_complete_task','create_incident_report',
  ],
  inbound_lead: [...BASE_VIEW, 'view_kpi', 'view_audit_log', 'receive_asn','qc_inspect','putaway_item','reassign_task','view_all_workers'],
  outbound_lead: [...BASE_VIEW, 'view_kpi', 'view_audit_log', 'pick_order','pack_order','sort_order','load_courier','reassign_task','view_all_workers'],
  inventory_lead: [...BASE_VIEW, 'view_kpi', 'view_audit_log', 'cycle_count','replenish','move_bin','reassign_task','view_all_workers'],
  returns_lead: [...BASE_VIEW, 'view_kpi', 'view_audit_log', 'inspect_rma','repack_item','reassign_task','view_all_workers'],
  quality_manager: [...BASE_VIEW, 'view_kpi', 'view_audit_log', 'qc_inspect','reassign_task','view_all_workers','create_incident_report'],
  warehouse_manager: [
    ...BASE_VIEW, 'view_kpi', 'view_audit_log', 'view_incidents',
    'receive_asn','qc_inspect','putaway_item','pick_order','pack_order','sort_order','load_courier',
    'inspect_rma','repack_item','cycle_count','replenish','move_bin',
    'reassign_task','block_task','view_all_workers','force_complete_task','create_incident_report',
    'manage_workers','view_full_audit','export_reports','admin_panel','modify_zones',
  ],
  super_admin: [
    ...BASE_VIEW, 'view_kpi', 'view_audit_log', 'view_incidents',
    'receive_asn','qc_inspect','putaway_item','pick_order','pack_order','sort_order','load_courier',
    'inspect_rma','repack_item','cycle_count','replenish','move_bin',
    'reassign_task','block_task','view_all_workers','force_complete_task','create_incident_report',
    'manage_workers','view_full_audit','export_reports','admin_panel','modify_zones',
  ],
};

export function hasPermission(role: WorkerRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isSupervisorOrAbove(role: WorkerRole | undefined): boolean {
  if (!role) return false;
  return ['shift_supervisor','inbound_lead','outbound_lead','inventory_lead','returns_lead','quality_manager','warehouse_manager','super_admin'].includes(role);
}

export function isManager(role: WorkerRole | undefined): boolean {
  if (!role) return false;
  return ['warehouse_manager','super_admin'].includes(role);
}
