import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Clock, AlertTriangle } from 'lucide-react';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ZoneBadge } from '../components/ZoneBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ACTIVE_STATUSES } from '../domain/orderStatus';
import type { Priority, ProblemType } from '../domain/types';
import { PROBLEM_TYPE_LABELS } from '../domain/types';

const PRIORITY_BG: Record<Priority, string> = {
  low: '#E5E7EB', normal: '#DBEAFE', high: '#FED7AA', urgent: '#FECACA',
};
const PRIORITY_FG: Record<Priority, string> = {
  low: '#374151', normal: '#1E40AF', high: '#9A3412', urgent: '#7F1D1D',
};

export function OrdersPage() {
  const { orders, workers } = useStore();
  const nav = useNavigate();
  const [problemFor, setProblemFor] = useState<string | null>(null);
  const [pType, setPType] = useState<ProblemType>('item_not_found');
  const [pDesc, setPDesc] = useState('');

  const list = orders.filter(o => ACTIVE_STATUSES.includes(o.status) || o.status === 'problem');

  const submitProblem = () => {
    if (!problemFor) return;
    if (!pDesc.trim()) { toast.error('Опишите проблему'); return; }
    store.createProblem({ type: pType, description: pDesc, orderId: problemFor });
    toast.success('Проблема создана');
    setProblemFor(null); setPDesc(''); setPType('item_not_found');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Заказы на сборку" subtitle={`Активных: ${list.length}`} />

      <div className="px-5 -mt-5 space-y-2">
        {list.length === 0 ? (
          <EmptyState emoji="🛒" title="Нет активных заказов" />
        ) : list.map(o => {
          const picker = o.pickerId ? workers.find(w => w.id === o.pickerId) : null;
          return (
            <div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{o.code}</div>
                  <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                    {o.customerName} · {o.city} · {o.shipMethod}
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <ZoneBadge zone={o.zone} />
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: PRIORITY_BG[o.priority], color: PRIORITY_FG[o.priority], fontWeight: 800 }}
                >
                  {o.priority}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]" style={{ fontWeight: 700 }}>
                  {o.items.length} поз.
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151] inline-flex items-center gap-1" style={{ fontWeight: 700 }}>
                  <Clock className="w-3 h-3" /> SLA {new Date(o.slaDeadline).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {picker && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]" style={{ fontWeight: 700 }}>
                    {picker.name}
                  </span>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => nav(`/picking/${o.id}`)} className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>
                  Открыть
                </button>
                {(o.status === 'received_by_warehouse' || o.status === 'picking_assigned') && (
                  <button
                    onClick={() => { store.startPicking(o.id); nav(`/picking/${o.id}`); }}
                    className="px-3 h-9 rounded-lg bg-[#F59E0B] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                  >Начать сборку</button>
                )}
                <button
                  onClick={() => setProblemFor(o.id)}
                  className="px-3 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                >
                  <AlertTriangle className="w-3 h-3" /> Проблема
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!problemFor}
        title={`Проблема по заказу ${orders.find(o => o.id === problemFor)?.code ?? ''}`}
        onClose={() => setProblemFor(null)}
        footer={
          <button onClick={submitProblem} className="w-full h-11 rounded-xl bg-[#EF4444] text-white active-press" style={{ fontWeight: 800 }}>
            Создать проблему
          </button>
        }
      >
        <h4 className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>Тип</h4>
        <div className="space-y-1 mb-3">
          {(Object.keys(PROBLEM_TYPE_LABELS) as ProblemType[]).map(t => (
            <button
              key={t}
              onClick={() => setPType(t)}
              className="w-full text-left p-2 rounded-xl"
              style={{
                backgroundColor: pType === t ? '#FEE2E2' : '#F9FAFB',
                border: pType === t ? '2px solid #EF4444' : '2px solid transparent',
                fontWeight: 600,
              }}
            >
              <span className="text-[13px] text-[#1F2430]">{PROBLEM_TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>
        <h4 className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>Описание</h4>
        <textarea
          value={pDesc}
          onChange={e => setPDesc(e.target.value)}
          rows={4}
          placeholder="Что произошло…"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#EF4444] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>
    </div>
  );
}
