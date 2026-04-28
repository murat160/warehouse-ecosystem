/**
 * LegalCaseDrawer — single right-side drawer that renders any of the 4
 * legal case kinds (contract / claim / dispute / complaint).
 *
 * Real actions (all change in-memory state, write audit, show toast):
 *   - Принять в работу       → status='in_progress'
 *   - Запросить документы    → status='awaiting_docs'
 *   - Изменить статус        → status switcher
 *   - Закрыть дело           → status='closed' / 'resolved' / 'rejected'
 *   - Добавить комментарий   → push to case.comments
 *   - Загрузить документ     → push to LEGAL_DOCS + case.documents
 *   - Скачать документ       → triggers a real download
 *   - Экспорт PDF/CSV        → CSV download via exportToCsv
 *   - Открыть продавца       → router navigate
 */
import { useState } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  X, FileText, Upload, Download, Send, CheckCircle2, History, MessageSquare,
  Pencil, ArrowRight, ExternalLink, Lock, Trash2, AlertTriangle, BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Locked } from '../rbac/PermissionLock';
import { exportToCsv } from '../../utils/downloads';
import {
  CASE_KIND_LABELS, CASE_STATUS_LABELS, LEGAL_DOC_KIND_LABELS, LEGAL_DOC_STATUS,
  LEGAL_DOCS, getDoc, pushAudit, pushComment,
  type LegalCase, type LegalDoc, type CaseStatus, type DocStatus,
} from '../../data/legal-mock';

interface Props {
  caseObj: LegalCase;
  onClose: () => void;
  /** Notify parent that data changed (re-render its list). */
  onChange: () => void;
}

const STATUS_OPTIONS: CaseStatus[] = [
  'draft', 'open', 'in_progress', 'awaiting_docs',
  'pending_signature', 'in_court', 'resolved', 'closed', 'rejected', 'expired',
];

