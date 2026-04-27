import { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, User, Phone, Mail, Globe,
  MapPin, CreditCard, FileText,
  CheckCircle, Clock, AlertCircle, XCircle, Download, Upload, Eye,
  Pencil, Save, X, Shield, Percent, Truck, Calendar,
  Building, Landmark, BadgeCheck, StickyNote, Lock, ExternalLink,
  Star, Copy, Check, Send, AlertTriangle, RefreshCw, Trash2,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw,
  Paperclip, FileImage, FileBadge, Package,
} from 'lucide-react';
import { SellerDetail, getTypeLabel } from '../../data/merchants-mock';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props { seller: SellerDetail; }

type DocStatus = 'verified' | 'pending' | 'expired' | 'missing';

interface DocFile {
  id: string;
  name: string;          // document type name
  type: string;          // badge label
  status: DocStatus;
  uploadedAt: string | null;
  expiresAt: string | null;
  size: string | null;
  uploadedBy: string | null;
  // real file (after user upload):
  file?: File;
  fileUrl?: string;      // blob URL or mock URL
  fileName?: string;     // original filename
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DOC_STATUS: Record<DocStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  verified: { label: 'Проверен',    color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',        icon: CheckCircle },
  pending:  { label: 'На проверке', color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200',       icon: Clock },
  expired:  { label: 'Истёк срок',  color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',          icon: XCircle },
  missing:  { label: 'Не загружен', color: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-dashed border-gray-300', icon: AlertCircle },
};

function initDocs(seller: SellerDetail): DocFile[] {
  return [
    { id: 'doc-1', name: 'Свидетельство о регистрации юр. лица', type: 'Регистрация', status: 'verified',
      uploadedAt: '2024-06-20', expiresAt: null, size: '1.2 МБ', uploadedBy: 'Система (onboarding)', fileName: 'svidetelstvo_reg.pdf' },
    { id: 'doc-2', name: 'ИНН организации', type: 'Налоговый', status: 'verified',
      uploadedAt: '2024-06-20', expiresAt: null, size: '0.8 МБ', uploadedBy: 'Система (onboarding)', fileName: 'inn_org.pdf' },
    { id: 'doc-3', name: 'Устав / учредительные документы', type: 'Учредительный',
      status: seller.riskLevel === 'high' ? 'pending' : 'verified',
      uploadedAt: seller.riskLevel === 'high' ? '2026-01-15' : '2024-06-22',
      expiresAt: null, size: '3.4 МБ', uploadedBy: 'Иванов А.С.', fileName: 'ustav.pdf' },
    { id: 'doc-4', name: 'Договор о сотрудничестве с платформой', type: 'Договор', status: 'verified',
      uploadedAt: '2024-07-01', expiresAt: '2027-07-01', size: '2.1 МБ', uploadedBy: 'Юридический отдел', fileName: 'dogovor_partner.pdf' },
    { id: 'doc-5', name: 'Банковские реквизиты (выписка из банка)', type: 'Финансовый', status: 'verified',
      uploadedAt: '2024-06-25', expiresAt: '2026-12-31', size: '0.5 МБ', uploadedBy: 'Иванов А.С.', fileName: 'bank_requisity.pdf' },
    { id: 'doc-6', name: 'Лицензия на торговлю', type: 'Лицензия',
      status: seller.sellerType === 'restaurant' ? 'verified' : 'missing',
      uploadedAt: seller.sellerType === 'restaurant' ? '2024-08-10' : null,
      expiresAt: seller.sellerType === 'restaurant' ? '2027-08-10' : null,
      size: seller.sellerType === 'restaurant' ? '1.8 МБ' : null,
      uploadedBy: seller.sellerType === 'restaurant' ? 'Иванов А.С.' : null,
      fileName: seller.sellerType === 'restaurant' ? 'licenziya.pdf' : undefined },
    { id: 'doc-7', name: 'Паспорт директора / доверенность', type: 'Удостоверение', status: 'verified',
      uploadedAt: '2024-06-20', expiresAt: '2028-05-14', size: '1.1 МБ', uploadedBy: 'Иванов А.С.', fileName: 'pasport_dir.pdf' },
    { id: 'doc-8', name: 'Сертификат соответствия товаров', type: 'Сертификат',
      status: seller.riskLevel !== 'low' ? 'expired' : 'verified',
      uploadedAt: '2024-09-01', expiresAt: seller.riskLevel !== 'low' ? '2025-09-01' : '2027-09-01',
      size: '0.9 МБ', uploadedBy: 'Отдел качества', fileName: 'sertifikat.pdf' },
  ];
}

// ─── Modal helpers ─────────────────────────────────────────────────────────────

function useEscClose(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
}

// ─── Document Viewer Modal ─────────────────────────────────────────────────────

function DocViewer({ doc, onClose }: { doc: DocFile; onClose: () => void }) {
  useEscClose(onClose);
  const [zoom, setZoom] = useState(1);
  const isImage = doc.file ? doc.file.type.startsWith('image/') : false;
  const isPdf   = doc.file ? doc.file.type === 'application/pdf' : !isImage;
  const url = doc.fileUrl;

  const portal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex flex-col bg-gray-900/95"
        onClick={onClose}
      >
        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-3 bg-gray-800 border-b border-gray-700" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="text-sm font-semibold text-white truncate">{doc.name}</p>
            {doc.fileName && <span className="text-xs text-gray-400 shrink-0">— {doc.fileName}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Zoom controls (for images) */}
            {isImage && (
              <div style={{display:'contents'}}>
                <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Уменьшить">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, z + 0.2))}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Увеличить">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => setZoom(1)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Сбросить масштаб">
                  <RotateCw className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-gray-600 mx-1" />
              </div>
            )}
            {/* Download */}
            {url && (
              <a href={url} download={doc.fileName ?? doc.name}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" /> Скачать
              </a>
            )}
            <button onClick={onClose}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors ml-1" title="Закрыть (Esc)">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-6" onClick={e => e.stopPropagation()}>
          {!url ? (
            // Mock document preview for demo docs
            <MockDocPreview doc={doc} />
          ) : isImage ? (
            <img
              src={url} alt={doc.name}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', maxWidth: '100%' }}
              className="rounded-lg shadow-2xl transition-transform"
            />
          ) : (
            <iframe
              src={url}
              title={doc.name}
              className="w-full max-w-4xl bg-white rounded-lg shadow-2xl"
              style={{ height: 'calc(100vh - 120px)' }}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
  return ReactDOM.createPortal(portal, document.body);
}

// Mock document preview for seeded documents (no real file)
function MockDocPreview({ doc }: { doc: DocFile }) {
  const sc = DOC_STATUS[doc.status];
  const StatusIcon = sc.icon;
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-2xl w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{doc.name}</h2>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color} ${sc.border}`}>
          <StatusIcon className="w-3 h-3" />{sc.label}
        </span>
      </div>
      <div className="space-y-3 bg-gray-50 rounded-xl p-6 border border-gray-200">
        {[
          { label: 'Тип документа', value: doc.type },
          { label: 'Дата загрузки', value: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
          { label: 'Загружен пользователем', value: doc.uploadedBy ?? '—' },
          { label: 'Размер файла', value: doc.size ?? '—' },
          { label: 'Имя файла', value: doc.fileName ?? '—' },
          ...(doc.expiresAt ? [{ label: 'Действует до', value: new Date(doc.expiresAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) }] : []),
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
            <span className="text-sm text-gray-500">{row.label}</span>
            <span className="text-sm font-semibold text-gray-900">{row.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-center text-gray-400">
        Для просмотра оригинала файла загрузите документ через кнопку «Заменить» или «Загрузить»
      </p>
    </div>
  );
}

// ─── Send Document Modal ───────────────────────────────────────────────────────

function SendDocModal({ doc, sellerEmail, onClose }: { doc: DocFile; sellerEmail: string; onClose: () => void }) {
  useEscClose(onClose);
  const [to, setTo] = useState(sellerEmail);
  const [subject, setSubject] = useState(`Документ: ${doc.name}`);
  const [body, setBody] = useState(`Уважаемый партнёр,\n\nПересылаем документ «${doc.name}».\n\nС уважением,\nАдминистрация платформы`);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!to.trim() || !subject.trim()) { toast.error('Укажите получателя и тему'); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 900));
    setSending(false);
    setSent(true);
    toast.success(`Документ «${doc.name}» отправлен на ${to}`);
    setTimeout(onClose, 1200);
  }

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <Send className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Отправить документ</p>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Paperclip className="w-3 h-3" />{doc.fileName ?? doc.name}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Кому *</label>
              <input value={to} onChange={e => setTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Тема *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Сообщение</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            {/* Attachment badge */}
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-xs text-blue-700 font-medium">{doc.fileName ?? doc.name}</span>
              {doc.size && <span className="text-xs text-blue-500 ml-auto">{doc.size}</span>}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Отмена
              </button>
              <button onClick={handleSend} disabled={sending || sent}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {sent ? <span style={{display:'contents'}}><Check className="w-4 h-4" />Отправлено!</span>
                  : sending ? <span style={{display:'contents'}}><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Отправка…</span>
                  : <span style={{display:'contents'}}><Send className="w-4 h-4" />Отправить</span>}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Upload Confirm Modal ──────────────────────────────────────────────────────

function UploadConfirmModal({ file, docName, onConfirm, onClose }: {
  file: File; docName: string; onConfirm: () => void; onClose: () => void;
}) {
  useEscClose(onClose);
  const isImage = file.type.startsWith('image/');
  const previewUrl = isImage ? URL.createObjectURL(file) : null;
  const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
  const [uploading, setUploading] = useState(false);

  async function go() {
    setUploading(true);
    await new Promise(r => setTimeout(r, 700));
    onConfirm();
  }

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-bold text-gray-900">Загрузка документа</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-500">Документ будет привязан к: <span className="font-semibold text-gray-800">{docName}</span></p>

            {/* File preview */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0" />
              ) : (
                <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 break-all">{file.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{file.type || 'Неизвестный тип'} · {sizeMb} МБ</p>
              </div>
            </div>

            {parseFloat(sizeMb) > 10 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Файл больше 10 МБ — это может замедлить загрузку.
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Отмена</button>
              <button onClick={go} disabled={uploading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                {uploading
                  ? <span style={{display:'contents'}}><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Загрузка…</span>
                  : <span style={{display:'contents'}}><Upload className="w-4 h-4" />Подтвердить</span>}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      title="Копировать"
      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, accent = 'blue', children, action }: {
  title: string; icon: any; accent?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  const borders: Record<string, string> = {
    blue: 'border-l-blue-500', green: 'border-l-green-500', purple: 'border-l-purple-500',
    orange: 'border-l-orange-500', gray: 'border-l-gray-400', red: 'border-l-red-500', yellow: 'border-l-yellow-500',
  };
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${borders[accent] ?? borders.blue} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-800 tracking-tight">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, copyable, editMode, editValue, onEdit, badge }: {
  label: string; value: React.ReactNode; copyable?: string;
  editMode?: boolean; editValue?: string; onEdit?: (v: string) => void; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0 gap-4">
      <span className="text-xs text-gray-500 font-medium w-44 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0 flex items-center gap-2 justify-end text-right">
        {editMode && onEdit && typeof editValue === 'string' ? (
          <input value={editValue} onChange={e => onEdit(e.target.value)}
            className="w-full text-xs border border-blue-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-right bg-blue-50/40" />
        ) : (
          <span style={{display:'contents'}}>
            {badge}
            <span className="text-xs font-semibold text-gray-900">{value}</span>
            {copyable && <CopyButton value={copyable} />}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocumentCard({ doc, onUpload, onView, onDownload, onSend, onDelete }: {
  doc: DocFile;
  onUpload: (id: string) => void;
  onView: (id: string) => void;
  onDownload: (id: string) => void;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const sc = DOC_STATUS[doc.status];
  const StatusIcon = sc.icon;
  const isMissing = doc.status === 'missing';
  const hasFile = !!doc.file || (doc.status !== 'missing');
  const isExpiringSoon = doc.expiresAt && doc.status !== 'expired' &&
    new Date(doc.expiresAt) < new Date(Date.now() + 30 * 86400000);

  return (
    <div className={`group flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-sm ${sc.border} ${sc.bg}`}>
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
        isMissing ? 'bg-gray-100 border-2 border-dashed border-gray-300' : 'bg-white shadow-sm border border-gray-100'
      }`}>
        {isMissing
          ? <Upload className="w-5 h-5 text-gray-300" />
          : doc.file?.type.startsWith('image/')
            ? <FileImage className="w-5 h-5 text-blue-400" />
            : <FileBadge className="w-5 h-5 text-gray-500" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{doc.name}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.color} ${sc.bg} ${sc.border}`}>
            <StatusIcon className="w-2.5 h-2.5" />{sc.label}
          </span>
          {isExpiringSoon && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
              <AlertTriangle className="w-2.5 h-2.5" />Истекает скоро
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{doc.type}</span>
          {doc.fileName && <span className="text-[10px] text-gray-500 font-mono">{doc.fileName}</span>}
          {doc.uploadedAt && <span className="text-[10px] text-gray-400">Загружен: {new Date(doc.uploadedAt).toLocaleDateString('ru-RU')}</span>}
          {doc.expiresAt && (
            <span className={`text-[10px] font-medium ${doc.status === 'expired' ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-gray-400'}`}>
              До: {new Date(doc.expiresAt).toLocaleDateString('ru-RU')}
            </span>
          )}
          {doc.size && <span className="text-[10px] text-gray-400">{doc.size}</span>}
          {doc.uploadedBy && <span className="text-[10px] text-gray-400">{doc.uploadedBy}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
        {/* View */}
        <button onClick={() => onView(doc.id)} title="Просмотр"
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Eye className="w-4 h-4" />
        </button>
        {/* Download */}
        <button onClick={() => onDownload(doc.id)} title="Скачать"
          disabled={isMissing}
          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <Download className="w-4 h-4" />
        </button>
        {/* Send */}
        <button onClick={() => onSend(doc.id)} title="Отправить по email"
          disabled={isMissing}
          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" />
        </button>
        {/* Upload / Replace */}
        <button onClick={() => onUpload(doc.id)} title={isMissing ? 'Загрузить' : 'Заменить'}
          className={`p-2 rounded-lg transition-colors ${
            isMissing
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
          }`}>
          {isMissing ? <Upload className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
        </button>
        {/* Delete (only if user-uploaded) */}
        {doc.file && (
          <button onClick={() => onDelete(doc.id)} title="Удалить файл"
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function SellerProfileTab({ seller }: Props) {
  // ── State ──
  const [editMode, setEditMode]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [docs, setDocs]           = useState<DocFile[]>(() => initDocs(seller));
  const [notes, setNotes]         = useState(seller.notesInternal || '');
  const [notesSaved, setNotesSaved] = useState(false);

  // Viewer / modal
  const [viewerDoc,     setViewerDoc]     = useState<DocFile | null>(null);
  const [sendDoc,       setSendDoc]       = useState<DocFile | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; docId: string } | null>(null);

  // Hidden file input ref per doc
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingDocId = useRef<string>('');

  // Edit form
  const [form, setForm] = useState({
    primaryContactName: seller.primaryContactName,
    primaryPhone:       seller.primaryPhone,
    primaryEmail:       seller.primaryEmail,
    billingEmail:       seller.billingEmail,
    taxId:              seller.taxId,
    bankAccount:        seller.bankAccount,
    timezone:           seller.timezone,
    legalName:          seller.legalName,
    displayName:        seller.displayName,
  });
  function up(f: keyof typeof form, v: string) { setForm(p => ({ ...p, [f]: v })); }

  // ── Save profile ──
  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    setEditMode(false);
    toast.success('Профиль сохранён. Изменения записаны в аудит-лог.');
  }
  function cancelEdit() {
    setForm({
      primaryContactName: seller.primaryContactName,
      primaryPhone:       seller.primaryPhone,
      primaryEmail:       seller.primaryEmail,
      billingEmail:       seller.billingEmail,
      taxId:              seller.taxId,
      bankAccount:        seller.bankAccount,
      timezone:           seller.timezone,
      legalName:          seller.legalName,
      displayName:        seller.displayName,
    });
    setEditMode(false);
  }

  // ── Upload flow ──
  function triggerUpload(docId: string) {
    uploadingDocId.current = docId;
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingUpload({ file, docId: uploadingDocId.current });
    // reset so same file can be re-selected
    e.target.value = '';
  }

  function confirmUpload() {
    if (!pendingUpload) return;
    const { file, docId } = pendingUpload;
    const url = URL.createObjectURL(file);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setDocs(prev => prev.map(d => d.id === docId ? {
      ...d,
      file,
      fileUrl: url,
      fileName: file.name,
      size: `${sizeMb} МБ`,
      status: 'pending',
      uploadedAt: new Date().toISOString().slice(0, 10),
      uploadedBy: 'Администратор (вы)',
    } : d));
    toast.success(`Файл «${file.name}» загружен. Статус: На проверке.`);
    setPendingUpload(null);
  }

  // ── View ──
  function handleView(docId: string) {
    const d = docs.find(x => x.id === docId);
    if (d) setViewerDoc(d);
  }

  // ── Download ──
  function handleDownload(docId: string) {
    const d = docs.find(x => x.id === docId);
    if (!d) return;

    if (d.fileUrl && d.file) {
      // Real file
      const a = document.createElement('a');
      a.href = d.fileUrl;
      a.download = d.fileName ?? d.name;
      a.click();
      toast.success(`Скачивание: ${d.fileName}`);
    } else {
      // Mock file — generate a text blob as demo
      const content = `ДОКУМЕНТ: ${d.name}\nТип: ${d.type}\nСтатус: ${DOC_STATUS[d.status].label}\nДата загрузки: ${d.uploadedAt ?? '—'}\nСрок действия: ${d.expiresAt ?? 'Бессрочно'}\nЗагружен: ${d.uploadedBy ?? '—'}\nРазмер: ${d.size ?? '—'}\n\n[Демонстрационный файл — в production здесь будет оригинальный документ из хранилища]`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = d.fileName ?? `${d.name}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Скачивание: ${d.fileName ?? d.name}`);
    }
  }

  // ── Send ──
  function handleSend(docId: string) {
    const d = docs.find(x => x.id === docId);
    if (d) setSendDoc(d);
  }

  // ── Delete file ──
  function handleDelete(docId: string) {
    setDocs(prev => prev.map(d => d.id === docId
      ? { ...d, file: undefined, fileUrl: undefined, fileName: undefined, status: 'missing', uploadedAt: null, size: null, uploadedBy: null }
      : d));
    toast.success('Файл удалён. Загрузите новый документ.');
  }

  // ── Save notes ──
  async function saveNotes() {
    setNotesSaved(true);
    await new Promise(r => setTimeout(r, 500));
    setNotesSaved(false);
    toast.success('Заметка сохранена. Изменение записано в аудит-лог.');
  }

  // ── Export all docs ──
  function exportAllDocs() {
    const hasDocs = docs.filter(d => d.status !== 'missing');
    if (!hasDocs.length) { toast.error('Нет доступных документов для экспорта.'); return; }
    const content = hasDocs.map(d =>
      `${d.name}\n  Файл: ${d.fileName ?? '—'}\n  Статус: ${DOC_STATUS[d.status].label}\n  Загружен: ${d.uploadedAt ?? '—'}\n  Загрузил: ${d.uploadedBy ?? '—'}\n  Размер: ${d.size ?? '—'}\n  Истекает: ${d.expiresAt ?? 'Бессрочно'}`
    ).join('\n\n');
    const blob = new Blob([`РЕЕСТР ДОКУМЕНТОВ — ${seller.displayName} (${seller.sellerCode})\n${'─'.repeat(60)}\n\n${content}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents_${seller.sellerCode}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Реестр документов (${hasDocs.length} шт.) экспортирован.`);
  }

  const docStats = {
    verified: docs.filter(d => d.status === 'verified').length,
    pending:  docs.filter(d => d.status === 'pending').length,
    expired:  docs.filter(d => d.status === 'expired').length,
    missing:  docs.filter(d => d.status === 'missing').length,
  };
  const hasIssues = docStats.expired > 0 || docStats.missing > 0;

  return (
    <div className="space-y-4">

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.xls,.xlsx"
        onChange={onFileSelected}
      />

      {/* Edit toolbar */}
      {editMode && (
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Pencil className="w-4 h-4" />
            <span className="font-medium">Режим редактирования</span>
            <span className="text-blue-400 hidden sm:inline">— изменения фиксируются в аудит-логе</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cancelEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors">
              <X className="w-3.5 h-3.5" />Отмена
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-60">
              {saving
                ? <span style={{display:'contents'}}><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Сохранение…</span>
                : <span style={{display:'contents'}}><Save className="w-3.5 h-3.5" />Сохранить</span>}
            </button>
          </div>
        </div>
      )}

      {/* ── Top grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main info */}
        <div className="lg:col-span-2">
          <Section title="Основная информация" icon={Building2} accent="blue"
            action={!editMode ? (
              <button onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Pencil className="w-3 h-3" />Редактировать
              </button>
            ) : null}>
            <InfoRow label="Отображаемое имя"  value={form.displayName}  copyable={form.displayName}
              editMode={editMode} editValue={form.displayName} onEdit={v => up('displayName', v)} />
            <InfoRow label="Юридическое название" value={form.legalName} copyable={form.legalName}
              editMode={editMode} editValue={form.legalName} onEdit={v => up('legalName', v)} />
            <InfoRow label="Код продавца" value={seller.sellerCode} copyable={seller.sellerCode}
              badge={<span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{seller.sellerCode}</span>} />
            <InfoRow label="Тип продавца" value={getTypeLabel(seller.sellerType) ?? seller.sellerType} />
            <InfoRow label="Рейтинг" value={
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{seller.rating.toFixed(1)}
              </span>} />
            <InfoRow label="Верификация" value={
              seller.verified
                ? <span className="flex items-center gap-1 text-green-700"><BadgeCheck className="w-3.5 h-3.5" />Верифицирован</span>
                : <span className="text-orange-600">Не верифицирован</span>} />
            <InfoRow label="Дата регистрации" value={new Date(seller.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })} />
            <InfoRow label="Последняя активность" value={new Date(seller.lastActivity).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            <InfoRow label="Города" value={seller.cities.join(', ')} />
            <InfoRow label="Регионы" value={seller.regions.join(', ')} />
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Docs summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-bold text-gray-800">Документы</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Проверено', value: docStats.verified, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
                { label: 'На проверке', value: docStats.pending, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
                { label: 'Истёк срок', value: docStats.expired, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
                { label: 'Отсутствует', value: docStats.missing, bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
              ].map(s => (
                <div key={s.label} className={`p-2.5 ${s.bg} rounded-xl text-center border ${s.border}`}>
                  <p className={`text-lg font-bold ${s.text}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Tariff */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-bold text-gray-800">Тарифный план</p>
            </div>
            {[
              { label: 'Тариф', value: seller.commissionPlanName },
              { label: 'Ставка', value: <span className="text-blue-600 font-bold">{seller.commissionRate}%</span> },
              { label: 'Исполнение', value: seller.fulfillmentType },
              { label: 'Часовой пояс', value: seller.timezone },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{r.label}</span>
                <span className="text-xs font-semibold text-gray-900">{r.value}</span>
              </div>
            ))}
          </div>
          {/* Risk */}
          <div className={`rounded-2xl border p-4 ${
            seller.riskLevel === 'high' ? 'bg-red-50 border-red-200' :
            seller.riskLevel === 'medium' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${seller.riskLevel === 'high' ? 'text-red-500' : seller.riskLevel === 'medium' ? 'text-orange-500' : 'text-green-500'}`} />
              <div>
                <p className={`text-xs font-bold ${seller.riskLevel === 'high' ? 'text-red-700' : seller.riskLevel === 'medium' ? 'text-orange-700' : 'text-green-700'}`}>
                  Риск: {seller.riskLevel === 'high' ? 'Высокий' : seller.riskLevel === 'medium' ? 'Средний' : 'Низкий'}
                </p>
                <p className={`text-[10px] ${seller.riskLevel === 'high' ? 'text-red-500' : seller.riskLevel === 'medium' ? 'text-orange-500' : 'text-green-500'}`}>
                  {seller.riskLevel === 'high' ? 'Расследование активно' : seller.riskLevel === 'medium' ? 'Повышенный контроль' : 'Нет нарушений'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Legal + Contacts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Юридические реквизиты" icon={Landmark} accent="purple">
          <InfoRow label="ИНН" value={form.taxId} copyable={form.taxId}
            editMode={editMode} editValue={form.taxId} onEdit={v => up('taxId', v)} />
          <InfoRow label="ОГРН / ОГРНИП" value="7707123456890" copyable="7707123456890" />
          <InfoRow label="КПП" value="770701001" copyable="770701001" />
          <InfoRow label="Юридический адрес" value="125009, г. Москва, ул. Тверская, д. 15" copyable="125009, г. Москва, ул. Тверская, д. 15" />
          <InfoRow label="Фактический адрес" value="125009, г. Москва, ул. Тверская, д. 15" />
          <InfoRow label="Форма собственности" value={seller.legalName.startsWith('ИП') ? 'ИП' : seller.legalName.startsWith('ООО') ? 'ООО' : 'АО'} />
          <InfoRow label="ОКВЭД" value="47.91 — Торговля розничная по почте" />
        </Section>
        <Section title="Контактные данные" icon={User} accent="green">
          <InfoRow label="Контактное лицо" value={form.primaryContactName}
            editMode={editMode} editValue={form.primaryContactName} onEdit={v => up('primaryContactName', v)} />
          <InfoRow label="Телефон" value={<a href={`tel:${form.primaryPhone}`} className="text-blue-600 hover:underline">{form.primaryPhone}</a>} copyable={form.primaryPhone}
            editMode={editMode} editValue={form.primaryPhone} onEdit={v => up('primaryPhone', v)} />
          <InfoRow label="Email (операционный)" value={<a href={`mailto:${form.primaryEmail}`} className="text-blue-600 hover:underline">{form.primaryEmail}</a>} copyable={form.primaryEmail}
            editMode={editMode} editValue={form.primaryEmail} onEdit={v => up('primaryEmail', v)} />
          <InfoRow label="Email (выплаты)" value={<a href={`mailto:${form.billingEmail}`} className="text-blue-600 hover:underline">{form.billingEmail}</a>} copyable={form.billingEmail}
            editMode={editMode} editValue={form.billingEmail} onEdit={v => up('billingEmail', v)} />
          <InfoRow label="Часовой пояс" value={form.timezone}
            editMode={editMode} editValue={form.timezone} onEdit={v => up('timezone', v)} />
          <InfoRow label="Зоны обслуживания" value={(seller.serviceAreas ?? seller.cities).join(', ')} />
          <InfoRow label="Привязанных ПВЗ" value={`${seller.assignedPvzCount} — ${seller.assignedPvzNames.join(', ') || '—'}`} />
        </Section>
      </div>

      {/* ── Banking ── */}
      <Section title="Банковские реквизиты" icon={CreditCard} accent="orange">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12">
          <div>
            <InfoRow label="Расчётный счёт" value={form.bankAccount} copyable={form.bankAccount}
              editMode={editMode} editValue={form.bankAccount} onEdit={v => up('bankAccount', v)} />
            <InfoRow label="Банк" value="АО «Тинькофф Банк»" copyable="АО «Тинькофф Банк»" />
            <InfoRow label="БИК" value="044525974" copyable="044525974" />
          </div>
          <div>
            <InfoRow label="Корр. счёт" value="30101810145250000974" copyable="30101810145250000974" />
            <InfoRow label="Город банка" value="Москва" />
            <InfoRow label="SWIFT" value="TICSRUMM" copyable="TICSRUMM" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Общий оборот</p>
            <p className="font-bold text-gray-900">₽{(seller.totalRevenue / 1_000_000).toFixed(1)}M</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Заработок платф.</p>
            <p className="font-bold text-green-700">₽{(seller.platformEarnings / 1_000_000).toFixed(2)}M</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
            <p className="text-[10px] text-gray-400 uppercase mb-1">Ожид. выплата</p>
            <p className="font-bold text-orange-700">₽{(seller.pendingPayouts / 1_000).toFixed(0)}K</p>
          </div>
        </div>
      </Section>

      {/* ── Documents ── */}
      <Section title="Документы партнёра" icon={FileText} accent="gray"
        action={
          <div className="flex items-center gap-2">
            <button onClick={exportAllDocs}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-3 h-3" />Экспорт реестра
            </button>
            <button
              onClick={() => { uploadingDocId.current = 'new'; fileInputRef.current?.click(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              <Upload className="w-3 h-3" />Загрузить
            </button>
          </div>
        }>

        {/* Alert banner */}
        {hasIssues && (
          <div className={`flex items-start gap-3 p-3 rounded-xl mb-4 border ${
            docStats.expired > 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${docStats.expired > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
            <div className="text-xs">
              {docStats.expired > 0 && <p className="font-semibold text-red-700 mb-0.5">{docStats.expired} документ(а) с истёкшим сроком — требуется обновление.</p>}
              {docStats.missing > 0 && <p className="font-semibold text-yellow-700">{docStats.missing} документ(а) не загружен — требуется предоставление.</p>}
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {docs.map(doc => (
            <DocumentCard
              key={doc.id} doc={doc}
              onUpload={triggerUpload}
              onView={handleView}
              onDownload={handleDownload}
              onSend={handleSend}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </Section>

      {/* ── Internal notes ── */}
      <Section title="Внутренние заметки (только операторы)" icon={StickyNote} accent="yellow"
        action={<span className="flex items-center gap-1 text-[10px] text-gray-400"><Lock className="w-3 h-3" />Не видно продавцу</span>}>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Внутренние заметки: история инцидентов, договорённости, ограничения..."
          rows={4}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none bg-yellow-50/30 placeholder-gray-300"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-gray-400">{notes.length} симв.</span>
          <button onClick={saveNotes} disabled={notesSaved}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60">
            {notesSaved
              ? <span style={{display:'contents'}}><Check className="w-3.5 h-3.5 text-green-500" />Сохранено</span>
              : <span style={{display:'contents'}}><Save className="w-3.5 h-3.5" />Сохранить заметку</span>}
          </button>
        </div>
      </Section>

      {/* ═══ Modals / Overlays ═══ */}
      <AnimatePresence>
        {viewerDoc && <DocViewer doc={viewerDoc} onClose={() => setViewerDoc(null)} />}
      </AnimatePresence>

      {sendDoc && (
        <SendDocModal doc={sendDoc} sellerEmail={seller.primaryEmail} onClose={() => setSendDoc(null)} />
      )}

      {pendingUpload && (
        <UploadConfirmModal
          file={pendingUpload.file}
          docName={docs.find(d => d.id === pendingUpload.docId)?.name ?? 'Документ'}
          onConfirm={confirmUpload}
          onClose={() => setPendingUpload(null)}
        />
      )}
    </div>
  );
}