import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, FileText, Plus, Lock, Unlock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import type { CashOperationKind } from '../domain/types';

const OP_LABELS: Record<CashOperationKind, string> = {
  cash_in:      'Наличные',
  card_payment: 'Карта',
  refund:       'Возврат',
  correction:   'Коррекция',
  opening:      'Открытие',
  closing:      'Закрытие',
};
const OP_COLORS: Record<CashOperationKind, string> = {
  cash_in:      '#16A34A',
  card_payment: '#0EA5E9',
  refund:       '#EF4444',
  correction:   '#F59E0B',
  opening:      '#6B7280',
  closing:      '#6B7280',
};

export function CashPage() {
  const { cashbox, cashOps, pvz } = useStore();
  const [opOpen, setOpOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [openOpen, setOpenOpen] = useState(false);
  const [op, setOp] = useState<{ kind: CashOperationKind; amount: string; orderId: string; notes: string }>({
    kind: 'cash_in', amount: '', orderId: '', notes: '',
  });
  const [openingBalance, setOpeningBalance] = useState('50000');
  const [closingBalance, setClosingBalance] = useState('');

  if (!pvz.cashEnabled) {
    return (
      <div className="min-h-screen bg-[#F5F6F8]">
        <PageHeader title="Касса" subtitle="Модуль кассы выключен в настройках ПВЗ" />
        <div className="px-5 -mt-5">
          <EmptyState title="Касса отключена" subtitle="Включите модуль в настройках ПВЗ" icon={<Wallet className="w-5 h-5" />} />
        </div>
      </div>
    );
  }

  const total = cashbox.cashReceived + cashbox.cardPayments - cashbox.refunds + cashbox.corrections;

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Касса"
        subtitle={`Состояние: ${cashbox.status === 'open' ? 'открыта' : 'закрыта'} · кассир ${cashbox.cashier ?? '—'}`}
        right={
          cashbox.status === 'open' ? (
            <button onClick={() => setCloseOpen(true)} className="px-3 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}>
              <Lock className="w-3 h-3" /> Закрыть кассу
            </button>
          ) : (
            <button onClick={() => setOpenOpen(true)} className="px-3 h-9 rounded-lg bg-[#16A34A] text-white text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}>
              <Unlock className="w-3 h-3" /> Открыть кассу
            </button>
          )
        }
      />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Cube k="Открытие"   v={`${cashbox.openingBalance.toLocaleString('ru-RU')} ₸`} color="#6B7280" />
            <Cube k="Наличные"   v={`${cashbox.cashReceived.toLocaleString('ru-RU')} ₸`}   color="#16A34A" />
            <Cube k="Карта"      v={`${cashbox.cardPayments.toLocaleString('ru-RU')} ₸`}    color="#0EA5E9" />
            <Cube k="Возвраты"   v={`${cashbox.refunds.toLocaleString('ru-RU')} ₸`}         color="#EF4444" />
            <Cube k="Коррекции"  v={`${cashbox.corrections.toLocaleString('ru-RU')} ₸`}     color="#F59E0B" />
            <Cube k="Итого"      v={`${total.toLocaleString('ru-RU')} ₸`}                  color="#1F2430" />
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => { setOp({ kind: 'cash_in', amount: '', orderId: '', notes: '' }); setOpOpen(true); }}
              disabled={cashbox.status !== 'open'}
              className="rounded-xl px-3 h-10 active-press flex items-center justify-center gap-1 text-[12px] disabled:opacity-40"
              style={{ backgroundColor: '#16A34A15', color: '#16A34A', fontWeight: 800 }}
            >
              <TrendingUp className="w-4 h-4" /> Принять оплату
            </button>
            <button
              onClick={() => { setOp({ kind: 'refund', amount: '', orderId: '', notes: '' }); setOpOpen(true); }}
              disabled={cashbox.status !== 'open'}
              className="rounded-xl px-3 h-10 active-press flex items-center justify-center gap-1 text-[12px] disabled:opacity-40"
              style={{ backgroundColor: '#EF444415', color: '#EF4444', fontWeight: 800 }}
            >
              <TrendingDown className="w-4 h-4" /> Возврат денег
            </button>
            <button
              onClick={() => { setOp({ kind: 'correction', amount: '', orderId: '', notes: '' }); setOpOpen(true); }}
              disabled={cashbox.status !== 'open'}
              className="rounded-xl px-3 h-10 active-press flex items-center justify-center gap-1 text-[12px] disabled:opacity-40"
              style={{ backgroundColor: '#F59E0B15', color: '#F59E0B', fontWeight: 800 }}
            >
              <Plus className="w-4 h-4" /> Коррекция
            </button>
            <button
              onClick={() => {
                store.uploadDocument({ kind: 'cash_report', title: `Кассовый отчёт ${new Date().toLocaleDateString('ru-RU')}`, size: '52 KB' });
                store.exportReport('cash', 'pdf');
                toast.success('Отчёт сформирован');
              }}
              className="rounded-xl px-3 h-10 active-press flex items-center justify-center gap-1 text-[12px]"
              style={{ backgroundColor: '#0369A115', color: '#0369A1', fontWeight: 800 }}
            >
              <FileText className="w-4 h-4" /> Кассовый отчёт
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>Операции смены</div>
            <button
              onClick={() => { store.exportReport('cash_ops', 'csv'); toast.success('CSV выгружен'); }}
              className="text-[11px] text-[#0EA5E9] active-press flex items-center gap-1"
              style={{ fontWeight: 800 }}
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
          {cashOps.length === 0 ? (
            <EmptyState title="Операций нет" />
          ) : (
            <div className="space-y-2">
              {cashOps.map(o => (
                <div key={o.id} className="rounded-xl bg-[#F9FAFB] p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] text-white" style={{ backgroundColor: OP_COLORS[o.kind], fontWeight: 800 }}>{OP_LABELS[o.kind]}</span>
                    <div className="min-w-0">
                      <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 700 }}>{o.id}{o.orderId ? ` · ${o.orderId}` : ''}{o.returnId ? ` · ${o.returnId}` : ''}</div>
                      <div className="text-[10px] text-[#6B7280]">{fmt(o.createdAt)} · {o.cashier}</div>
                    </div>
                  </div>
                  <div className="text-[14px]" style={{ color: o.kind === 'refund' ? '#EF4444' : '#16A34A', fontWeight: 900 }}>
                    {o.kind === 'refund' ? '−' : '+'}{o.amount.toLocaleString('ru-RU')} ₸
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={opOpen}
        onClose={() => setOpOpen(false)}
        title={`Операция: ${OP_LABELS[op.kind]}`}
        footer={
          <>
            <button onClick={() => setOpOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                const amount = Number(op.amount);
                if (!amount || amount <= 0) { toast.error('Сумма обязательна'); return; }
                store.addCashOp(op.kind, amount, { orderId: op.orderId || undefined, notes: op.notes || undefined });
                toast.success('Операция проведена');
                setOpOpen(false);
              }}
              className="px-4 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Провести</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['cash_in','card_payment','refund','correction'] as CashOperationKind[]).map(k => (
              <button
                key={k}
                onClick={() => setOp({ ...op, kind: k })}
                className={`rounded-lg h-9 text-[11px] ${op.kind === k ? 'text-white' : 'text-[#374151]'}`}
                style={{ backgroundColor: op.kind === k ? OP_COLORS[k] : '#F3F4F6', fontWeight: 800 }}
              >
                {OP_LABELS[k]}
              </button>
            ))}
          </div>
          <Field label="Сумма (₸)">
            <input
              type="number"
              value={op.amount}
              onChange={e => setOp({ ...op, amount: e.target.value })}
              autoFocus
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[14px]"
            />
          </Field>
          <Field label="Order ID (необязательно)">
            <input
              value={op.orderId}
              onChange={e => setOp({ ...op, orderId: e.target.value })}
              placeholder="ORD-..."
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]"
              style={{ fontFamily: 'monospace' }}
            />
          </Field>
          <Field label="Комментарий">
            <input
              value={op.notes}
              onChange={e => setOp({ ...op, notes: e.target.value })}
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={openOpen}
        onClose={() => setOpenOpen(false)}
        title="Открыть кассу"
        footer={
          <>
            <button onClick={() => setOpenOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                const v = Number(openingBalance);
                if (!Number.isFinite(v) || v < 0) { toast.error('Некорректное значение'); return; }
                store.openCashbox(v);
                toast.success('Касса открыта');
                setOpenOpen(false);
              }}
              className="px-4 h-9 rounded-lg bg-[#16A34A] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Открыть</button>
          </>
        }
      >
        <Field label="Стартовый баланс (₸)">
          <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[14px]" />
        </Field>
      </Modal>

      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Закрыть кассу"
        footer={
          <>
            <button onClick={() => setCloseOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                const v = Number(closingBalance);
                if (!Number.isFinite(v) || v < 0) { toast.error('Введите фактическую сумму'); return; }
                store.closeCashbox(v);
                store.uploadDocument({ kind: 'cash_report', title: `Кассовый отчёт (закрытие)`, size: '64 KB' });
                toast.success('Касса закрыта, отчёт сформирован');
                setCloseOpen(false);
              }}
              className="px-4 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Закрыть</button>
          </>
        }
      >
        <Field label="Фактическая сумма в кассе (₸)">
          <input
            type="number"
            value={closingBalance}
            onChange={e => setClosingBalance(e.target.value)}
            placeholder={String(total)}
            autoFocus
            className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[14px]"
          />
        </Field>
        <div className="mt-2 text-[11px] text-[#6B7280]">
          Расчётный остаток: {(cashbox.openingBalance + cashbox.cashReceived - cashbox.refunds + cashbox.corrections).toLocaleString('ru-RU')} ₸
        </div>
      </Modal>
    </div>
  );
}

function Cube({ k, v, color }: { k: string; v: any; color: string }) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] p-3">
      <div className="text-[10px] uppercase" style={{ color, fontWeight: 800 }}>{k}</div>
      <div className="text-[16px] mt-0.5 text-[#1F2430]" style={{ fontWeight: 900 }}>{v}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <div className="text-[10px] text-[#6B7280] uppercase mb-1" style={{ fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}
