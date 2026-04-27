import { useState } from 'react';
import { Plus, AlertTriangle, X, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store } from '../hooks/useAppState';
import { INCIDENT_TYPE_LABELS, type IncidentType } from '../data/mockData';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

const STATUS_CFG = {
  open:          { label: 'Открыт',     bg: '#FEE2E2', color: '#EF4444' },
  investigating: { label: 'Изучается',  bg: '#FEF3C7', color: '#F59E0B' },
  resolved:      { label: 'Решён',      bg: '#D1FAE5', color: '#00D27A' },
};

export function IncidentsPage() {
  const state = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<IncidentType>('damage');
  const [description, setDescription] = useState('');
  const [photoTaken, setPhotoTaken] = useState(false);

  const submit = () => {
    if (!description.trim()) {
      toast.error('Опишите инцидент');
      return;
    }
    store.reportIncident({
      type,
      description,
      photos: photoTaken ? ['photo://incident.jpg'] : [],
    });
    toast.success('Инцидент создан');
    setShowForm(false);
    setDescription('');
    setPhotoTaken(false);
    setType('damage');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Инциденты" subtitle={`${state.incidents.length} зарегистрировано`} />

      <div className="px-5 -mt-3 mb-3">
        <button
          onClick={() => setShowForm(true)}
          className="w-full h-12 rounded-2xl bg-[#EF4444] text-white flex items-center justify-center gap-2 active-press shadow-md"
          style={{ fontWeight: 700 }}
        >
          <Plus className="w-4 h-4" />
          Создать инцидент
        </button>
      </div>

      <div className="px-5 space-y-2">
        {state.incidents.length === 0 ? (
          <EmptyState emoji="✅" title="Инцидентов нет" subtitle="" />
        ) : (
          state.incidents.map(inc => {
            const reporter = state.workers.find(w => w.id === inc.reportedBy);
            const cfg = STATUS_CFG[inc.status];
            return (
              <div key={inc.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                    <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                      {INCIDENT_TYPE_LABELS[inc.type]}
                    </span>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: cfg.bg, color: cfg.color, fontWeight: 800 }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 500 }}>
                  {inc.id} · {reporter?.name || inc.reportedBy}
                </div>
                <div className="text-[13px] text-[#1F2430] mb-2" style={{ fontWeight: 500 }}>
                  {inc.description}
                </div>
                {(inc.binId || inc.skuId || inc.taskId) && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {inc.binId && <Tag>{inc.binId}</Tag>}
                    {inc.skuId && <Tag>{inc.skuId}</Tag>}
                    {inc.taskId && <Tag>{inc.taskId}</Tag>}
                  </div>
                )}
                <div className="text-[10px] text-[#9CA3AF] mt-2" style={{ fontWeight: 500 }}>
                  {new Date(inc.createdAt).toLocaleString('ru')}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end animate-fade-in" onClick={() => setShowForm(false)}>
          <div
            className="w-full bg-white rounded-t-3xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex justify-center pb-3">
              <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>Создать инцидент</h3>
              <button onClick={() => setShowForm(false)} className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                <X className="w-5 h-5 text-[#1F2430]" />
              </button>
            </div>

            <h4 className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>Тип</h4>
            <div className="space-y-1 mb-3">
              {(Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="w-full flex items-center gap-2 p-2 rounded-xl active-press text-left"
                  style={{
                    backgroundColor: type === t ? '#FEE2E2' : '#F9FAFB',
                    border: type === t ? '2px solid #EF4444' : '2px solid transparent',
                  }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type === t ? '#EF4444' : '#D1D5DB' }} />
                  <span className="text-[13px] text-[#1F2430]" style={{ fontWeight: 600 }}>
                    {INCIDENT_TYPE_LABELS[t]}
                  </span>
                </button>
              ))}
            </div>

            <h4 className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>Описание</h4>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что произошло, где, когда..."
              rows={4}
              className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2EA7E0] focus:outline-none text-[14px] resize-none mb-3"
              style={{ fontWeight: 500 }}
            />

            <button
              onClick={() => setPhotoTaken(true)}
              className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed"
              style={{
                borderColor: photoTaken ? '#00D27A' : '#D1D5DB',
                backgroundColor: photoTaken ? '#D1FAE5' : 'transparent',
                color: photoTaken ? '#065F46' : '#6B7280',
                fontWeight: 600,
              }}
            >
              <Camera className="w-4 h-4" />
              {photoTaken ? '✓ Фото прикреплено' : 'Прикрепить фото'}
            </button>

            <button
              onClick={submit}
              className="w-full h-12 rounded-xl bg-[#EF4444] text-white active-press"
              style={{ fontWeight: 800 }}
            >
              Создать инцидент
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: any }) {
  return (
    <span className="text-[10px] bg-[#F3F4F6] text-[#1F2430] px-2 py-0.5 rounded-md font-mono" style={{ fontWeight: 700 }}>
      {children}
    </span>
  );
}
