import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, PhoneCall, Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { ROLE_LABELS } from '../domain/roles';

export type CallStatus = 'idle' | 'ringing' | 'in_call' | 'ended' | 'missed';

const STATUS_LABELS: Record<CallStatus, string> = {
  idle:    'Готов к звонку',
  ringing: 'Гудки…',
  in_call: 'Разговор',
  ended:   'Звонок завершён',
  missed:  'Пропущенный',
};

const STATUS_COLORS: Record<CallStatus, string> = {
  idle:    '#6B7280',
  ringing: '#F59E0B',
  in_call: '#10B981',
  ended:   '#1F2430',
  missed:  '#EF4444',
};

const ONLINE_STATUS = (shiftStatus: 'on_shift' | 'on_break' | 'off') =>
  shiftStatus === 'on_shift' ? { label: 'online', color: '#10B981' }
    : shiftStatus === 'on_break' ? { label: 'busy',    color: '#F59E0B' }
    :                              { label: 'offline', color: '#9CA3AF' };

function pad(n: number) { return n < 10 ? `0${n}` : String(n); }
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

export interface MockCallModalProps {
  open: boolean;
  workerId: string | null;
  onClose: () => void;
}

export function MockCallModal({ open, workerId, onClose }: MockCallModalProps) {
  const { workers, currentWorker } = useStore();
  const [status, setStatus] = useState<CallStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const ringTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);

  const callee = workerId ? workers.find(w => w.id === workerId) : null;

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setStatus('idle');
      setSeconds(0); setMuted(false); setSpeaker(false);
    } else {
      if (ringTimer.current) { clearTimeout(ringTimer.current); ringTimer.current = null; }
      if (tickTimer.current) { clearInterval(tickTimer.current); tickTimer.current = null; }
    }
    return () => {
      if (ringTimer.current) clearTimeout(ringTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, [open]);

  // Tick during in_call
  useEffect(() => {
    if (status === 'in_call') {
      tickTimer.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
      return () => { if (tickTimer.current) clearInterval(tickTimer.current); };
    }
  }, [status]);

  if (!callee) return null;
  const presence = ONLINE_STATUS(callee.shiftStatus);

  const startRinging = () => {
    if (callee.shiftStatus === 'off') {
      // абонент offline — сразу missed
      setStatus('missed');
      store.viewMedia(`Mock call missed → ${callee.name} (offline)`);
      toast.error('Абонент offline — звонок не состоялся');
      return;
    }
    setStatus('ringing');
    store.viewMedia(`Mock call ringing → ${callee.name}`);
    // имитируем ответ через 2.2с
    ringTimer.current = window.setTimeout(() => {
      setStatus('in_call');
      toast.success(`${callee.name} ответил`);
    }, 2200);
  };

  const endCall = () => {
    if (ringTimer.current) { clearTimeout(ringTimer.current); ringTimer.current = null; }
    if (tickTimer.current) { clearInterval(tickTimer.current); tickTimer.current = null; }
    if (status === 'in_call') {
      store.viewMedia(`Mock call ended → ${callee.name}, ${formatDuration(seconds)}`);
    }
    setStatus('ended');
  };

  const closeAll = () => {
    if (ringTimer.current) { clearTimeout(ringTimer.current); ringTimer.current = null; }
    if (tickTimer.current) { clearInterval(tickTimer.current); tickTimer.current = null; }
    setStatus('idle'); setSeconds(0);
    onClose();
  };

  if (!open) return null;

  const colorRing = STATUS_COLORS[status];
  const initial = callee.name.charAt(0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-3" onClick={closeAll}>
      <div
        className="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center md:hidden pt-2">
          <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
        </div>

        <header className="flex items-center justify-between px-5 pt-3 pb-2">
          <div>
            <div className="text-[11px]" style={{ color: colorRing, fontWeight: 800 }}>
              {STATUS_LABELS[status]}
            </div>
            {currentWorker && (
              <div className="text-[10px] text-[#9CA3AF]" style={{ fontWeight: 600 }}>
                Звонит: {currentWorker.name}
              </div>
            )}
          </div>
          <button onClick={closeAll} className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center" aria-label="Закрыть">
            <X className="w-5 h-5 text-[#1F2430]" />
          </button>
        </header>

        <div className="text-center pt-2 pb-5 px-5">
          <div
            className="mx-auto w-28 h-28 rounded-full flex items-center justify-center mb-3 relative"
            style={{
              backgroundColor: '#E0F2FE',
              boxShadow: status === 'ringing' ? `0 0 0 6px ${colorRing}33` : undefined,
            }}
          >
            <span className="text-[44px] text-[#0369A1]" style={{ fontWeight: 900 }}>{initial}</span>
            <span
              className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white"
              style={{ backgroundColor: presence.color }}
              title={presence.label}
            />
          </div>
          <div className="text-[20px] text-[#1F2430]" style={{ fontWeight: 900 }}>{callee.name}</div>
          <div className="text-[12px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>
            {ROLE_LABELS[callee.role]} · {callee.id}
          </div>
          <div className="text-[11px] mt-1" style={{ color: presence.color, fontWeight: 800 }}>
            {presence.label}
          </div>

          {(status === 'in_call' || status === 'ended') && (
            <div className="text-[28px] mt-4 font-mono" style={{ fontWeight: 900, color: status === 'in_call' ? '#10B981' : '#374151' }}>
              {formatDuration(seconds)}
            </div>
          )}
          {status === 'ringing' && (
            <div className="text-[12px] mt-3 text-[#92400E] animate-pulse" style={{ fontWeight: 700 }}>
              Идёт вызов…
            </div>
          )}
          {status === 'missed' && (
            <div className="text-[12px] mt-3 text-[#7F1D1D]" style={{ fontWeight: 700 }}>
              Звонок не состоялся
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          {status === 'in_call' && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <CallToggle
                active={muted} onClick={() => setMuted(m => !m)}
                onIcon={<MicOff className="w-5 h-5 text-white" />}
                offIcon={<Mic className="w-5 h-5 text-[#1F2430]" />}
                label={muted ? 'Mic OFF' : 'Mic'}
              />
              <CallToggle
                active={speaker} onClick={() => setSpeaker(s => !s)}
                onIcon={<Volume2 className="w-5 h-5 text-white" />}
                offIcon={<VolumeX className="w-5 h-5 text-[#1F2430]" />}
                label={speaker ? 'Speaker' : 'Speaker'}
              />
              <button
                onClick={endCall}
                className="h-14 rounded-2xl bg-[#EF4444] text-white active-press inline-flex items-center justify-center gap-1"
                style={{ fontWeight: 800 }}
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          )}

          {(status === 'idle' || status === 'ended' || status === 'missed') && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={closeAll} className="h-12 rounded-xl bg-[#F3F4F6] text-[#1F2430] active-press" style={{ fontWeight: 800 }}>
                Закрыть
              </button>
              <button
                onClick={startRinging}
                className="h-12 rounded-xl text-white active-press inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: '#10B981', fontWeight: 800 }}
              >
                {status === 'ended' || status === 'missed' ? <PhoneCall className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                {status === 'ended' || status === 'missed' ? 'Перезвонить' : 'Начать звонок'}
              </button>
            </div>
          )}

          {status === 'ringing' && (
            <button
              onClick={endCall}
              className="w-full h-12 rounded-xl bg-[#EF4444] text-white active-press inline-flex items-center justify-center gap-2"
              style={{ fontWeight: 800 }}
            >
              <PhoneOff className="w-5 h-5" /> Завершить звонок
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CallToggle({ active, onClick, onIcon, offIcon, label }: {
  active: boolean; onClick: () => void; onIcon: React.ReactNode; offIcon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="h-14 rounded-2xl active-press inline-flex flex-col items-center justify-center gap-0.5"
      style={{
        backgroundColor: active ? '#1F2430' : '#F3F4F6',
        color: active ? 'white' : '#1F2430',
        fontWeight: 800,
      }}
    >
      {active ? onIcon : offIcon}
      <span className="text-[9px]">{label}</span>
    </button>
  );
}
