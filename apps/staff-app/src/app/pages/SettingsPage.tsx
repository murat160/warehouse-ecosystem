import { LogOut, User, Smartphone, Cpu, FileText, Award, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppState, store } from '../hooks/useAppState';
import { ROLE_LABELS } from '../data/mockData';
import { PageHeader } from '../components/PageHeader';
import { DeviceManager } from '../services/hardware';

export function SettingsPage() {
  const state = useAppState();
  const nav = useNavigate();
  const worker = state.currentWorker;

  if (!worker) return null;

  const handleLogout = () => {
    store.logout();
    toast('Вы вышли из системы');
    nav('/login');
  };

  const handleResetState = () => {
    if (confirm('Сбросить все данные склада к исходным? (для разработки)')) {
      store.resetState();
      toast.success('Состояние сброшено');
      nav('/login');
    }
  };

  const devices = DeviceManager.instance.getAllStatus();

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Профиль" />

      <div className="px-5 -mt-3 mb-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#2EA7E0] text-[36px]" style={{ fontWeight: 900 }}>
              {worker.name[0]}
            </div>
            <div className="flex-1">
              <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>
                {worker.name}
              </div>
              <div className="text-[13px] text-[#6B7280]" style={{ fontWeight: 600 }}>
                {ROLE_LABELS[worker.role]}
              </div>
              <div className="text-[11px] text-[#9CA3AF] mt-0.5" style={{ fontWeight: 500 }}>
                {worker.warehouseName}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Cell icon={<Activity className="w-3 h-3" />} value={worker.productivity + '%'} label="Прод-сть" />
            <Cell icon={<FileText className="w-3 h-3" />} value={worker.tasksCompletedToday.toString()} label="Задач" />
            <Cell icon={<Award className="w-3 h-3" />} value={worker.errorRate.toFixed(1) + '%'} label="Ошибки" />
          </div>
        </div>
      </div>

      <div className="px-5 mb-3">
        <h3 className="text-[13px] text-[#6B7280] mb-2 px-1" style={{ fontWeight: 700 }}>
          Устройства (Hardware)
        </h3>
        <div className="bg-white rounded-2xl p-1 shadow-sm">
          {devices.map((d, i) => (
            <div
              key={d.kind}
              className={`flex items-center justify-between p-3 ${i < devices.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-[#9CA3AF]" />
                <div>
                  <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                    {KIND_LABELS[d.kind]}
                  </div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    {d.model}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {d.battery !== undefined && (
                  <span className="text-[11px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                    {d.battery}%
                  </span>
                )}
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: d.connected ? '#00D27A' : '#EF4444' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mb-3">
        <h3 className="text-[13px] text-[#6B7280] mb-2 px-1" style={{ fontWeight: 700 }}>
          Инфо
        </h3>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-[#F3F4F6]">
          <Row icon={<User className="w-4 h-4" />} label="ID" value={worker.id} />
          <Row icon={<Smartphone className="w-4 h-4" />} label="Бейдж" value={worker.badgeId} />
          <Row icon={<FileText className="w-4 h-4" />} label="Зона" value={worker.zone || '—'} />
          <Row icon={<Activity className="w-4 h-4" />} label="Смена" value={`${worker.shiftPlanned.start} – ${worker.shiftPlanned.end}`} />
        </div>
      </div>

      <div className="px-5">
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active-press"
        >
          <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
            <LogOut className="w-5 h-5 text-[#EF4444]" />
          </div>
          <div className="text-[14px] text-[#EF4444]" style={{ fontWeight: 700 }}>
            Выйти из системы
          </div>
        </button>
      </div>

      <div className="px-5 mt-2">
        <button
          onClick={handleResetState}
          className="w-full text-[11px] text-[#9CA3AF] py-2"
          style={{ fontWeight: 500 }}
        >
          🔧 Сбросить локальные данные (dev)
        </button>
      </div>

      <div className="px-5 mt-6 text-center">
        <div className="text-[10px] text-[#9CA3AF]" style={{ fontWeight: 500 }}>
          Warehouse WMS · v1.0
        </div>
      </div>
    </div>
  );
}

const KIND_LABELS = {
  scanner: 'Сканер штрихкодов',
  scale: 'Промышленные весы',
  printer: 'Принтер этикеток',
  camera: 'Камера',
  rfid: 'RFID-ридер',
};

function Cell({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-2">
      <div className="text-[16px] text-[#1F2430] mb-0.5" style={{ fontWeight: 900 }}>{value}</div>
      <div className="flex items-center gap-1 text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>
        {icon}
        {label}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="text-[#9CA3AF]">{icon}</div>
      <div className="flex-1 text-[13px] text-[#6B7280]" style={{ fontWeight: 500 }}>{label}</div>
      <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