function downloadFile(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function LegalCaseDrawer({ caseObj, onClose, onChange }: Props) {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();

  // Permissions are fairly permissive when the user has wildcard;
  // legal.* prefix is checked otherwise.
  const canEdit     = hasPermission('legal.contracts.manage')
                   || hasPermission('legal.claims.manage')
                   || hasPermission('legal.disputes.resolve')
                   || hasPermission('legal.documents.request');
  const canUpload   = hasPermission('legal.documents.request') || canEdit;
  const canDownload = hasPermission('legal.documents.request') || hasPermission('legal.reports.export') || canEdit;

  const [commentText, setCommentText] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);

  const cs = CASE_STATUS_LABELS[caseObj.status];
  const docs: LegalDoc[] = caseObj.documents
    .map(id => getDoc(id))
    .filter((d): d is LegalDoc => !!d);

  function changeStatus(s: CaseStatus, message?: string) {
    if (!canEdit) return;
    caseObj.status = s;
    if (s === 'closed' || s === 'resolved' || s === 'rejected') caseObj.closedAt = new Date().toLocaleString('ru-RU');
    pushAudit(caseObj, message ?? `Статус: ${CASE_STATUS_LABELS[s].label}`, user?.name ?? 'op', user?.role ?? 'op');
    onChange();
    toast.success(message ?? `Статус: ${CASE_STATUS_LABELS[s].label}`);
  }

  function takeOwnership() {
    if (!canEdit) return;
    caseObj.responsible = user?.name ?? 'op';
    caseObj.status = 'in_progress';
    pushAudit(caseObj, `Принял в работу: ${user?.name ?? 'op'}`, user?.name ?? 'op', user?.role ?? 'op');
    onChange();
    toast.success(`«${caseObj.number}» в вашей работе`);
  }

  function requestDocs() {
    if (!canUpload) return;
    caseObj.status = 'awaiting_docs';
    pushAudit(caseObj, 'Запрошены документы', user?.name ?? 'op', user?.role ?? 'op');
    onChange();
    toast.success('Запрос документов отправлен');
  }

  async function uploadDoc(file: File) {
    if (!canUpload) return;
    const url = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result || ''));
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    const doc: LegalDoc = {
      docId: `lg-doc-${Date.now()}`,
      caseId: caseObj.caseId,
      kind: 'evidence_doc',
      filename: file.name,
      uploadedBy: user?.name ?? 'op',
      uploadedAt: new Date().toLocaleString('ru-RU'),
      status: 'uploaded',
      url,
    };
    LEGAL_DOCS.unshift(doc);
    caseObj.documents.unshift(doc.docId);
    pushAudit(caseObj, `Загружен документ: ${file.name}`, user?.name ?? 'op', user?.role ?? 'op');
    onChange();
    toast.success(`Загружено: ${file.name}`);
  }

  function downloadDoc(d: LegalDoc) {
    if (!canDownload) return;
    if (d.url) {
      const a = document.createElement('a');
      a.href = d.url; a.download = d.filename;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success(`Скачано: ${d.filename}`);
      return;
    }
    // Mock placeholder
    downloadFile(`${d.filename}.txt`,
      `# ${d.filename}\nТип: ${LEGAL_DOC_KIND_LABELS[d.kind]}\nЗагружен: ${d.uploadedBy} · ${d.uploadedAt}\nСтатус: ${LEGAL_DOC_STATUS[d.status].label}\n`);
    toast.success(`Скачаны метаданные: ${d.filename}.txt`);
  }

  function approveDoc(d: LegalDoc, status: DocStatus) {
    if (!canEdit) return;
    d.status = status;
    pushAudit(caseObj, `Документ ${d.filename} → ${LEGAL_DOC_STATUS[status].label}`, user?.name ?? 'op', user?.role ?? 'op');
    onChange();
    toast.success(`Документ: ${LEGAL_DOC_STATUS[status].label}`);
  }

  function removeDoc(docId: string) {
    if (!canEdit) return;
    caseObj.documents = caseObj.documents.filter(id => id !== docId);
    pushAudit(caseObj, `Документ удалён`, user?.name ?? 'op', user?.role ?? 'op');
    onChange();
    toast.success('Документ удалён');
  }

  function addComment() {
    if (!canEdit) return;
    if (!commentText.trim()) return;
    pushComment(caseObj, commentText.trim(), user?.name ?? 'op', user?.role ?? 'op');
    pushAudit(caseObj, 'Добавлен комментарий', user?.name ?? 'op', user?.role ?? 'op');
    setCommentText('');
    onChange();
    toast.success('Комментарий добавлен');
  }

  function exportPdfMock() {
    downloadFile(`${caseObj.number}.pdf.txt`,
      `LEGAL CASE ${caseObj.number}\n\n` +
      `Тип: ${CASE_KIND_LABELS[caseObj.kind]}\n` +
      `Статус: ${CASE_STATUS_LABELS[caseObj.status].label}\n` +
      `Открыто: ${caseObj.startedAt}\n` +
      (caseObj.closedAt ? `Закрыто: ${caseObj.closedAt}\n` : '') +
      `Партнёр: ${caseObj.partner ?? '—'}\n` +
      `Тема: ${caseObj.subject}\n` +
      (caseObj.description ? `Описание: ${caseObj.description}\n` : '') +
      (caseObj.amount != null ? `Сумма: ${caseObj.amount} ${caseObj.currency ?? ''}\n` : '') +
      `\n--- ДОКУМЕНТЫ (${docs.length}) ---\n` +
      docs.map(d => `· ${d.filename} (${LEGAL_DOC_KIND_LABELS[d.kind]}, ${LEGAL_DOC_STATUS[d.status].label})`).join('\n') +
      `\n\n--- AUDIT (${caseObj.audit.length}) ---\n` +
      caseObj.audit.map(a => `${a.at} · ${a.actor} (${a.role}) · ${a.action}`).join('\n')
    );
    toast.success(`PDF (mock): ${caseObj.number}.pdf.txt`);
  }

  function exportCsv() {
    exportToCsv([{
      number: caseObj.number, kind: CASE_KIND_LABELS[caseObj.kind],
      subject: caseObj.subject, status: CASE_STATUS_LABELS[caseObj.status].label,
      partner: caseObj.partner ?? '', amount: caseObj.amount ?? '',
      currency: caseObj.currency ?? '', startedAt: caseObj.startedAt,
      closedAt: caseObj.closedAt ?? '', responsible: caseObj.responsible ?? '',
      documents: docs.map(d => d.filename).join(' | '),
    }] as any[], [
      { key: 'number',      label: '№' },
      { key: 'kind',        label: 'Тип' },
      { key: 'subject',     label: 'Тема' },
      { key: 'status',      label: 'Статус' },
      { key: 'partner',     label: 'Сторона' },
      { key: 'amount',      label: 'Сумма' },
      { key: 'currency',    label: 'Валюта' },
      { key: 'startedAt',   label: 'Открыто' },
      { key: 'closedAt',    label: 'Закрыто' },
      { key: 'responsible', label: 'Ответственный' },
      { key: 'documents',   label: 'Документы' },
    ], `legal-${caseObj.number}`);
    toast.success(`CSV: ${caseObj.number}`);
  }

  const partnerLink =
    caseObj.partnerType === 'merchant' && caseObj.partnerId ? `/merchants/${caseObj.partnerId}` :
    caseObj.partnerType === 'customer' ? `/users` :
    null;

  const node = (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-end bg-gray-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-3xl flex flex-col h-full" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider">{CASE_KIND_LABELS[caseObj.kind]}</p>
            <p className="font-bold text-gray-900 truncate">{caseObj.number} · {caseObj.subject}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {!editingStatus ? (
                <button onClick={() => canEdit && setEditingStatus(true)}
                  className={`px-1.5 py-0 rounded text-[9px] font-bold ${cs.cls} ${canEdit ? 'cursor-pointer hover:ring-2 hover:ring-current/40' : ''}`}>
                  {cs.label}{canEdit && <Pencil className="w-2.5 h-2.5 inline ml-1" />}
                </button>
              ) : (
                <select value={caseObj.status}
                  onChange={e => { changeStatus(e.target.value as CaseStatus); setEditingStatus(false); }}
                  onBlur={() => setEditingStatus(false)} autoFocus
                  className="px-2 py-0.5 border border-gray-200 rounded text-xs">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{CASE_STATUS_LABELS[s].label}</option>)}
                </select>
              )}
              <span className="text-[10px] text-gray-400">{caseObj.startedAt}</span>
              {caseObj.responsible && <span className="text-[10px] text-blue-700">Ответственный: {caseObj.responsible}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Закрыть"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-blue-700 mb-1">Сторона</p>
              <p className="text-sm font-bold text-gray-900">{caseObj.partner ?? '—'}</p>
              {caseObj.partnerType && <p className="text-xs text-gray-500">{caseObj.partnerType}</p>}
              {partnerLink && (
                <Link to={partnerLink} className="text-xs text-blue-700 hover:underline mt-1 inline-flex items-center gap-1">
                  Открыть профиль <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
            {(caseObj.amount != null) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-green-700 mb-1">Сумма</p>
                <p className="text-2xl font-bold text-green-700">{caseObj.amount.toLocaleString('ru-RU')} {caseObj.currency ?? ''}</p>
              </div>
            )}
            {caseObj.orderId && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-amber-700 mb-1">Связанный заказ</p>
                <Link to={`/orders/${caseObj.orderId}`} className="text-sm font-mono font-bold text-amber-800 hover:underline inline-flex items-center gap-1">
                  {caseObj.orderId} <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
            {caseObj.expiresAt && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-rose-700 mb-1">Срок действия</p>
                <p className="text-sm font-bold text-gray-900">{caseObj.expiresAt}</p>
              </div>
            )}
          </section>

          {caseObj.description && (
            <section>
              <p className="text-xs font-bold text-gray-700 mb-1">Описание</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">{caseObj.description}</p>
            </section>
          )}

          {/* Quick actions */}
          <section className="flex flex-wrap gap-2">
            <Locked perm="legal.disputes.resolve">
              <button onClick={takeOwnership} disabled={!canEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold">
                <BadgeCheck className="w-3.5 h-3.5" />Принять в работу
              </button>
            </Locked>
            <Locked perm="legal.documents.request">
              <button onClick={requestDocs} disabled={!canUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 disabled:opacity-50 text-orange-700 rounded-lg text-xs font-semibold">
                <Send className="w-3.5 h-3.5" />Запросить документы
              </button>
            </Locked>
            <Locked perm="legal.disputes.resolve">
              <button onClick={() => changeStatus('resolved', 'Урегулировано')} disabled={!canEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 disabled:opacity-50 text-green-700 rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />Урегулировано
              </button>
            </Locked>
            <Locked perm="legal.disputes.resolve">
              <button onClick={() => changeStatus('closed', 'Закрыто')} disabled={!canEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-lg text-xs font-semibold">
                Закрыть дело
              </button>
            </Locked>
            <button onClick={exportPdfMock} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-xs">
              <Download className="w-3.5 h-3.5" />PDF
            </button>
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-xs">
              <Download className="w-3.5 h-3.5" />CSV
            </button>
            {partnerLink && (
              <button onClick={() => { onClose(); navigate(partnerLink!); }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                <ExternalLink className="w-3.5 h-3.5" />Открыть {caseObj.partnerType === 'customer' ? 'клиента' : 'продавца'}
              </button>
            )}
          </section>

          {/* Documents */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Документы ({docs.length})</p>
              <Locked perm="legal.documents.request">
                <label className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer ${canUpload ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                  <Upload className="w-3 h-3" />Загрузить
                  <input type="file" hidden disabled={!canUpload}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }} />
                </label>
              </Locked>
            </div>
            {docs.length === 0 ? (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />Документов нет.
              </div>
            ) : (
              <div className="space-y-1">
                {docs.map(d => {
                  const ds = LEGAL_DOC_STATUS[d.status];
                  return (
                    <div key={d.docId} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs">
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{d.filename}</p>
                        <p className="text-[10px] text-gray-500 truncate">{LEGAL_DOC_KIND_LABELS[d.kind]} · {d.uploadedBy} · {d.uploadedAt}</p>
                      </div>
                      <span className={`px-1.5 py-0 rounded text-[9px] font-bold ${ds.cls}`}>{ds.label}</span>
                      {canDownload && (
                        <button onClick={() => downloadDoc(d)} className="p-1 hover:bg-gray-200 rounded text-gray-500" title="Скачать">
                          <Download className="w-3 h-3" />
                        </button>
                      )}
                      {canEdit && d.status !== 'verified' && (
                        <button onClick={() => approveDoc(d, 'verified')} className="p-1 hover:bg-green-100 text-green-700 rounded" title="Одобрить">
                          <CheckCircle2 className="w-3 h-3" />
                        </button>
                      )}
                      {canEdit && d.status !== 'rejected' && (
                        <button onClick={() => approveDoc(d, 'rejected')} className="p-1 hover:bg-red-100 text-red-700 rounded" title="Отклонить">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => removeDoc(d.docId)} className="p-1 hover:bg-gray-200 rounded text-gray-500" title="Удалить">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Comments */}
          <section>
            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Комментарии ({caseObj.comments.length})</p>
            {canEdit && (
              <div className="flex gap-2 mb-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                  placeholder="Добавить комментарий..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={addComment} disabled={!commentText.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
                  Отправить
                </button>
              </div>
            )}
            <div className="space-y-1">
              {caseObj.comments.map((c, i) => (
                <div key={i} className="px-3 py-2 bg-gray-50 rounded-lg text-xs">
                  <p className="text-gray-800">{c.text}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{c.actor} <span className="font-mono">({c.role})</span> · {c.at}</p>
                </div>
              ))}
              {caseObj.comments.length === 0 && (
                <p className="text-xs text-gray-400 italic">Пока нет комментариев</p>
              )}
            </div>
          </section>

          {/* Audit history */}
          <section>
            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Audit ({caseObj.audit.length})</p>
            <div className="space-y-1">
              {caseObj.audit.map((e, i) => (
                <div key={i} className="px-3 py-1.5 text-[11px] text-gray-700">
                  <span className="font-semibold">{e.actor}</span> ({e.role}) · {e.at} · {e.action}
                </div>
              ))}
            </div>
          </section>

          {!canEdit && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Read-only. Действия станут активны после получения прав <span className="font-mono">legal.*.manage</span> / <span className="font-mono">legal.documents.request</span>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}
