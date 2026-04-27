import { useState } from 'react';
import { Users, Search, ChevronRight, Lock, Award } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { ROLE_LABELS, type WorkerProfile, type WorkerRole } from '../data/mockData';
import { PageHeader } from '../components/PageHeader';
import { hasPermission } from '../services/permissions';

export function WorkersAdminPage() {
  const state = useAppState();
  const me = state.currentWorker;
  const [query, setQuery] = useState('');
  const [filterRole, setFilterRole] = useState<WorkerRole | 'all'>('all');
  const [selected, setSelected] = useState<WorkerProfile | null>(null);

  if (!me || !hasPermission(me.role, 'manage_workers')) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center px-5">
        <div className="text-center">
          <Lock className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
          <p className="text-[16px] text-[#1F2430]" style={{ fontWeight: 700 }}>Доступ ограничен</p>
          <p className="text-[13px] text-[#6B7280] mt-1" style={{ fontWeight: 500 }}>
            Только для warehouse manager
          </p>
        </div>
      </div>
    );
  }

  const filtered = state.workers.filter(w => {
    if (filterRole !== 'all' && w.role !== filterRole) return false;
    if (query) {
      const q = query.toLowerCase();
      return w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q) || w.badgeId.toLowerCase().includes(q);
    }
    return true;
  });

  const onShift = state.workers.filter(w => w.shiftStatus === 'on_shift').length;

  // Уникальные роли в списке для фильтра
  const uniqueRoles: WorkerRole[] = Array.from(new Set(state.workers.map(w => w.role)));

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Сотрудники" subtitle={`${state.workers.length} всего · ${onShift} на смене`} />

      <div className="px-5 -mt-3 mb-3">
        <div className="bg-white rounded-2xl p-2 flex items-center gap-2 shadow-sm">
          <Search className="w-5 h-5 text-[#9CA3AF] ml-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя, ID, бейдж..."
            className="flex-1 outline-none text-[14px]"
            style={{ fontWeight: 500 }}
          />
        </div>
      </div>

      <div className="px-5 mb-3 flex gap-1 overflow-x-auto pb-1">
        <FilterChip active={filterRole === 'all'} onClick={() => setFilterRole('all')}>Все</FilterChip>
        {uniqueRoles.map(r => (
          <FilterChip key={r} active={filterRole === r} onClick={() => setFilterRole(r)}>
            {ROLE_LABELS[r]}
          </FilterChip>
        ))}
      </div>

      <div className="px-5 space-y-2">
        {filtered.map(w => {
          const myTasks = state.tasks.filter(t => t.assignedTo === w.id && t.status !== 'completed').length;
          return (
            <button
              key={w.id}
              onClick={() => setSelected(w)}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active-press text-left"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#2EA7E0] text-[18px]" style={{ fontWeight: 800 }}>
                  {w.name[0]}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: w.shiftStatus === 'on_shift' ? '#00D27A' : w.shiftStatus === 'on_break' ? '#F59E0B' : '#9CA3AF' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>
                  {w.name}
                </div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {ROLE_LABELS[w.role]} · {w.badgeId}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ fontWeight: 700 }}>
                  <span style={{ color: w.productivity >= 90 ? '#00D27A' : '#F59E0B' }}>
                    {w.productivity}%
                  </span>
                  <span className="text-[#9CA3AF]">·</span>
                  <span style={{ color: w.errorRate < 1 ? '#00D27A' : w.errorRate < 2 ? '#F59E0B' : '#EF4444' }}>
                    ошибки {w.errorRate}%
                  </span>
                  <span className="text-[#9CA3AF]">·</span>
                  <span className="text-[#1F2430]">{myTasks} задач</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
            </button>
          );
        })}
      </div>

      {selected && (
        <WorkerProfileModal worker={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: any; key?: any }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap"
      style={{ backgroundColor: active ? '#1F2430' : 'white', color: active ? 'white' : '#1F2430', fontWeight: 700 }}
    >
      {children}
    </button>
  );
}

function WorkerProfileModal({ worker, onClose }: { worker: WorkerProfile; onClose: () => void }) {
  const state = useAppState();
  const tasks = state.tasks.filter(t => t.assignedTo === worker.id);
  const completed = tasks.filter(t => t.status === 'completed').length;
  const errors = tasks.reduce((s, t) => s + (t.errors?.length || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end animate-fade-in" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl p-5 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pb-3">
          <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#2EA7E0] text-[36px]" style={{ fontWeight: 900 }}>
            {worker.name[0]}
          </div>
          <div className="flex-1">
            <div className="text-[20px] text-[#1F2430]" style={{ fontWeight: 900 }}>{worker.name}</div>
            <div className="text-[13px] text-[#6B7280]" style={{ fontWeight: 600 }}>
              {ROLE_LABELS[worker.role]}
            </div>
            <div className="text-[11px] text-[#9CA3AF] mt-0.5" style={{ fontWeight: 500 }}>
              ID: {worker.id} · Бейдж: {worker.badgeId}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <Cell value={worker.productivity + '%'} label="Продуктивность" good={worker.productivity >= 90} />
          <Cell value={worker.errorRate.toFixed(1) + '%'} label="Ошибки" bad={worker.errorRate > 1.5} />
          <Cell value={completed.toString()} label="Завершено задач" />
          <Cell value={errors.toString()} label="Ошибок в задачах" bad={errors > 0} />
        </div>

        <div className="bg-[#F9FAFB] rounded-2xl p-3 mb-3">
          <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 600 }}>Смена</div>
          <div className="text-[13px] text-[#1F2430] mb-0.5" style={{ fontWeight: 700 }}>
            {worker.shiftPlanned.start} – {worker.shiftPlanned.end}
          </div>
          <div className="text-[11px]" style={{ fontWeight: 600, color: worker.shiftStatus === 'on_shift' ? '#00D27A' : '#9CA3AF' }}>
            {worker.shiftStatus === 'on_shift' ? '● На смене' : worker.shiftStatus === 'on_break' ? '● Перерыв' : '○ Не на смене'}
          </div>
        </div>

        <div className="bg-[#F9FAFB] rounded-2xl p-3 mb-3">
          <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 600 }}>Зона работы</div>
          <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>
            {worker.zone || 'Не назначена'}
          </div>
        </div>

        {worker.productivity >= 95 && worker.errorRate < 1 && (
          <div className="bg-[#FEF3C7] rounded-2xl p-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#F59E0B]" />
            <div>
              <div className="text-[12px] text-[#92400E]" style={{ fontWeight: 800 }}>
                Топ-сотрудник
              </div>
              <div className="text-[11px] text-[#92400E]" style={{ fontWeight: 500 }}>
                Высокая продуктивность и низкие ошибки
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ value, label, good, bad }: { value: string; label: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-3">
      <div className="text-[20px]" style={{ fontWeight: 900, color: bad ? '#EF4444' : good ? '#00D27A' : '#1F2430' }}>{value}</div>
      <div className="text-[11px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}
