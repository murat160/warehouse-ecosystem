import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import React from 'react';
import {
  FileText, Eye, Download, CheckCircle2, XCircle, RotateCcw,
  AlertTriangle, Clock, Shield, Search, ChevronDown,
  X, Send, Mail, AlertCircle, FileImage, File, Archive,
  CheckSquare, Square, Layers, Upload, User, Calendar,
  ExternalLink, Info, Ban, Zap, Trash2, RefreshCw,
  ShieldCheck, Building2, Store, MapPin, Bike, Users,
  Filter, ChevronRight,
} from 'lucide-react';
import {
  GLOBAL_COMPLIANCE_DOCS, GLOBAL_COMPLIANCE_AUDIT, getGlobalKPIs,
  OWNER_TYPE_LABELS, OWNER_TYPE_COLORS, REJECT_REASONS, daysUntilExpiry,
  type GlobalComplianceDoc, type GlobalAuditEntry, type GlobalAuditAction,
  type OwnerType,
} from '../../data/compliance-center-mock';
import { REVIEWERS, type RejectReason } from '../../data/compliance-mock';
import { addNotification } from '../../store/notificationsStore';
import { getDocs, subscribe as subscribeCompliance, type ComplianceDoc } from '../../store/complianceStore';
import { getDocPreview, subscribePreview } from '../../store/docPreviewStore';

// ── Bridge: ComplianceDoc (courier store) → GlobalComplianceDoc ───────────────

function bridgeCourierDoc(d: ComplianceDoc): GlobalComplianceDoc {
  return {
    id: d.id,
    owner_type: 'COURIER_FAST' as OwnerType,
    owner_id: d.courier_id,
    owner_name: d.courier_name,
    owner_email: d.courier_email,
    owner_avatar: d.courier_avatar,
    owner_blocked: d.courier_blocked,
    doc_name: d.doc_name,
    doc_type: d.doc_type,
    doc_type_label: d.doc_type_label,
    file_url: d.file_url,
    file_type: d.format,
    size: d.size,
    uploaded_by: d.uploaded_by ?? 'admin@pvz-platform.ru',
    uploaded_at: d.uploaded_at,
    issued_at: d.issued_at,
    expires_at: d.expires_at,
    status: d.status as GlobalComplianceDoc['status'],
    reviewed_by: d.reviewed_by,
    reviewed_by_label: d.reviewed_by_label,
    reviewed_at: d.reviewed_at,
    reviewer_role: d.reviewer_role,
    review_comment: null,
    reject_reason: d.reject_reason as GlobalComplianceDoc['reject_reason'],
    reject_comment: d.reject_comment,
    is_mandatory: d.is_mandatory ?? false,
    blocks_work: d.blocks_work ?? false,
    version: d.version ?? 1,
    notified_60: d.notified_60,
    notified_30: d.notified_30,
    notified_7: d.notified_7,
    notified_1: d.notified_1,
    previewUrl: d.previewUrl,  // ← preserve base64 data URL for image preview
  };
}

/** Merge live courier store docs with static seller/pvz/employee docs, no duplicates */
function buildMergedDocs(storeDocs: ComplianceDoc[]): GlobalComplianceDoc[] {
  const bridged = storeDocs.map(bridgeCourierDoc);
  const storeIds = new Set(bridged.map(d => d.id));
  // Static GLOBAL_COMPLIANCE_DOCS entries not covered by the store (seller/pvz/employee)
  const staticRest = GLOBAL_COMPLIANCE_DOCS.filter(d => !storeIds.has(d.id));
  return [...bridged, ...staticRest];
}

// ─── Types / Constants ────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending_review' | 'approved' | 'rejected' | 'expiring_soon' | 'expired';
type OwnerFilter  = 'all' | OwnerType;

type DocAction = 'view' | 'download' | 'approve' | 'reject' | 'reupload' | 'email' | 'delete' | 'replace';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all',           label: 'Все' },
  { id: 'pending_review',label: 'На проверке' },
  { id: 'approved',      label: 'Одобренные' },
  { id: 'rejected',      label: 'Отклонённые' },
  { id: 'expiring_soon', label: 'Истекают' },
  { id: 'expired',       label: 'Истекли' },
];

const OWNER_TABS: { id: OwnerFilter; label: string; icon: React.ElementType }[] = [
  { id: 'all',               label: 'Все источники', icon: ShieldCheck },
  { id: 'COURIER_FAST',      label: 'Курьеры Fast',  icon: Bike },
  { id: 'COURIER_WAREHOUSE', label: 'Курьеры Склад', icon: Building2 },
  { id: 'SELLER',            label: 'Продавцы',      icon: Store },
  { id: 'PVZ',               label: 'ПВЗ',           icon: MapPin },
  { id: 'EMPLOYEE',          label: 'Сотрудники',    icon: Users },
];

type ComplianceDocStatus = GlobalComplianceDoc['status'];

