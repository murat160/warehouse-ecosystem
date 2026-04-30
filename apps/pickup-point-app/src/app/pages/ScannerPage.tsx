import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Camera, Keyboard, CheckCircle2, AlertTriangle, Package, Grid3x3, Truck, Undo2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';

type Mode = 'camera' | 'external' | 'manual';

interface ScanLog {
  id: string;
  ts: string;
  raw: string;
  matched: 'order' | 'cell' | 'batch' | 'return' | 'doc' | 'unknown';
  detail: string;
}

export function ScannerPage() {
  const { orders, cells, batches, returns: rets, documents } = useStore();
  const [mode, setMode] = useState<Mode>('external');
  const [input, setInput] = useState('');
  const [log, setLog] = useState<ScanLog[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
  const nav = useNavigate();

  useEffect(() => {
    if (mode === 'external') inputRef.current?.focus();
  }, [mode]);

  const handle = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    const order = orders.find(o => o.id === v || o.trackingNumber === v || o.qr === v || o.pickupCode === v || o.packageLabel === v);
    if (order) {
      pushLog({ raw: v, matched: 'order', detail: `${order.id} · ${order.status}` });
      toast.success(`Заказ: ${order.id}`);
      setInput('');
      return;
    }
    const cell = cells.find(c => c.id === v || c.qr === v);
    if (cell) {
      pushLog({ raw: v, matched: 'cell', detail: `${cell.id} · ${cell.status}` });
      toast.success(`Ячейка: ${cell.id}`);
      setInput('');
      return;
    }
    const batch = batches.find(b => b.id === v);
    if (batch) {
      pushLog({ raw: v, matched: 'batch', detail: `${batch.id} · ${batch.status}` });
      toast.success(`Партия: ${batch.id}`);
      setInput('');
      return;
    }
    const ret = rets.find(r => r.id === v);
    if (ret) {
      pushLog({ raw: v, matched: 'return', detail: `${ret.id} · ${ret.status}` });
      toast.success(`Возврат: ${ret.id}`);
      setInput('');
      return;
    }
    const doc = documents.find(d => d.id === v);
    if (doc) {
      pushLog({ raw: v, matched: 'doc', detail: `${doc.id} · ${doc.kind}` });
      toast.success(`Документ: ${doc.id}`);
      setInput('');
      return;
    }
    pushLog({ raw: v, matched: 'unknown', detail: 'Код не распознан' });
    toast.error('Код не распознан');
    setInput('');
  };

  const pushLog = (entry: Omit<ScanLog, 'id' | 'ts'>) => {
    setLog(l => [{ id: `S-${Date.now()}`, ts: new Date().toISOString(), ...entry }, ...l].slice(0, 30));
  };

  const last = log[0];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader title="Сканер" subtitle="QR / Pickup code / package label / cell QR / batch / return" />

      <div className="px-5 -mt-5 max-w-3xl mx-auto space-y-3">
        <div className="bg-white rounded-2xl p-2 grid grid-cols-3 gap-2">
          <ModeBtn on={mode === 'camera'}   onClick={() => setMode('camera')}   icon={Camera}    label="Камера" />
          <ModeBtn on={mode === 'external'} onClick={() => setMode('external')} icon={ScanLine}  label="Внешний" />
          <ModeBtn on={mode === 'manual'}   onClick={() => setMode('manual')}   icon={Keyboard}  label="Вручную" />
        </div>

        {mode === 'camera' && (
          <div className="bg-white rounded-2xl p-5">
            {!isHttps && (
              <div className="mb-3 rounded-xl bg-[#FEF3C7] p-3 text-[12px] text-[#92400E]" style={{ fontWeight: 700 }}>
                ⚠ Камера через браузер требует HTTPS. Сейчас работает в режиме mock.
              </div>
            )}
            <div className="aspect-square bg-[#0F172A] rounded-2xl flex items-center justify-center">
              <div className="text-center text-white/70">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <div className="text-[12px]">[Mock] Здесь будет видео с камеры</div>
              </div>
            </div>
            <div className="text-[11px] text-[#6B7280] mt-3">Наведите камеру на QR — система автоматически распознает код и определит тип объекта.</div>
          </div>
        )}

        {(mode === 'external' || mode === 'manual') && (
          <div className="bg-white rounded-2xl p-5">
            <div className="text-[12px] text-[#6B7280] mb-3">
              {mode === 'external'
                ? 'Подключите профессиональный сканер. Поле в фокусе, сканер пришлёт код + Enter.'
                : 'Введите код вручную и нажмите Enter.'}
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handle(input); }}
              autoFocus
              placeholder={mode === 'external' ? 'Поле фокуса для сканера…' : 'Введите код'}
              className="w-full border-2 border-[#0EA5E9] rounded-2xl px-4 h-14 text-[16px] text-center"
              style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: 1 }}
            />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {orders.slice(0, 3).map(o => (
                <button key={o.id} onClick={() => handle(o.qr)} className="rounded-xl bg-[#F3F4F6] px-3 h-9 text-[11px] text-[#374151] active-press" style={{ fontWeight: 700 }}>
                  Тест: {o.pickupCode}
                </button>
              ))}
            </div>
          </div>
        )}

        {last && (
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              {last.matched === 'unknown' ? <AlertTriangle className="w-4 h-4 text-[#EF4444]" /> : <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />}
              <div className="text-[12px] uppercase" style={{ color: last.matched === 'unknown' ? '#EF4444' : '#16A34A', fontWeight: 800 }}>
                {last.matched}
              </div>
            </div>
            <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{last.detail}</div>
            <div className="text-[10px] text-[#6B7280] mt-1" style={{ fontFamily: 'monospace' }}>{last.raw}</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Quick icon={Package}  color="#0EA5E9" label="Заказы"   onClick={() => nav('/orders')} />
          <Quick icon={Grid3x3}  color="#10B981" label="Ячейки"   onClick={() => nav('/cells')} />
          <Quick icon={Truck}    color="#7C3AED" label="Курьеры"  onClick={() => nav('/handoff')} />
          <Quick icon={Undo2}    color="#F43F5E" label="Возвраты" onClick={() => nav('/returns')} />
          <Quick icon={FileText} color="#6B7280" label="Доки"     onClick={() => nav('/documents')} />
        </div>

        {log.length > 0 && (
          <div className="bg-white rounded-2xl p-4">
            <div className="text-[12px] text-[#6B7280] mb-2 uppercase" style={{ fontWeight: 800 }}>Журнал сканирований ({log.length})</div>
            <div className="space-y-2">
              {log.map(l => (
                <div key={l.id} className="rounded-xl bg-[#F9FAFB] p-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-[#1F2430]" style={{ fontWeight: 800, fontFamily: 'monospace' }}>{l.raw}</div>
                    <div className="text-[10px] text-[#6B7280]">{l.detail}</div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: l.matched === 'unknown' ? '#EF4444' : '#16A34A', fontWeight: 800 }}>
                    {l.matched}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeBtn({ on, onClick, icon: Icon, label }: { on: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick} className={`rounded-xl h-12 active-press flex items-center justify-center gap-2 text-[12px] ${on ? 'bg-[#0EA5E9] text-white' : 'bg-[#F3F4F6] text-[#374151]'}`} style={{ fontWeight: 800 }}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
function Quick({ icon: Icon, color, label, onClick }: { icon: any; color: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl px-3 py-2 active-press flex flex-col items-center justify-center gap-1"
      style={{ backgroundColor: color + '15', color, fontWeight: 800 }}>
      <Icon className="w-4 h-4" />
      <span className="text-[11px]">{label}</span>
    </button>
  );
}
