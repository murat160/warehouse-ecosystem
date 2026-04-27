import { useState, useRef, useCallback, useEffect } from 'react';
import {
  FileText, Upload, Download, Trash2, Eye, RefreshCw, Send, Mail,
  AlertTriangle, CheckCircle2, Clock, XCircle, Shield, FilePlus,
  File, FileImage, Archive, ChevronRight, X, Printer, Camera,
  Monitor, Image as ImageIcon, Link, Inbox, FolderOpen, RotateCcw,
  Info, ZoomIn,
} from 'lucide-react';
import type { Courier } from '../../data/couriers-mock';
import { addDocToCompliance, removeDoc as removeDocFromCompliance } from '../../store/complianceStore';
import * as _docPreviewStore from '../../store/docPreviewStore';
const { storeFilePreview, setDocPreview, removeDocPreview, getDocPreview } = _docPreviewStore;
import { DocumentViewerModal, type DocumentRecord, type DocumentContent } from '../../components/ui/DocumentViewer';
import ReactDOM from 'react-dom';

// ─── Module-level doc cache — persists docs across navigation ─────────────────
// Without this, every time the user navigates away and back, useState re-runs
// buildDocs() from static mock data and all uploaded documents are lost.
const _tabDocCache = new Map<string, { docs: DocRecord[]; audit: AuditEntry[]; synced: boolean }>();

function initials(name: string): string {
  return name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase();
}

const DOC_LABELS: Record<string, string> = {
  passport: 'Паспорт', photo: 'Фото профиля', medical: 'Мед. справка',
  insurance: 'Страховой полис', license: 'Водит. удост.',
  contract: 'Договор / ГПД', tax: 'Налоговая анкета', other: 'Другое',
};

