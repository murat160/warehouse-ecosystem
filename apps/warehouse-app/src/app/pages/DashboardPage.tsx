import { useNavigate } from 'react-router-dom';
import {
  Clock, ListTodo, ShoppingCart, Package, ScanLine, PackageCheck,
  Truck, ArrowDownToLine, Boxes, Grid3x3, ClipboardCheck, Undo2,
  AlertTriangle, FileText, BarChart3, Move, Settings, ListChecks,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ROLE_LABELS } from '../domain/roles';
import { can, type Permission } from '../domain/roles';

interface Quick { to: string; label: string; icon: any; color: string; perm: Permission; }

const QUICK: Quick[] = [
  { to: '/shift',         label: 'Моя смена',         icon: Clock,           color: '#0EA5E9', perm: 'view_dashboard' },
  { to: '/orders',        label: 'Заказы на сборку',  icon: ListChecks,      color: '#F59E0B', perm: 'pick' },
  { to: '/picking',       label: 'Сборка',            icon: ShoppingCart,    color: '#F59E0B', perm: 'pick' },
  { to: '/sorting',       label: 'Сортировка',        icon: Grid3x3,         color: '#06B6D4', perm: 'sort' },
  { to: '/packing',       label: 'Упаковка',          icon: Package,         color: '#10B981', perm: 'pack' },
  { to: '/ready',         label: 'Готово к выдаче',   icon: PackageCheck,    color: '#22C55E', perm: 'handoff' },
  { to: '/handoff',       label: 'Передача курьеру',  icon: Truck,           color: '#7C3AED', perm: 'handoff' },
  { to: '/inbound',       label: 'Приёмка',           icon: ArrowDownToLine, color: '#2EA7E0', perm: 'receive' },
  { to: '/inventory',     label: 'Остатки',           icon: Boxes,           color: '#14B8A6', perm: 'inventory' },
  { to: '/bins',          label: 'Ячейки',            icon: Grid3x3,         color: '#6366F1', perm: 'inventory' },
  { to: '/count',         label: 'Инвентаризация',    icon: ClipboardCheck,  color: '#7C3AED', perm: 'count' },
  { to: '/movements',     label: 'Перемещения',       icon: Move,            color: '#0EA5E9', perm: 'move' },
  { to: '/returns',       label: 'Возвраты',          icon: Undo2,           color: '#F43F5E', perm: 'returns' },
  { to: '/problems',      label: 'Проблемы',          icon: AlertTriangle,   color: '#EF4444', perm: 'problems' },
  { to: '/scanner',       label: 'Сканер',            icon: ScanLine,        color: '#7C3AED', perm: 'scanner' },
  { to: '/documents',     label: 'Документы',         icon: FileText,        color: '#6B7280', perm: 'documents' },
  { to: '/reports',       label: 'Отчёты',            icon: BarChart3,       color: '#A855F7', perm: 'view_reports' },
  { to: '/shift-settings',label: 'Настройки смены',   icon: Settings,        color: '#1F2937', perm: 'configure_shift' },
];

export function DashboardPage() {
  const { currentWorker, orders, tasks, problems } = useStore();
  const nav = useNavigate();
  const role = currentWorker?.role;

  const counts = {
    pickQueue:  orders.filter(o => o.status === 'received_by_warehouse' || o.status === 'picking_assigned').length,
    inPicking:  orders.filter(o => o.status === 'picking_in_progress').length,
    inSorting:  orders.filter(o => o.status === 'sorting').length,
    toPack:     orders.filter(o => o.status === 'picked' || o.status === 'packing_in_progress').length,
    ready:      orders.filter(o => o.status === 'ready_for_pickup').length,
    handed:     orders.filter(o => o.status === 'handed_to_courier').length,
    activeT:    tasks.filter(t => t.status !== 'completed').length,
    openProb:   problems.filter(p => p.status !== 'resolved').length,
  };

  const allowed = QUICK.filter(q => can(role, q.perm));
  const firstName = currentWorker?.name.split(' ')[0] ?? '';

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader
        title={`Здравствуйте, ${firstName}`}
        subtitle={`${currentWorker?.id ?? ''} · ${role ? ROLE_LABELS[role] : ''} · смена: ${currentWorker?.shiftStatus ?? '—'}`}
      />

      <div className="px-5 -mt-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm grid grid-cols-3 md:grid-cols-4 gap-3">
          <Stat label="К сборке"   value={counts.pickQueue + counts.inPicking} color="#F59E0B" />
          <Stat label="Сортировка" value={counts.inSorting}                    color="#06B6D4" />
          <Stat label="К упаковке" value={counts.toPack}                       color="#10B981" />
          <Stat label="К выдаче"   value={counts.ready}                        color="#22C55E" />
          <Stat label="Передано"   value={counts.handed}                       color="#7C3AED" />
          <Stat label="Задач"      value={counts.activeT}                      color="#0EA5E9" />
          <Stat label="Проблем"    value={counts.openProb}                     color="#EF4444" />
          <Stat label="Заказов"    value={orders.length}                       color="#6B7280" />
        </div>
      </div>

      <div className="px-5 mt-5">
        <h2 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Быстрый доступ</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {allowed.map(q => {
            const Icon = q.icon;
            return (
              <button
                key={q.to}
                onClick={() => nav(q.to)}
                className="bg-white rounded-2xl p-4 text-left shadow-sm active-press"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                  style={{ backgroundColor: q.color + '20' }}
                >
                  <Icon className="w-5 h-5" style={{ color: q.color }} />
                </div>
                <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>{q.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-3">
      <div className="text-[20px]" style={{ fontWeight: 900, color }}>{value}</div>
      <div className="text-[11px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}