const STATUS_CFG: Record<ComplianceDocStatus, { label: string; badge: string; dot: string; icon: React.ReactNode }> = {
  draft:          { label: 'Черновик',    badge: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400',   icon: <File className="w-3 h-3" /> },
  uploaded:       { label: 'Загружен',    badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',   icon: <Upload className="w-3 h-3" /> },
  pending_review: { label: 'На проверке', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', icon: <Clock className="w-3 h-3" /> },
  approved:       { label: 'Одобрен',     badge: 'bg-green-100 text-green-700',   dot: 'bg-green-500',  icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:       { label: 'Отклонён',    badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500',    icon: <XCircle className="w-3 h-3" /> },
  expired:        { label: 'Истёк',       badge: 'bg-red-100 text-red-800',       dot: 'bg-red-600',    icon: <AlertCircle className="w-3 h-3" /> },
  expiring_soon:  { label: 'Истекает',    badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400',  icon: <AlertTriangle className="w-3 h-3" /> },
  replaced:       { label: 'Заменён',     badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400', icon: <RotateCcw className="w-3 h-3" /> },
};

const FORMAT_ICON: Record<string, React.ReactNode> = {
  pdf:  <FileText className="w-5 h-5 text-red-500" />,
  jpg:  <FileImage className="w-5 h-5 text-blue-500" />,
  png:  <FileImage className="w-5 h-5 text-indigo-500" />,
  webp: <FileImage className="w-5 h-5 text-teal-500" />,
  docx: <File className="w-5 h-5 text-blue-700" />,
  doc:  <File className="w-5 h-5 text-blue-600" />,
  zip:  <Archive className="w-5 h-5 text-yellow-600" />,
};

const AUDIT_ICON: Record<GlobalAuditAction, string> = {
  UPLOAD: '📁', REPLACE: '🔃', APPROVE: '✅', REJECT: '❌',
  REQUEST_REUPLOAD: '📤', DOWNLOAD: '⬇️', EMAIL_SENT: '📧',
  EXPIRY_CHECK: '⏰', VIEW: '👁', DELETE: '🗑️', STATUS_CHANGE: '🔄',
};

function nowTs() {
  return new Date().toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Owner Badge ──────────────────────────────────────────────────────────────

function OwnerBadge({ type }: { type: OwnerType }) {
  const cfg = OWNER_TYPE_COLORS[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {OWNER_TYPE_LABELS[type]}
    </span>
  );
}

// ─── Image formats helper ─────────────────────────────────────────────────────

function isImageFormat(fmt: string) {
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp'].includes(fmt.toLowerCase());
}

// ─── Viewer Modal ─────────────────────────────────────────────────────────────

function ViewerModal({ doc, onClose, onDownload, onApprove, onReject }: {
  doc: GlobalComplianceDoc;
  onClose: () => void;
  onDownload: (d: GlobalComplianceDoc) => void;
  onApprove?: (d: GlobalComplianceDoc) => void;
  onReject?: (d: GlobalComplianceDoc) => void;
}) {
  const sc      = STATUS_CFG[doc.status];
  const days    = daysUntilExpiry(doc.expires_at);
  const isPending = doc.status === 'pending_review';

  // ── Preview resolution (3 sources, highest priority first) ───────────────
  // 1. docPreviewStore — populated when file uploaded anywhere in the app
  // 2. doc.previewUrl  — passed through compliance doc chain
  // 3. null            — show placeholder icon
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(
    () => getDocPreview(doc.id) ?? doc.previewUrl ?? undefined
  );

  useEffect(() => {
    // Re-check whenever preview store updates (async FileReader may not be done yet)
    const check = () => {
      const src = getDocPreview(doc.id) ?? doc.previewUrl ?? undefined;
      setPreviewSrc(src);
    };
    check();
    return subscribePreview(check);
  }, [doc.id, doc.previewUrl]);

  const showImage = !!previewSrc && isImageFormat(doc.file_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {FORMAT_ICON[doc.file_type] ?? <FileText className="w-5 h-5 text-gray-400" />}
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{doc.doc_name}</p>
              <p className="text-[10px] text-gray-400">{doc.file_type.toUpperCase()} · {doc.size} · v{doc.version}</p>
            </div>
          </div>
          <OwnerBadge type={doc.owner_type} />
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${sc.badge}`}>
            {sc.icon}{sc.label}
          </span>
          <button onClick={onClose} className="ml-1 p-1.5 hover:bg-gray-200 rounded-lg shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Owner info */}
        <div className="px-5 py-3 border-b bg-blue-50 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
            {doc.owner_avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-900">{doc.owner_name}</p>
            <p className="text-[10px] text-blue-600">{doc.owner_email} · ID: {doc.owner_id}</p>
          </div>
          {doc.owner_blocked && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-semibold">
              <Ban className="w-3 h-3" />Заблокирован
            </span>
          )}
          {doc.is_mandatory && (
            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] font-semibold">Обязательный</span>
          )}
        </div>

        {/* ── Preview area ── */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-6 min-h-[220px]">
          {showImage ? (
            // ✅ Real image preview — from docPreviewStore or doc.previewUrl
            <div className="w-full flex flex-col items-center gap-3">
              <img
                src={previewSrc}
                alt={doc.doc_name}
                className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-lg border border-gray-200 bg-white"
                onError={(e) => {
                  // If image fails to load (broken blob URL), hide it
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200 shadow-sm text-xs text-gray-500">
                <FileImage className="w-3.5 h-3.5 text-blue-400" />
                {doc.doc_name} · {doc.size} · {doc.file_type.toUpperCase()}
              </div>
            </div>
          ) : isImageFormat(doc.file_type) && !previewSrc ? (
            // Image type but no preview available
            <div className="w-full max-w-md bg-white rounded-xl shadow border border-gray-200 p-8 flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center">
                <FileImage className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{doc.doc_name}</p>
              <p className="text-xs text-gray-500">Изображение · {doc.size}</p>
              <p className="text-[10px] text-gray-400 text-center">Превью доступно только для документов, загруженных через форму платформы</p>
              <button
                onClick={() => onDownload(doc)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />Открыть оригинал
              </button>
            </div>
          ) : doc.file_type === 'pdf' ? (
            <div className="w-full max-w-md bg-white rounded-xl shadow border border-gray-200 p-8 flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center">
                <FileText className="w-10 h-10 text-red-400" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{doc.doc_name}</p>
              <p className="text-xs text-gray-500">PDF · {doc.size}</p>
              <p className="text-[10px] text-gray-400 text-center break-all max-w-xs">{doc.file_url}</p>
              <button
                onClick={() => onDownload(doc)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-medium hover:bg-red-600 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />Открыть PDF
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-gray-200 p-8 flex flex-col items-center gap-3">
              <span className="text-4xl">{doc.file_type === 'zip' ? '📦' : '📝'}</span>
              <p className="text-sm font-semibold text-gray-800">{doc.doc_name}</p>
              <p className="text-xs text-gray-500">{doc.file_type.toUpperCase()} · {doc.size}</p>
            </div>
          )}
        </div>

        {/* Meta grid */}
        <div className="px-5 py-3 border-t bg-gray-50 grid grid-cols-4 gap-3 shrink-0">
          {[
            { l: 'Тип документа', v: doc.doc_type_label },
            { l: 'Выдан', v: doc.issued_at ?? '—' },
            { l: 'Действует до', v: doc.expires_at ? `${doc.expires_at}${days !== null && days > 0 ? ` (${days} дн.)` : ''}` : 'Бессрочно' },
            { l: 'Версия', v: `v${doc.version}` },
            { l: 'Загружен', v: doc.uploaded_at },
            { l: 'Кем загружен', v: doc.uploaded_by },
            { l: 'Проверил', v: doc.reviewed_by_label ?? '—' },
            { l: 'Дата проверки', v: doc.reviewed_at ?? '—' },
          ].map(({ l, v }) => (
            <div key={l}>
              <p className="text-[9px] uppercase tracking-wide text-gray-400 font-medium">{l}</p>
              <p className="text-[11px] font-semibold text-gray-700 mt-0.5 break-words">{v}</p>
            </div>
          ))}
        </div>

        {/* Reject info */}
        {doc.reject_reason && (
          <div className="px-5 py-3 border-t bg-red-50 shrink-0">
            <p className="text-xs font-semibold text-red-700 mb-1">
              Причина отклонения: {REJECT_REASONS[doc.reject_reason]}
            </p>
            {doc.reject_comment && (
              <p className="text-[11px] text-red-600">{doc.reject_comment}</p>
            )}
          </div>
        )}

        {/* Review comment */}
        {doc.review_comment && !doc.reject_reason && (
          <div className="px-5 py-3 border-t bg-green-50 shrink-0">
            <p className="text-xs font-semibold text-green-700 mb-1">Комментарий проверяющего:</p>
            <p className="text-[11px] text-green-600">{doc.review_comment}</p>
          </div>
        )}

        {/* Actions */}
        {(onApprove || onReject) && isPending && (
          <div className="px-5 py-4 border-t bg-white shrink-0 flex gap-2">
            <button
              onClick={() => onDownload(doc)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />Скачать
            </button>
            <div className="flex-1" />
            {onReject && (
              <button
                onClick={() => { onClose(); onReject(doc); }}
                className="flex items-center gap-1.5 px-4 py-2 border border-red-300 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />Отклонить
              </button>
            )}
            {onApprove && (
              <button
                onClick={() => { onApprove(doc); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />Одобрить
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({ doc, onClose, onConfirm }: {
  doc: GlobalComplianceDoc;
  onClose: () => void;
  onConfirm: (reason: RejectReason, comment: string) => void;
}) {
  const [reason, setReason] = useState<RejectReason>('unreadable');
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b bg-red-50 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">Отклонить документ</h3>
            <p className="text-[10px] text-gray-500 truncate">{doc.doc_name} · {doc.owner_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Причина отклонения *</label>
            <div className="space-y-2">
              {(Object.entries(REJECT_REASONS) as [RejectReason, string][]).map(([key, label]) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reason === key ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${reason === key ? 'border-red-500' : 'border-gray-300'}`}>
                    {reason === key && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                  </div>
                  <input type="radio" value={key} checked={reason === key} onChange={() => setReason(key)} className="hidden" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Комментарий владельцу</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Уточните, что именно не так и как исправить..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700">
              После отклонения владелец получит уведомление с причиной и запрос на повторную загрузку.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Отмена
            </button>
            <button
              onClick={() => onConfirm(reason, comment)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              <XCircle className="w-4 h-4" />Отклонить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reupload Modal ───────────────────────────────────────────────────────────

function ReuploadModal({ doc, onClose, onConfirm }: {
  doc: GlobalComplianceDoc;
  onClose: () => void;
  onConfirm: (message: string) => void;
}) {
  const [msg, setMsg] = useState(
    `Уважаемый(ая),\n\nПожалуйста, загрузите актуальную версию документа «${doc.doc_name}».\n\nС уважением,\nDocument Compliance Center`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b bg-blue-50 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">Запрос повторной загрузки</h3>
            <p className="text-[10px] text-gray-500 truncate">{doc.doc_name} · {doc.owner_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email владельца</label>
            <input value={doc.owner_email} readOnly className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Сообщение</label>
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Отмена
            </button>
            <button
              onClick={() => onConfirm(msg)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />Отправить запрос
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Email Modal ──────────────────────────────────────────────────────────────

function EmailModal({ doc, onClose, onConfirm }: {
  doc: GlobalComplianceDoc;
  onClose: () => void;
  onConfirm: (subject: string, body: string) => void;
}) {
  const [subject, setSubject] = useState(`[PVZ Platform] Информация по документу: ${doc.doc_name}`);
  const [body, setBody] = useState(
    `Здравствуйте,\n\nОбращаемся по вопросу документа «${doc.doc_name}».\n\n[Введите сообщение]\n\nС уважением,\nCompliance-отдел PVZ Platform`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b bg-violet-50 flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">Email владельцу</h3>
            <p className="text-[10px] text-gray-500 truncate">{doc.owner_email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Кому</label>
            <input value={doc.owner_email} readOnly className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Тема письма</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Текст письма</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Отмена
            </button>
            <button
              onClick={() => onConfirm(subject, body)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({ doc, onClose, onConfirm }: {
  doc: GlobalComplianceDoc;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b bg-red-50 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">Удалить документ</h3>
            <p className="text-[10px] text-gray-500 truncate">{doc.doc_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 px-3 py-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700">
              <p className="font-semibold mb-1">Внимание: необратимое действие</p>
              <p>Документ <strong>«{doc.doc_name}»</strong> ({doc.owner_name}) будет безвозвратно удалён. Действие записывается в аудит-лог.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Отмена
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />Удалить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ��── Replace Modal ────────────────────────────────────────────────────────────

function ReplaceModal({ doc, onClose, onConfirm }: {
  doc: GlobalComplianceDoc;
  onClose: () => void;
  onConfirm: (fileName: string) => void;
}) {
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState('');

  const handleFile = (name: string) => {
    setFileName(name);
    setSelected(name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b bg-indigo-50 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">Заменить документ</h3>
            <p className="text-[10px] text-gray-500 truncate">{doc.doc_name} · v{doc.version} → v{doc.version + 1}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition-colors ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f.name); }}
          >
            <Upload className={`w-8 h-8 ${dragging ? 'text-indigo-500' : 'text-gray-300'}`} />
            <div className="text-center">
              <p className="text-sm text-gray-600 font-medium">Перетащите файл или</p>
              <label className="cursor-pointer text-indigo-600 text-sm font-semibold hover:underline">
                выберите с компьютера
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.doc"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f.name); }}
                />
              </label>
            </div>
            <p className="text-[10px] text-gray-400">PDF, JPG, PNG, WEBP, DOCX · до 20 МБ</p>
          </div>
          {selected && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-700 font-medium truncate">{selected}</p>
            </div>
          )}
          <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-700">
              Новый документ автоматически получит статус «На проверке» и будет добавлен в очередь. Текущая версия архивируется.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Отмена
            </button>
            <button
              disabled={!selected}
              onClick={() => selected && onConfirm(selected)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3.5 h-3.5" />Загрузить замену
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Document Row ─────────────────────────────────────────────────────────────

function DocRow({
  doc, selected, onSelect, onAction, bulkMode,
}: {
  doc: GlobalComplianceDoc;
  selected: boolean;
  onSelect: (id: string) => void;
  onAction: (action: DocAction, doc: GlobalComplianceDoc) => void;
  bulkMode: boolean;
}) {
  const sc      = STATUS_CFG[doc.status];
  const days    = daysUntilExpiry(doc.expires_at);
  const isPend  = doc.status === 'pending_review';
  const oc      = OWNER_TYPE_COLORS[doc.owner_type];

  // Reactive preview thumbnail from global store
  const [thumbSrc, setThumbSrc] = useState<string | undefined>(
    () => getDocPreview(doc.id) ?? doc.previewUrl ?? undefined
  );
  useEffect(() => {
    const check = () => setThumbSrc(getDocPreview(doc.id) ?? doc.previewUrl ?? undefined);
    check();
    return subscribePreview(check);
  }, [doc.id, doc.previewUrl]);

  const hasThumb = !!thumbSrc && isImageFormat(doc.file_type);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 bg-white border-b last:border-b-0 transition-all hover:bg-gray-50/60 ${selected ? 'bg-blue-50/40' : ''} ${doc.owner_blocked ? 'border-l-4 border-l-red-400' : isPend ? 'border-l-4 border-l-yellow-400' : ''}`}
    >
      {/* Checkbox */}
      {bulkMode && (
        <button onClick={() => onSelect(doc.id)} className="shrink-0">
          {selected
            ? <CheckSquare className="w-4 h-4 text-blue-600" />
            : <Square className="w-4 h-4 text-gray-300" />
          }
        </button>
      )}

      {/* Doc icon / thumbnail */}
      <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
        {hasThumb ? (
          <img src={thumbSrc} alt={doc.doc_name} className="w-full h-full object-cover" />
        ) : (
          FORMAT_ICON[doc.file_type] ?? <FileText className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{doc.doc_name}</p>
          {doc.version > 1 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono">v{doc.version}</span>
          )}
          {doc.is_mandatory && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">обяз.</span>
          )}
          <span className="text-[10px] uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{doc.file_type}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[10px] text-gray-400">
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${oc.bg} ${oc.text} font-medium`}>
            {OWNER_TYPE_LABELS[doc.owner_type]}
          </span>
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.owner_name}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{doc.uploaded_at}</span>
          {doc.expires_at && (
            <span className={`flex items-center gap-1 ${doc.status === 'expired' ? 'text-red-600 font-medium' : doc.status === 'expiring_soon' ? 'text-amber-600 font-medium' : ''}`}>
              <Clock className="w-3 h-3" />
              До: {doc.expires_at}
              {days !== null && days > 0 && doc.status === 'expiring_soon' && ` (${days} дн.)`}
            </span>
          )}
          {doc.reviewed_by_label && (
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" />
              {doc.reviewed_by_label} · {doc.reviewed_at}
            </span>
          )}
          {doc.reject_reason && (
            <span className="text-red-500 font-medium">{REJECT_REASONS[doc.reject_reason]}</span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${sc.badge}`}>
        {sc.icon}{sc.label}
      </span>

      {/* Blocked badge */}
      {doc.owner_blocked && (
        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] font-semibold shrink-0">
          <Ban className="w-2.5 h-2.5" />Блок
        </span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => onAction('view', doc)}     title="Просмотр"    className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"><Eye    className="w-3.5 h-3.5 text-blue-500" /></button>
        <button onClick={() => onAction('download', doc)} title="Скачать"     className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><Download className="w-3.5 h-3.5 text-gray-500" /></button>
        {isPend && (
          <>
            <button onClick={() => onAction('approve', doc)} title="Одобрить"  className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /></button>
            <button onClick={() => onAction('reject', doc)}  title="Отклонить" className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><XCircle className="w-3.5 h-3.5 text-red-500" /></button>
          </>
        )}
        <button onClick={() => onAction('reupload', doc)} title="Запрос повторной загрузки" className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"><RotateCcw className="w-3.5 h-3.5 text-amber-500" /></button>
        <button onClick={() => onAction('email', doc)}    title="Email владельцу"           className="p-1.5 hover:bg-violet-50 rounded-lg transition-colors"><Mail className="w-3.5 h-3.5 text-violet-500" /></button>
        <button onClick={() => onAction('replace', doc)}  title="Заменить файл"             className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"><RefreshCw className="w-3.5 h-3.5 text-indigo-500" /></button>
        <button onClick={() => onAction('delete', doc)}   title="Удалить"                   className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ComplianceCenter() {
  // Initialize from merged live store + static data
  const [docs, setDocs]   = useState<GlobalComplianceDoc[]>(() => buildMergedDocs(getDocs()));
  const [audit, setAudit] = useState<GlobalAuditEntry[]>(GLOBAL_COMPLIANCE_AUDIT);

  // Subscribe to complianceStore — courier docs uploaded anywhere re-appear here
  useEffect(() => {
    const unsub = subscribeCompliance(() => {
      setDocs(buildMergedDocs(getDocs()));
    });
    return unsub;
  }, []);

  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch]     = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAudit, setShowAudit] = useState(false);
  const [blockedOnly, setBlockedOnly] = useState(false);

  // Unique audit ID counter — prevents duplicate keys when Date.now() collides
  const auditSeqRef = useRef(0);

  // Modals
  const [viewDoc,    setViewDoc]    = useState<GlobalComplianceDoc | null>(null);
  const [rejectDoc,  setRejectDoc]  = useState<GlobalComplianceDoc | null>(null);
  const [reuploadDoc,setReuploadDoc]= useState<GlobalComplianceDoc | null>(null);
  const [emailDoc,   setEmailDoc]   = useState<GlobalComplianceDoc | null>(null);
  const [deleteDoc,  setDeleteDoc]  = useState<GlobalComplianceDoc | null>(null);
  const [replaceDoc, setReplaceDoc] = useState<GlobalComplianceDoc | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type?: 'ok'|'warn'|'err' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CURRENT_REVIEWER = REVIEWERS[0];

  const showToast = useCallback((msg: string, type: 'ok'|'warn'|'err' = 'ok') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const addAudit = useCallback((action: GlobalAuditAction, doc: GlobalComplianceDoc, details: string) => {
    setAudit(prev => [{
      id: `ga-${Date.now()}-${++auditSeqRef.current}`,
      doc_id: doc.id,
      owner_type: doc.owner_type,
      owner_name: doc.owner_name,
      user: CURRENT_REVIEWER.email,
      userLabel: CURRENT_REVIEWER.name,
      action,
      timestamp: nowTs(),
      details,
    }, ...prev]);
  }, [CURRENT_REVIEWER]);

  // ── Filtered docs ──
  const filteredDocs = useMemo(() => {
    let list = docs;
    if (blockedOnly) list = list.filter(d => d.owner_blocked);
    if (ownerFilter !== 'all') list = list.filter(d => d.owner_type === ownerFilter);
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.doc_name.toLowerCase().includes(q) ||
        d.owner_name.toLowerCase().includes(q) ||
        d.owner_id.toLowerCase().includes(q) ||
        d.doc_type_label.toLowerCase().includes(q) ||
        d.owner_email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [docs, ownerFilter, statusFilter, search]);

  const kpis = useMemo(() => getGlobalKPIs(docs), [docs]);

  // ── Handlers ──

  const handleApprove = useCallback((doc: GlobalComplianceDoc) => {
    setDocs(prev => prev.map(d => d.id === doc.id ? {
      ...d,
      status: 'approved',
      reviewed_by: CURRENT_REVIEWER.email,
      reviewed_by_label: CURRENT_REVIEWER.name,
      reviewed_at: nowTs(),
      reviewer_role: CURRENT_REVIEWER.roleLabel,
      review_comment: 'Одобрено проверяющим',
      reject_reason: null,
      reject_comment: null,
    } : d));
    addAudit('APPROVE', doc, `«${doc.doc_name}» одобрен — ${OWNER_TYPE_LABELS[doc.owner_type]}: ${doc.owner_name}`);
    // Send notification to store
    addNotification({
      id: `compliance-${Date.now()}`,
      type: 'task_assigned',
      title: `Документ одобрен: ${doc.doc_name}`,
      body: `${OWNER_TYPE_LABELS[doc.owner_type]} ${doc.owner_name}`,
      fromId: CURRENT_REVIEWER.id,
      fromName: CURRENT_REVIEWER.name,
      fromRole: CURRENT_REVIEWER.roleLabel,
      targetDept: 'Compliance',
      priority: 'normal',
      createdAt: nowTs(),
      read: false,
    });
    showToast(`✅ «${doc.doc_name}» одобрен`);
    setSelected(prev => { const s = new Set(prev); s.delete(doc.id); return s; });
  }, [CURRENT_REVIEWER, addAudit, showToast]);

  const handleRejectConfirm = useCallback((reason: RejectReason, comment: string) => {
    if (!rejectDoc) return;
    const doc = rejectDoc;
    setDocs(prev => prev.map(d => d.id === doc.id ? {
      ...d,
      status: 'rejected',
      reviewed_by: CURRENT_REVIEWER.email,
      reviewed_by_label: CURRENT_REVIEWER.name,
      reviewed_at: nowTs(),
      reviewer_role: CURRENT_REVIEWER.roleLabel,
      reject_reason: reason,
      reject_comment: comment,
    } : d));
    addAudit('REJECT', doc, `«${doc.doc_name}» отклонён: «${REJECT_REASONS[reason]}»${comment ? ` — ${comment.slice(0, 60)}` : ''}`);
    addAudit('EMAIL_SENT', doc, `Уведомление об отклонении отправлено на ${doc.owner_email}`);
    showToast(`❌ «${doc.doc_name}» отклонён. Владелец уведомлён.`, 'warn');
    setRejectDoc(null);
  }, [rejectDoc, CURRENT_REVIEWER, addAudit, showToast]);

  const handleReuploadConfirm = useCallback((message: string) => {
    if (!reuploadDoc) return;
    const doc = reuploadDoc;
    addAudit('REQUEST_REUPLOAD', doc, `Запрос повторной загрузки отправлен: ${doc.owner_name}`);
    addAudit('EMAIL_SENT', doc, `Email-уведомление на ${doc.owner_email}: «${message.slice(0, 60)}...»`);
    showToast(`📤 Запрос отправлен на ${doc.owner_email}`);
    setReuploadDoc(null);
  }, [reuploadDoc, addAudit, showToast]);

  const handleEmailConfirm = useCallback((subject: string, body: string) => {
    if (!emailDoc) return;
    const doc = emailDoc;
    addAudit('EMAIL_SENT', doc, `Email «${subject.slice(0, 60)}» отправлен на ${doc.owner_email}`);
    showToast(`📧 Email отправлен на ${doc.owner_email}`);
    setEmailDoc(null);
  }, [emailDoc, addAudit, showToast]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteDoc) return;
    const doc = deleteDoc;
    addAudit('DELETE', doc, `Документ «${doc.doc_name}» удалён — владелец: ${doc.owner_name}`);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    showToast(`🗑️ Документ «${doc.doc_name}» удалён`, 'warn');
    setDeleteDoc(null);
  }, [deleteDoc, addAudit, showToast]);

  const handleReplaceConfirm = useCallback((fileName: string) => {
    if (!replaceDoc) return;
    const doc = replaceDoc;
    setDocs(prev => prev.map(d => d.id === doc.id ? {
      ...d,
      status: 'pending_review',
      version: d.version + 1,
      uploaded_by: CURRENT_REVIEWER.email,
      uploaded_at: nowTs(),
      reviewed_by: null,
      reviewed_by_label: null,
      reviewed_at: null,
      reviewer_role: null,
      review_comment: null,
      reject_reason: null,
      reject_comment: null,
    } : d));
    addAudit('REPLACE', doc, `«${doc.doc_name}» заменён файлом «${fileName}» — v${doc.version} → v${doc.version + 1}`);
    showToast(`🔃 «${doc.doc_name}» заменён, поставлен в очередь проверки`);
    setReplaceDoc(null);
  }, [replaceDoc, CURRENT_REVIEWER, addAudit, showToast]);

  const handleDownload = useCallback((doc: GlobalComplianceDoc) => {
    addAudit('DOWNLOAD', doc, `Скачан «${doc.doc_name}» (${doc.file_type.toUpperCase()}, ${doc.size})`);
    showToast(`⬇️ «${doc.doc_name}» скачан`);
  }, [addAudit, showToast]);

  const handleView = useCallback((doc: GlobalComplianceDoc) => {
    addAudit('VIEW', doc, `Просмотрен «${doc.doc_name}» — ${doc.owner_name}`);
    setViewDoc(doc);
  }, [addAudit]);

  // ── Action dispatcher ──
  const handleAction = useCallback((action: DocAction, doc: GlobalComplianceDoc) => {
    switch (action) {
      case 'view':     handleView(doc); break;
      case 'download': handleDownload(doc); break;
      case 'approve':  handleApprove(doc); break;
      case 'reject':   setRejectDoc(doc); break;
      case 'reupload': setReuploadDoc(doc); break;
      case 'email':    setEmailDoc(doc); break;
      case 'delete':   setDeleteDoc(doc); break;
      case 'replace':  setReplaceDoc(doc); break;
    }
  }, [handleView, handleDownload, handleApprove]);

  const toggleSelect  = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const selectAll     = () => setSelected(new Set(filteredDocs.map(d => d.id)));
  const clearAll      = () => setSelected(new Set());

  const bulkApprove = () => {
    const pend = filteredDocs.filter(d => selected.has(d.id) && d.status === 'pending_review');
    pend.forEach(d => handleApprove(d));
    if (pend.length === 0) showToast('Нет документов на проверке в ��ыбранных', 'warn');
    else showToast(`✅ Одобрено ${pend.length} документов`);
  };

  const handleExport = () => {
    const header = 'Тип владельца;ID;Имя;Email;Документ;Тип;Формат;Статус;Загружен;Истекает;Проверил;Дата проверки;Причина отклонения';
    const rows = filteredDocs.map(d => [
      OWNER_TYPE_LABELS[d.owner_type], d.owner_id, d.owner_name, d.owner_email,
      d.doc_name, d.doc_type_label, d.file_type, d.status,
      d.uploaded_at, d.expires_at ?? '', d.reviewed_by_label ?? '', d.reviewed_at ?? '',
      d.reject_reason ? REJECT_REASONS[d.reject_reason] : '',
    ].join(';'));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `compliance-center-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('📊 Экспорт CSV готов');
  };

  const statusCount = (s: StatusFilter) =>
    s === 'all' ? docs.filter(d => ownerFilter === 'all' || d.owner_type === ownerFilter).length
                : docs.filter(d => d.status === s && (ownerFilter === 'all' || d.owner_type === ownerFilter)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Modals (root level, outside motion.div) ── */}
      {viewDoc && (
        <ViewerModal
          doc={viewDoc}
          onClose={() => setViewDoc(null)}
          onDownload={handleDownload}
          onApprove={handleApprove}
          onReject={setRejectDoc}
        />
      )}
      {rejectDoc && (
        <RejectModal
          doc={rejectDoc}
          onClose={() => setRejectDoc(null)}
          onConfirm={handleRejectConfirm}
        />
      )}
      {reuploadDoc && (
        <ReuploadModal
          doc={reuploadDoc}
          onClose={() => setReuploadDoc(null)}
          onConfirm={handleReuploadConfirm}
        />
      )}
      {emailDoc && (
        <EmailModal
          doc={emailDoc}
          onClose={() => setEmailDoc(null)}
          onConfirm={handleEmailConfirm}
        />
      )}
      {deleteDoc && (
        <DeleteModal
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {replaceDoc && (
        <ReplaceModal
          doc={replaceDoc}
          onClose={() => setReplaceDoc(null)}
          onConfirm={handleReplaceConfirm}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all ${
            toast.type === 'err'  ? 'bg-red-600 text-white' :
            toast.type === 'warn' ? 'bg-amber-500 text-white' :
                                    'bg-gray-900 text-white'
          }`}
        >
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Document Compliance Center</h1>
                <p className="text-xs text-gray-500 mt-0.5">Единая очередь проверки документов платформы · Роль: {CURRENT_REVIEWER.roleLabel}</p>
              </div>
              {kpis.pending > 0 && (
                <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                  {kpis.pending} ожидают
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setBulkMode(v => !v); clearAll(); }}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium transition-colors ${bulkMode ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              {bulkMode ? 'Выйти из массовой' : 'Массовая проверка'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />Экспорт CSV
            </button>
          </div>
        </div>

        {/* ── KPI Cards — Status ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {([
            { label: 'Всего',         val: kpis.total,         bg: 'bg-slate-50',   border: 'border-slate-200', text: 'text-slate-700', icon: <ShieldCheck className="w-4 h-4" />, filter: 'all' as StatusFilter,           blocked: false },
            { label: 'На проверке',   val: kpis.pending,       bg: 'bg-yellow-50',  border: 'border-yellow-200',text: 'text-yellow-700',icon: <Clock className="w-4 h-4" />,        filter: 'pending_review' as StatusFilter, blocked: false },
            { label: 'Одобрено',      val: kpis.approved,      bg: 'bg-green-50',   border: 'border-green-200', text: 'text-green-700', icon: <CheckCircle2 className="w-4 h-4" />, filter: 'approved' as StatusFilter,       blocked: false },
            { label: 'Отклонено',     val: kpis.rejected,      bg: 'bg-red-50',     border: 'border-red-200',   text: 'text-red-700',   icon: <XCircle className="w-4 h-4" />,      filter: 'rejected' as StatusFilter,       blocked: false },
            { label: 'Истекают',      val: kpis.expiring_soon, bg: 'bg-amber-50',   border: 'border-amber-200', text: 'text-amber-700', icon: <AlertTriangle className="w-4 h-4" />,filter: 'expiring_soon' as StatusFilter,  blocked: false },
            { label: 'Истекли',       val: kpis.expired,       bg: 'bg-red-50',     border: 'border-red-300',   text: 'text-red-800',   icon: <AlertCircle className="w-4 h-4" />,  filter: 'expired' as StatusFilter,        blocked: false },
            { label: 'Заблокированы', val: kpis.blocked,       bg: 'bg-gray-50',    border: 'border-gray-200',  text: 'text-gray-700',  icon: <Ban className="w-4 h-4" />,          filter: 'all' as StatusFilter,            blocked: true  },
          ] as const).map(({ label, val, bg, border, text, icon, filter, blocked }) => {
            const isActive = blocked
              ? blockedOnly
              : (!blockedOnly && statusFilter === filter);
            return (
              <button
                key={label}
                onClick={() => {
                  if (blocked) {
                    const next = !blockedOnly;
                    setBlockedOnly(next);
                    if (next) setStatusFilter('all');
                  } else {
                    setBlockedOnly(false);
                    setStatusFilter(isActive && filter !== 'all' ? 'all' : filter);
                  }
                }}
                className={`${bg} border ${border} rounded-xl p-3 flex flex-col gap-1 text-left cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${isActive ? 'ring-2 ring-offset-1 shadow-md scale-[1.02]' : ''}`}
                style={isActive ? { '--tw-ring-color': 'currentColor' } as React.CSSProperties : {}}
                title={`Фильтр: ${label}`}
              >
                <div className={`${text} flex items-center gap-1.5`}>
                  {icon}
                  <span className="text-[10px] font-medium leading-tight">{label}</span>
                  {isActive && <span className="ml-auto text-[8px] bg-current text-white rounded px-1 opacity-70">✓</span>}
                </div>
                <p className={`text-2xl font-bold ${text}`}>{val}</p>
              </button>
            );
          })}
        </div>

        {/* ── KPI Cards — By owner type ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.entries(kpis.byOwner) as [OwnerType, number][]).map(([type, count]) => {
            const cfg = OWNER_TYPE_COLORS[type];
            const pending = docs.filter(d => d.owner_type === type && d.status === 'pending_review').length;
            return (
              <button
                key={type}
                onClick={() => { setOwnerFilter(ownerFilter === type ? 'all' : type); setBlockedOnly(false); }}
                className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-all text-left ${ownerFilter === type ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1` : `bg-white border-gray-200 hover:border-gray-300`}`}
                style={ownerFilter === type ? { '--tw-ring-color': 'currentColor' } as React.CSSProperties : {}}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${ownerFilter === type ? cfg.text : 'text-gray-600'}`}>
                    {OWNER_TYPE_LABELS[type]}
                  </span>
                  {pending > 0 && (
                    <span className="text-[9px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{pending}</span>
                  )}
                </div>
                <p className={`text-xl font-bold ${ownerFilter === type ? cfg.text : 'text-gray-800'}`}>{count}</p>
              </button>
            );
          })}
        </div>

        {/* ── Mandatory failures alert ── */}
        {kpis.mandatoryFail > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 flex-1">
              <strong>{kpis.mandatoryFail} обязательных документов</strong> отклонены или истекли — работа может быть ограничена
            </p>
            <button
              onClick={() => setStatusFilter('rejected')}
              className="text-xs font-semibold text-red-600 hover:underline shrink-0"
            >
              Показать →
            </button>
          </div>
        )}

        {/* ── Bulk controls ── */}
        {bulkMode && (
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Zap className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-700 flex-1">
              Массовая проверка · выбрано: <strong>{selected.size}</strong> из {filteredDocs.length}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={selectAll}  className="text-xs text-blue-600 hover:underline font-medium">Выбрать все</button>
              <button onClick={clearAll}   className="text-xs text-gray-500 hover:underline font-medium">Снять</button>
              {selected.size > 0 && (
                <button
                  onClick={bulkApprove}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />Одобрить выбранные
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Main table card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          {/* Owner type tabs */}
          <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50">
            {OWNER_TABS.map(tab => {
              const isActive = ownerFilter === tab.id;
              const cnt = tab.id === 'all'
                ? docs.length
                : docs.filter(d => d.owner_type === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setOwnerFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                    isActive ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status filter row */}
          <div className="flex overflow-x-auto border-b border-gray-100">
            {STATUS_TABS.map(tab => {
              const cnt = statusCount(tab.id);
              const isActive = !blockedOnly && statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setStatusFilter(tab.id); setBlockedOnly(false); }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                    isActive ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  <span className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {cnt}
                  </span>
                </button>
              );
            })}
            {blockedOnly && (
              <button
                onClick={() => setBlockedOnly(false)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 border-gray-500 text-gray-700 bg-gray-50"
              >
                <Ban className="w-3 h-3" />Заблокированы
                <span className="min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-gray-200 text-gray-700">{kpis.blocked}</span>
                <X className="w-3 h-3 ml-1 opacity-60" />
              </button>
            )}
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по документу, владельцу, ID, email..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Document list */}
          <div className="divide-y divide-gray-100">
            {filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Документов не найдено</p>
                {(ownerFilter !== 'all' || statusFilter !== 'all' || search || blockedOnly) && (
                  <button
                    onClick={() => { setOwnerFilter('all'); setStatusFilter('all'); setSearch(''); setBlockedOnly(false); }}
                    className="mt-2 text-xs text-indigo-600 hover:underline"
                  >
                    Сбросить фильтры
                  </button>
                )}
              </div>
            ) : (
              filteredDocs.map(doc => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  selected={selected.has(doc.id)}
                  onSelect={toggleSelect}
                  onAction={handleAction}
                  bulkMode={bulkMode}
                />
              ))
            )}
          </div>

          {/* Footer count */}
          {filteredDocs.length > 0 && (
            <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Показано <strong>{filteredDocs.length}</strong> из <strong>{docs.length}</strong> документов
              </p>
              {selected.size > 0 && (
                <p className="text-xs text-blue-600 font-medium">Выбрано: {selected.size}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Audit log ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowAudit(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Shield className="w-4 h-4 text-gray-400" />
              Единый аудит-лог действий
              <span className="text-xs font-normal text-gray-400">({audit.length} записей)</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAudit ? 'rotate-180' : ''}`} />
          </button>
          {showAudit && (
            <div className="border-t divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {audit.map(a => {
                const oc = OWNER_TYPE_COLORS[a.owner_type];
                return (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-xs mt-0.5">
                      {AUDIT_ICON[a.action]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-xs font-semibold text-gray-800">{a.userLabel}</p>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${oc.bg} ${oc.text}`}>
                          {OWNER_TYPE_LABELS[a.owner_type]}
                        </span>
                        <span className="text-[9px] text-gray-400">{a.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-gray-600">{a.details}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
