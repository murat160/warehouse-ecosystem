import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Camera, Cpu, Keyboard, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ScanInput } from '../components/ScanInput';
import { useT } from '../i18n';

type ScanType = 'BIN' | 'ITEM' | 'ZONE' | 'ORDER' | 'PACKAGE' | 'COURIER' | 'RETURN' | 'INVOICE';
type Mode = 'camera' | 'hardware' | 'manual';

const TYPE_LABELS: Record<ScanType, string> = {
  BIN: 'BIN', ITEM: 'ITEM', ZONE: 'ZONE',
  ORDER: 'ORDER', PACKAGE: 'PACKAGE',
  COURIER: 'COURIER', RETURN: 'RETURN', INVOICE: 'INVOICE',
};

interface ScanRow { ok: boolean; type: ScanType; code: string; result: string; mode: Mode; at: string; }

export function ScannerPage() {
  const t = useT();
  const { bins, skus, orders, couriers, returns: rmas, asns } = useStore();
  const [type, setType] = useState<ScanType>('ITEM');
  const [mode, setMode] = useState<Mode>('manual');
  const [history, setHistory] = useState<ScanRow[]>([]);
  const hwBufferRef = useRef('');
  const hwInputRef = useRef<HTMLInputElement | null>(null);
  const [camFlash, setCamFlash] = useState(false);
  const [camDraft, setCamDraft] = useState('');

  // Hardware mode: автофокус скрытого input + reFocus при потере
  useEffect(() => {
    if (mode !== 'hardware') return;
    const focus = () => hwInputRef.current?.focus();
    focus();
    const interval = window.setInterval(focus, 1500);
    const onBlur = () => focus();
    window.addEventListener('focus', onBlur);
    return () => { clearInterval(interval); window.removeEventListener('focus', onBlur); };
  }, [mode]);

  const onScan = (code: string, viaMode: Mode) => {
    let ok = false;
    let result = '';
    switch (type) {
      case 'BIN':
      case 'ZONE': {
        const bin = bins.find(b => b.id === code || b.qrCode.endsWith(code));
        if (bin) { ok = true; result = `${bin.id} · ${bin.zone} · ${bin.warehouse}`; }
        else result = t('scanner.notFound');
        break;
      }
      case 'ITEM': {
        const sku = skus.find(s => s.sku === code || s.barcode === code);
        if (sku) { ok = true; result = `${sku.photo} ${sku.name} · ${sku.sku}`; }
        else result = t('scanner.notFound');
        break;
      }
      case 'ORDER':
      case 'PACKAGE': {
        const o = orders.find(x => x.code === code || x.shippingLabel === code);
        if (o) { ok = true; result = `${o.code} · ${o.customerName} · ${o.status}`; }
        else result = t('scanner.notFound');
        break;
      }
      case 'COURIER': {
        const c = couriers.find(x => x.id === code);
        if (c) { ok = true; result = `${c.name} · ${c.vehiclePlate}`; }
        else result = t('scanner.notFound');
        break;
      }
      case 'RETURN': {
        const r = rmas.find(x => x.id === code);
        if (r) { ok = true; result = `${r.id} · ${r.orderId}`; }
        else result = t('scanner.notFound');
        break;
      }
      case 'INVOICE': {
        const a = asns.find(x => x.invoiceNumber === code);
        if (a) { ok = true; result = `${a.supplierName} · ${a.invoiceNumber}`; }
        else result = t('scanner.notFound');
        break;
      }
    }
    setHistory(h => [{ ok, type, code, result, mode: viaMode, at: new Date().toLocaleTimeString() }, ...h].slice(0, 50));
    if (ok) toast.success(result); else toast.error(`${t('scanner.notFound')}: ${code}`);
  };

  // Hardware: handle Enter
  const onHwKey: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      const code = hwBufferRef.current.trim() || (e.target as HTMLInputElement).value.trim();
      if (code) onScan(code, 'hardware');
      hwBufferRef.current = '';
      (e.target as HTMLInputElement).value = '';
    }
  };

  const triggerCameraScan = () => {
    setCamFlash(true);
    window.setTimeout(() => setCamFlash(false), 220);
    if (camDraft.trim()) {
      onScan(camDraft.trim(), 'camera');
      setCamDraft('');
    } else {
      toast.error(t('scanner.placeholder'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title={t('scanner.title')} subtitle={t('scanner.subtitle')} />

      <div className="px-3 md:px-5 -mt-5 space-y-3">
        {/* Mode tabs */}
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            <ModeTab active={mode === 'camera'}  onClick={() => setMode('camera')}  icon={<Camera className="w-4 h-4" />}    label={t('scanner.camera')} />
            <ModeTab active={mode === 'hardware'} onClick={() => setMode('hardware')} icon={<Cpu className="w-4 h-4" />}      label={t('scanner.hardware')} />
            <ModeTab active={mode === 'manual'}   onClick={() => setMode('manual')}   icon={<Keyboard className="w-4 h-4" />} label={t('scanner.manual')} />
          </div>
          <div className="text-[11px] text-[#6B7280] mt-2 px-1" style={{ fontWeight: 600 }}>
            {mode === 'camera'   && t('scanner.cameraHint')}
            {mode === 'hardware' && t('scanner.hwHint')}
            {mode === 'manual'   && t('scanner.manualHint')}
          </div>
        </div>

        {/* Scan type pills */}
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="text-[11px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>{t('scanner.scanType')}</div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
            {(Object.keys(TYPE_LABELS) as ScanType[]).map(tt => (
              <button
                key={tt}
                onClick={() => setType(tt)}
                className="h-9 rounded-lg text-[10px] active-press"
                style={{
                  backgroundColor: type === tt ? '#7C3AED' : '#F3F4F6',
                  color: type === tt ? 'white' : '#374151',
                  fontWeight: 800,
                }}
              >
                {TYPE_LABELS[tt]}
              </button>
            ))}
          </div>
        </div>

        {/* Mode body */}
        {mode === 'camera' && (
          <div className="bg-white rounded-2xl p-3 shadow-sm">
            <div
              className="relative w-full aspect-[4/3] md:aspect-video rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: 'linear-gradient(180deg, #1F2430 0%, #0B1020 100%)' }}
            >
              <div className="absolute inset-6 border-2 border-[#7C3AED] rounded-2xl">
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanLine className="w-16 h-16 text-[#7C3AED] animate-pulse" />
                </div>
                <div
                  className="absolute left-3 right-3 top-1/2 h-0.5"
                  style={{
                    backgroundColor: '#7C3AED',
                    boxShadow: '0 0 16px #7C3AED',
                    transform: 'translateY(-50%)',
                  }}
                />
              </div>
              {camFlash && <div className="absolute inset-0 bg-white/70 transition-opacity" />}
              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-black/40 backdrop-blur-sm rounded-xl p-2 flex gap-2 items-center">
                  <input
                    value={camDraft}
                    onChange={e => setCamDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') triggerCameraScan(); }}
                    placeholder={t('scanner.placeholder')}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-white/90 text-[13px] focus:outline-none"
                    style={{ fontWeight: 600 }}
                  />
                  <button
                    onClick={triggerCameraScan}
                    className="h-9 px-3 rounded-lg bg-[#7C3AED] text-white text-[12px] active-press"
                    style={{ fontWeight: 800 }}
                  >
                    {t('scanner.simulate')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'hardware' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-center text-center py-6">
              <div>
                <div className="w-20 h-20 mx-auto rounded-full bg-[#E0F2FE] flex items-center justify-center mb-3">
                  <Cpu className="w-9 h-9 text-[#0369A1]" />
                </div>
                <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                  {t('scanner.hardware')}
                </div>
                <div className="text-[11px] text-[#6B7280] max-w-sm mt-1" style={{ fontWeight: 500 }}>
                  {t('scanner.hwHint')}
                </div>
              </div>
            </div>
            {/* invisible input collecting HID-keystrokes */}
            <input
              ref={hwInputRef}
              autoFocus
              onKeyDown={onHwKey}
              onChange={(e) => { hwBufferRef.current = e.target.value; }}
              className="opacity-0 absolute pointer-events-none w-px h-px"
              aria-hidden="true"
            />
            <button
              onClick={() => hwInputRef.current?.focus()}
              className="w-full h-10 rounded-xl bg-[#1F2430] text-white text-[12px] active-press"
              style={{ fontWeight: 800 }}
            >
              {t('scanner.hardware')} · re-focus
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <ScanInput
              label={TYPE_LABELS[type]}
              placeholder={t('scanner.placeholder')}
              onScan={(code) => onScan(code, 'manual')}
              autoFocus
              buttonText={t('scanner.check')}
            />
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>{t('scanner.history')}</h3>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] py-1 border-b border-[#F3F4F6] last:border-0">
                  {h.ok
                    ? <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[#1F2430] font-mono truncate" style={{ fontWeight: 700 }}>
                      {h.type} · {h.code}
                    </div>
                    <div className="text-[#6B7280] truncate" style={{ fontWeight: 500 }}>{h.result}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#9CA3AF]" style={{ fontWeight: 700 }}>{h.mode}</div>
                    <div className="text-[10px] text-[#9CA3AF]" style={{ fontWeight: 500 }}>{h.at}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="h-12 rounded-xl active-press inline-flex flex-col items-center justify-center gap-0.5"
      style={{
        backgroundColor: active ? '#7C3AED' : '#F3F4F6',
        color: active ? 'white' : '#1F2430',
        fontWeight: 800,
      }}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}
