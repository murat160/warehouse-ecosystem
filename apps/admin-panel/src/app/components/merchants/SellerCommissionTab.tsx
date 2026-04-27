import { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'sonner';
import {
  Percent, Pencil as Edit2, Plus, Trash2, Check, X, AlertTriangle,
  Shield, CheckCircle2, Clock, History, Download, RefreshCw,
  ChevronDown, ChevronUp, Lock, Unlock, Info, TrendingUp,
  TrendingDown, BarChart2, DollarSign, ArrowRight, User,
  FileText, Save, Calculator, ArrowUpRight, ArrowDownRight,
  Copy, Eye, EyeOff,
} from 'lucide-react';
import { SellerDetail } from '../../data/merchants-mock';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type CommissionScope = 'platform' | 'category' | 'product' | 'custom';
type RuleStatus = 'active' | 'pending_approval' | 'expired' | 'disabled';
type ApprovalStatus = 'pending' | 'approved_1' | 'approved_2' | 'rejected';

interface CommissionRule {
  id: string;
  label: string;
  scope: CommissionScope;
  category?: string;
  baseRate: number;       // % platform takes
  courierRate: number;    // % courier share from delivery fee
  minOrderAmount: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: RuleStatus;
  approvedBy?: string[];
  createdBy: string;
  createdAt: string;
  note?: string;
}

interface CommissionChange {
  id: string;
  changedAt: string;
  changedBy: string;
  changedByRole: string;
  field: string;
  oldValue: string;
  newValue: string;
  approvers: string[];
  ip: string;
  reason: string;
}

interface SodRequest {
  ruleId: string | null; // null = new rule
  draft: Partial<CommissionRule>;
  reason: string;
  approver1?: string;
  approver2?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const COMMISSION_PLANS = [
  { id: 'standard', name: 'Standard', description: 'Базовый тариф', baseRate: 15 },
  { id: 'premium',  name: 'Premium',  description: 'Для топ-партнёров', baseRate: 12 },
  { id: 'startup',  name: 'Startup',  description: 'Первые 90 дней', baseRate: 8 },
  { id: 'custom',   name: 'Custom',   description: 'Индивидуальный договор', baseRate: null },
];

const CATEGORY_OPTIONS = [
  'Рестораны / еда', 'Продукты / FMCG', 'Электроника',
  'Одежда и аксессуары', 'Аптека', 'Товары для дома',
  'Авто / запчасти', 'Спорт / хобби', 'Косметика / Beauty',
  'Другое',
];

const APPROVERS = [
  { id: 'cfo',     name: 'Елена Воронова',  role: 'CFO' },
  { id: 'ceo',     name: 'Дмитрий Иванов',  role: 'CEO' },
  { id: 'finance', name: 'Андрей Смирнов',  role: 'Finance Lead' },
  { id: 'legal',   name: 'Ольга Титова',    role: 'Legal' },
];

function makeRules(commissionRate: number): CommissionRule[] {
  return [
    {
      id: 'rule-base',
      label: 'Базовая ставка платформы',
      scope: 'platform',
      baseRate: commissionRate,
      courierRate: 20,
      minOrderAmount: 0,
      effectiveFrom: '01.01.2026',
      status: 'active',
      approvedBy: ['Елена Воронова', 'Дмитрий Иванов'],
      createdBy: 'Система',
      createdAt: '01.01.2026',
    },
    {
      id: 'rule-electronics',
      label: 'Электроника — пониженная ставка',
      scope: 'category',
      category: 'Электроника',
      baseRate: commissionRate - 2,
      courierRate: 18,
      minOrderAmount: 1000,
      effectiveFrom: '15.01.2026',
      effectiveTo: '15.04.2026',
      status: 'active',
      approvedBy: ['Андрей Смирнов'],
      createdBy: 'Admin',
      createdAt: '14.01.2026',
      note: 'Акционнй период Q1 2026',
    },
    {
      id: 'rule-promo',
      label: 'Промо-ставка «Новый партнёр»',
      scope: 'custom',
      baseRate: commissionRate - 5,
      courierRate: 20,
      minOrderAmount: 0,
      effectiveFrom: '01.02.2026',
      effectiveTo: '01.05.2026',
      status: 'pending_approval',
      approvedBy: [],
      createdBy: 'RegionalManager',
      createdAt: '07.02.2026',
      note: 'Ожидает SoD-подтверждения CFO + Admin',
    },
    {
      id: 'rule-clothing',
      label: 'Одежда — завершена',
      scope: 'category',
      category: 'Одежда и аксессуары',
      baseRate: commissionRate + 1,
      courierRate: 20,
      minOrderAmount: 800,
      effectiveFrom: '01.11.2025',
      effectiveTo: '01.01.2026',
      status: 'expired',
      approvedBy: ['Елена Воронова', 'Андрей Смирнов'],
      createdBy: 'Admin',
      createdAt: '28.10.2025',
    },
  ];
}

function makeHistory(sellerName: string): CommissionChange[] {
  return [
    {
      id: 'h1',
      changedAt: '07.02.2026 14:22',
      changedBy: 'Admin (Иванов А.)',
      changedByRole: 'Admin',
      field: 'commissionRate',
      oldValue: '16%',
      newValue: '13%',
      approvers: ['CFO Воронова', 'Finance Смирнов'],
      ip: '10.12.3.45',
      reason: 'Пересмотр по итогам Q4 2025. Мерчант выполнил KPI.',
    },
    {
      id: 'h2',
      changedAt: '15.01.2026 09:10',
      changedBy: 'RegionalManager (Петрова Е.)',
      changedByRole: 'RegionalManager',
      field: 'category_override:Электроника',
      oldValue: '—',
      newValue: `${13-2}% (до 15.04.2026)`,
      approvers: ['Finance Смирнов'],
      ip: '10.12.8.102',
      reason: 'Промо-условия Q1 2026 по электронике',
    },
    {
      id: 'h3',
      changedAt: '01.01.2026 00:00',
      changedBy: 'Система',
      changedByRole: 'System',
      field: 'commissionPlan',
      oldValue: 'Startup (8%)',
      newValue: 'Standard (15%)',
      approvers: ['Auto-transition'],
      ip: 'system',
      reason: 'Автоматический перевод по истечении 90-дневного стартового периода.',
    },
    {
      id: 'h4',
      changedAt: '03.11.2025 11:45',
      changedBy: 'Admin (Иванов А.)',
      changedByRole: 'Admin',
      field: 'payoutHold',
      oldValue: 'false',
      newValue: 'true → false',
      approvers: ['Finance Смирнов', 'Admin Иванов'],
      ip: '10.12.3.45',
      reason: 'Снятие холда после проверки документов KYC',
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n >= 1_000_000 ? `₽${(n/1_000_000).toFixed(1)}М`
       : n >= 1_000     ? `₽${(n/1_000).toFixed(1)}К`
       :                  `₽${n.toLocaleString('ru-RU')}`;
}

const SCOPE_CFG: Record<CommissionScope, { label: string; color: string; bg: string }> = {
  platform: { label: 'Платформа',  color: 'text-blue-700',   bg: 'bg-blue-50' },
  category: { label: 'Категория',  color: 'text-purple-700', bg: 'bg-purple-50' },
  product:  { label: 'Товар',      color: 'text-teal-700',   bg: 'bg-teal-50' },
  custom:   { label: 'Кастомная',  color: 'text-orange-700', bg: 'bg-orange-50' },
};

const RULE_STATUS_CFG: Record<RuleStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:           { label: 'Активна',           color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle2 },
  pending_approval: { label: 'На согласовании',   color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  expired:          { label: 'Истекла',            color: 'text-gray-500',   bg: 'bg-gray-100',   icon: Clock },
  disabled:         { label: 'Отключена',          color: 'text-red-700',    bg: 'bg-red-100',    icon: X },
};

const CAN_EDIT_ROLES = new Set(['SuperAdmin', 'Admin', 'Finance']);
const CAN_APPROVE_ROLES = new Set(['SuperAdmin', 'Admin', 'Finance', 'ComplianceAdmin']);

// ─── SoD Approval Modal ───────────────────────────────────────────────────────

function SodApprovalModal({
  draft, onConfirm, onClose, isNew, currentRate
}: {
  draft: Partial<CommissionRule>;
  onConfirm: (approver1: string, approver2: string, reason: string) => void;
  onClose: () => void;
  isNew: boolean;
  currentRate?: number;
}) {
  const [approver1, setApprover1] = useState('');
  const [approver2, setApprover2] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit() {
    if (!approver1 || !approver2) { toast.error('Необходимо выбрать двух согласующих'); return; }
    if (approver1 === approver2)   { toast.error('Первый и второй согласующий должны быть разными'); return; }
    if (!reason.trim())            { toast.error('Укажите причину изменения'); return; }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onConfirm(approver1, approver2, reason);
    }, 800);
  }

  const modal = (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold">SoD-подтверждение</p>
                <p className="text-indigo-200 text-xs mt-0.5">Separation of Duties — обязателен двойной контроль</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Change summary */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 mb-2.5">Суть изменения</p>
            <div className="space-y-1.5 text-sm">
              {isNew && <p className="text-gray-700">➕ Создание новой комиссионной правило</p>}
              {draft.label && <div className="flex justify-between"><span className="text-gray-500">Название:</span><span className="font-medium">{draft.label}</span></div>}
              {draft.baseRate !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Ставка платформы:</span>
                  <span className="flex items-center gap-1.5">
                    {currentRate !== undefined && <span className="text-red-500 line-through text-xs">{currentRate}%</span>}
                    <span className="font-bold text-green-700">{draft.baseRate}%</span>
                  </span>
                </div>
              )}
              {draft.effectiveTo && <div className="flex justify-between"><span className="text-gray-500">До:</span><span className="font-medium">{draft.effectiveTo}</span></div>}
              {draft.note && <div className="flex justify-between"><span className="text-gray-500">Примечание:</span><span className="font-medium text-gray-700">{draft.note}</span></div>}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">
              Обоснование изменения <span className="text-red-500">*</span>
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Опишите причину: результаты переговоров, выполнение KPI, промо-условия..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          {/* Approvers */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Первый согласующий', value: approver1, set: setApprover1, other: approver2 },
              { label: 'Второй согласующий', value: approver2, set: setApprover2, other: approver1 },
            ].map((col, i) => (
              <div key={i}>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  {col.label} <span className="text-red-500">*</span>
                </label>
                <select value={col.value} onChange={e => col.set(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">Выбрать...</option>
                  {APPROVERS.filter(a => a.id !== col.other).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Запрос будет отправлен обоим согласующим для подтверждения. Изменение вступит в силу после двойного одобрения. Все действия фиксируются в audit log.</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Отмена
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-[2] py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
              {submitting
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Отправка...</>
                : <><Shield className="w-4 h-4" />Отправить на SoD-согласование</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}

// ─── Rule Edit Modal ──────────────────────────────────────────────────────────

function RuleEditModal({
  rule, onClose, onSave, isNew = false
}: {
  rule: Partial<CommissionRule>;
  onClose: () => void;
  onSave: (updated: Partial<CommissionRule>) => void;
  isNew?: boolean;
}) {
  const [draft, setDraft] = useState<Partial<CommissionRule>>({ ...rule });
  const [showSod, setShowSod] = useState(false);

  function upd(field: keyof CommissionRule, val: any) {
    setDraft(p => ({ ...p, [field]: val }));
  }

  function handleSodConfirm(approver1: string, approver2: string, reason: string) {
    onSave({ ...draft, note: (draft.note ? draft.note + ' | ' : '') + `SoD: ${reason}` });
    setShowSod(false);
    onClose();
  }

  const modal = (
    <div className="fixed inset-0 z-[9980] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
              <Percent className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{isNew ? 'Новая комиссионная ставка' : 'Редактировать ставку'}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Потребует SoD-согласования двух уполномоченных лиц</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Label */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Название правила</label>
            <input value={draft.label || ''} onChange={e => upd('label', e.target.value)}
              placeholder="Например: Промо Q2 2026 — Электроника"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          {/* Scope + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Охват</label>
              <select value={draft.scope || 'platform'} onChange={e => upd('scope', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                {Object.entries(SCOPE_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            {(draft.scope === 'category') && (
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Категория</label>
                <select value={draft.category || ''} onChange={e => upd('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                  <option value="">Выбрать...</option>
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Rates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Ставка платформы %</label>
              <div className="relative">
                <input type="number" min={0} max={50} step={0.5}
                  value={draft.baseRate ?? ''}
                  onChange={e => upd('baseRate', parseFloat(e.target.value) || 0)}
                  className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Доля курьера %</label>
              <div className="relative">
                <input type="number" min={0} max={50} step={0.5}
                  value={draft.courierRate ?? ''}
                  onChange={e => upd('courierRate', parseFloat(e.target.value) || 0)}
                  className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Мин. сумма заказа</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₽</span>
                <input type="number" min={0} step={100}
                  value={draft.minOrderAmount ?? 0}
                  onChange={e => upd('minOrderAmount', parseInt(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
          </div>

          {/* Effective dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Действует с</label>
              <input type="text" value={draft.effectiveFrom || ''} onChange={e => upd('effectiveFrom', e.target.value)}
                placeholder="DD.MM.YYYY"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Действует до (опц.)</label>
              <input type="text" value={draft.effectiveTo || ''} onChange={e => upd('effectiveTo', e.target.value)}
                placeholder="DD.MM.YYYY или пусто = бессрочно"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Примечание</label>
            <textarea value={draft.note || ''} onChange={e => upd('note', e.target.value)} rows={2}
              placeholder="Договорённость, ссылка на доп. соглашение..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>

          {/* Preview */}
          {draft.baseRate !== undefined && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-purple-700 mb-2">Предварительный расчёт</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[500, 2000, 10000].map(amount => (
                  <div key={amount} className="bg-white rounded-lg p-2.5 border border-purple-100">
                    <p className="text-xs text-gray-400 mb-1">Заказ {fmt(amount)}</p>
                    <p className="font-black text-purple-700">{fmt(Math.round(amount * (draft.baseRate! / 100)))}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">комиссия</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button onClick={() => setShowSod(true)}
            disabled={!draft.label || draft.baseRate === undefined}
            className="flex-[2] py-2.5 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />Сохранить с SoD-согласованием
          </button>
        </div>
      </div>

      {showSod && (
        <SodApprovalModal
          draft={draft}
          isNew={isNew}
          currentRate={rule.baseRate}
          onConfirm={handleSodConfirm}
          onClose={() => setShowSod(false)}
        />
      )}
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}

// ─── Commission Simulator ─────────────────────────────────────────────────────

function CommissionSimulator({ activeRate, courierRate }: { activeRate: number; courierRate: number }) {
  const [orderAmount, setOrderAmount] = useState(2500);
  const [deliveryFee, setDeliveryFee] = useState(250);

  const platformCut  = Math.round(orderAmount * activeRate / 100);
  const courierCut   = Math.round(deliveryFee * courierRate / 100);
  const sellerNet    = orderAmount - platformCut;
  const sellerPct    = +((sellerNet / orderAmount) * 100).toFixed(1);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-2xl p-5 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold">Калькулятор комиссии</p>
          <p className="text-xs text-blue-300 mt-0.5">Симуляция по текущим ставкам</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-blue-300 block mb-1">Сумма заказа, ₽</label>
          <input type="number" min={100} step={100} value={orderAmount}
            onChange={e => setOrderAmount(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-300" />
        </div>
        <div>
          <label className="text-xs text-blue-300 block mb-1">Стоимость доставки, ₽</label>
          <input type="number" min={0} step={50} value={deliveryFee}
            onChange={e => setDeliveryFee(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <p className="text-[10px] text-blue-300 mb-1">Заказ</p>
          <p className="font-black text-lg">₽{orderAmount.toLocaleString()}</p>
        </div>
        <div className="bg-red-500/20 rounded-xl p-3 text-center border border-red-400/30">
          <p className="text-[10px] text-red-300 mb-1">Комиссия</p>
          <p className="font-black text-lg text-red-300">−₽{platformCut.toLocaleString()}</p>
          <p className="text-[10px] text-red-300">{activeRate}%</p>
        </div>
        <div className="bg-orange-500/20 rounded-xl p-3 text-center border border-orange-400/30">
          <p className="text-[10px] text-orange-300 mb-1">Курьер</p>
          <p className="font-black text-lg text-orange-300">−₽{courierCut.toLocaleString()}</p>
          <p className="text-[10px] text-orange-300">{courierRate}%</p>
        </div>
        <div className="bg-green-500/20 rounded-xl p-3 text-center border border-green-400/30">
          <p className="text-[10px] text-green-300 mb-1">Продавцу</p>
          <p className="font-black text-lg text-green-300">₽{sellerNet.toLocaleString()}</p>
          <p className="text-[10px] text-green-300">{sellerPct}%</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface Props { sellerId: string; seller: SellerDetail; }

export function SellerCommissionTab({ sellerId, seller }: Props) {
  const { user } = useAuth();
  const canEdit    = CAN_EDIT_ROLES.has(user?.role ?? '');
  const canApprove = CAN_APPROVE_ROLES.has(user?.role ?? '');

  const [rules, setRules] = useState<CommissionRule[]>(() => makeRules(seller.commissionRate));
  const [history] = useState<CommissionChange[]>(() => makeHistory(seller.displayName));
  const [tab, setTab] = useState<'rules' | 'history' | 'simulator'>('rules');
  const [editModal, setEditModal] = useState<{ rule: Partial<CommissionRule>; isNew: boolean } | null>(null);
  const [expandHistory, setExpandHistory] = useState(false);
  const [showDisabled, setShowDisabled] = useState(false);

  // Current active base rule
  const baseRule  = rules.find(r => r.scope === 'platform' && r.status === 'active');
  const activeRules = rules.filter(r => r.status === 'active');
  const pendingRules = rules.filter(r => r.status === 'pending_approval');
  const expiredRules = rules.filter(r => r.status === 'expired' || r.status === 'disabled');

  const displayRules = showDisabled ? rules : rules.filter(r => r.status !== 'expired' && r.status !== 'disabled');

  function handleSaveRule(updated: Partial<CommissionRule>) {
    if (editModal?.isNew) {
      const newRule: CommissionRule = {
        id: `rule-${Date.now()}`,
        label: updated.label || 'Без названия',
        scope: updated.scope || 'custom',
        category: updated.category,
        baseRate: updated.baseRate ?? seller.commissionRate,
        courierRate: updated.courierRate ?? 20,
        minOrderAmount: updated.minOrderAmount ?? 0,
        effectiveFrom: updated.effectiveFrom || new Date().toLocaleDateString('ru-RU'),
        effectiveTo: updated.effectiveTo,
        status: 'pending_approval',
        approvedBy: [],
        createdBy: user?.name || 'Admin',
        createdAt: new Date().toLocaleDateString('ru-RU'),
        note: updated.note,
      };
      setRules(prev => [newRule, ...prev]);
      toast.success('Правило создано и отправлено на SoD-согласование');
    } else if (editModal?.rule.id) {
      setRules(prev => prev.map(r =>
        r.id === editModal.rule.id
          ? { ...r, ...updated, status: 'pending_approval' }
          : r
      ));
      toast.success('Изменение отправлено на SoD-согласование');
    }
    setEditModal(null);
  }

  function approveRule(id: string) {
    setRules(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'active', approvedBy: [...(r.approvedBy || []), user?.name || 'Admin'] } : r
    ));
    toast.success('Правило одобрено и активировано');
  }

  function disableRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, status: 'disabled' } : r));
    toast.warning('Правило отключено');
  }

  function exportHistory() {
    const rows = [
      ['Дата', 'Кем изменено', 'Роль', 'Поле', 'Было', 'Стало', 'Согласующие', 'IP', 'Причина'],
      ...history.map(h => [h.changedAt, h.changedBy, h.changedByRole, h.field, h.oldValue, h.newValue, h.approvers.join(', '), h.ip, h.reason])
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission_history_${sellerId}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('История комиссий экспортирована');
  }

  // KPI line
  const totalRevenue14d = 2_089_000;
  const platformEarnings14d = Math.round(totalRevenue14d * seller.commissionRate / 100);
  const sellerNet14d = totalRevenue14d - platformEarnings14d;

  return (
    <div className="space-y-5">
      {/* RBAC Banner */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl">
          <Lock className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-500">
            Ваша роль (<span className="font-semibold text-gray-700">{user?.role}</span>) позволяет только просматривать комиссии.
            Для изменения требуется роль <span className="font-semibold text-gray-700">Admin / Finance / SuperAdmin</span>.
          </p>
        </div>
      )}

      {/* Pending approval banner */}
      {pendingRules.length > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-yellow-50 border border-yellow-200 rounded-2xl flex-wrap">
          <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-yellow-800">{pendingRules.length} правил ожидают SoD-согласования</p>
            <p className="text-xs text-yellow-600 mt-0.5">
              {pendingRules.map(r => r.label).join(' · ')}
            </p>
          </div>
          {canApprove && (
            <button onClick={() => approveRule(pendingRules[0].id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0">
              <Check className="w-3.5 h-3.5" />Одобрить
            </button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Текущая ставка',
            value: `${seller.commissionRate}%`,
            sub: seller.commissionPlanName,
            color: 'text-purple-700', bg: 'bg-purple-50',
            icon: Percent,
          },
          {
            label: 'Выручка платформы (14д)',
            value: fmt(platformEarnings14d),
            sub: `от GMV ${fmt(totalRevenue14d)}`,
            color: 'text-blue-700', bg: 'bg-blue-50',
            icon: DollarSign,
          },
          {
            label: 'Выплачено продавцу (14д)',
            value: fmt(sellerNet14d),
            sub: `${+(sellerNet14d/totalRevenue14d*100).toFixed(1)}% от GMV`,
            color: 'text-green-700', bg: 'bg-green-50',
            icon: TrendingUp,
          },
          {
            label: 'Активных правил',
            value: `${activeRules.length}`,
            sub: `${pendingRules.length > 0 ? pendingRules.length + ' на согласовании' : 'Нет ожидающих'}`,
            color: pendingRules.length > 0 ? 'text-yellow-700' : 'text-gray-700',
            bg: pendingRules.length > 0 ? 'bg-yellow-50' : 'bg-gray-50',
            icon: FileText,
          },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <button
              key={i}
              onClick={() => setTab(i === 0 ? 'rules' : i === 1 ? 'rules' : i === 2 ? 'history' : 'rules')}
              className={`${k.bg} rounded-2xl p-4 border border-transparent hover:border-gray-200 text-left cursor-pointer hover:shadow-md active:scale-[0.97] transition-all`}
            >
              <div className={`w-8 h-8 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                <Icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { id: 'rules' as const, label: 'Правила комиссий', icon: Percent },
          { id: 'history' as const, label: 'История изменений', icon: History },
          { id: 'simulator' as const, label: 'Калькулятор', icon: Calculator },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />{t.label}
              {t.id === 'history' && (
                <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{history.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── RULES TAB ── */}
      {tab === 'rules' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="show-disabled" checked={showDisabled} onChange={e => setShowDisabled(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded" />
              <label htmlFor="show-disabled" className="text-xs text-gray-500 cursor-pointer">Показать истёкшие</label>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {canEdit && (
                <button
                  onClick={() => setEditModal({
                    rule: {
                      scope: 'custom',
                      baseRate: seller.commissionRate,
                      courierRate: 20,
                      minOrderAmount: 0,
                      effectiveFrom: new Date().toLocaleDateString('ru-RU'),
                    },
                    isNew: true,
                  })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors">
                  <Plus className="w-3.5 h-3.5" />Добавить правило
                </button>
              )}
            </div>
          </div>

          {/* Rules list */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_140px_100px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
              <span>Правило</span>
              <span>Ставка</span>
              <span>Охват</span>
              <span>Период</span>
              <span>Статус</span>
              {canEdit && <span className="text-right">Действия</span>}
            </div>

            {displayRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <Percent className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Нет правил</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {displayRules.map(rule => {
                  const sc = RULE_STATUS_CFG[rule.status];
                  const sp = SCOPE_CFG[rule.scope];
                  const StIcon = sc.icon;

                  return (
                    <div key={rule.id}
                      className={`grid grid-cols-[2fr_1fr_1fr_1fr_140px_100px] gap-2 items-center px-4 py-3.5 transition-colors ${
                        rule.status === 'pending_approval' ? 'bg-yellow-50/50' :
                        rule.status === 'expired' || rule.status === 'disabled' ? 'opacity-50' :
                        'hover:bg-gray-50'
                      }`}>

                      {/* Label + details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{rule.label}</p>
                          {rule.scope === 'platform' && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">БАЗОВАЯ</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          {rule.category && <span>{rule.category}</span>}
                          {rule.minOrderAmount > 0 && <span>· мин. заказ ₽{rule.minOrderAmount.toLocaleString()}</span>}
                          {rule.note && <span className="text-orange-600 truncate max-w-[140px]">· {rule.note}</span>}
                        </div>
                        {rule.approvedBy && rule.approvedBy.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            {rule.approvedBy.join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Rates */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl font-black text-purple-700">{rule.baseRate}%</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">Курьер: {rule.courierRate}%</p>
                      </div>

                      {/* Scope badge */}
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${sp.bg} ${sp.color}`}>
                          {sp.label}
                        </span>
                      </div>

                      {/* Period */}
                      <div className="text-xs text-gray-600">
                        <p>с {rule.effectiveFrom}</p>
                        {rule.effectiveTo && <p className="text-gray-400">по {rule.effectiveTo}</p>}
                        {!rule.effectiveTo && rule.status === 'active' && <p className="text-green-600 text-[10px]">бессрочно</p>}
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold ${sc.bg} ${sc.color}`}>
                          <StIcon className="w-3 h-3" />{sc.label}
                        </span>
                        {rule.status === 'pending_approval' && canApprove && (
                          <button onClick={() => approveRule(rule.id)}
                            className="mt-1.5 flex items-center gap-1 text-[10px] text-green-700 hover:text-green-800 font-bold">
                            <Check className="w-3 h-3" />Одобрить
                          </button>
                        )}
                      </div>

                      {/* Actions */}
                      {canEdit && (
                        <div className="flex items-center justify-end gap-1">
                          {rule.status !== 'expired' && rule.status !== 'disabled' && (
                            <button
                              onClick={() => setEditModal({ rule, isNew: false })}
                              className="p-1.5 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors" title="Редактировать">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {rule.status === 'active' && rule.scope !== 'platform' && (
                            <button onClick={() => disableRule(rule.id)}
                              className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Отключить">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SoD notice */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-indigo-800">Separation of Duties (SoD)</p>
                <p className="text-xs text-indigo-600 mt-1 leading-relaxed">
                  Любое изменение комиссионной ставки требует согласования двух уполномоченных лиц из разных функциональных ролей 
                  (например, Finance + Admin или CFO + Legal). Это требование обязательно для всех ролей, включая SuperAdmin. 
                  Все изменения фиксируются в иммутабельном аудит-логе с привязкой к IP-адресу и timestamp.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{history.length} записей в истории изменений</p>
            <button onClick={exportHistory}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors">
              <Download className="w-3.5 h-3.5" />Экспорт CSV
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-50">
            {history.map((h, i) => (
              <div key={h.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Timeline dot */}
                  <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <History className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{h.changedBy}</p>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">{h.changedByRole}</span>
                      <span className="text-xs text-gray-400">{h.changedAt}</span>
                      <span className="ml-auto text-[10px] text-gray-300 font-mono">{h.ip}</span>
                    </div>
                    {/* Change */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-mono bg-red-50 text-red-700 px-2 py-1 rounded-lg">{h.oldValue || '—'}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="text-xs font-mono bg-green-50 text-green-700 px-2 py-1 rounded-lg font-bold">{h.newValue}</span>
                      <span className="text-xs text-gray-400">{h.field}</span>
                    </div>
                    {/* Reason */}
                    <p className="text-xs text-gray-500 mt-2 italic">«{h.reason}»</p>
                    {/* Approvers */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {h.approvers.map((ap, j) => (
                        <span key={j} className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                          <Shield className="w-2.5 h-2.5" />{ap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SIMULATOR TAB ── */}
      {tab === 'simulator' && (
        <div className="space-y-5">
          <CommissionSimulator
            activeRate={baseRule?.baseRate ?? seller.commissionRate}
            courierRate={baseRule?.courierRate ?? 20}
          />

          {/* Rule comparison */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-4">Сравнение активных правил</h3>
            <div className="space-y-3">
              {activeRules.map(rule => {
                const sp = SCOPE_CFG[rule.scope];
                const exampleOrder = 2000;
                const commission = Math.round(exampleOrder * rule.baseRate / 100);
                const net = exampleOrder - commission;
                return (
                  <div key={rule.id} className="flex items-center gap-4 p-3.5 border border-gray-100 rounded-xl hover:border-purple-200 hover:bg-purple-50/20 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{rule.label}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${sp.bg} ${sp.color}`}>{sp.label}</span>
                      </div>
                      {rule.category && <p className="text-xs text-gray-400 mt-0.5">{rule.category}</p>}
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-purple-700">{rule.baseRate}%</p>
                      <p className="text-[10px] text-gray-400">ставка</p>
                    </div>
                    <div className="text-center min-w-[90px]">
                      <p className="text-sm font-bold text-red-600">−₽{commission.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">с ₽{exampleOrder.toLocaleString()}</p>
                    </div>
                    <div className="text-center min-w-[90px]">
                      <p className="text-sm font-bold text-green-700">₽{net.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">продавцу</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">Расчёт для примерного заказа ₽2 000</p>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {editModal && (
        <RuleEditModal
          rule={editModal.rule}
          isNew={editModal.isNew}
          onClose={() => setEditModal(null)}
          onSave={handleSaveRule}
        />
      )}
    </div>
  );
}