import { useState, useRef } from 'react';
import {
  AlertTriangle, MessageSquare, RotateCcw, ShieldAlert, Clock,
  CheckCircle, ArrowUpRight, ImageIcon, ZoomIn, Upload, Paperclip, Camera,
  Plus, X, RefreshCw,
} from 'lucide-react';
import {
  getQualityCases, QualityCase, QualityCaseMessage,
  QualityCaseRefund, QualityCaseAttachment,
} from '../../data/merchants-mock';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { CaseDetailPanel } from './CaseDetailPanel';

// ─── Config ───────────────────────────────────────────────────────────────────

interface Props { sellerId: string; }

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  complaint:  { label: 'Жалоба',        color: 'text-orange-700', bg: 'bg-orange-100', icon: MessageSquare },
  return:     { label: 'Возврат',       color: 'text-blue-700',   bg: 'bg-blue-100',   icon: RotateCcw },
  quality:    { label: 'Качество',      color: 'text-purple-700', bg: 'bg-purple-100', icon: AlertTriangle },
  fraud:      { label: 'Фрод',          color: 'text-red-700',    bg: 'bg-red-100',    icon: ShieldAlert },
  sla_breach: { label: 'SLA нарушение', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
};
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:          { label: 'Открыт',        color: 'text-blue-700',   bg: 'bg-blue-100' },
  investigating: { label: 'Расследование', color: 'text-orange-700', bg: 'bg-orange-100' },
  resolved:      { label: 'Решён',         color: 'text-green-700',  bg: 'bg-green-100' },
  escalated:     { label: 'Эскалирован',   color: 'text-red-700',    bg: 'bg-red-100' },
};

// ─── Attachment thumbnail strip (on card) ────────────────────────────────────

