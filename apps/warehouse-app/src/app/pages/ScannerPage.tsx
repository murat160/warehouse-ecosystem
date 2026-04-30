import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Camera, Cpu, Keyboard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ScanInput } from '../components/ScanInput';
import { CameraScanner } from '../components/CameraScanner';
import { useT } from '../i18n';

type ScanType = 'BIN' | 'ITEM' | 'ZONE' | 'ORDER' | 'PACKAGE' | 'COURIER' | 'RETURN' | 'INVOICE' | 'ASN';
type Mode = 'camera' | 'hardware' | 'manual';
type HwState = 'ready' | 'received' | 'success' | 'failed';

const TYPE_LABELS: Record<ScanType, string> = {
  BIN: 'BIN', ITEM: 'ITEM', ZONE: 'ZONE',
  ORDER: 'ORDER', PACKAGE: 'PACKAGE',
  COURIER: 'COURIER', RETURN: 'RETURN', INVOICE: 'INVOICE', ASN: 'ASN',
};

interface ScanRow { ok: boolean; type: ScanType; code: string; result: string; mode: Mode; at: string; }

export function ScannerPage() {
  const t = useT();
  const nav = useNavigate();
  const [type, setType] = useState<ScanType>('ITEM');
  const [mode, setMode] = useState<Mode>('manual');
  const [history, setHistory] = useState<ScanRow[]>([]);
  const [hwState, setHwState] = useState<HwState>('ready');
  const [hwHasFocus, setHwHasFocus] = useState(true);
  const hwInputRef = useRef<HTMLInputElement | null>(null);

  // Hardware mode: автофокус + tracking
  useEffect(() => {
    if (mode !== 'hardware') return;
    const focus = () => hwInputRef.current?.focus();
    focus();
    const interval = window.setInterval(focus, 1500);
    return () => clearInterval(interval);
  }, [mode]);

  const onScan = (rawCode: string, viaMode: Mode) => {
    const code = rawCode.trim();
    if (!code) return;
    // Используем единый универсальный валидатор store.scanValidate
    const r = store.scanValidate({ type: type === 'ASN' ? 'ASN' : type, value: code, context: `Scanner ${viaMode}` });
    const row: ScanRow = {
      ok: r.ok, type, code,
      result: r.ok ? t('scanner.found') : (r.reason ?? t('scanner.notFound')),
      mode: viaMode, at: new Date().toLocaleTimeString(),
    };
    setHistory(h => [row, ...h].slice(0, 50));
    if (viaMode === 'hardware') setHwState(r.ok ? 'success' : 'failed');
    if (r.ok) toast.success(`${TYPE_LABELS[type]} · ${code}`);
    else      toast.error(`${TYPE_LABELS[type]} · ${code}: ${r.reason ?? t('scanner.notFound')}`);
  };

  const onHwKey: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const target = e.target as HTMLInputElement;
    const code = target.value;
    if (code) {
      setHwState('received');
      onScan(code, 'hardware');
      target.value = '';
    }
  };

  const lastFail = history.find(r => !r.ok);
  const showCreateProblem = !!lastFail;

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title={t('scanner.title')} subtitle={t('scanner.subtitle')} />

      <div className="px-3 md:px-5 -mt-5 space-y-3">
        {/* Mode tabs */}
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            <ModeTab active={mode === 'camera'}   onClick={() => setMode('camera')}   icon={<Camera className="w-4 h-4" />}   label={t('scanner.camera')} />
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
          <div className="grid grid-cols-3 md:grid-cols-9 gap-1.5">
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
              >{TYPE_LABELS[tt]}</button>
            ))}
          </div>
        </div>

        {/* Mode body */}
        {mode === 'camera' && (
          <CameraScanner onResult={(code) => onScan(code, 'camera')} />
        )}

        {mode === 'hardware' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                <Cpu className="w-6 h-6 text-[#0369A1]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                  {t('scanner.hardware')}
                </div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  Bluetooth · USB · Android terminal
                </div>
              </div>
              <HwBadge state={hwState} t={t} hasFocus={hwHasFocus} />
            </div>

            {/* Видимый input — даём пользователю явное поле для проверки */}
            <input
              ref={hwInputRef}
              autoFocus
              placeholder={t('scanner.placeholder')}
              onFocus={() => setHwHasFocus(true)}
              onBlur={() => setHwHasFocus(false)}
              onKeyDown={onHwKey}
              onChange={() => { if (hwState !== 'received') setHwState('received'); }}
              className="w-full px-3 py-3 rounded-xl border-2 text-[15px] font-mono mb-2 focus:outline-none"
              style={{
                fontWeight: 700,
                borderColor: hwState === 'success' ? '#10B981' : hwState === 'failed' ? '#EF4444' : '#E5E7EB',
              }}
            />
            {!hwHasFocus && (
              <button
                onClick={() => hwInputRef.current?.focus()}
                className="w-full h-10 rounded-xl bg-[#7C3AED] text-white text-[12px] active-press"
                style={{ fontWeight: 800 }}
              >
                {t('scanner.hwReFocus')}
              </button>
            )}
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

        {/* Last result + create problem */}
        {showCreateProblem && (
          <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-2xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#7F1D1D] flex-shrink-0" />
            <div className="text-[11px] text-[#7F1D1D] flex-1" style={{ fontWeight: 700 }}>
              {lastFail!.type} · {lastFail!.code} — {lastFail!.result}
            </div>
            <button
              onClick={() => nav('/problems')}
              className="px-3 h-9 rounded-lg bg-[#EF4444] text-white text-[11px] active-press"
              style={{ fontWeight: 800 }}
            >
              {t('scanner.createProblem')}
            </button>
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

function HwBadge({ state, t, hasFocus }: { state: HwState; t: (k: string) => string; hasFocus: boolean }) {
  const map: Record<HwState, { bg: string; fg: string; key: string }> = {
    ready:    { bg: '#F3F4F6', fg: '#374151', key: 'scanner.hwReady' },
    received: { bg: '#FEF3C7', fg: '#92400E', key: 'scanner.hwReceived' },
    success:  { bg: '#DCFCE7', fg: '#166534', key: 'scanner.hwSuccess' },
    failed:   { bg: '#FEE2E2', fg: '#991B1B', key: 'scanner.hwFailed' },
  };
  const c = map[state];
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 800 }}>
        {t(c.key)}
      </span>
      <span className="text-[9px]" style={{ color: hasFocus ? '#10B981' : '#EF4444', fontWeight: 800 }}>
        {hasFocus ? '● focus' : '○ no focus'}
      </span>
    </div>
  );
}
