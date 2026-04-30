import { useState } from 'react';
import { Play, Pause, Square, MessageSquarePlus, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ROLE_LABELS } from '../domain/roles';

export function ShiftPage() {
  const { shift, employees, currentEmployee, pvz } = useStore();
  const [comment, setComment] = useState('');
  const [openComment, setOpenComment] = useState(false);
  const [openClose, setOpenClose] = useState(false);

  const opener = employees.find(e => e.id === shift.openedBy);
  const closer = employees.find(e => e.id === shift.closedBy);

  const tryClose = (force: boolean) => {
    const r = store.closeShift(force);
    if (!r.ok) {
      toast.error(r.reason ?? 'Не получилось закрыть смену');
      return;
    }
    toast.success('Смена закрыта');
    setOpenClose(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Моя смена"
        subtitle={`${pvz.name} · ${shift.date}`}
        badge={
          <span
            className="px-2 py-0.5 rounded-full text-[11px]"
            style={{
              backgroundColor: shift.status === 'active' ? '#16A34A' : shift.status === 'paused' ? '#F59E0B' : shift.status === 'closed' ? '#6B7280' : '#94A3B8',
              color: 'white', fontWeight: 800,
            }}
          >
            {shift.status === 'active' ? 'активна' : shift.status === 'paused' ? 'пауза' : shift.status === 'closed' ? 'закрыта' : 'не начата'}
          </span>
        }
      />

      <div className="px-5 -mt-5 space-y-4">
        <div className="bg-white rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Выдано"     value={shift.metrics.issued}   color="#16A34A" />
          <Stat label="Принято"    value={shift.metrics.accepted} color="#0EA5E9" />
          <Stat label="Возвратов"  value={shift.metrics.returns}  color="#F43F5E" />
          <Stat label="Проблем"    value={shift.metrics.problems} color="#EF4444" />
          <Stat label="Касса"      value={`${shift.metrics.cashTotal.toLocaleString('ru-RU')} ₸`} color="#F59E0B" full />
          <Stat label="Открыта"    value={shift.openedAt ? fmt(shift.openedAt) : '—'} color="#0EA5E9" full />
          <Stat label="Открыл"     value={opener?.name ?? '—'} color="#7C3AED" full />
          <Stat label="Закрыта"    value={shift.closedAt ? fmt(shift.closedAt) : '—'} color="#6B7280" full />
          <Stat label="Закрыл"     value={closer?.name ?? '—'} color="#6B7280" full />
        </div>

        <div className="bg-white rounded-2xl p-4">
          <div className="text-[13px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Управление сменой</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Btn label="Начать"       icon={Play}    color="#16A34A" disabled={shift.status === 'active'}
                 onClick={() => { store.openShift(); toast.success('Смена начата'); }} />
            <Btn label="Пауза"        icon={Pause}   color="#F59E0B" disabled={shift.status !== 'active'}
                 onClick={() => { store.pauseShift(); toast('Смена на паузе'); }} />
            <Btn label="Продолжить"   icon={RotateCcw} color="#0EA5E9" disabled={shift.status !== 'paused'}
                 onClick={() => { store.resumeShift(); toast('Смена возобновлена'); }} />
            <Btn label="Закрыть"      icon={Square}  color="#EF4444" disabled={shift.status === 'closed'}
                 onClick={() => setOpenClose(true)} />
            <Btn label="Комментарий"  icon={MessageSquarePlus} color="#7C3AED"
                 onClick={() => setOpenComment(true)} />
            <Btn label="Скачать отчёт" icon={Download} color="#6B7280"
                 onClick={() => { store.exportReport('shift', 'pdf'); toast.success('Отчёт смены выгружен'); }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4">
          <div className="text-[13px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Сотрудники на смене</div>
          <div className="space-y-2">
            {shift.staffIds.map(id => {
              const e = employees.find(x => x.id === id);
              if (!e) return null;
              const isMe = e.id === currentEmployee?.id;
              return (
                <div key={id} className="flex items-center gap-3 p-2 rounded-xl bg-[#F9FAFB]">
                  <div className="w-9 h-9 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#0369A1] text-[14px]" style={{ fontWeight: 900 }}>
                    {e.avatar ?? e.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>
                      {e.name} {isMe && <span className="text-[10px] text-[#0EA5E9] ml-1">(вы)</span>}
                    </div>
                    <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 500 }}>{ROLE_LABELS[e.role]} · {e.id}</div>
                  </div>
                  <div className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: e.shiftStatus === 'active' ? '#16A34A20' : e.shiftStatus === 'paused' ? '#F59E0B20' : '#6B728020',
                      color: e.shiftStatus === 'active' ? '#16A34A' : e.shiftStatus === 'paused' ? '#F59E0B' : '#6B7280',
                      fontWeight: 800,
                    }}>
                    {e.shiftStatus}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4">
          <div className="text-[13px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Комментарии</div>
          <div className="space-y-2">
            {shift.comments.length === 0 && <div className="text-[12px] text-[#6B7280]">Пока нет комментариев</div>}
            {shift.comments.map(c => {
              const e = employees.find(x => x.id === c.authorId);
              return (
                <div key={c.id} className="rounded-xl bg-[#F9FAFB] p-3">
                  <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 700 }}>{e?.name ?? c.authorId}</div>
                  <div className="text-[12px] text-[#374151] mt-1" style={{ fontWeight: 500 }}>{c.text}</div>
                  <div className="text-[10px] text-[#9CA3AF] mt-1">{fmt(c.createdAt)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        open={openComment}
        onClose={() => setOpenComment(false)}
        title="Добавить комментарий"
        footer={
          <>
            <button onClick={() => setOpenComment(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!comment.trim()) { toast.error('Пустой комментарий'); return; }
                store.addShiftComment(comment.trim());
                setComment('');
                setOpenComment(false);
                toast.success('Комментарий добавлен');
              }}
              className="px-4 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Сохранить</button>
          </>
        }
      >
        <textarea
          autoFocus
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={4}
          className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[13px]"
          placeholder="Что произошло на смене?"
        />
      </Modal>

      <Modal
        open={openClose}
        onClose={() => setOpenClose(false)}
        title="Закрыть смену"
        footer={
          <>
            <button onClick={() => setOpenClose(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => tryClose(true)}
              className="px-4 h-9 rounded-lg border border-[#EF4444] text-[#EF4444] text-[12px] active-press" style={{ fontWeight: 700 }}
            >Force-закрытие</button>
            <button
              onClick={() => tryClose(false)}
              className="px-4 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Закрыть</button>
          </>
        }
      >
        <div className="text-[13px] text-[#374151]">
          Перед закрытием смены проверьте: касса закрыта, возвраты завершены, приёмки от курьера закрыты, критические проблемы эскалированы.
        </div>
        <div className="text-[12px] text-[#6B7280] mt-2">Force-закрытие используется только в исключительных случаях и пишет в audit.</div>
      </Modal>
    </div>
  );
}

function Stat({ label, value, color, full }: { label: string; value: string | number; color: string; full?: boolean }) {
  return (
    <div className={`rounded-xl bg-[#F9FAFB] p-3 ${full ? 'col-span-2 md:col-span-1' : ''}`}>
      <div className="text-[10px] uppercase" style={{ color, fontWeight: 800 }}>{label}</div>
      <div className="text-[16px] mt-1 text-[#1F2430]" style={{ fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function Btn({ label, icon: Icon, color, onClick, disabled }: { label: string; icon: any; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl p-3 text-left active-press disabled:opacity-40"
      style={{ backgroundColor: color + '15' }}
    >
      <Icon className="w-4 h-4 mb-1" style={{ color }} />
      <div className="text-[12px]" style={{ color, fontWeight: 800 }}>{label}</div>
    </button>
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}