function AttachmentStrip({
  attachments, onView, onAdd,
}: {
  attachments: QualityCaseAttachment[];
  onView: (i: number) => void;
  onAdd: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
    if (files.length) { onAdd(files); toast.success(`Добавлено ${files.length} фото ✓`); }
    e.target.value = '';
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-1.5 mb-2">
        <Paperclip className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
          Вложения · {attachments.length}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {attachments.map((att, i) => (
          <button
            key={att.id}
            onClick={() => onView(i)}
            className="relative group w-14 h-14 rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 transition-all shadow-sm shrink-0"
            title={att.label}
          >
            <img src={att.url} alt={att.label} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/40 transition-all flex items-center justify-center">
              <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {i === 0 && attachments.length > 1 && (
              <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <Camera className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </button>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center gap-0.5 transition-all text-gray-400 hover:text-blue-500 shrink-0"
          title="Добавить фото"
        >
          <Upload className="w-4 h-4" />
          <span className="text-[9px] font-semibold leading-none">Добавить</span>
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>
    </div>
  );
}

// ─── Attachment Lightbox ──────────────────────────────────────────────────────

function AttachmentLightbox({
  attachments, initialIndex, caseCode, onClose,
}: {
  attachments: QualityCaseAttachment[];
  initialIndex: number;
  caseCode: string;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const current = attachments[idx];

  function go(dir: -1 | 1) { setIdx(i => Math.max(0, Math.min(attachments.length - 1, i + dir))); }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex flex-col"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gray-950/92 backdrop-blur-sm" />

      <div className="relative z-10 flex items-center justify-between px-5 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 bg-white/10 px-2 py-1 rounded-lg">{caseCode}</span>
          <span className="text-sm text-white/70">{current.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{idx + 1} / {attachments.length}</span>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-14 overflow-hidden" onClick={e => e.stopPropagation()}>
        <button onClick={() => go(-1)} disabled={idx === 0}
          className="absolute left-3 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition-all">
          ‹
        </button>
        <AnimatePresence mode="wait">
          <motion.img key={current.id} src={current.url} alt={current.label}
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="max-w-full object-contain rounded-xl shadow-2xl select-none"
            style={{ maxHeight: 'calc(100vh - 180px)' }} draggable={false}
          />
        </AnimatePresence>
        <button onClick={() => go(1)} disabled={idx === attachments.length - 1}
          className="absolute right-3 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition-all">
          ›
        </button>
      </div>

      <div className="relative z-10 shrink-0 px-5 pb-4 pt-2" onClick={e => e.stopPropagation()}>
        <p className="text-center text-xs text-gray-400 mb-3">
          {current.uploadedBy} · {new Date(current.uploadedAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
        {attachments.length > 1 && (
          <div className="flex justify-center gap-2">
            {attachments.map((att, i) => (
              <button key={att.id} onClick={() => setIdx(i)}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${i === idx ? 'border-blue-400 scale-105' : 'border-white/20 opacity-50 hover:opacity-80'}`}>
                <img src={att.url} alt={att.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Create Case Modal ────────────────────────────────────────────────────────

function CreateCaseModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (c: QualityCase) => void;
}) {
  const [form, setForm] = useState({
    type: 'complaint',
    priority: 'p2',
    subject: '',
    description: '',
    orderRef: '',
    customerName: '',
    customerPhone: '',
    amount: '',
  });
  const [saving, setSaving] = useState(false);

  function up(field: string, value: string) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSave() {
    if (!form.subject.trim()) { toast.error('Укажите тему кейса'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    const ts = Date.now();
    const newCase: QualityCase = {
      id: `qc-new-${ts}`,
      caseCode: `QC-2026-${String(Math.floor(Math.random() * 900 + 100))}`,
      type: form.type as any,
      priority: form.priority as any,
      subject: form.subject,
      status: 'open',
      createdAt: new Date().toISOString(),
      resolution: null,
      amount: form.amount ? parseFloat(form.amount) : null,
      orderRef: form.orderRef || undefined,
      customerName: form.customerName || undefined,
      customerPhone: form.customerPhone || undefined,
      assignedOperator: undefined,
      messages: [
        {
          id: `sys-${ts}-0`,
          senderName: 'Система',
          senderRole: 'system',
          text: `Кейс создан оператором. ${form.description ? `Описание: ${form.description}` : ''}`,
          sentAt: new Date().toISOString(),
        },
      ],
      attachments: [],
    };
    onCreate(newCase);
    setSaving(false);
    onClose();
    toast.success(`Кейс ${newCase.caseCode} создан ✓`);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Создать кейс QA</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Тип</label>
              <select value={form.type} onChange={e => up('type', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {Object.entries(TYPE_CONFIG).map(([t, c]) => <option key={t} value={t}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Приоритет</label>
              <select value={form.priority} onChange={e => up('priority', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {['p1', 'p2', 'p3', 'p4'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Тема <span className="text-red-500">*</span></label>
            <input value={form.subject} onChange={e => up('subject', e.target.value)}
              placeholder="Кратко опишите суть кейса..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Описание</label>
            <textarea value={form.description} onChange={e => up('description', e.target.value)}
              rows={3} placeholder="Подробное описание ситуации..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Order ref + amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Номер заказа</label>
              <input value={form.orderRef} onChange={e => up('orderRef', e.target.value)}
                placeholder="ORD-2026-..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Сумма спора (₽)</label>
              <input type="number" value={form.amount} onChange={e => up('amount', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Имя покупателя</label>
              <input value={form.customerName} onChange={e => up('customerName', e.target.value)}
                placeholder="Имя Фамилия"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Телефон</label>
              <input value={form.customerPhone} onChange={e => up('customerPhone', e.target.value)}
                placeholder="+7 (999) ..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving || !form.subject.trim()}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 text-white text-sm rounded-xl transition-colors flex items-center gap-2">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Создать кейс
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function SellerQualityTab({ sellerId }: Props) {
  const [cases, setCases] = useState<QualityCase[]>(() => getQualityCases(sellerId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [lightbox, setLightbox] = useState<{ atts: QualityCaseAttachment[]; idx: number; code: string } | null>(null);

  const selectedCase = cases.find(c => c.id === selectedId) ?? null;

  function updateCase(id: string, updates: Partial<QualityCase>) {
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  function addMessage(caseId: string, msg: QualityCaseMessage) {
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, messages: [...(c.messages ?? []), msg] } : c));
  }

  function updateRefund(caseId: string, updates: Partial<QualityCaseRefund>) {
    setCases(prev => prev.map(c =>
      c.id === caseId && c.refund ? { ...c, refund: { ...c.refund, ...updates } } : c
    ));
  }

  function addAttachment(caseId: string, files: File[]) {
    const newAtts: QualityCaseAttachment[] = files.map(f => ({
      id: `att-local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(f),
      label: f.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Оператор',
    }));
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, attachments: [...(c.attachments ?? []), ...newAtts] } : c));
    toast.success(`Добавлено ${files.length} фото ✓`);
  }

  function createCase(c: QualityCase) {
    setCases(prev => [c, ...prev]);
  }

  function handleEscalateAll() {
    const open = cases.filter(c => c.status === 'open' || c.status === 'investigating');
    if (!open.length) { toast.info('Нет активных кейсов для эскалации'); return; }
    setCases(prev => prev.map(c =>
      c.status === 'open' || c.status === 'investigating' ? { ...c, status: 'escalated' } : c
    ));
    toast.warning(`Эскалировано ${open.length} кейс(ов) в Senior QC`);
  }

  const stats = {
    total: cases.length,
    open: cases.filter(c => c.status === 'open' || c.status === 'investigating').length,
    resolved: cases.filter(c => c.status === 'resolved').length,
    totalAmount: cases.reduce((s, c) => s + (c.amount || 0), 0),
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-gray-900">{stats.total}</p>
          <p className="text-[10px] text-gray-500 uppercase">Всего кейсов</p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <p className="text-lg font-bold text-orange-600">{stats.open}</p>
          <p className="text-[10px] text-gray-500 uppercase">Активных</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">{stats.resolved}</p>
          <p className="text-[10px] text-gray-500 uppercase">Решено</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-lg font-bold text-red-600">₽{stats.totalAmount.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 uppercase">Сумма споров</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Создать кейс
        </button>
        <button
          onClick={handleEscalateAll}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" /> Эскалировать активные
        </button>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {cases.map(c => {
          const tc = TYPE_CONFIG[c.type] || TYPE_CONFIG.complaint;
          const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
          const TIcon = tc.icon;
          const atts = c.attachments ?? [];

          return (
            <div key={c.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
              {/* Top row */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${tc.bg} ${tc.color}`}>
                    <TIcon className="w-3 h-3" /> {tc.label}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    c.priority === 'p1' ? 'bg-red-100 text-red-700' :
                    c.priority === 'p2' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{c.priority.toUpperCase()}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  {c.refund && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      c.refund.status === 'processed' ? 'bg-green-100 text-green-700' :
                      c.refund.status === 'approved'  ? 'bg-blue-100 text-blue-700' :
                      c.refund.status === 'rejected'  ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      Возврат ₽{c.refund.amount.toLocaleString('ru-RU')}
                      {c.refund.status === 'processed' ? ' · Выплачен' :
                       c.refund.status === 'approved'  ? ' · Одобрен' :
                       c.refund.status === 'rejected'  ? ' · Отклонён' : ' · Ожидает'}
                    </span>
                  )}
                  {atts.length > 0 && (
                    <button
                      onClick={() => setLightbox({ atts, idx: 0, code: c.caseCode })}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                    >
                      <ImageIcon className="w-2.5 h-2.5" /> {atts.length} фото
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">{c.caseCode}</span>
                </div>
              </div>

              {/* Subject */}
              <p className="text-sm font-medium text-gray-900">{c.subject}</p>

              {/* Meta */}
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                <span>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</span>
                {c.amount && <span className="font-medium text-red-600">₽{c.amount.toLocaleString()}</span>}
                {c.assignedOperator && <span className="text-gray-500">👤 {c.assignedOperator.name}</span>}
                {c.customerName && <span className="text-gray-500">Покупатель: {c.customerName}</span>}
                {c.resolution && <span className="text-green-600">{c.resolution}</span>}
              </div>

              {/* Attachment strip */}
              <AttachmentStrip
                attachments={atts}
                onView={(i) => setLightbox({ atts, idx: i, code: c.caseCode })}
                onAdd={(files) => addAttachment(c.id, files)}
              />

              {/* Open case button */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  {c.messages && c.messages.filter(m => m.senderRole !== 'system').length > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {c.messages.filter(m => m.senderRole !== 'system').length} сообщений
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedId(c.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
                >
                  Открыть кейс →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {cases.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm">Нет кейсов качества</p>
        </div>
      )}

      {/* Case Detail Panel — portal to body */}
      {selectedCase && (
        <CaseDetailPanel
          case_={selectedCase}
          onClose={() => setSelectedId(null)}
          onUpdateCase={updateCase}
          onAddMessage={addMessage}
          onUpdateRefund={updateRefund}
          onAddAttachment={addAttachment}
          onViewAttachment={(atts, i) => setLightbox({ atts, idx: i, code: selectedCase.caseCode })}
        />
      )}

      {/* Create case modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateCaseModal
            onClose={() => setShowCreate(false)}
            onCreate={createCase}
          />
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && lightbox.atts.length > 0 && (
          <AttachmentLightbox
            attachments={lightbox.atts}
            initialIndex={lightbox.idx}
            caseCode={lightbox.code}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
