import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { ROLE_LABELS } from '../domain/roles';

export function LoginPage() {
  const { employees, pvz } = useStore();
  const nav = useNavigate();
  const [pickedId, setPickedId] = useState<string | null>(null);

  const submit = () => {
    if (!pickedId) { toast.error('Выберите сотрудника'); return; }
    if (!store.login(pickedId)) { toast.error('Сотрудник не найден'); return; }
    toast.success('Вход выполнен');
    nav('/');
  };

  return (
    <div className="min-h-screen bg-[#1F2430] flex flex-col px-4 pt-8 pb-8">
      <div className="max-w-md mx-auto w-full text-white flex-1 flex flex-col">
        <div className="mb-6">
          <h1 className="text-[28px]" style={{ fontWeight: 900 }}>Ehli Trend PVZ</h1>
          <p className="text-white/60 text-[13px] mt-1" style={{ fontWeight: 500 }}>
            Пункт выдачи · {pvz.name}
          </p>
        </div>

        <div className="space-y-2 mb-6 flex-1">
          {employees.map(e => (
            <button
              key={e.id}
              onClick={() => setPickedId(e.id)}
              className="w-full text-left rounded-2xl p-3 active-press flex items-center gap-3"
              style={{
                backgroundColor: pickedId === e.id ? '#0EA5E9' : 'rgba(255,255,255,0.08)',
                color: 'white', fontWeight: 700,
              }}
            >
              <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-[20px]" style={{ fontWeight: 900 }}>
                {e.avatar ?? e.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px]">{e.name}</div>
                <div className="text-[11px] opacity-70 mt-0.5" style={{ fontWeight: 500 }}>
                  {ROLE_LABELS[e.role]} · {e.id}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={submit}
          className="w-full h-12 rounded-2xl bg-[#22C55E] text-white active-press"
          style={{ fontWeight: 800 }}
        >
          Войти
        </button>
      </div>
    </div>
  );
}
