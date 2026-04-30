import { useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ROLE_LABELS } from '../domain/roles';
import type { PvzSettings } from '../domain/types';

export function SettingsPage() {
  const { pvz, employees } = useStore();
  const [draft, setDraft] = useState<PvzSettings>(pvz);

  const save = () => {
    store.updateSettings(draft);
    toast.success('Настройки сохранены');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Настройки ПВЗ"
        subtitle={pvz.id}
        right={
          <button onClick={save} className="px-3 h-9 rounded-lg bg-white text-[#1F2430] text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}>
            <Save className="w-3 h-3" /> Сохранить
          </button>
        }
      />

      <div className="px-5 -mt-5 max-w-3xl space-y-3">
        <Card title="Основное">
          <Field label="Название">
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" />
          </Field>
          <Field label="Адрес">
            <input value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })}
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" />
          </Field>
          <Field label="График работы">
            <input value={draft.workingHours} onChange={e => setDraft({ ...draft, workingHours: e.target.value })}
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" />
          </Field>
        </Card>

        <Card title="Хранение и просрочка">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Лимит хранения (дни)">
              <input type="number" value={draft.storageLimitDays} onChange={e => setDraft({ ...draft, storageLimitDays: Number(e.target.value) })}
                className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" />
            </Field>
            <Field label="Просрочка после (дни)">
              <input type="number" value={draft.expiredAfterDays} onChange={e => setDraft({ ...draft, expiredAfterDays: Number(e.target.value) })}
                className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" />
            </Field>
          </div>
        </Card>

        <Card title="Выдача и возвраты">
          <Toggle label="Выдача по OTP"     value={draft.otpEnabled}     onChange={v => setDraft({ ...draft, otpEnabled: v })} />
          <Toggle label="Выдача по QR"       value={draft.qrEnabled}      onChange={v => setDraft({ ...draft, qrEnabled: v })} />
          <Toggle label="Возвраты включены" value={draft.returnsEnabled} onChange={v => setDraft({ ...draft, returnsEnabled: v })} />
        </Card>

        <Card title="Касса">
          <Toggle label="Касса включена" value={draft.cashEnabled} onChange={v => setDraft({ ...draft, cashEnabled: v })} />
        </Card>

        <Card title="Уведомления">
          <Toggle label="Включить уведомления" value={draft.notificationsEnabled} onChange={v => setDraft({ ...draft, notificationsEnabled: v })} />
          <Field label="Язык интерфейса">
            <select value={draft.language} onChange={e => setDraft({ ...draft, language: e.target.value as PvzSettings['language'] })}
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-2 text-[13px]">
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
              <option value="en">English</option>
            </select>
          </Field>
        </Card>

        <Card title="Сотрудники ПВЗ">
          <div className="space-y-2">
            {employees.map(e => (
              <div key={e.id} className="rounded-xl bg-[#F9FAFB] p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#0369A1] text-[14px]" style={{ fontWeight: 900 }}>
                  {e.avatar ?? e.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 800 }}>{e.name}</div>
                  <div className="text-[10px] text-[#6B7280]">{ROLE_LABELS[e.role]} · {e.id}{e.phone ? ` · ${e.phone}` : ''}</div>
                </div>
                <select
                  value={e.shiftStatus}
                  onChange={ev => {
                    store.setEmployeeShift(e.id, ev.target.value as any);
                    toast(`${e.name}: ${ev.target.value}`);
                  }}
                  className="text-[11px] border border-[#E5E7EB] rounded-lg h-8 px-2"
                >
                  <option value="not_started">не начал</option>
                  <option value="active">на смене</option>
                  <option value="paused">пауза</option>
                  <option value="closed">смена закрыта</option>
                </select>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div className="bg-white rounded-2xl p-4 space-y-3">
      <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>{title}</div>
      {children}
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
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between rounded-xl bg-[#F9FAFB] p-3 active-press"
    >
      <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 700 }}>{label}</div>
      <div className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-[#16A34A]' : 'bg-[#D1D5DB]'} relative`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${value ? 'left-[18px]' : 'left-0.5'}`} />
      </div>
    </button>
  );
}