function syncDocToStore(courier: Courier, doc: DocRecord, version = 1) {
  addDocToCompliance({
    id: `${courier.id}-${doc.document_id}`,
    entity_id: courier.id,
    entity_name: courier.name,
    entity_email: courier.email,
    entity_avatar: initials(courier.name),
    entity_type: 'courier',
    doc_name: doc.name,
    doc_type: doc.document_type,
    doc_type_label: DOC_LABELS[doc.document_type] ?? doc.document_type,
    format: doc.format,
    size: doc.size,
    file_url: doc.file_url,
    issued_at: doc.issued_at,
    expires_at: doc.expires_at,
    is_mandatory: true,
    blocks_work: doc.document_type === 'passport' || doc.document_type === 'license',
    previewUrl: doc.previewUrl,
    uploaded_by: doc.uploaded_by,
    version,
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocStatus = 'active' | 'expiring_soon' | 'expired' | 'pending_verification' | 'rejected';
export type DocFormat = 'pdf' | 'jpg' | 'png' | 'docx' | 'doc' | 'heic' | 'webp' | 'zip';
export type AuditActionType =
  | 'UPLOAD' | 'DOWNLOAD' | 'EMAIL' | 'SYSTEM_CHECK'
  | 'REPLACE' | 'DELETE' | 'VIEW' | 'REFRESH' | 'PDF_PACK';

export type UploadSource = 'computer' | 'gallery' | 'camera' | 'url' | 'email' | 'drop';

export interface DocRecord {
  document_id: string;
  courier_id: string;
  document_type: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
  issued_at: string | null;
  expires_at: string | null;
  status: DocStatus;
  name: string;
  format: DocFormat;
  size: string;
  previewUrl?: string;
  // Review info
  reviewed_by?: string | null;
  reviewed_by_label?: string | null;
  reviewed_at?: string | null;
  compliance_status?: 'pending_review' | 'approved' | 'rejected' | null;
  reject_reason?: string | null;
  reject_comment?: string | null;
}

export interface AuditEntry {
  id: string;
  user: string;
  action: AuditActionType;
  timestamp: string;
  details: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowTs() {
  return new Date().toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;
  const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function computeStatus(expires_at: string | null, baseStatus: DocStatus): DocStatus {
  if (baseStatus === 'pending_verification' || baseStatus === 'rejected') return baseStatus;
  if (!expires_at) return 'active';
  const days = daysUntil(expires_at);
  if (days === null) return 'active';
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'active';
}

function extToFormat(filename: string): DocFormat {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, DocFormat> = {
    pdf: 'pdf', jpg: 'jpg', jpeg: 'jpg', png: 'png',
    docx: 'docx', doc: 'doc', heic: 'heic', heif: 'heic',
    webp: 'webp', zip: 'zip',
  };
  return map[ext] ?? 'pdf';
}

function isImage(fmt: DocFormat) {
  return ['jpg', 'png', 'webp', 'heic'].includes(fmt);
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}

function fmtDateInput(dateStr: string): string {
  // yyyy-mm-dd → dd.mm.yyyy
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function buildDocs(courier: Courier): DocRecord[] {
  const fmtMap: Record<string, DocFormat> = {
    passport: 'pdf', photo: 'jpg', medical: 'pdf',
    insurance: 'pdf', license: 'pdf', other: 'docx',
  };
  const stMap: Record<string, DocStatus> = {
    valid: 'active', expired: 'expired', pending: 'pending_verification', missing: 'rejected',
  };
  const sizes = [1.2, 0.4, 0.9, 0.7, 1.5, 0.6];

  const docs: DocRecord[] = courier.documents.map((d, i) => {
    const fmt = fmtMap[d.type] as DocFormat ?? 'pdf';
    const baseStatus = stMap[d.status] ?? 'active';
    const expiresAt = d.expiresAt === '—' ? null : d.expiresAt;
    return {
      document_id: d.id,
      courier_id: courier.id,
      document_type: d.type,
      file_url: `https://placehold.co/600x800/e2e8f0/475569?text=${fmt.toUpperCase()}`,
      uploaded_by: 'admin@pvz-platform.ru',
      uploaded_at: d.issuedAt,
      issued_at: d.issuedAt,
      expires_at: expiresAt,
      status: computeStatus(expiresAt, baseStatus),
      name: d.name,
      format: fmt,
      size: `${sizes[i % sizes.length]} МБ`,
    };
  });

  docs.push({
    document_id: 'dext1',
    courier_id: courier.id,
    document_type: 'contract',
    file_url: `https://placehold.co/600x800/e2e8f0/475569?text=PDF`,
    uploaded_by: 'hr@pvz-platform.ru',
    uploaded_at: courier.contractDate,
    issued_at: courier.contractDate,
    expires_at: courier.contractExpiry,
    status: computeStatus(courier.contractExpiry, courier.contractStatus === 'active' ? 'active' : 'expired'),
    name: 'Трудовой договор / ГПД',
    format: 'pdf',
    size: '2.1 МБ',
  });
  docs.push({
    document_id: 'dext2',
    courier_id: courier.id,
    document_type: 'tax',
    file_url: `https://placehold.co/600x800/e2e8f0/475569?text=DOCX`,
    uploaded_by: 'admin@pvz-platform.ru',
    uploaded_at: '01.01.2026',
    issued_at: '01.01.2026',
    expires_at: null,
    status: 'pending_verification',
    name: 'Налоговая анкета 2026',
    format: 'docx',
    size: '0.3 МБ',
  });

  return docs;
}

function buildAudit(courierId: string): AuditEntry[] {
  return [
    { id: 'a1', user: 'admin@pvz-platform.ru', action: 'UPLOAD', timestamp: '05.03.2026 11:22', details: `Загружен «Паспорт РФ» (PDF, 1.2 МБ) — курьер ${courierId}` },
    { id: 'a2', user: 'admin@pvz-platform.ru', action: 'PDF_PACK', timestamp: '03.03.2026 14:05', details: `Сгенерирован PDF-пакет документов курьера ${courierId}` },
    { id: 'a3', user: 'hr@pvz-platform.ru', action: 'UPLOAD', timestamp: '01.03.2026 10:00', details: `Загружен «Трудовой договор / ГПД» (PDF, 2.1 МБ)` },
    { id: 'a4', user: 'system', action: 'SYSTEM_CHECK', timestamp: '28.02.2026 00:00', details: `Автопроверка сроков: обнаружены истёкшие документы` },
    { id: 'a5', user: 'admin@pvz-platform.ru', action: 'EMAIL', timestamp: '28.02.2026 09:30', details: `Документы отправлены на email курьера` },
    { id: 'a6', user: 'admin@pvz-platform.ru', action: 'DOWNLOAD', timestamp: '25.02.2026 16:48', details: `Скачан «Медицинская справка» (PDF)` },
  ];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx,.doc,.heic,.heif,.webp,.zip';

const DOC_TYPES = [
  { value: 'passport', label: 'Паспорт' },
  { value: 'photo', label: 'Фото профиля' },
  { value: 'medical', label: 'Медицинская справка' },
  { value: 'insurance', label: 'Страховой полис' },
  { value: 'license', label: 'Водительское удостоверение' },
  { value: 'contract', label: 'Договор / ГПД' },
  { value: 'tax', label: 'Налоговая анкета' },
  { value: 'other', label: 'Другое' },
];

const FORMAT_ICON: Record<DocFormat, React.ReactNode> = {
  pdf:  <FileText className="w-5 h-5 text-red-500" />,
  jpg:  <FileImage className="w-5 h-5 text-blue-500" />,
  png:  <FileImage className="w-5 h-5 text-indigo-500" />,
  webp: <FileImage className="w-5 h-5 text-teal-500" />,
  heic: <FileImage className="w-5 h-5 text-purple-500" />,
  docx: <File className="w-5 h-5 text-blue-700" />,
  doc:  <File className="w-5 h-5 text-blue-600" />,
  zip:  <Archive className="w-5 h-5 text-yellow-600" />,
};

const STATUS_CFG: Record<DocStatus, { label: string; badge: string; dot: string; icon: React.ReactNode }> = {
  active:               { label: 'Действителен',  badge: 'bg-green-100 text-green-700',   dot: 'bg-green-500',  icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> },
  expiring_soon:        { label: 'Истекает',       badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400',  icon: <Clock className="w-3.5 h-3.5 text-amber-500" /> },
  expired:              { label: 'Истёк',          badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500',    icon: <XCircle className="w-3.5 h-3.5 text-red-600" /> },
  pending_verification: { label: 'На проверке',    badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', icon: <Clock className="w-3.5 h-3.5 text-yellow-600" /> },
  rejected:             { label: 'Отклонён',       badge: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400',   icon: <XCircle className="w-3.5 h-3.5 text-gray-400" /> },
};

const AUDIT_ICON: Record<AuditActionType, string> = {
  UPLOAD: '📁', DOWNLOAD: '⬇️', EMAIL: '📧', SYSTEM_CHECK: '🔄',
  REPLACE: '🔃', DELETE: '🗑', VIEW: '👁', REFRESH: '♻️', PDF_PACK: '🖨',
};
const AUDIT_LABEL: Record<AuditActionType, string> = {
  UPLOAD: 'Загружен', DOWNLOAD: 'Скачан', EMAIL: 'Email отправлен',
  SYSTEM_CHECK: 'Автопроверка', REPLACE: 'Заменён', DELETE: 'Удалён',
  VIEW: 'Просмотрен', REFRESH: 'Обновлён', PDF_PACK: 'PDF-пакет создан',
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  courier: Courier;
  onClose: () => void;
  onUpload: (doc: DocRecord) => void;
  onAudit: (action: AuditActionType, details: string) => void;
  replaceTarget?: DocRecord;
}

function UploadModal({ courier, onClose, onUpload, onAudit, replaceTarget }: UploadModalProps) {
  const [source, setSource] = useState<UploadSource>('computer');
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [urlError, setUrlError] = useState('');

  // Step 2 metadata
  const [docName, setDocName] = useState(replaceTarget?.name ?? '');
  const [docType, setDocType] = useState(replaceTarget?.document_type ?? 'passport');
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const computerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // NOTE: We intentionally do NOT revoke previewUrl here because:
  // 1. We now use FileReader (base64 data URLs) which don't need revocation
  // 2. The data URL must persist so ComplianceCenter can display the image
  // Legacy blob URLs: only revoke if it was accidentally created as blob:
  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Temp key for preview while we don't have final compliance ID yet
  const tempPreviewKeyRef = useRef<string | null>(null);

  const acceptFile = useCallback((f: File) => {
    setFile(f);
    if (!replaceTarget) setDocName(f.name.replace(/\.[^.]+$/, ''));
    const fmt = extToFormat(f.name);
    if (isImage(fmt)) {
      setLoadingPreview(true);
      // Generate a temp key to store preview in global store immediately
      const tmpKey = `upload-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      tempPreviewKeyRef.current = tmpKey;

      // storeFilePreview reads file with FileReader + fallback, stores in global Map
      storeFilePreview(tmpKey, f, (dataUrl) => {
        setPreviewUrl(dataUrl);
        setLoadingPreview(false);
      });
    } else {
      setPreviewUrl(null);
      setLoadingPreview(false);
    }
    setStep(2);
  }, [replaceTarget]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const handleUrlFetch = () => {
    if (!urlInput.trim()) { setUrlError('Введите URL'); return; }
    try { new URL(urlInput); } catch { setUrlError('Некорректный URL'); return; }
    setUrlError('');
    const name = urlInput.split('/').pop() ?? 'document';
    const mockFile = new File([''], name, { type: 'application/pdf' });
    acceptFile(mockFile);
  };

  const handleEmailImport = () => {
    if (!emailInput.trim()) return;
    const mockFile = new File([''], 'email-attachment.pdf', { type: 'application/pdf' });
    acceptFile(mockFile);
  };

  const handleConfirm = () => {
    if (!docName.trim()) return;
    const fmt = file ? extToFormat(file.name) : 'pdf';
    const docId = replaceTarget?.document_id ?? `d-${Date.now()}`;
    // Compliance store ID = "{courier.id}-{doc.document_id}" — must match syncDocToStore
    const complianceId = `${courier.id}-${docId}`;

    // ── Register preview under FINAL compliance doc ID ─────────────────────
    // Priority 1: data URL captured in local state (from FileReader)
    if (previewUrl) {
      setDocPreview(complianceId, previewUrl);
    }
    // Priority 2: if local state somehow didn't get set, promote the temp key
    const tmpKey = tempPreviewKeyRef.current;
    if (!previewUrl && tmpKey) {
      const tmpPreview = getDocPreview(tmpKey);
      if (tmpPreview) setDocPreview(complianceId, tmpPreview);
    }
    // Clean up the temp key
    if (tmpKey) { removeDocPreview(tmpKey); tempPreviewKeyRef.current = null; }

    const newDoc: DocRecord = {
      document_id: docId,
      courier_id: courier.id,
      document_type: docType,
      file_url: `https://placehold.co/600x800/e2e8f0/475569?text=${fmt.toUpperCase()}`,
      uploaded_by: 'admin@pvz-platform.ru',
      uploaded_at: new Date().toLocaleDateString('ru-RU'),
      issued_at: issuedAt ? fmtDateInput(issuedAt) : new Date().toLocaleDateString('ru-RU'),
      expires_at: expiresAt ? fmtDateInput(expiresAt) : null,
      status: 'pending_verification',
      name: docName,
      format: fmt,
      size: file ? humanSize(file.size) : '—',
      previewUrl: previewUrl ?? getDocPreview(complianceId) ?? undefined,
    };
    onUpload(newDoc);
    onAudit(replaceTarget ? 'REPLACE' : 'UPLOAD',
      `${replaceTarget ? 'Заменён' : 'Загружен'} «${docName}» (${fmt.toUpperCase()}${file ? ', ' + humanSize(file.size) : ''}) — ожидает проверки`);
    onClose();
  };

  const goBack = () => {
    setStep(1);
    setFile(null);
    // blob URLs need revocation; data URLs do not
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setLoadingPreview(false);
    if (!replaceTarget) setDocName('');
  };

  const srcTabs: { id: UploadSource; icon: React.ElementType; label: string }[] = [
    { id: 'computer', icon: Monitor, label: 'Компьютер' },
    { id: 'gallery', icon: ImageIcon, label: 'Галерея' },
    { id: 'camera', icon: Camera, label: 'Камера' },
    { id: 'url', icon: Link, label: 'URL' },
    { id: 'email', icon: Inbox, label: 'Email' },
    { id: 'drop', icon: FolderOpen, label: 'Перетащить' },
  ];

  const fmt = file ? extToFormat(file.name) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[460px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <FilePlus className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">
              {replaceTarget ? `Заменить «${replaceTarget.name}»` : 'Загрузить документ'}
            </h3>
            <p className="text-[10px] text-gray-400">
              {step === 1 ? 'Шаг 1 из 2 — выберите источник и файл' : 'Шаг 2 из 2 — укажите тип и даты'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-5 pt-3">
          <div className="flex-1 h-1 rounded-full bg-blue-500" />
          <div className={`flex-1 h-1 rounded-full transition-colors duration-300 ${step === 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
        </div>

        <div className="p-5">
          {step === 1 ? (
            <div className="space-y-4">
              {/* Source tabs */}
              <div className="grid grid-cols-6 gap-1 p-1 bg-gray-100 rounded-xl">
                {srcTabs.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setSource(id)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-all ${
                      source === id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="leading-none">{label}</span>
                  </button>
                ))}
              </div>

              {/* Format hint */}
              <p className="text-[10px] text-gray-400 text-center">
                Поддерживаемые форматы: PDF · JPG · PNG · HEIC · WEBP · DOC · DOCX · ZIP
              </p>

              {/* Computer */}
              {source === 'computer' && (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                  onClick={() => computerRef.current?.click()}
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                    <FolderOpen className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Выберите файл</p>
                  <p className="text-[11px] text-gray-400 mt-1">Откроется диалог выбора файла</p>
                  <input ref={computerRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFileInput} />
                </div>
              )}

              {/* Gallery */}
              {source === 'gallery' && (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                  onClick={() => galleryRef.current?.click()}
                >
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-100 transition-colors">
                    <ImageIcon className="w-6 h-6 text-indigo-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Открыть галерею</p>
                  <p className="text-[11px] text-gray-400 mt-1">Выберите фото или изображение</p>
                  <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
                </div>
              )}

              {/* Camera */}
              {source === 'camera' && (
                <div className="space-y-3">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                    onClick={() => cameraRef.current?.click()}
                  >
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-100 transition-colors">
                      <Camera className="w-6 h-6 text-purple-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Сфотографировать документ</p>
                    <p className="text-[11px] text-gray-400 mt-1">Работает на мобильных устройствах и планшетах</p>
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
                  </div>
                </div>
              )}

              {/* URL */}
              {source === 'url' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">URL файла</label>
                    <div className="flex gap-2">
                      <input
                        value={urlInput}
                        onChange={e => { setUrlInput(e.target.value); setUrlError(''); }}
                        placeholder="https://example.com/document.pdf"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={e => e.key === 'Enter' && handleUrlFetch()}
                      />
                      <button
                        onClick={handleUrlFetch}
                        className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors shrink-0"
                      >
                        Загрузить
                      </button>
                    </div>
                    {urlError && <p className="text-[10px] text-red-500 mt-1">{urlError}</p>}
                  </div>
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-700">Укажите прямую ссылку на файл. Поддерживаются открытые ссылки без авторизации.</p>
                  </div>
                </div>
              )}

              {/* Email */}
              {source === 'email' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email-адрес отправителя</label>
                    <div className="flex gap-2">
                      <input
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        placeholder="sender@example.com"
                        type="email"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={e => e.key === 'Enter' && handleEmailImport()}
                      />
                      <button
                        onClick={handleEmailImport}
                        className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors shrink-0"
                      >
                        Импорт
                      </button>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-100 rounded-xl">
                    <Info className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-green-700">Система импортирует вложение из последнего письма от указанного адреса на ящик платфо��мы.</p>
                  </div>
                </div>
              )}

              {/* Drag & Drop */}
              {source === 'drop' && (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                    dragOver
                      ? 'border-blue-500 bg-blue-50 scale-[0.99]'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors ${dragOver ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Upload className={`w-7 h-7 transition-colors ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                  </div>
                  <p className={`text-sm font-medium transition-colors ${dragOver ? 'text-blue-600' : 'text-gray-700'}`}>
                    {dragOver ? 'Отпустите для загрузки' : 'Перетащите файл сюда'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">из Проводника, Finder или браузера</p>
                </div>
              )}
            </div>
          ) : (
            /* Step 2 — metadata */
            <div className="space-y-4">
              {/* Preview */}
              {fmt && isImage(fmt) ? (
                previewUrl ? (
                  // Real image preview — base64 data URL, always valid
                  <div className="w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center" style={{ minHeight: 144 }}>
                    <img src={previewUrl} alt="preview" className="max-w-full max-h-48 object-contain" />
                  </div>
                ) : loadingPreview ? (
                  // Reading file... show spinner
                  <div className="w-full h-36 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[11px] text-gray-400">Загрузка превью...</p>
                  </div>
                ) : (
                  <div className="w-full h-24 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">🖼</span>
                    <p className="text-xs text-gray-500 truncate max-w-xs">{file?.name}</p>
                  </div>
                )
              ) : (
                <div className="w-full h-24 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">{fmt === 'pdf' ? '📄' : fmt === 'zip' ? '📦' : '📝'}</span>
                  <p className="text-xs text-gray-500 truncate max-w-xs">{file?.name}</p>
                  <p className="text-[10px] text-gray-400">{file ? humanSize(file.size) : ''}</p>
                </div>
              )}

              {/* File chip */}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                {fmt && FORMAT_ICON[fmt]}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-800 truncate">{file?.name}</p>
                  <p className="text-[10px] text-blue-500">{file ? humanSize(file.size) : ''} · {fmt?.toUpperCase()}</p>
                </div>
                <button onClick={goBack} className="p-1 hover:bg-blue-200 rounded-lg transition-colors" title="Другой файл">
                  <RefreshCw className="w-3 h-3 text-blue-500" />
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Название документа *</label>
                <input
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  placeholder="Например: Паспорт РФ"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Тип документа</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DOC_TYPES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Дата выдачи</label>
                  <input
                    type="date"
                    value={issuedAt}
                    onChange={e => setIssuedAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Дата окончания</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={goBack}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!docName.trim() || loadingPreview}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {loadingPreview
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Обработка...</>
                    : <><Upload className="w-3.5 h-3.5" />{replaceTarget ? 'Заменить' : 'Загрузить'}</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Viewer Modal ─────────────────────────────────────────────────────────────

function ViewerModal({ doc, courierId, onClose, onDownload }: {
  doc: DocRecord;
  courierId: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  // Look up preview from global store first (most reliable), then fall back to doc.previewUrl
  const complianceId = `${courierId}-${doc.document_id}`;
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(
    () => getDocPreview(complianceId) ?? doc.previewUrl
  );

  // Re-check if preview becomes available (async FileReader)
  useEffect(() => {
    const check = () => {
      const p = getDocPreview(complianceId) ?? doc.previewUrl;
      if (p) setPreviewSrc(p);
    };
    check();
    const { subscribePreview } = _docPreviewStore;
    const unsub = subscribePreview(check);
    return unsub;
  }, [complianceId, doc.previewUrl]);

  const showImage = previewSrc && isImage(doc.format);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {FORMAT_ICON[doc.format]}
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{doc.name}</p>
              <p className="text-[10px] text-gray-400">{doc.format.toUpperCase()} · {doc.size}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />Скачать
            </button>
            <button onClick={onClose} className="ml-1 p-1.5 hover:bg-gray-200 rounded-lg">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4 min-h-[300px]">
          {showImage ? (
            // Real image — from global docPreviewStore or doc.previewUrl
            <div className="flex flex-col items-center gap-3 w-full">
              <img
                src={previewSrc}
                alt={doc.name}
                className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-md border border-gray-200 bg-white"
              />
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <FileImage className="w-3 h-3" />
                {doc.name} · {doc.size} · {doc.format.toUpperCase()}
              </p>
            </div>
          ) : doc.format === 'pdf' ? (
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
                <p className="text-xs text-gray-500 mt-1">PDF-документ · {doc.size}</p>
                <p className="text-[10px] text-gray-400 mt-2 break-all px-2">{doc.file_url}</p>
              </div>
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
              >
                <Download className="w-4 h-4" />Открыть PDF
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col items-center gap-3">
              <span className="text-5xl">{doc.format === 'zip' ? '📦' : '📝'}</span>
              <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
              <p className="text-xs text-gray-500">{doc.size} · {doc.format.toUpperCase()}</p>
            </div>
          )}
        </div>

        {/* Meta footer */}
        <div className="px-5 py-3 border-t bg-gray-50 grid grid-cols-4 gap-3 shrink-0">
          {[
            { l: 'Тип', v: doc.document_type },
            { l: 'Загружен', v: doc.uploaded_at },
            { l: 'Выдан', v: doc.issued_at ?? '—' },
            { l: 'Действует до', v: doc.expires_at ?? 'Бессрочно' },
          ].map(({ l, v }) => (
            <div key={l}>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide font-medium">{l}</p>
              <p className="text-[11px] font-semibold text-gray-700 mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DocumentsTab({ courier }: { courier: Courier }) {
  // ── Persistent state: survive navigation ──────────────────────────────────
  const [docs, setDocs] = useState<DocRecord[]>(() => {
    const cached = _tabDocCache.get(courier.id);
    if (cached) return cached.docs;
    const built = buildDocs(courier);
    _tabDocCache.set(courier.id, { docs: built, audit: buildAudit(courier.id), synced: false });
    return built;
  });

  const [audit, setAudit] = useState<AuditEntry[]>(() => {
    const cached = _tabDocCache.get(courier.id);
    return cached?.audit ?? buildAudit(courier.id);
  });

  // ── On first open per courier: push all initial docs to complianceStore ───
  useEffect(() => {
    const cached = _tabDocCache.get(courier.id);
    if (!cached || cached.synced) return;
    cached.docs.forEach(doc => syncDocToStore(courier, doc));
    cached.synced = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courier.id]);

  // ── Keep cache in sync whenever docs/audit change ─────────────────────────
  useEffect(() => {
    const cached = _tabDocCache.get(courier.id);
    if (cached) cached.docs = docs;
  }, [courier.id, docs]);

  useEffect(() => {
    const cached = _tabDocCache.get(courier.id);
    if (cached) cached.audit = audit;
  }, [courier.id, audit]);

  // Modal state
  const [viewDoc, setViewDoc] = useState<DocRecord | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<DocRecord | null>(null);
  const [replaceDoc, setReplaceDoc] = useState<DocRecord | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [emailModal, setEmailModal] = useState<{ doc: DocRecord | null; all: boolean } | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  // Email form
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Toast
  const [toast, setToast] = useState<{ msg: string; type?: 'ok' | 'warn' } | null>(null);

  const addAudit = useCallback((action: AuditActionType, details: string, user = 'admin@pvz-platform.ru') => {
    setAudit(prev => [{ id: `a-${Date.now()}`, user, action, timestamp: nowTs(), details }, ...prev]);
  }, []);

  const showToast = useCallback((msg: string, type: 'ok' | 'warn' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Auto system-check on mount
  useEffect(() => {
    const expired = docs.filter(d => d.status === 'expired');
    const soon = docs.filter(d => d.status === 'expiring_soon');
    if (expired.length || soon.length) {
      addAudit('SYSTEM_CHECK',
        `Автопроверка: ${expired.length} истёкших, ${soon.length} истекающих в течение 30 дней`,
        'system');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Computed
  const expiredDocs = docs.filter(d => d.status === 'expired');
  const expiringSoon = docs.filter(d => d.status === 'expiring_soon');

  // ── Handlers ──

  const handleView = (doc: DocRecord) => {
    addAudit('VIEW', `Просмотрен «${doc.name}»`);
    setViewDoc(doc);
  };

  const handleDownload = (doc: DocRecord) => {
    addAudit('DOWNLOAD', `Скачан «${doc.name}» (${doc.format.toUpperCase()}, ${doc.size})`);
    showToast(`⬇️ «${doc.name}» скачан`);
  };

  const handleRefresh = (doc: DocRecord) => {
    addAudit('REFRESH', `Файл «${doc.name}» перезагружен из источника`);
    showToast(`♻️ «${doc.name}» обновлён`);
  };

  const handleDelete = () => {
    if (!deleteDoc) return;
    const complianceId = `${courier.id}-${deleteDoc.document_id}`;
    setDocs(prev => prev.filter(d => d.document_id !== deleteDoc.document_id));
    removeDocFromCompliance(complianceId, 'Администратор');
    removeDocPreview(complianceId); // clean up preview store
    addAudit('DELETE', `Удалён «${deleteDoc.name}» (ID: ${deleteDoc.document_id})`);
    showToast(`🗑 «${deleteDoc.name}» удалён`, 'warn');
    setDeleteDoc(null);
  };

  const handleUploadOrReplace = (newDoc: DocRecord) => {
    const version = replaceDoc ? ((_tabDocCache.get(courier.id)?.docs.find(d => d.document_id === replaceDoc.document_id) as any)?.version ?? 1) + 1 : 1;
    if (replaceDoc) {
      setDocs(prev => prev.map(d => d.document_id === newDoc.document_id ? { ...newDoc, version } : d));
      showToast(`🔃 «${newDoc.name}» заменён — на проверке`);
    } else {
      setDocs(prev => [...prev, newDoc]);
      showToast(`📁 «${newDoc.name}» загружен — на проверке`);
    }
    // ── Sync to global Compliance Store (add or update) ───────────────────
    syncDocToStore(courier, newDoc, version);
    setReplaceDoc(null);
  };

  const openReplaceModal = (doc: DocRecord) => {
    setReplaceDoc(doc);
    setShowUpload(true);
  };

  const openEmailModal = (doc: DocRecord | null, all = false) => {
    const subj = doc ? `Документ: ${doc.name}` : `Документы курьера ${courier.name}`;
    const body = `Уважаемый(ая) ${courier.name.split(' ')[0]},\n\n${
      doc ? `Во вложении направляем документ «${doc.name}».` : `Во вложении направляем ваши актуальные документы (${docs.length} файлов).`
    }\n\nС уважением,\nАдминистрация PVZ Platform`;
    setEmailSubject(subj);
    setEmailBody(body);
    setEmailModal({ doc, all });
  };

  const handleSendEmail = () => {
    if (!emailModal) return;
    const target = emailModal.doc ? `«${emailModal.doc.name}»` : `все документы (${docs.length})`;
    addAudit('EMAIL', `Отправлен email на ${courier.email}: тема «${emailSubject}», вложение: ${target}`);
    showToast(`📧 Email отправлен на ${courier.email}`);
    setEmailModal(null);
    setEmailSubject('');
    setEmailBody('');
  };

  const handleGeneratePDF = () => {
    addAudit('PDF_PACK', `Сгенерирован PDF-пакет: ${docs.length} файлов`);
    showToast('🖨 PDF-пакет готов к скачиванию');
  };

  const borderColor = (doc: DocRecord) =>
    doc.status === 'expired' ? 'border-red-200' :
    doc.status === 'expiring_soon' ? 'border-amber-200' : 'border-gray-200';

  const iconBg = (doc: DocRecord) =>
    doc.status === 'expired' ? 'bg-red-50 border-red-200' :
    doc.status === 'expiring_soon' ? 'bg-amber-50 border-amber-200' :
    doc.status === 'pending_verification' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200';

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{docs.length} документов</p>
          <p className="text-xs text-gray-400 mt-0.5">ID: {courier.id} · {courier.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGeneratePDF}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />PDF-пакет
          </button>
          <button
            onClick={() => openEmailModal(null, true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />Email все
          </button>
          <button
            onClick={() => { setReplaceDoc(null); setShowUpload(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />Загрузить документ
          </button>
        </div>
      </div>

      {/* ── Status summary strip ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Действительных', count: docs.filter(d => d.status === 'active').length, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'Истекают (30 дн.)', count: expiringSoon.length, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Истёкших', count: expiredDocs.length, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100' },
        ].map(({ label, count, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-3 text-center`}>
            <p className={`text-base font-bold ${color}`}>{count}</p>
            <p className={`text-[10px] ${color} opacity-80 mt-0.5 leading-tight`}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Expiry warnings ── */}
      {(expiredDocs.length > 0 || expiringSoon.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
          <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Предупреждения — система отправила уведомление курьеру и администратору
          </p>
          {expiredDocs.map(d => (
            <div key={d.document_id} className="flex items-center gap-2 text-xs text-red-700">
              <XCircle className="w-3 h-3 shrink-0" />
              <span><strong>{d.name}</strong> — срок истёк {d.expires_at && `(${d.expires_at})`}</span>
              <span className="ml-auto text-[10px] bg-red-100 px-1.5 py-0.5 rounded font-medium">EXPIRED</span>
            </div>
          ))}
          {expiringSoon.map(d => {
            const days = daysUntil(d.expires_at);
            return (
              <div key={d.document_id} className="flex items-center gap-2 text-xs text-amber-700">
                <Clock className="w-3 h-3 shrink-0" />
                <span><strong>{d.name}</strong> — истекает через {days} дн. ({d.expires_at})</span>
                <span className="ml-auto text-[10px] bg-amber-100 px-1.5 py-0.5 rounded font-medium">EXPIRING SOON</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Documents list ── */}
      <div className="space-y-2">
        {docs.map(doc => {
          const sc = STATUS_CFG[doc.status];
          const days = daysUntil(doc.expires_at);
          return (
            <div
              key={doc.document_id}
              className={`flex items-center gap-3 p-3.5 bg-white rounded-xl border transition-all hover:shadow-sm ${borderColor(doc)}`}
            >
              {/* Icon / thumbnail — check global docPreviewStore first */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${iconBg(doc)}`}>
                {(() => {
                  const compId = `${courier.id}-${doc.document_id}`;
                  const src = getDocPreview(compId) ?? doc.previewUrl;
                  return src && isImage(doc.format)
                    ? <img src={src} alt={doc.name} className="w-full h-full object-cover" />
                    : FORMAT_ICON[doc.format];
                })()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                  <span className="text-[10px] uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{doc.format}</span>
                  <span className="text-[10px] text-gray-400">{doc.size}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5 flex-wrap">
                  <span>Загружен: {doc.uploaded_at}</span>
                  {doc.issued_at && <span>Выдан: {doc.issued_at}</span>}
                  {doc.expires_at && (
                    <span className={
                      doc.status === 'expired' ? 'text-red-600 font-medium' :
                      doc.status === 'expiring_soon' ? 'text-amber-600 font-medium' : ''
                    }>
                      До: {doc.expires_at}
                      {doc.status === 'expiring_soon' && days !== null && ` (${days} дн.)`}
                    </span>
                  )}
                  {doc.reviewed_by_label && (
                    <span className="flex items-center gap-1 text-[10px]">
                      <Shield className="w-3 h-3 text-green-500" />
                      <span className={doc.compliance_status === 'approved' ? 'text-green-600' : doc.compliance_status === 'rejected' ? 'text-red-500' : 'text-gray-400'}>
                        {doc.compliance_status === 'approved' ? 'Одобрен' : doc.compliance_status === 'rejected' ? 'Отклонён' : 'Проверен'}: {doc.reviewed_by_label} · {doc.reviewed_at}
                      </span>
                    </span>
                  )}
                  {doc.reject_reason && (
                    <span className="text-[10px] text-red-500 font-medium">Причина: {doc.reject_reason}</span>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${sc.badge}`}>
                {sc.icon}{sc.label}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => handleView(doc)} title="Просмотр" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <Eye className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button onClick={() => handleDownload(doc)} title="Скачать" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button onClick={() => openReplaceModal(doc)} title="Заменить" className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                </button>
                <button onClick={() => handleRefresh(doc)} title="Обновить" className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors">
                  <RotateCcw className="w-3.5 h-3.5 text-teal-500" />
                </button>
                <button onClick={() => openEmailModal(doc)} title="Email" className="p-1.5 hover:bg-green-50 rounded-lg transition-colors">
                  <Mail className="w-3.5 h-3.5 text-green-600" />
                </button>
                <button onClick={() => setDeleteDoc(doc)} title="Удалить" className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Audit log ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAudit(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-xs font-semibold text-gray-600"
        >
          <span className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Аудит-лог ({audit.length})
          </span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAudit ? 'rotate-90' : ''}`} />
        </button>
        {showAudit && (
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {audit.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-xs">
                  {AUDIT_ICON[a.action]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{AUDIT_LABEL[a.action]}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{a.details}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{a.timestamp} · {a.user}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════ MODALS ══════════════════ */}

      {/* Upload / Replace modal */}
      {showUpload && (
        <UploadModal
          courier={courier}
          onClose={() => { setShowUpload(false); setReplaceDoc(null); }}
          onUpload={handleUploadOrReplace}
          onAudit={addAudit}
          replaceTarget={replaceDoc ?? undefined}
        />
      )}

      {/* Viewer — upgraded to shared DocumentViewerModal with navigation */}
      {viewDoc && (() => {
        const allDocRecords: DocumentRecord[] = docs.map(d => {
          const statusMap: Record<DocStatus, 'signed' | 'pending' | 'draft' | 'expired' | 'rejected'> = {
            active: 'signed', expiring_soon: 'pending', expired: 'expired',
            pending_verification: 'pending', rejected: 'rejected',
          };
          const content: DocumentContent = {
            title: d.name,
            subtitle: DOC_LABELS[d.document_type] ?? d.document_type,
            number: d.document_id,
            date: d.uploaded_at,
            organization: 'PVZ Platform — Документы курьера',
            headerFields: [
              { label: 'Тип документа', value: DOC_LABELS[d.document_type] ?? d.document_type },
              { label: 'Формат', value: d.format.toUpperCase() },
              { label: 'Размер', value: d.size },
              { label: 'Загружен', value: d.uploaded_by },
            ],
            tableHeaders: ['Параметр', 'Значение'],
            tableRows: [
              ['ID документа', d.document_id],
              ['Дата выдачи', d.issued_at ?? '—'],
              ['Действует до', d.expires_at ?? 'Бессрочно'],
              ['Статус', STATUS_CFG[d.status]?.label ?? d.status],
              ['Загружен', d.uploaded_at],
              ['Загружен кем', d.uploaded_by],
            ],
            signatures: [{ role: 'Загрузил', name: d.uploaded_by, signed: true, date: d.uploaded_at }],
            notes: d.expires_at ? [`Срок действия до: ${d.expires_at}`] : undefined,
          };
          return {
            id: d.document_id,
            name: d.name,
            type: d.format.toUpperCase(),
            size: d.size,
            date: d.uploaded_at,
            status: statusMap[d.status] ?? 'draft',
            number: d.document_id,
            content,
          };
        });
        const currentDoc = allDocRecords.find(r => r.id === viewDoc.document_id) || allDocRecords[0];
        return ReactDOM.createPortal(
          <DocumentViewerModal
            doc={currentDoc}
            onClose={() => setViewDoc(null)}
            allDocs={allDocRecords}
            onNavigate={(navDoc) => {
              const found = docs.find(d => d.document_id === navDoc.id);
              if (found) setViewDoc(found);
            }}
          />,
          document.body
        );
      })()}

      {/* Delete confirm */}
      {deleteDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteDoc(null)}>
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b bg-red-50 flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm flex-1">Удалить документ?</h3>
              <button onClick={() => setDeleteDoc(null)} className="p-1.5 hover:bg-gray-200 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Вы уверены, что хотите безвозвратно удалить документ <strong>«{deleteDoc.name}»</strong>?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteDoc(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">Удалить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEmailModal(null)}>
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b bg-green-50 flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                <Mail className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm">Отправить на email</h3>
                <p className="text-[10px] text-gray-500">{courier.email}</p>
              </div>
              <button onClick={() => setEmailModal(null)} className="p-1.5 hover:bg-gray-200 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {emailModal.doc && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                  {FORMAT_ICON[emailModal.doc.format]}
                  <span className="font-medium">{emailModal.doc.name} ({emailModal.doc.format.toUpperCase()}, {emailModal.doc.size})</span>
                </div>
              )}
              {emailModal.all && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium">PDF-пакет: все {docs.length} документов</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Кому</label>
                <input value={courier.email} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Тема</label>
                <input
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Текст письма</label>
                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEmailModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={handleSendEmail} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                  <Send className="w-3.5 h-3.5" />Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 text-white text-sm rounded-xl shadow-xl flex items-center gap-2 max-w-sm transition-all ${toast.type === 'warn' ? 'bg-red-700' : 'bg-gray-900'}`}>
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          {toast.msg}
        </div>
      )}
    </div>
  );
}