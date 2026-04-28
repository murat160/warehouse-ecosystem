import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { ROLE_LABELS } from '../domain/roles';

export function LoginPage() {
  const { workers } = useStore();
  const nav = useNavigate();
  const [pickedId, setPickedId] = useState<string | null>(null);

  const submit = () => {
    if (!pickedId) { toast.error('Выберите сотрудника'); return; }
    if (!store.login(pickedId)) { toast.error('Сотрудник не найден'); return; }
    toast.success('Вход выполнен');
    nav('/');
  };

  return (
    <div className="min-h-screen bg-[#1F2430] flex flex-col px-5 pt-12 pb-8">
      <div className="max-w-md mx-auto w-full text-white flex-1 flex flex-col">
        <h1 className="text-[28px] mb-1" style={{ fontWeight: 900 }}>Warehouse App</h1>
        <p className="text-white/60 text-[13px] mb-8" style={{ fontWeight: 500 }}>
          Войдите как сотрудник склада
        </p>

        <div className="space-y-2 mb-6">
          {workers.map(w => (
            <button
              key={w.id}
              onClick={() => setPickedId(w.id)}
              className="w-full text-left rounded-2xl p-4 active-press"
              style={{
                backgroundColor: pickedId === w.id ? '#2EA7E0' : 'rgba(255,255,255,0.08)',
                color: 'white', fontWeight: 700,
              }}
            >
              <div className="text-[14px]">{w.name}</div>
              <div className="text-[11px] opacity-70 mt-0.5" style={{ fontWeight: 500 }}>
                {w.id} · {ROLE_LABELS[w.role]}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={submit}
          className="w-full h-12 rounded-2xl bg-[#00D27A] text-white active-press"
          style={{ fontWeight: 800 }}
        >
          Войти
        </button>
      </div>
    </div>
  );
}
