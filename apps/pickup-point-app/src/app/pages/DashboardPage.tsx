import { useNavigate } from 'react-router-dom';
import {
  Package, PackageCheck, AlertTriangle, Truck, Grid3x3, Wallet,
  Undo2, Clock, Users, ArrowDownToLine, UserCheck, Search,
  ScanLine, FileText, BarChart3,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ROLE_LABELS } from '../domain/roles';

export function DashboardPage() {
  const { currentEmployee, orders, returns: rets, problems, couriers, cells, cashbox, employees, shift } = useStore();
  const nav = useNavigate();

  const inPvz = orders.filter(o => ['arrived_to_pvz','receiving','stored','ready_for_pickup','pickup_code_sent'].includes(o.status));
  const ready = orders.filter(o => o.status === 'ready_for_pickup' || o.status === 'pickup_code_sent');
  const issuedToday = orders.filter(o => o.status === 'issued');
  const expired = orders.filter(o => o.status === 'expired_storage');
  const todayReturns = rets.filter(r => r.status !== 'closed');
  const openProblems = problems.filter(p => p.status !== 'resolved' && p.status !== 'rejected');
  const couriersIn = couriers.filter(c => c.status === 'en_route_in' || c.status === 'arrived');
  const free = cells.filter(c => c.status === 'empty').length;
  const occ = cells.filter(c => c.status === 'occupied').length;
  const cashTotal = cashbox.cashReceived + cashbox.cardPayments - cashbox.refunds + cashbox.corrections;
  const activeStaff = employees.filter(e => e.shiftStatus === 'active').length;

  const cards: { label: string; value: string | number; sub?: string; color: string; onClick: () => void }[] = [
    { label: 'Заказов в ПВЗ',     value: inPvz.length,         color: '#0EA5E9', onClick: () => nav('/orders') },
    { label: 'Готово к выдаче',   value: ready.length,         color: '#22C55E', onClick: () => nav('/orders?filter=ready') },
    { label: 'Выдано сегодня',    value: issuedToday.length,   color: '#16A34A', onClick: () => nav('/orders?filter=issued') },
    { label: 'Просроченные',      value: expired.length,       color: '#EF4444', onClick: () => nav('/orders?filter=expired') },
    { label: 'Возвраты',          value: todayReturns.length,  color: '#F43F5E', onClick: () => nav('/returns') },
    { label: 'Проблемы',          value: openProblems.length,  color: '#DC2626', onClick: () => nav('/problems') },
    { label: 'Курьеры в пути',    value: couriersIn.length,    color: '#7C3AED', onClick: () => nav('/handoff') },
    { label: 'Свободные ячейки',  value: free,                 color: '#10B981', onClick: () => nav('/cells') },
    { label: 'Занятые ячейки',    value: occ,                  color: '#0369A1', onClick: () => nav('/cells') },
    { label: 'Касса за смену',    value: `${cashTotal.toLocaleString('ru-RU')} ₸`, sub: cashbox.status === 'open' ? 'Открыта' : 'Закрыта', color: '#F59E0B', onClick: () => nav('/cash') },
    { label: 'Текущая смена',     value: shift.status === 'active' ? 'Активна' : shift.status === 'paused' ? 'Пауза' : shift.status === 'closed' ? 'Закрыта' : 'Не начата', color: '#0EA5E9', onClick: () => nav('/shift') },
    { label: 'Активных сотрудников', value: `${activeStaff} / ${employees.length}`, color: '#6366F1', onClick: () => nav('/shift') },
  ];

  const QUICK = [
    { to: '/scanner',    label: 'Сканер',         icon: ScanLine,        color: '#7C3AED' },
    { to: '/issue',      label: 'Выдача',         icon: UserCheck,       color: '#22C55E' },
    { to: '/receiving',  label: 'Приёмка',        icon: ArrowDownToLine, color: '#0EA5E9' },
    { to: '/returns',    label: 'Возвраты',       icon: Undo2,           color: '#F43F5E' },
    { to: '/problems',   label: 'Проблемы',       icon: AlertTriangle,   color: '#EF4444' },
    { to: '/cells',      label: 'Ячейки',         icon: Grid3x3,         color: '#10B981' },
    { to: '/search',     label: 'Поиск',          icon: Search,          color: '#0369A1' },
    { to: '/handoff',    label: 'Курьер',         icon: Truck,           color: '#7C3AED' },
    { to: '/documents',  label: 'Документы',      icon: FileText,        color: '#6B7280' },
    { to: '/reports',    label: 'Отчёты',         icon: BarChart3,       color: '#A855F7' },
  ];

  const firstName = currentEmployee?.name.split(' ')[0] ?? '';

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title={`Здравствуйте, ${firstName}`}
        subtitle={`${currentEmployee ? ROLE_LABELS[currentEmployee.role] : ''} · смена ${shift.status}`}
      />

      <div className="px-5 -mt-5">
        <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {cards.map(c => (
            <button
              key={c.label}
              onClick={c.onClick}
              className="text-left rounded-xl p-3 active-press"
              style={{ backgroundColor: c.color + '12' }}
            >
              <div className="text-[10px] uppercase tracking-wide" style={{ color: c.color, fontWeight: 800 }}>{c.label}</div>
              <div className="text-[20px] mt-1 text-[#1F2430]" style={{ fontWeight: 900 }}>{c.value}</div>
              {c.sub && <div className="text-[10px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>{c.sub}</div>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5">
        <h2 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Быстрый доступ</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK.map(q => {
            const Icon = q.icon;
            return (
              <button
                key={q.to}
                onClick={() => nav(q.to)}
                className="bg-white rounded-2xl p-4 text-left active-press border border-[#F3F4F6] hover:shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: q.color + '20' }}>
                  <Icon className="w-5 h-5" style={{ color: q.color }} />
                </div>
                <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>{q.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-5 grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#0EA5E9]" />
            <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>Метрики смены</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#F9FAFB] p-3">
              <div className="text-[11px] text-[#6B7280] uppercase" style={{ fontWeight: 700 }}>Выдано</div>
              <div className="text-[18px] text-[#16A34A]" style={{ fontWeight: 900 }}>{shift.metrics.issued}</div>
            </div>
            <div className="rounded-xl bg-[#F9FAFB] p-3">
              <div className="text-[11px] text-[#6B7280] uppercase" style={{ fontWeight: 700 }}>Принято</div>
              <div className="text-[18px] text-[#0EA5E9]" style={{ fontWeight: 900 }}>{shift.metrics.accepted}</div>
            </div>
            <div className="rounded-xl bg-[#F9FAFB] p-3">
              <div className="text-[11px] text-[#6B7280] uppercase" style={{ fontWeight: 700 }}>Возвратов</div>
              <div className="text-[18px] text-[#F43F5E]" style={{ fontWeight: 900 }}>{shift.metrics.returns}</div>
            </div>
            <div className="rounded-xl bg-[#F9FAFB] p-3">
              <div className="text-[11px] text-[#6B7280] uppercase" style={{ fontWeight: 700 }}>Проблем</div>
              <div className="text-[18px] text-[#EF4444]" style={{ fontWeight: 900 }}>{shift.metrics.problems}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[#7C3AED]" />
            <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>На смене</div>
          </div>
          <div className="space-y-2">
            {employees.map(e => (
              <div key={e.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[12px] text-[#0369A1]" style={{ fontWeight: 800 }}>
                  {e.avatar ?? e.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>{e.name}</div>
                  <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 500 }}>{ROLE_LABELS[e.role]}</div>
                </div>
                <div className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: e.shiftStatus === 'active' ? '#16A34A20' : e.shiftStatus === 'paused' ? '#F59E0B20' : '#6B728020',
                    color: e.shiftStatus === 'active' ? '#16A34A' : e.shiftStatus === 'paused' ? '#F59E0B' : '#6B7280',
                    fontWeight: 800,
                  }}>
                  {e.shiftStatus === 'active' ? 'на смене' : e.shiftStatus === 'paused' ? 'пауза' : e.shiftStatus === 'closed' ? 'смена закрыта' : 'не начал'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
