import { Download, FileText, BarChart3, Clock, Wallet, Undo2, AlertTriangle, Users, Package, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';

const REPORTS = [
  { id: 'daily',     label: 'Дневной отчёт',     icon: BarChart3,        color: '#0EA5E9' },
  { id: 'shift',     label: 'Сменный отчёт',     icon: Clock,            color: '#7C3AED' },
  { id: 'issued',    label: 'Выданные заказы',   icon: Package,          color: '#22C55E' },
  { id: 'received',  label: 'Принятые заказы',   icon: ArrowDownToLine,  color: '#10B981' },
  { id: 'returns',   label: 'Возвраты',          icon: Undo2,            color: '#F43F5E' },
  { id: 'problems',  label: 'Проблемы',          icon: AlertTriangle,    color: '#EF4444' },
  { id: 'cash',      label: 'Касса',             icon: Wallet,           color: '#F59E0B' },
  { id: 'expired',   label: 'Просроченные',      icon: Clock,            color: '#6B7280' },
  { id: 'staff',     label: 'Работа сотрудников', icon: Users,           color: '#6366F1' },
  { id: 'sla',       label: 'SLA',               icon: BarChart3,        color: '#A855F7' },
];

export function ReportsPage() {
  const { audit, orders, returns: rets, problems, shift } = useStore();

  const exportIt = (id: string, format: 'csv' | 'xlsx' | 'pdf') => {
    store.exportReport(id, format);
    toast.success(`${id}.${format} экспорт начат`);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader title="Отчёты" subtitle={`Экспорт CSV / XLSX (mock) / PDF (mock)`} />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Quick label="Заказов" value={orders.length} color="#0EA5E9" />
          <Quick label="Возвратов" value={rets.length} color="#F43F5E" />
          <Quick label="Проблем" value={problems.length} color="#EF4444" />
          <Quick label="Выдано за смену" value={shift.metrics.issued} color="#16A34A" />
        </div>

        <div className="bg-white rounded-2xl p-4">
          <div className="text-[13px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Готовые отчёты</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {REPORTS.map(r => {
              const Icon = r.icon;
              return (
                <div key={r.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ backgroundColor: r.color + '12' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: r.color + '25' }}>
                    <Icon className="w-5 h-5" style={{ color: r.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>{r.label}</div>
                    <div className="text-[10px] text-[#6B7280]">id: {r.id}</div>
                  </div>
                  <div className="flex gap-1">
                    <ExportBtn label="CSV"  onClick={() => exportIt(r.id, 'csv')} />
                    <ExportBtn label="XLSX" onClick={() => exportIt(r.id, 'xlsx')} />
                    <ExportBtn label="PDF"  onClick={() => exportIt(r.id, 'pdf')} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>Аудит ({audit.length})</div>
            <button
              onClick={() => exportIt('audit', 'csv')}
              className="text-[11px] text-[#0EA5E9] active-press flex items-center gap-1"
              style={{ fontWeight: 800 }}
            >
              <Download className="w-3 h-3" /> Экспорт audit
            </button>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {audit.slice(0, 50).map(a => (
              <div key={a.id} className="rounded-xl bg-[#F9FAFB] p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-[#1F2430]" style={{ fontWeight: 800 }}>{a.action}</div>
                  <div className="text-[10px] text-[#6B7280]">{fmt(a.ts)}</div>
                </div>
                <div className="text-[10px] text-[#6B7280] mt-0.5">
                  {a.actorName} · {a.target ?? '—'} {a.details ? `· ${a.details}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Quick({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: color + '15' }}>
      <div className="text-[10px] uppercase" style={{ color, fontWeight: 800 }}>{label}</div>
      <div className="text-[20px] mt-1 text-[#1F2430]" style={{ fontWeight: 900 }}>{value}</div>
    </div>
  );
}
function ExportBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg px-2 h-7 bg-white text-[10px] text-[#374151] border border-[#E5E7EB] active-press flex items-center gap-1" style={{ fontWeight: 800 }}>
      <FileText className="w-3 h-3" /> {label}
    </button>
  );
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}
