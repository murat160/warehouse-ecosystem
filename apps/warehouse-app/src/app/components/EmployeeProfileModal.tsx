import { useState } from 'react';
import { Phone, MessageSquare, ListTodo, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../store/useStore';
import { ROLE_LABELS } from '../domain/roles';
import { useT } from '../i18n';

const ONLINE_DOT = (s: 'on_shift' | 'on_break' | 'off') =>
  s === 'on_shift' ? { color: '#10B981', key: 'common.onShift' as const }
  : s === 'on_break' ? { color: '#F59E0B', key: 'common.onBreak' as const }
  :                    { color: '#9CA3AF', key: 'common.offShift' as const };

const isUrl = (s: string) => /^(https?:|blob:|data:)/.test(s);

export interface EmployeeProfileModalProps {
  open: boolean;
  workerId: string | null;
  onClose: () => void;
  onMessage?: (workerId: string) => void;
  onCall?: (workerId: string) => void;
  /** Можно ли менять avatar (true только для текущего пользователя). */
  editable?: boolean;
}

export function EmployeeProfileModal({ open, workerId, onClose, onMessage, onCall, editable }: EmployeeProfileModalProps) {
  const t = useT();
  const { workers, currentWorker, tasks } = useStore();
  const nav = useNavigate();
  const w = workerId ? workers.find(x => x.id === workerId) : null;
  const [showTasks, setShowTasks] = useState(false);

  if (!open || !w) return null;
  const dot = ONLINE_DOT(w.shiftStatus);
  const myTasks = tasks.filter(x => x.assignedTo === w.id && x.status !== 'completed');

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    store.setWorkerAvatar(w.id, url);
    toast.success(t('action.uploadPhoto'));
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-end md:items-center justify-center p-3" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-2 md:hidden">
          <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
        </div>

        <header className="flex items-center justify-between px-5 pt-3 pb-1">
          <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 700 }}>
            {t('chat.openProfile')}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center" aria-label="Close">
            <X className="w-5 h-5 text-[#1F2430]" />
          </button>
        </header>

        <div className="text-center px-5 pb-4">
          <div className="relative inline-block">
            <div className="w-28 h-28 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[56px] overflow-hidden">
              {w.avatar
                ? (isUrl(w.avatar)
                    ? <img src={w.avatar} alt={w.name} className="w-full h-full object-cover" />
                    : <span>{w.avatar}</span>)
                : <span className="text-[#0369A1]" style={{ fontWeight: 900 }}>{w.name.charAt(0)}</span>}
            </div>
            <span
              className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white"
              style={{ backgroundColor: dot.color }}
              title={t(dot.key)}
            />
            {(editable || (currentWorker && currentWorker.id === w.id)) && (
              <label
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 h-7 rounded-full bg-[#1F2430] text-white text-[10px] inline-flex items-center gap-1 cursor-pointer active-press"
                style={{ fontWeight: 800 }}
              >
                <Camera className="w-3 h-3" /> {t('action.uploadPhoto')}
                <input type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
              </label>
            )}
          </div>

          <div className="mt-4 text-[20px] text-[#1F2430]" style={{ fontWeight: 900 }}>{w.name}</div>
          <div className="text-[13px] text-[#6B7280]" style={{ fontWeight: 600 }}>
            {w.position ?? ROLE_LABELS[w.role]}
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] mt-1" style={{ color: dot.color, fontWeight: 800 }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot.color }} />
            {t(dot.key)}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-left text-[12px]">
            <Field label={t('common.role')}      value={ROLE_LABELS[w.role]} />
            <Field label={t('common.warehouse')} value={w.warehouseCode ?? '—'} />
            <Field label={t('common.shift')}     value={`${w.shiftStart ?? '—'} – ${w.shiftEnd ?? '—'}`} />
            <Field label={'#'}                   value={w.id} />
            {w.lastSeenAt && (
              <div className="col-span-2 text-[11px] text-[#9CA3AF]" style={{ fontWeight: 600 }}>
                {t('common.lastSeen')}: {new Date(w.lastSeenAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 grid grid-cols-3 gap-2">
          <button
            onClick={() => { onMessage?.(w.id); onClose(); }}
            className="h-12 rounded-xl bg-[#7C3AED] text-white active-press inline-flex flex-col items-center justify-center gap-0.5"
            style={{ fontWeight: 800 }}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px]">{t('action.message')}</span>
          </button>
          <button
            onClick={() => { onCall?.(w.id); onClose(); }}
            className="h-12 rounded-xl bg-[#10B981] text-white active-press inline-flex flex-col items-center justify-center gap-0.5"
            style={{ fontWeight: 800 }}
          >
            <Phone className="w-4 h-4" />
            <span className="text-[10px]">{t('action.call')}</span>
          </button>
          <button
            onClick={() => setShowTasks(s => !s)}
            className="h-12 rounded-xl bg-[#F3F4F6] text-[#1F2430] active-press inline-flex flex-col items-center justify-center gap-0.5"
            style={{ fontWeight: 800 }}
          >
            <ListTodo className="w-4 h-4" />
            <span className="text-[10px]">{t('action.openTasks')}</span>
          </button>
        </div>

        {showTasks && (
          <div className="border-t border-[#F3F4F6] p-4 max-h-48 overflow-y-auto">
            {myTasks.length === 0 ? (
              <div className="text-[12px] text-[#6B7280] text-center py-3" style={{ fontWeight: 500 }}>{t('common.empty')}</div>
            ) : (
              <ul className="space-y-1">
                {myTasks.map(taskItem => (
                  <li key={taskItem.id} className="text-[12px] flex items-center justify-between">
                    <span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{taskItem.id}</span>
                    <button
                      onClick={() => { onClose(); nav('/tasks'); }}
                      className="text-[11px] text-[#0369A1] underline"
                      style={{ fontWeight: 700 }}
                    >{taskItem.type}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F9FAFB] rounded-lg p-2">
      <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 700 }}>{label}</div>
      <div className="text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{value}</div>
    </div>
  );
}
