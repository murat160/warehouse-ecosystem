import { useState } from 'react';
import { FileText, Download, Eye, CheckCircle2, XCircle, Upload, Search as SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { DOCUMENT_KIND_LABELS } from '../domain/types';
import type { DocumentKind, DocumentStatus } from '../domain/types';

const STATUS_COLOR: Record<DocumentStatus, string> = {
  draft:    '#94A3B8',
  pending:  '#F59E0B',
  approved: '#16A34A',
  rejected: '#EF4444',
  expired:  '#6B7280',
};
const STATUS_LABEL: Record<DocumentStatus, string> = {
  draft:    'Черновик',
  pending:  'На проверке',
  approved: 'Одобрен',
  rejected: 'Отклонён',
  expired:  'Просрочен',
};

export function DocumentsPage() {
  const { documents } = useStore();
  const [kindFilter, setKindFilter] = useState<DocumentKind | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [upload, setUpload] = useState<{ kind: DocumentKind; title: string }>({ kind: 'batch_acceptance', title: '' });

  const filtered = documents.filter(d => {
    if (kindFilter !== 'all' && d.kind !== kindFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!d.title.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const previewDoc = documents.find(d => d.id === previewId) ?? null;

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Документы"
        subtitle={`${documents.length} всего`}
        right={
          <button onClick={() => setUploadOpen(true)} className="px-3 h-9 rounded-lg bg-white text-[#1F2430] text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}>
            <Upload className="w-3 h-3" /> Загрузить
          </button>
        }
      />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <SearchIcon className="w-4 h-4 text-[#9CA3AF]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию / ID" className="flex-1 outline-none text-[13px]" />
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            <select value={kindFilter} onChange={e => setKindFilter(e.target.value as any)} className="border border-[#E5E7EB] rounded-xl h-9 px-2 text-[12px]">
              <option value="all">Все типы</option>
              {(Object.entries(DOCUMENT_KIND_LABELS) as [DocumentKind, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="border border-[#E5E7EB] rounded-xl h-9 px-2 text-[12px]">
              <option value="all">Все статусы</option>
              {(Object.entries(STATUS_LABEL) as [DocumentStatus, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Документов нет" subtitle="Сбросьте фильтры или загрузите новый" icon={<FileText className="w-5 h-5" />} />
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-[#F9FAFB] text-[10px] text-[#6B7280] uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Документ</th>
                  <th className="text-left px-3 py-2">Тип</th>
                  <th className="text-left px-3 py-2">Связь</th>
                  <th className="text-left px-3 py-2">Статус</th>
                  <th className="text-left px-3 py-2">Дата</th>
                  <th className="text-right px-3 py-2">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-t border-[#F3F4F6]">
                    <td className="px-3 py-2.5 text-[#1F2430]" style={{ fontWeight: 800 }}>
                      {d.title}
                      <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 500 }}>{d.id} · {d.size ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 text-[#374151]">{DOCUMENT_KIND_LABELS[d.kind]}</td>
                    <td className="px-3 py-2.5 text-[#374151]">
                      {d.orderId ?? d.returnId ?? d.problemId ?? d.batchId ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] text-white" style={{ backgroundColor: STATUS_COLOR[d.status], fontWeight: 800 }}>
                        {STATUS_LABEL[d.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[#6B7280]">{fmt(d.uploadedAt)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => setPreviewId(d.id)} className="text-[#0EA5E9] mr-2 active-press" title="Просмотр"><Eye className="w-4 h-4 inline" /></button>
                      <button onClick={() => { store.downloadDocument(d.id); toast.success('Скачивание начато'); }} className="text-[#374151] mr-2 active-press" title="Скачать"><Download className="w-4 h-4 inline" /></button>
                      {d.status === 'pending' && (
                        <>
                          <button onClick={() => { store.approveDocument(d.id); toast.success('Документ одобрен'); }} className="text-[#16A34A] mr-2 active-press" title="Одобрить"><CheckCircle2 className="w-4 h-4 inline" /></button>
                          <button onClick={() => { setRejectId(d.id); }} className="text-[#EF4444] active-press" title="Отклонить"><XCircle className="w-4 h-4 inline" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!previewDoc}
        onClose={() => setPreviewId(null)}
        title={previewDoc?.title ?? ''}
        wide
        footer={
          previewDoc ? (
            <>
              <button onClick={() => setPreviewId(null)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Закрыть</button>
              <button
                onClick={() => { store.downloadDocument(previewDoc.id); toast.success('Скачивание начато'); }}
                className="px-4 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}
              >
                <Download className="w-3 h-3" /> Скачать
              </button>
            </>
          ) : null
        }
      >
        {previewDoc && (
          <div className="space-y-3">
            <div className="aspect-video bg-[#F3F4F6] rounded-xl flex items-center justify-center">
              <div className="text-center text-[#6B7280]">
                <FileText className="w-12 h-12 mx-auto mb-2" />
                <div className="text-[12px]">[Mock] Превью документа {previewDoc.id}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Cube k="Тип" v={DOCUMENT_KIND_LABELS[previewDoc.kind]} />
              <Cube k="Статус" v={STATUS_LABEL[previewDoc.status]} />
              <Cube k="Размер" v={previewDoc.size ?? '—'} />
              <Cube k="Загружен" v={fmt(previewDoc.uploadedAt)} />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Загрузить документ"
        footer={
          <>
            <button onClick={() => setUploadOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!upload.title.trim()) { toast.error('Введите название'); return; }
                store.uploadDocument({ kind: upload.kind, title: upload.title.trim(), size: '128 KB' });
                toast.success('Документ загружен');
                setUploadOpen(false);
                setUpload({ kind: 'batch_acceptance', title: '' });
              }}
              className="px-4 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >
              <Upload className="w-3 h-3 inline mr-1" /> Загрузить
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Тип">
            <select value={upload.kind} onChange={e => setUpload({ ...upload, kind: e.target.value as DocumentKind })}
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-2 text-[13px]">
              {(Object.entries(DOCUMENT_KIND_LABELS) as [DocumentKind, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Название">
            <input value={upload.title} onChange={e => setUpload({ ...upload, title: e.target.value })} placeholder="Например: Акт приёмки от 30.04"
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" />
          </Field>
          <div className="rounded-xl bg-[#F9FAFB] p-4 text-center text-[12px] text-[#6B7280]">
            [Mock] Здесь был бы file picker
          </div>
        </div>
      </Modal>

      <Modal
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        title="Отклонить документ"
        footer={
          <>
            <button onClick={() => setRejectId(null)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!rejectId || !rejectReason.trim()) { toast.error('Укажите причину'); return; }
                store.rejectDocument(rejectId, rejectReason.trim());
                toast('Документ отклонён');
                setRejectId(null);
                setRejectReason('');
              }}
              className="px-4 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Отклонить</button>
          </>
        }
      >
        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Причина" className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[13px]" />
      </Modal>
    </div>
  );
}

function Cube({ k, v }: { k: string; v: any }) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] p-2">
      <div className="text-[10px] text-[#6B7280] uppercase" style={{ fontWeight: 800 }}>{k}</div>
      <div className="text-[12px] text-[#1F2430] mt-0.5" style={{ fontWeight: 800 }}>{v}</div>
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
function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}
