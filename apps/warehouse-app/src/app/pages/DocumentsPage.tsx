import { useState } from 'react';
import { Download, Upload, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '../domain/types';
import { can } from '../domain/roles';

const STATUS_COLORS = {
  pending:  { bg: '#FEF3C7', fg: '#92400E' },
  approved: { bg: '#DCFCE7', fg: '#166534' },
  rejected: { bg: '#FEE2E2', fg: '#991B1B' },
} as const;

export function DocumentsPage() {
  const { documents, currentWorker } = useStore();
  const canApprove = can(currentWorker?.role, 'documents') && (currentWorker?.role === 'warehouse_admin' || currentWorker?.role === 'shift_manager');

  const [showUpload, setShowUpload] = useState(false);
  const [uType, setUType] = useState<DocumentType>('invoice');
  const [uNumber, setUNumber] = useState('');

  const upload = () => {
    if (!uNumber.trim()) { toast.error('Укажите номер'); return; }
    store.uploadDocument({ type: uType, number: uNumber });
    toast.success('Документ загружен');
    setShowUpload(false); setUNumber(''); setUType('invoice');
  };

  const downloadMock = (d: typeof documents[number]) => {
    const text = `Document: ${DOCUMENT_TYPE_LABELS[d.type]}\nNumber: ${d.number}\nStatus: ${d.status}\nCreated: ${d.createdAt}\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${d.type}-${d.number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Документ скачан');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Документы" subtitle={`Всего: ${documents.length}`} />

      <div className="px-5 -mt-5">
        <button
          onClick={() => setShowUpload(true)}
          className="w-full h-11 rounded-2xl bg-[#0EA5E9] text-white flex items-center justify-center gap-2 active-press mb-3"
          style={{ fontWeight: 800 }}
        >
          <Upload className="w-4 h-4" /> Загрузить документ
        </button>

        <div className="space-y-2">
          {documents.length === 0 ? (
            <EmptyState emoji="📄" title="Документов нет" />
          ) : documents.map(d => {
            const c = STATUS_COLORS[d.status];
            return (
              <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="min-w-0">
                    <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{d.number}</div>
                    <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                      {DOCUMENT_TYPE_LABELS[d.type]} · {new Date(d.createdAt).toLocaleString('ru')}
                    </div>
                    {(d.orderId || d.asnId || d.rmaId) && (
                      <div className="text-[10px] text-[#9CA3AF] mt-0.5 font-mono" style={{ fontWeight: 600 }}>
                        {d.orderId && `заказ ${d.orderId}`}
                        {d.asnId && `поставка ${d.asnId}`}
                        {d.rmaId && `возврат ${d.rmaId}`}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 800 }}>
                    {d.status}
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => downloadMock(d)}
                    className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                  >
                    <Download className="w-3 h-3" /> Скачать
                  </button>
                  {canApprove && d.status === 'pending' && (
                    <>
                      <button
                        onClick={() => { store.approveDocument(d.id); toast.success('Одобрено'); }}
                        className="px-3 h-9 rounded-lg bg-[#10B981] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                      >
                        <Check className="w-3 h-3" /> Одобрить
                      </button>
                      <button
                        onClick={() => { store.rejectDocument(d.id); toast('Отклонено'); }}
                        className="px-3 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                      >
                        <X className="w-3 h-3" /> Отклонить
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={showUpload}
        title="Загрузить документ"
        onClose={() => setShowUpload(false)}
        footer={
          <button onClick={upload} className="w-full h-11 rounded-xl bg-[#0EA5E9] text-white active-press" style={{ fontWeight: 800 }}>
            Загрузить
          </button>
        }
      >
        <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Тип</div>
        <select
          value={uType}
          onChange={e => setUType(e.target.value as DocumentType)}
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] text-[14px] mb-3"
          style={{ fontWeight: 600 }}
        >
          {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map(t => (
            <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Номер</div>
        <input
          value={uNumber}
          onChange={e => setUNumber(e.target.value)}
          placeholder="ACT-123"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#0EA5E9] focus:outline-none text-[14px]"
          style={{ fontWeight: 500 }}
        />
      </Modal>
    </div>
  );
}
