/**
 * SellerAccessTab — управление ролью продавца и его доступом к категориям sidebar.
 * Локальный state (никакого backend).
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ShieldCheck, ShieldAlert, ShieldOff, Pencil as Edit2, X,
  Lock, Unlock, Download, History, User, CheckCircle2, ChevronDown, ChevronRight,
} from 'lucide-react';
import type { SellerSummary } from '../../data/merchants-mock';
import { exportToCsv } from '../../utils/downloads';

type AccessLevel = 'full' | 'restricted' | 'blocked';

interface MerchantRole {
  roleId: string;
  roleName: string;
  assignedBy: string;
  assignedByRole: string;
  assignedAt: string;
  level: AccessLevel;
}

interface AccessAudit {
  at: string;
  actor: string;
  action: string;
}

const PRESET_ROLES = [
  { id: 'merchant_owner',   name: 'Владелец магазина',   description: 'Полный доступ к товарам, заказам, аналитике своего магазина.', perms: ['products.view', 'products.create', 'products.edit', 'products.media', 'products.export', 'orders.view', 'finance.view'] },
  { id: 'merchant_manager', name: 'Менеджер магазина',   description: 'Управление товарами, заказами без финансов.',                  perms: ['products.view', 'products.create', 'products.edit', 'products.media', 'orders.view'] },
  { id: 'merchant_clerk',   name: 'Сотрудник магазина',  description: 'Просмотр и редактирование товаров.',                            perms: ['products.view', 'products.edit', 'orders.view'] },
  { id: 'merchant_readonly',name: 'Только чтение',        description: 'Только просмотр всех данных.',                                  perms: ['products.view', 'orders.view', 'finance.view'] },
];

// Sidebar categories the merchant can access (bound to platform-side modules).
const SIDEBAR_CATEGORIES: { key: string; label: string }[] = [
  { key: 'products',    label: 'Товары' },
  { key: 'orders',      label: 'Заказы' },
  { key: 'finance',     label: 'Финансы' },
  { key: 'analytics',   label: 'Аналитика' },
  { key: 'support',     label: 'Поддержка' },
  { key: 'promotions',  label: 'Продвижение' },
  { key: 'compliance',  label: 'Документы' },
];

const ACTION_KEYS: { key: string; label: string }[] = [
  { key: 'view',    label: 'view'    },
  { key: 'create',  label: 'create'  },
  { key: 'edit',    label: 'edit'    },
  { key: 'delete',  label: 'delete'  },
  { key: 'export',  label: 'export'  },
  { key: 'upload',  label: 'upload'  },
  { key: 'approve', label: 'approve' },
  { key: 'reject',  label: 'reject'  },
  { key: 'recommend', label: 'recommend' },
];

export function SellerAccessTab({ seller }: { seller: SellerSummary }) {
  const [role, setRole] = useState<MerchantRole>({
    roleId: 'merchant_owner',
    roleName: 'Владелец магазина',
    assignedBy: 'Супер Админ',
    assignedByRole: 'SuperAdmin',
    assignedAt: '01.01.2026 09:00',
    level: 'full',
  });
  const [audit, setAudit] = useState<AccessAudit[]>([
    { at: '01.01.2026 09:00', actor: 'Супер Админ', action: `Назначена роль «Владелец магазина»` },
  ]);
  const [grants, setGrants] = useState<Record<string, Record<string, boolean>>>(() => {
    // Default: full access on products/orders, view on others
    const init: Record<string, Record<string, boolean>> = {};
    SIDEBAR_CATEGORIES.forEach(cat => {
      init[cat.key] = {};
      ACTION_KEYS.forEach(a => {
        init[cat.key][a.key] = (cat.key === 'products' || cat.key === 'orders') ? true : (a.key === 'view');
      });
    });
    return init;
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>('products');
  const [pendingRoleId, setPendingRoleId] = useState(role.roleId);

  function pushAudit(action: string) {
    setAudit(prev => [{ at: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), actor: 'Супер Админ', action }, ...prev]);
  }

  function applyRoleChange() {
    const target = PRESET_ROLES.find(r => r.id === pendingRoleId);
    if (!target) return;
    setRole(prev => ({
      ...prev,
      roleId: target.id, roleName: target.name,
      assignedBy: 'Супер Админ', assignedByRole: 'SuperAdmin',
      assignedAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }));
    pushAudit(`Изменена роль → «${target.name}»`);
    toast.success(`Роль изменена: ${target.name}`);
    setShowRoleModal(false);
  }

  function setLevel(level: AccessLevel) {
    if (role.level === level) return;
    setRole(prev => ({ ...prev, level }));
    const labels: Record<AccessLevel, string> = { full: 'Полный', restricted: 'Ограниченный', blocked: 'Заблокирован' };
    pushAudit(`Уровень доступа → ${labels[level]}`);
    toast.success(`Доступ: ${labels[level]}`);
  }

  function togglePerm(catKey: string, actionKey: string) {
    setGrants(prev => ({
      ...prev,
      [catKey]: { ...prev[catKey], [actionKey]: !prev[catKey][actionKey] },
    }));
    const cat = SIDEBAR_CATEGORIES.find(c => c.key === catKey);
    pushAudit(`${grants[catKey][actionKey] ? 'Снято' : 'Выдано'} право ${catKey}.${actionKey} (${cat?.label})`);
  }

  function exportAccessLog() {
    if (audit.length === 0) { toast.info('Журнал пуст'); return; }
    exportToCsv(audit as any[], [
      { key: 'at',     label: 'Дата' },
      { key: 'actor',  label: 'Кто' },
      { key: 'action', label: 'Действие' },
    ], `access-log-${seller.sellerCode}`);
    toast.success(`Журнал доступа скачан: ${audit.length} записей`);
  }

  const levelCfg: Record<AccessLevel, { label: string; cls: string; icon: any }> = {
    full:       { label: 'Полный доступ',     cls: 'bg-green-50 border-green-200 text-green-700',  icon: ShieldCheck },
    restricted: { label: 'Ограниченный',       cls: 'bg-yellow-50 border-yellow-200 text-yellow-700',icon: ShieldAlert },
    blocked:    { label: 'Заблокирован',       cls: 'bg-red-50 border-red-200 text-red-700',         icon: ShieldOff },
  };
  const Lcfg = levelCfg[role.level];
  const LIcon = Lcfg.icon;

  const grantedCount = useMemo(() => {
    let total = 0, granted = 0;
    SIDEBAR_CATEGORIES.forEach(cat => {
      ACTION_KEYS.forEach(a => {
        total++;
        if (grants[cat.key]?.[a.key]) granted++;
      });
    });
    return { total, granted };
  }, [grants]);

  return (
    <div className="space-y-5">
      {/* Role card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${Lcfg.cls}`}>
              <LIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{role.roleName}</p>
              <p className="text-xs text-gray-500 mt-0.5">Роль продавца на платформе</p>
              <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                <span className={`px-2 py-0.5 rounded-full font-semibold border ${Lcfg.cls}`}>{Lcfg.label}</span>
                <span className="text-gray-400">·</span>
                <span className="flex items-center gap-1 text-gray-500"><User className="w-3 h-3" />Назначил: <span className="font-medium text-gray-700">{role.assignedBy} ({role.assignedByRole})</span></span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{role.assignedAt}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setPendingRoleId(role.roleId); setShowRoleModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium">
              <Edit2 className="w-3.5 h-3.5" />Изменить роль
            </button>
            <button onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium">
              <History className="w-3.5 h-3.5" />История
            </button>
            <button onClick={exportAccessLog}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium">
              <Download className="w-3.5 h-3.5" />Audit CSV
            </button>
          </div>
        </div>

        {/* Level switches */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {([
            { v: 'full' as AccessLevel,       label: 'Полный',       icon: ShieldCheck, color: 'green' },
            { v: 'restricted' as AccessLevel, label: 'Ограниченный', icon: ShieldAlert, color: 'yellow' },
            { v: 'blocked' as AccessLevel,    label: 'Заблокирован', icon: ShieldOff,   color: 'red' },
          ]).map(opt => {
            const isActive = role.level === opt.v;
            const Icon = opt.icon;
            return (
              <button key={opt.v} onClick={() => setLevel(opt.v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                  isActive
                    ? opt.color === 'green'  ? 'border-green-400 bg-green-50 text-green-800'
                    : opt.color === 'yellow' ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                    : 'border-red-400 bg-red-50 text-red-800'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}>
                <Icon className="w-4 h-4" />
                {opt.label}
                {isActive && <CheckCircle2 className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Permissions grid */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Права по категориям</p>
            <p className="text-xs text-gray-500 mt-0.5">Доступ к разделам sidebar и конкретным действиям. Изменения сохраняются локально.</p>
          </div>
          <span className="text-xs px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-semibold">
            {grantedCount.granted} / {grantedCount.total}
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {SIDEBAR_CATEGORIES.map(cat => {
            const isExpanded = expandedCat === cat.key;
            const catGranted = ACTION_KEYS.filter(a => grants[cat.key]?.[a.key]).length;
            return (
              <div key={cat.key}>
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat.key)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <span className="flex-1 font-medium text-gray-800">{cat.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${catGranted === 0 ? 'bg-gray-100 text-gray-500' : catGranted === ACTION_KEYS.length ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {catGranted} / {ACTION_KEYS.length}
                  </span>
                </button>
                {isExpanded && (
                  <div className="bg-gray-50/40 px-5 py-3 grid grid-cols-3 gap-2">
                    {ACTION_KEYS.map(a => {
                      const isOn = !!grants[cat.key]?.[a.key];
                      return (
                        <label key={a.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                          isOn ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                          <input
                            type="checkbox" checked={isOn}
                            onChange={() => togglePerm(cat.key, a.key)}
                            className="w-3.5 h-3.5 accent-blue-600"
                          />
                          <span className={`text-xs font-mono ${isOn ? 'text-blue-700 font-bold' : 'text-gray-500'}`}>{cat.key}.{a.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Role modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowRoleModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">Изменить роль</p>
              <button onClick={() => setShowRoleModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-2">
              {PRESET_ROLES.map(r => {
                const isActive = pendingRoleId === r.id;
                return (
                  <button key={r.id} onClick={() => setPendingRoleId(r.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${isActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">{r.name}</p>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setShowRoleModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={applyRoleChange} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">Применить</button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900 flex items-center gap-2"><History className="w-4 h-4" />История доступа</p>
              <button onClick={() => setShowHistoryModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {audit.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">История пуста</p>
              ) : audit.map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-700">{h.action}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{h.actor} · {h.at}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
