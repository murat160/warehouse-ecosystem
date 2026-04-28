/**
 * AccountingItemDrawer — drawer for any accounting item (reconciliation /
 * report / export / tax_doc / invoice). Real actions:
 *  - Mark reviewed / closed / paid / discrepancy
 *  - Download CSV (single-row export)
 *  - Add comment-like audit entry
 *  - Upload document (mock: pushed into item.documents)
 */
import { useState } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'sonner';
import {
  X, Download, Upload, CheckCircle2, History, FileText, AlertTriangle,
  BadgeCheck, Lock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { exportToCsv } from '../../utils/downloads';
import {
  ACCT_KIND_LABELS, ACCT_STATUS_LABELS, pushAudit,
  type AcctItem, type AcctStatus,
} from '../../data/accounting-mock';

interface Props {
  item:    AcctItem;
  permKey: string;            // e.g. 'accounting.reconciliations'
  onClose: () => void;
  onChange: () => void;
}

const NEXT_STATUSES: AcctStatus[] = [
  'draft', 'in_progress', 'reviewed', 'closed',
  'discrepancy', 'submitted', 'paid', 'overdue', 'cancelled', 'ready',
];

export function AccountingItemDrawer({ item, permKey, onClose, onChange }: Props) {
  const { hasPermission, user } = useAuth();
  const canManage  = hasPermission(`${permKey}.manage`)
                  || hasPermission(`${permKey}.edit`)
                  || hasPermission('accounting.invoices.manage')
                  || hasPermission('accounting.payouts.approve');
  const canExport  = hasPermission(`${permKey}.export`)
                  || hasPermission('accounting.reports.export');
  const canUpload  = canManage;

  const cs = ACCT_STATUS_LABELS[item.status];
  const [editingStatus, setEditingStatus] = useState(false);
  const [note, setNote] = useState('');

  function setStatus(s: AcctStatus) {
    if (!canManage) return;
    item.status = s;
    pushAudit(item, `Статус: ${ACCT_STATUS_LABELS[s].label}`, user?.name ?? 'op', user?.role ?? 'op');
    onChange();
    toast.success(`Статус: ${ACCT_STATUS_LABELS[s].label}`);
  }

  function exportRow() {
    exportToCsv([{
      number: item.number, kind: ACCT_KIND_LABELS[item.kind],
      subject: item.subject, period: item.period ?? '',
      partner: item.partner ?? '',
      amount: item.amount ?? '', currency: item.currency ?? '',
      paid: item.paid ?? '', due: item.due ?? '',
      status: ACCT_STATUS_LABELS[item.status].label,
    }] as any[], [
      { key: 'number',   label: '№' },
      { key: 'kind',     label: 'Тип' },
      { key: 'subject',  label: 'Предмет' },
      { key: 'period',   label: 'Период' },
      { key: 'partner',  label: 'Партнёр' },
      { key: 'amount',   label: 'Сумма' },
      { key: 'currency', label: 'Валюта' },
      { key: 'paid',     label: 'Оплачено' },
      { key: 'due',      label: 'К оплате' },
      { key: 'status',   label: 'Статус' },
    ], `acct-${item.number}`);
    toast.success(`CSV: ${item.number}`);
  }

  async function uploadDoc(file: File) {
    if (!canUpload) return;
    const id = `acct-doc-${Date.now()}`;
    item.documents.unshift(id);
    pushAudit(item, `Загружен документ: ${file.name}`, user?.name ?? 'op', user?.role ?? 'op');
    onChange();
    toast.success(`Загружено: ${file.name}`);
  }

  function addNote() {
    if (!canManage || !note.trim()) return;
    pushAudit(item, `Комментарий: ${note.trim()}`, user?.name ?? 'op', user?.role ?? 'op');
    setNote('');
    onChange();
    toast.success('Заметка сохранена');
  }

  const node = (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-end bg-gray-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-2xl flex flex-col h-full" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b shrink-0 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider">{ACCT_KIND_LABELS[item.kind]}</p>
            <p className="font-bold text-gray-900 truncate">{item.number}</p>
            <p className="text-xs text-gray-600">{item.subject}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {!editingStatus ? (
                <button onClick={() => canManage && setEditingStatus(true)}
                  className={`px-1.5 py-0 rounded text-[9px] font-bold ${cs.cls} ${canManage ? 'cursor-pointer hover:ring-2 hover:ring-current/40' : ''}`}>
                  {cs.label}
                </button>
              ) : (
                <select value={item.status} autoFocus
                  onBlur={() => setEditingStatus(false)}
                  onChange={e => { setStatus(e.target.value as AcctStatus); setEditingStatus(false); }}
                  className="px-2 py-0.5 border border-gray-200 rounded text-xs">
                  {NEXT_STATUSES.map(s => <option key={s} value={s}>{ACCT_STATUS_LABELS[s].label}</option>)}
                </select>
              )}
              {item.period && <span className="text-[10px] text-gray-500">{item.period}</span>}
              {item.responsible && <span className="text-[10px] text-blue-700">Ответственный: {item.responsible}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Закрыть"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary */}
          <section className="grid grid-cols-2 gap-3">
            {item.partner && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-blue-700 mb-1">Партнёр</p>
                <p className="text-sm font-bold text-gray-900">{item.partner}</p>
              </div>
            )}
            {item.amount != null && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-green-700 mb-1">Сумма</p>
                <p className="text-2xl font-bold text-green-700">{item.amount.toLocaleString('ru-RU')} {item.currency ?? ''}</p>
                {item.paid != null && (
                  <p className="text-[10px] text-gray-500 mt-1">Оплачено: {item.paid.toLocaleString('ru-RU')}</p>
                )}
              </div>
            )}
            {item.period && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-amber-700 mb-1">Период</p>
                <p className="text-sm font-bold">{item.period}</p>
              </div>
            )}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Документов</p>
              <p className="text-sm font-bold">{item.documents.length}</p>
            </div>
          </section>

          {item.description && (
            <section>
              <p className="text-xs font-bold text-gray-700 mb-1">Описание</p>
              <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 border border-gray-100">{item.description}</p>
            </section>
          )}

          {/* Quick actions */}
          <section className="flex flex-wrap gap-2">
            {item.kind === 'reconciliation' && canManage && (
              <>
                <button onClick={() => setStatus('reviewed')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold">
                  <BadgeCheck className="w-3.5 h-3.5" />Отметить «Проверено»
                </button>
                <button onClick={() => setStatus('discrepancy')} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />Расхождение
                </button>
                <button onClick={() => setStatus('closed')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />Закрыть
                </button>
              </>
            )}
            {item.kind === 'tax_doc' && canManage && (
              <>
                <button onClick={() => setStatus('submitted')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold">
                  Подан в ФНС
                </button>
                <button onClick={() => setStatus('paid')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />Оплачен
                </button>
              </>
            )}
            {(item.kind === 'report' || item.kind === 'export') && (
              <button onClick={() => setStatus('ready')} disabled={!canManage}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 disabled:opacity-50 text-green-700 rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />Отметить готовым
              </button>
            )}
            <button onClick={exportRow} disabled={!canExport}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 rounded-lg text-xs">
              <Download className="w-3.5 h-3.5" />CSV
            </button>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${canUpload ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              <Upload className="w-3.5 h-3.5" />Документ
              <input type="file" hidden disabled={!canUpload}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }} />
            </label>
          </section>

          {/* Note input */}
          {canManage && (
            <section>
              <p className="text-xs font-bold text-gray-700 mb-2">Заметка / комментарий</p>
              <div className="flex gap-2">
                <input value={note} onChange={e => setNote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
                  placeholder="Добавить заметку..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={addNote} disabled={!note.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
                  +
                </button>
              </div>
            </section>
          )}

          {/* Audit */}
          <section>
            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Audit ({item.audit.length})</p>
            <div className="space-y-1">
              {item.audit.map((e, i) => (
                <div key={i} className="px-3 py-1.5 text-[11px] text-gray-700">
                  <span className="font-semibold">{e.actor}</span> ({e.role}) · {e.at} · {e.action}
                </div>
              ))}
            </div>
          </section>

          {!canManage && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Read-only. Действия станут активны после получения <span className="font-mono">{permKey}.manage</span>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}
