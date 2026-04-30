import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ScanLine, CheckCircle2, XCircle, AlertTriangle, KeyRound, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { OrderStatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import type { PickupOrder } from '../domain/types';

export function IssuePage() {
  const { orders, pvz } = useStore();
  const [params] = useSearchParams();
  const initialId = params.get('order');
  const [step, setStep] = useState<'scan_code' | 'check_label' | 'otp' | 'confirm'>('scan_code');
  const [codeInput, setCodeInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [order, setOrder] = useState<PickupOrder | null>(initialId ? orders.find(o => o.id === initialId) ?? null : null);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    if (order) setStep('check_label');
  }, [order]);

  const reset = () => {
    setOrder(null); setCodeInput(''); setLabelInput(''); setOtpInput(''); setStep('scan_code');
  };

  const onCodeScan = () => {
    if (!codeInput.trim()) return;
    const code = codeInput.trim();
    const candidate = orders.find(o =>
      o.pickupCode === code || o.qr === code || o.id === code || o.trackingNumber === code,
    );
    if (!candidate) {
      toast.error('Заказ не найден');
      return;
    }
    if (candidate.status === 'issued') {
      toast.error('Заказ уже выдан');
      return;
    }
    if (candidate.status !== 'ready_for_pickup' && candidate.status !== 'pickup_code_sent' && candidate.status !== 'stored') {
      toast.error(`Статус не позволяет выдачу: ${candidate.status}`);
    }
    setOrder(candidate);
    setStep('check_label');
  };

  const onLabelScan = () => {
    if (!order) return;
    if (labelInput.trim() !== order.packageLabel) {
      toast.error('Package label не совпал');
      store.createProblem({ type: 'wrong_order', orderId: order.id, description: `Несовпадение package label при выдаче: ${labelInput}` });
      return;
    }
    if (pvz.otpEnabled) setStep('otp');
    else setStep('confirm');
  };

  const onOtp = () => {
    if (!order) return;
    if (otpInput.trim().length < 4) { toast.error('Введите OTP-код'); return; }
    setStep('confirm');
  };

  const issue = () => {
    if (!order) return;
    const r = store.issueOrderToCustomer(order.id, { codeMatched: true, labelMatched: true });
    if (!r.ok) { toast.error(r.reason ?? 'Ошибка'); return; }
    toast.success('Заказ выдан клиенту');
    reset();
  };

  const refuse = () => {
    if (!order || !refuseReason.trim()) { toast.error('Укажите причину'); return; }
    store.customerRefused(order.id, refuseReason.trim());
    store.createReturn({ orderId: order.id, reason: 'customer_refusal', description: refuseReason.trim() });
    toast('Отказ оформлен и переведено в возврат');
    setRefuseOpen(false);
    setRefuseReason('');
    reset();
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Выдача клиенту"
        subtitle="Сканер · код · label · OTP · подтверждение"
        right={
          <button onClick={reset} className="px-3 h-9 rounded-lg bg-white text-[#1F2430] text-[12px] active-press" style={{ fontWeight: 800 }}>Сброс</button>
        }
      />

      <div className="px-5 -mt-5 max-w-2xl mx-auto space-y-4">
        <Stepper step={step} otpEnabled={pvz.otpEnabled} />

        {step === 'scan_code' && (
          <div className="bg-white rounded-2xl p-5">
            <div className="text-[16px] text-[#1F2430] mb-1" style={{ fontWeight: 800 }}>1. QR / Pickup Code клиента</div>
            <div className="text-[12px] text-[#6B7280] mb-4">Сканируйте QR клиента или введите 6-значный код</div>
            <div className="flex gap-2">
              <input
                autoFocus
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onCodeScan(); }}
                placeholder="QR / pickup code / order ID"
                className="flex-1 border border-[#E5E7EB] rounded-xl px-3 h-11 text-[14px]"
                style={{ fontFamily: 'monospace' }}
              />
              <button onClick={onCodeScan} className="rounded-xl bg-[#0EA5E9] text-white px-4 active-press flex items-center gap-1" style={{ fontWeight: 800 }}>
                <ScanLine className="w-4 h-4" /> Найти
              </button>
            </div>
          </div>
        )}

        {order && (
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{order.id}</div>
                <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 600 }}>{order.customerName} · {order.customerPhone}</div>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
              <Box k="Pickup Code" v={order.pickupCode} mono />
              <Box k="Package label" v={order.packageLabel} mono />
              <Box k="Ячейка" v={order.cellId ?? '—'} mono />
              <Box k="Кол-во" v={`${order.packageCount} пак.`} />
            </div>
            {order.paymentRequired && order.paymentStatus !== 'paid' && (
              <div className="mt-3 rounded-xl bg-[#FEF3C7] p-2 text-[12px] text-[#92400E]" style={{ fontWeight: 700 }}>
                Оплата при получении: {order.paymentAmount?.toLocaleString('ru-RU')} ₸
              </div>
            )}
          </div>
        )}

        {step === 'check_label' && order && (
          <div className="bg-white rounded-2xl p-5">
            <div className="text-[16px] text-[#1F2430] mb-1" style={{ fontWeight: 800 }}>2. Package label</div>
            <div className="text-[12px] text-[#6B7280] mb-4">Сканируйте label на посылке: <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{order.packageLabel}</span></div>
            <div className="flex gap-2">
              <input
                autoFocus
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onLabelScan(); }}
                placeholder="Сканируйте PKG-..."
                className="flex-1 border border-[#E5E7EB] rounded-xl px-3 h-11 text-[14px]"
                style={{ fontFamily: 'monospace' }}
              />
              <button onClick={onLabelScan} className="rounded-xl bg-[#0EA5E9] text-white px-4 active-press" style={{ fontWeight: 800 }}>Проверить</button>
            </div>
          </div>
        )}

        {step === 'otp' && order && (
          <div className="bg-white rounded-2xl p-5">
            <div className="text-[16px] text-[#1F2430] mb-1" style={{ fontWeight: 800 }}>3. OTP-код</div>
            <div className="text-[12px] text-[#6B7280] mb-4">Клиент получил OTP по SMS. Введите 4-6 цифр.</div>
            <div className="flex gap-2">
              <input
                autoFocus
                value={otpInput}
                onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => { if (e.key === 'Enter') onOtp(); }}
                placeholder="OTP"
                className="flex-1 border border-[#E5E7EB] rounded-xl px-3 h-11 text-[18px] text-center"
                style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: 4 }}
              />
              <button onClick={onOtp} className="rounded-xl bg-[#0EA5E9] text-white px-4 active-press" style={{ fontWeight: 800 }}>
                <KeyRound className="w-4 h-4 inline mr-1" /> Принять
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && order && (
          <div className="bg-white rounded-2xl p-5">
            <div className="text-[16px] text-[#1F2430] mb-1" style={{ fontWeight: 800 }}>4. Подтверждение выдачи</div>
            <div className="text-[12px] text-[#6B7280] mb-4">Все проверки пройдены. Подтвердите выдачу.</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={issue} className="rounded-xl bg-[#22C55E] text-white px-4 h-11 active-press flex items-center justify-center gap-1" style={{ fontWeight: 800 }}>
                <CheckCircle2 className="w-4 h-4" /> Выдать заказ
              </button>
              <button onClick={() => setRefuseOpen(true)} className="rounded-xl bg-[#F59E0B] text-white px-4 h-11 active-press flex items-center justify-center gap-1" style={{ fontWeight: 800 }}>
                <XCircle className="w-4 h-4" /> Отказ клиента
              </button>
            </div>
          </div>
        )}

        {order && (
          <div className="bg-white rounded-2xl p-4">
            <div className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>Эскалация</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setProblemOpen(true)}
                className="rounded-xl bg-[#EF444415] text-[#EF4444] px-3 h-9 active-press flex items-center justify-center gap-1 text-[12px]"
                style={{ fontWeight: 800 }}
              >
                <AlertTriangle className="w-4 h-4" /> Создать проблему
              </button>
              <button
                onClick={() => { nav('/orders'); }}
                className="rounded-xl bg-[#F3F4F6] text-[#374151] px-3 h-9 active-press text-[12px]"
                style={{ fontWeight: 800 }}
              >
                Открыть в Заказах
              </button>
            </div>
          </div>
        )}

        {!order && step === 'scan_code' && (
          <EmptyState
            title="Готов к выдаче"
            subtitle="Попросите клиента показать QR или назвать код"
            icon={<UserCheck className="w-5 h-5" />}
          />
        )}
      </div>

      <Modal
        open={refuseOpen}
        onClose={() => setRefuseOpen(false)}
        title="Отказ клиента"
        footer={
          <>
            <button onClick={() => setRefuseOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button onClick={refuse} className="px-4 h-9 rounded-lg bg-[#F59E0B] text-white text-[12px] active-press" style={{ fontWeight: 800 }}>Оформить отказ</button>
          </>
        }
      >
        <textarea
          value={refuseReason}
          onChange={e => setRefuseReason(e.target.value)}
          rows={3}
          placeholder="Причина отказа"
          className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[13px]"
        />
      </Modal>

      <Modal
        open={problemOpen}
        onClose={() => setProblemOpen(false)}
        title="Проблема при выдаче"
        footer={
          <>
            <button onClick={() => setProblemOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!order) return;
                store.createProblem({
                  type: 'customer_check_failed',
                  description: 'Проблема при выдаче, требуется решение менеджера',
                  orderId: order.id,
                  priority: 'high',
                });
                toast.success('Проблема создана и эскалирована');
                setProblemOpen(false);
              }}
              className="px-4 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Создать</button>
          </>
        }
      >
        <div className="text-[13px] text-[#374151]">
          Будет создана проблема типа "клиент не прошёл проверку" с привязкой к заказу {order?.id}.
        </div>
      </Modal>
    </div>
  );
}

