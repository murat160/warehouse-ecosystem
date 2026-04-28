import { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { ClipboardList, Download, X, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { useAuth } from '../../contexts/AuthContext';
import {
  LEGAL_DOCS, LEGAL_DOC_KIND_LABELS, LEGAL_DOC_STATUS,
  getCase, type LegalDoc, type DocStatus,
} from '../../data/legal-mock';

function downloadDoc(d: LegalDoc) {
  if (d.url) {
    const a = document.createElement('a');
    a.href = d.url; a.download = d.filename;
    document.body.appendChild(a); a.click(); a.remove();
  } else {
    const blob = new Blob([`# ${d.filename}\n${LEGAL_DOC_KIND_LABELS[d.kind]}\n${d.uploadedBy} · ${d.uploadedAt}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${d.filename}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  toast.success(`Скачан: ${d.filename}`);
}

export function LegalDocuments() {
  const { hasPermission, user } = useAuth();
  const canUpload   = hasPermission('legal.documents.request') || hasPermission('legal.contracts.manage');
  const canApprove  = canUpload;
  const canDownload = hasPermission('legal.reports.export') || canUpload;

  const [, force]   = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | DocStatus>('all');
  const [preview, setPreview] = useState<LegalDoc | null>(null);

  const stats = useMemo(() => ({
    total:    LEGAL_DOCS.length,
    uploaded: LEGAL_DOCS.filter(d => d.status === 'uploaded').length,
    verified: LEGAL_DOCS.filter(d => d.status === 'verified').length,
    rejected: LEGAL_DOCS.filter(d => d.status === 'rejected').length,
  }), []);

  const filtered = useMemo(() => LEGAL_DOCS.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.filename.toLowerCase().includes(q) || (d.caseId ?? '').toLowerCase().includes(q);
    const mst = filter === 'all' || d.status === filter;
    return ms && mst;
  }), [search, filter]);

  function setStatus(d: LegalDoc, s: DocStatus) {
    if (!canApprove) return;
    d.status = s;
    const c = d.caseId ? getCase(d.caseId) : undefined;
    if (c) c.audit.unshift({ at: new Date().toLocaleString('ru-RU'), actor: user?.name ?? 'op', role: user?.role ?? 'op', action: `Документ ${d.filename} → ${LEGAL_DOC_STATUS[s].label}` });
    force(x => x + 1);
    toast.success(`Документ: ${LEGAL_DOC_STATUS[s].label}`);
  }

  async function uploadFile(file: File) {
    if (!canUpload) return;
    const url = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result || ''));
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    LEGAL_DOCS.unshift({
      docId: `lg-doc-${Date.now()}`, kind: 'evidence_doc',
      filename: file.name, uploadedBy: user?.name ?? 'op',
      uploadedAt: new Date().toLocaleString('ru-RU'), status: 'uploaded', url,
    });
    force(x => x + 1);
    toast.success(`Загружено: ${file.name}`);
  }

  const rows: PlaceholderRow[] = filtered.map(d => {
    const ds = LEGAL_DOC_STATUS[d.status];
    return {
      id: d.docId, _doc: d,
      filename: <p className="font-semibold">{d.filename}</p>,
      kind: <span className="text-xs">{LEGAL_DOC_KIND_LABELS[d.kind]}</span>,
      uploadedBy: d.uploadedBy,
      uploadedAt: <span className="text-[10px] text-gray-500">{d.uploadedAt}</span>,
      caseId: d.caseId ?? '—',
      status: <span className={`inline-flex w-fit px-1.5 py-0 rounded text-[10px] font-bold ${ds.cls}`}>{ds.label}</span>,
    };
  });

  return (
    <>
      <ModulePlaceholder
        permKey="legal.documents"
        icon={ClipboardList}
        section="Юридический"
        title="Юридические документы"
        subtitle="Договоры, претензии, ответы, акты, фото-доказательства, документы продавцов / клиентов / заказов."
        kpis={[
          { label: 'Всего',     value: stats.total,    color: 'blue',   active: filter === 'all',      onClick: () => setFilter('all') },
          { label: 'Загружены', value: stats.uploaded, color: 'amber',  active: filter === 'uploaded', onClick: () => setFilter(filter === 'uploaded' ? 'all' : 'uploaded') },
          { label: 'Проверены', value: stats.verified, color: 'green',  active: filter === 'verified', onClick: () => setFilter(filter === 'verified' ? 'all' : 'verified') },
          { label: 'Отклонены', value: stats.rejected, color: 'red',    active: filter === 'rejected', onClick: () => setFilter(filter === 'rejected' ? 'all' : 'rejected') },
        ]}
        columns={[
          { key: 'filename',   label: 'Файл' },
          { key: 'kind',       label: 'Тип' },
          { key: 'uploadedBy', label: 'Кем загружен' },
          { key: 'uploadedAt', label: 'Когда' },
          { key: 'caseId',     label: 'Дело' },
          { key: 'status',     label: 'Статус' },
        ]}
        rows={rows}
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={r => setPreview(r._doc as LegalDoc)}
        onCreate={undefined}
        hideCreate
        headerExtra={
          canUpload ? (
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold cursor-pointer">
              <Upload className="w-4 h-4" />Загрузить документ
              <input type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
            </label>
          ) : null
        }
      />

      {/* Preview modal */}
      {preview && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-500">{LEGAL_DOC_KIND_LABELS[preview.kind]}</p>
                <p className="font-bold text-gray-900">{preview.filename}</p>
                <p className="text-xs text-gray-500 mt-0.5">{preview.uploadedBy} · {preview.uploadedAt}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                {preview.url ? (
                  /\.(jpg|jpeg|png|webp)$/i.test(preview.filename) ? (
                    <img src={preview.url} alt={preview.filename} className="max-w-full mx-auto rounded-lg" />
                  ) : (
                    <p className="text-sm text-gray-600">Превью недоступно для этого формата. Используйте «Скачать».</p>
                  )
                ) : (
                  <p className="text-sm text-gray-500 italic">Mock документ — содержимое будет доступно после интеграции backend.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between bg-gray-50 rounded px-2 py-1.5"><span className="text-gray-500">Статус</span><span className={`font-bold ${LEGAL_DOC_STATUS[preview.status].cls} px-1.5 py-0 rounded text-[10px]`}>{LEGAL_DOC_STATUS[preview.status].label}</span></div>
                <div className="flex justify-between bg-gray-50 rounded px-2 py-1.5"><span className="text-gray-500">Дело</span><span className="font-semibold">{preview.caseId ?? '—'}</span></div>
              </div>
              {preview.comment && <p className="text-xs text-gray-600 italic">{preview.comment}</p>}
            </div>
            <div className="px-6 py-3 border-t bg-gray-50 flex gap-2">
              {canDownload && (
                <button onClick={() => downloadDoc(preview)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">
                  <Download className="w-3.5 h-3.5" />Скачать
                </button>
              )}
              {canApprove && preview.status !== 'verified' && (
                <button onClick={() => { setStatus(preview, 'verified'); setPreview({ ...preview, status: 'verified' }); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />Одобрить
                </button>
              )}
              {canApprove && preview.status !== 'rejected' && (
                <button onClick={() => { setStatus(preview, 'rejected'); setPreview({ ...preview, status: 'rejected' }); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold">
                  Отклонить
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
