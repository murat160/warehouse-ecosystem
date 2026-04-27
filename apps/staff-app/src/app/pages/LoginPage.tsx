import { useEffect, useState } from 'react';
import { ChevronRight, Lock, X } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '../hooks/useAppState';
import { ROLE_LABELS, type WorkerProfile, type WorkerRole } from '../data/mockData';
import { authApi } from '../api/client';
import { mapUser } from '../api/mappers';

export function LoginPage() {
  // Stage-3: fetch worker list from backend's public /api/auth/workers
  // (state.workers is empty until login succeeds and bootstrap runs).
  const [publicWorkers, setPublicWorkers] = useState<WorkerProfile[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authApi.publicWorkers()
      .then(list => setPublicWorkers(list.map(mapUser)))
      .catch(err => toast.error(`Не удалось загрузить сотрудников: ${err.message}`))
      .finally(() => setLoadingWorkers(false));
  }, []);

  const handleLogin = async () => {
    if (!selectedWorker || submitting) return;
    setSubmitting(true);
    const result = await store.login(selectedWorker.id, pin);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error || 'Ошибка входа');
      setPin('');
    } else {
      toast.success(`Добро пожаловать, ${selectedWorker.name.split(' ')[0]}!`);
    }
  };

  if (selectedWorker) {
    return (
      <div className="min-h-screen bg-[#1F2430] flex flex-col items-center justify-center px-6">
        <button
          onClick={() => { setSelectedWorker(null); setPin(''); }}
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="w-20 h-20 rounded-full bg-[#2EA7E0] flex items-center justify-center mb-4">
          <span className="text-[32px]" style={{ fontWeight: 900, color: 'white' }}>
            {selectedWorker.name[0]}
          </span>
        </div>
        <h2 className="text-white text-[22px] mb-1" style={{ fontWeight: 800 }}>
          {selectedWorker.name}
        </h2>
        <p className="text-white/60 text-[14px] mb-1" style={{ fontWeight: 600 }}>
          {ROLE_LABELS[selectedWorker.role]}
        </p>
        <p className="text-white/40 text-[12px] mb-8" style={{ fontWeight: 500 }}>
          Бейдж: {selectedWorker.badgeId}
        </p>

        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-white/60" />
          <span className="text-white/60 text-[13px]" style={{ fontWeight: 600 }}>
            Введите PIN
          </span>
        </div>

        <div className="flex gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white text-[24px]"
              style={{ fontWeight: 900 }}
            >
              {pin[i] ? '•' : ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {['1','2','3','4','5','6','7','8','9'].map((num) => (
            <button
              key={num}
              onClick={() => pin.length < 4 && setPin(pin + num)}
              className="h-16 rounded-2xl bg-white/10 text-white text-[24px] active-press"
              style={{ fontWeight: 700 }}
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => pin.length < 4 && setPin(pin + '0')}
            className="h-16 rounded-2xl bg-white/10 text-white text-[24px] active-press"
            style={{ fontWeight: 700 }}
          >
            0
          </button>
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            className="h-16 rounded-2xl bg-white/5 text-white text-[14px] active-press"
            style={{ fontWeight: 600 }}
          >
            ⌫
          </button>
        </div>

        {pin.length === 4 && (
          <button
            onClick={handleLogin}
            className="mt-6 w-full max-w-xs h-14 rounded-full bg-[#2EA7E0] text-white text-[16px] active-press"
            style={{ fontWeight: 800 }}
          >
            Войти
          </button>
        )}

        <p className="text-white/30 text-[11px] mt-8 text-center px-4" style={{ fontWeight: 500 }}>
          Тестовый PIN: 1234 (сотрудники), 0000 (руководство)
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-12">
      <div className="bg-[#1F2430] px-5 pt-12 pb-8 rounded-b-3xl">
        <h1 className="text-white text-[26px]" style={{ fontWeight: 900 }}>
          Складской WMS
        </h1>
        <p className="text-white/60 text-[14px] mt-1" style={{ fontWeight: 500 }}>
          Выберите сотрудника
        </p>
      </div>

      <div className="px-5 -mt-4 pb-6 space-y-2">
        {loadingWorkers && (
          <div className="bg-white rounded-2xl p-4 text-center text-[13px] text-[#6B7280]" style={{ fontWeight: 500 }}>
            Загружаем список сотрудников…
          </div>
        )}
        {!loadingWorkers && publicWorkers.length === 0 && (
          <div className="bg-white rounded-2xl p-4 text-center text-[13px] text-[#EF4444]" style={{ fontWeight: 600 }}>
            Не удалось получить список с сервера. Проверь, что backend запущен на /api/health.
          </div>
        )}
        {publicWorkers.map((w) => (
          <button
            key={w.id}
            onClick={() => setSelectedWorker(w)}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active-press"
          >
            <div className="w-12 h-12 rounded-full bg-[#E0F2FE] flex items-center justify-center">
              <span className="text-[18px] text-[#2EA7E0]" style={{ fontWeight: 800 }}>
                {w.name[0]}
              </span>
            </div>
            <div className="flex-1 text-left">
              <div className="text-[15px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                {w.name}
              </div>
              <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                {ROLE_LABELS[w.role as WorkerRole] ?? w.role} · {w.badgeId}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
          </button>
        ))}
      </div>
    </div>
  );
}