function Stepper({ step, otpEnabled }: { step: 'scan_code' | 'check_label' | 'otp' | 'confirm'; otpEnabled: boolean }) {
  const steps = otpEnabled
    ? [{ k: 'scan_code', t: 'QR/Code' }, { k: 'check_label', t: 'Label' }, { k: 'otp', t: 'OTP' }, { k: 'confirm', t: 'Подтверждение' }]
    : [{ k: 'scan_code', t: 'QR/Code' }, { k: 'check_label', t: 'Label' }, { k: 'confirm', t: 'Подтверждение' }];
  const idx = steps.findIndex(s => s.k === step);
  return (
    <div className="bg-white rounded-2xl p-3 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.k} className="flex items-center gap-2 flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] ${i <= idx ? 'bg-[#0EA5E9] text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`} style={{ fontWeight: 900 }}>
            {i + 1}
          </div>
          <div className={`text-[11px] ${i <= idx ? 'text-[#1F2430]' : 'text-[#9CA3AF]'}`} style={{ fontWeight: 700 }}>{s.t}</div>
          {i < steps.length - 1 && <div className={`h-[2px] flex-1 ${i < idx ? 'bg-[#0EA5E9]' : 'bg-[#F3F4F6]'}`} />}
        </div>
      ))}
    </div>
  );
}

function Box({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] p-2">
      <div className="text-[10px] text-[#6B7280] uppercase" style={{ fontWeight: 800 }}>{k}</div>
      <div className="text-[13px] text-[#1F2430] mt-0.5" style={{ fontWeight: 800, fontFamily: mono ? 'monospace' : undefined }}>{v}</div>
    </div>
  );
}
