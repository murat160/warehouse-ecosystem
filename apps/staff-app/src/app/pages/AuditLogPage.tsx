import { useState } from 'react';
import { Lock, FileText } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { hasPermission } from '../services/permissions';

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  LOGIN:           { bg: '#E0F2FE', color: '#0EA5E9' },
  LOGOUT:          { bg: '#F3F4F6', color: '#6B7280' },
  TASK_ACCEPT:     { bg: '#DBEAFE', color: '#2EA7E0' },
  TASK_START:      { bg: '#FEF3C7', color: '#F59E0B' },
  TASK_COMPLETE:   { bg: '#D1FAE5', color: '#00D27A' },
  TASK_BLOCK:      { bg: '#FEE2E2', color: '#EF4444' },
  TASK_ESCALATE:   { bg: '#FEE2E2', color: '#DC2626' },
  TASK_ERROR:      { bg: '#FEE2E2', color: '#EF4444' },
  PICK_ITEM:       { bg: '#FEF3C7', color: '#F59E0B' },
  PICK_DONE:       { bg: '#D1FAE5', color: '#00D27A' },
  PACK_DONE:       { bg: '#CCFBF1', color: '#14B8A6' },
  PACK_WEIGHT_FAIL:{ bg: '#FEE2E2', color: '#EF4444' },
  RECEIVE_ITEM:    { bg: '#DBEAFE', color: '#2EA7E0' },
  RECEIVE_FINISH:  { bg: '#D1FAE5', color: '#00D27A' },
  ASN_DOCKED:      { bg: '#E0F2FE', color: '#0EA5E9' },
  QC_DECISION:     { bg: '#F3E8FF', color: '#A855F7' },
  QC_FAILED:       { bg: '#FEE2E2', color: '#EF4444' },
  PUTAWAY:         { bg: '#CFFAFE', color: '#06B6D4' },
  COUNT_SUBMIT:    { bg: '#F3E8FF', color: '#A855F7' },
  REPLENISH:       { bg: '#E0F2FE', color: '#0EA5E9' },
  LOAD:            { bg: '#D1FAE5', color: '#00D27A' },
  RMA_INSPECT:     { bg: '#FFE4E6', color: '#F43F5E' },
  INCIDENT:        { bg: '#FEE2E2', color: '#DC2626' },
  SHIFT_STATUS:    { bg: '#F3F4F6', color: '#6B7280' },
};

export function AuditLogPage() {
  const state = useAppState();
  const me = state.currentWorker;
  const [filter, setFilter] = useState<'all' | 'mine' | string>('all');

  if (!me || !hasPermission(me.role, 'view_audit_log')) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center px-5">
        <div className="text-center">
          <Lock className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
          <p className="text-[16px] text-[#1F2430]" style={{ fontWeight: 700 }}>Доступ ограничен</p>
        </div>
      </div>
    );
  }

  const log = filter === 'all' ? state.auditLog
    : filter === 'mine' ? state.auditLog.filter(e => e.workerId === me.id)
    : state.auditLog.filter(e => e.action === filter);

  const actions = Array.from(new Set(state.auditLog.map(e => e.action)));

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Журнал действий" subtitle={`${state.auditLog.length} записей`} />

      <div className="px-5 -mt-3 mb-3 flex gap-1 overflow-x-auto pb-1">
        <Pill active={filter === 'all'}  onClick={() => setFilter('all')}>Все</Pill>
        <Pill active={filter === 'mine'} onClick={() => setFilter('mine')}>Мои</Pill>
        {actions.slice(0, 8).map(a => (
          <Pill key={a} active={filter === a} onClick={() => setFilter(a)}>{a}</Pill>
        ))}
      </div>

      <div className="px-5 space-y-1">
        {log.length === 0 ? (
          <EmptyState emoji="📋" title="Записей нет" subtitle="" />
        ) : (
          log.map(entry => {
            const cfg = ACTION_COLORS[entry.action] || { bg: '#F3F4F6', color: '#6B7280' };
            return (
              <div key={entry.id} className="bg-white rounded-xl p-3 shadow-sm flex items-start gap-2">
                <FileText className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ backgroundColor: cfg.bg, color: cfg.color, fontWeight: 800 }}
                    >
                      {entry.action}
                    </span>
                    <span className="text-[11px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                      {entry.workerName}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 500 }}>
                    {entry.details}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] mt-0.5" style={{ fontWeight: 500 }}>
                    {new Date(entry.timestamp).toLocaleString('ru')}
                    {entry.taskId && ` · ${entry.taskId}`}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: any; key?: any }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap"
      style={{ backgroundColor: active ? '#1F2430' : 'white', color: active ? 'white' : '#1F2430', fontWeight: 700 }}
    >
      {children}
    </button>
  );
}
