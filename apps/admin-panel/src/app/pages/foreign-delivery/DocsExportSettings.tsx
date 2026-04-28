/**
 * Documents + AccountingExport + Settings pages.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileCheck2, BookOpen, Settings as SettingsIcon, Lock, Upload, Download,
  CheckCircle2, XCircle, Search, FileText, AlertCircle, Save,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Locked } from '../../components/rbac/PermissionLock';
import { exportToCsv } from '../../utils/downloads';
import {
  FOREIGN_DOCS, DOC_KIND_LABELS, DOC_STATUS_LABELS,
  FOREIGN_SETTINGS, EXPENSE_TYPE_LABELS, SELLER_TYPE_LABELS, SUPPLIER_KIND_LABELS,
  COMPANIES,
  type ForeignDoc, type DocStatus, type DocKind, type ForeignSettings,
} from '../../data/foreign-delivery';

// ─── Documents ───────────────────────────────────────────────────────────────

export function ForeignDocuments() {
  const { hasPermission } = useAuth();
  if (!hasPermission('foreign_delivery.documents.view')) {
    return <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2></div>;
  }
  const canUpload   = hasPermission('foreign_delivery.documents.upload');
  const canApprove  = hasPermission('foreign_delivery.documents.approve');
  const canDownload = hasPermission('foreign_delivery.documents.download');

  const [docs, setDocs] = useState<ForeignDoc[]>(FOREIGN_DOCS);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | DocKind>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DocStatus>('all');

  const filtered = useMemo(() => docs.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.filename.toLowerCase().includes(q) || (d.orderId ?? '').toLowerCase().includes(q);
    const mk = kindFilter === 'all' || d.kind === kindFilter;
    const mst = statusFilter === 'all' || d.status === statusFilter;
    return ms && mk && mst;
  }), [docs, search, kindFilter, statusFilter]);

  function setStatus(id: string, status: DocStatus) {
    setDocs(prev => prev.map(d => d.docId === id ? { ...d, status } : d));
    const i = FOREIGN_DOCS.findIndex(d => d.docId === id);
    if (i >= 0) FOREIGN_DOCS[i].status = status;
    toast.success(`Документ → ${DOC_STATUS_LABELS[status].label}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Документы</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Инвойсы, фото доставки, акты, отчёты, комментарии.</p>
        </div>
        <Locked perm="foreign_delivery.documents.upload">
          <button disabled={!canUpload} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
            <Upload className="w-4 h-4" />Загрузить документ
          </button>
        </Locked>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени файла, Order ID..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={kindFilter} onChange={e => setKindFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">Все типы</option>
          {Object.entries(DOC_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">Все статусы</option>
          {Object.entries(DOC_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="text-left px-3 py-3 font-medium text-gray-500">Файл / Тип</th>
              <th className="text-left px-3 py-3 font-medium text-gray-500">Заказ</th>
              <th className="text-left px-3 py-3 font-medium text-gray-500 hidden md:table-cell">Кем загружен</th>
              <th className="text-left px-3 py-3 font-medium text-gray-500">Статус</th>
              <th className="text-center px-3 py-3 font-medium text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(d => {
              const ds = DOC_STATUS_LABELS[d.status];
              return (
                <tr key={d.docId} className="hover:bg-gray-50/40">
                  <td className="px-3 py-3">
                    <p className="text-sm font-semibold flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-gray-500" />{d.filename}</p>
                    <p className="text-[10px] text-gray-500">{DOC_KIND_LABELS[d.kind]}</p>
                  </td>
                  <td className="px-3 py-3">
                    {d.orderId ? <Link to={`/foreign-delivery/orders?order=${d.orderId}`} className="text-xs text-blue-700 hover:underline">{d.orderId}</Link> : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <p className="text-xs">{d.uploadedBy}</p>
                    <p className="text-[10px] text-gray-500">{d.uploadedAt}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center w-fit px-1.5 py-0 rounded text-[9px] font-bold ${ds.cls}`}>{ds.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {canDownload && <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Download className="w-3.5 h-3.5" /></button>}
                      {canApprove && d.status !== 'verified' && (
                        <button onClick={() => setStatus(d.docId, 'verified')} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                      )}
                      {canApprove && d.status !== 'rejected' && (
                        <button onClick={() => setStatus(d.docId, 'rejected')} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"><XCircle className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Документов не найдено</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AccountingExport ────────────────────────────────────────────────────────

const EXPORT_OPTIONS: { id: string; label: string; perm: string }[] = [
  { id: 'orders',           label: 'Реестр зарубежных заказов',      perm: 'foreign_delivery.orders.view' },
  { id: 'settlement_cards', label: 'Карточки расчёта заказов',       perm: 'foreign_delivery.settlement_cards.view' },
  { id: 'daily',            label: 'Дневной реестр',                 perm: 'foreign_delivery.daily_registry.view' },
  { id: 'weekly',           label: 'Недельный реестр',               perm: 'foreign_delivery.weekly_registry.view' },
  { id: 'monthly',          label: 'Месячный отчёт',                 perm: 'foreign_delivery.monthly.view' },
  { id: 'sellers',          label: 'Отчёт по продавцам',             perm: 'foreign_delivery.local_sellers.view' },
  { id: 'suppliers',        label: 'Отчёт по поставщикам',           perm: 'foreign_delivery.suppliers.view' },
  { id: 'intercompany',     label: 'Задолженность между компаниями', perm: 'foreign_delivery.intercompany_debt.view' },
  { id: 'supplier_debt',    label: 'Задолженность поставщикам',      perm: 'foreign_delivery.supplier_payables.view' },
  { id: 'margin',           label: 'Маржа польской компании',        perm: 'foreign_delivery.margin.view' },
  { id: 'fulfillment',      label: 'Локальное исполнение',           perm: 'foreign_delivery.local_fulfillment.view' },
  { id: 'docs',             label: 'Отчёт по документам',            perm: 'foreign_delivery.documents.view' },
  { id: 'refunds',          label: 'Отчёт по возвратам',             perm: 'foreign_delivery.orders.view' },
  { id: 'setoff',           label: 'Отчёт по взаимозачёту',          perm: 'foreign_delivery.setoff.view' },
];

const FORMATS = ['CSV', 'XLSX', 'PDF', 'JSON'] as const;

export function AccountingExport() {
  const { hasPermission } = useAuth();
  if (!hasPermission('foreign_delivery.accounting_export')) {
    return <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2></div>;
  }

  function exportSample(id: string, format: string) {
    if (format === 'CSV') {
      exportToCsv([{ message: `${id} export · placeholder` }] as any[], [{ key: 'message', label: 'Заглушка' }], `foreign-${id}`);
    } else {
      // mock formats — text blob download
      const blob = new Blob([`# ${id}\n\nДемо-экспорт в формате ${format}.\nВ реальном API это будет полноценный файл.`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `foreign-${id}.${format.toLowerCase()}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }
    toast.success(`Экспорт ${id} · ${format}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Экспорт для бухгалтера</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Любой отчёт можно скачать в CSV / XLSX (mock) / PDF (mock) / JSON backup.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EXPORT_OPTIONS.map(opt => {
          const allowed = hasPermission(opt.perm);
          return (
            <div key={opt.id} className={`bg-white rounded-xl border ${allowed ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-4`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-[10px] text-gray-500 font-mono">требует: {opt.perm}</p>
                </div>
                {!allowed && <Lock className="w-4 h-4 text-gray-400" />}
              </div>
              <div className="flex flex-wrap gap-1">
                {FORMATS.map(f => (
                  <button key={f} disabled={!allowed} onClick={() => exportSample(opt.id, f)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                      allowed ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function ForeignSettingsPage() {
  const { hasPermission } = useAuth();
  if (!hasPermission('foreign_delivery.settings.manage') && !hasPermission('foreign_delivery.view')) {
    return <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2></div>;
  }
  const canManage = hasPermission('foreign_delivery.settings.manage');

  const [draft, setDraft] = useState<ForeignSettings>(FOREIGN_SETTINGS);

  function save() {
    if (!canManage) return;
    Object.assign(FOREIGN_SETTINGS, draft);
    toast.success('Настройки сохранены');
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Настройки расчётов</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Все коэффициенты, валюты, типы и правила автоопределения настраиваются здесь.</p>
      </div>

      {/* Default costs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b"><p className="font-bold text-gray-900 text-sm">Значения по умолчанию (TMT)</p></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">Комиссия туркменской компании</span>
            <input type="number" value={draft.defaultTurkmenCommission}
              onChange={e => setDraft(d => ({ ...d, defaultTurkmenCommission: Number(e.target.value) }))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-50" />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">Стоимость упаковки</span>
            <input type="number" value={draft.defaultPackagingCost}
              onChange={e => setDraft(d => ({ ...d, defaultPackagingCost: Number(e.target.value) }))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-50" />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">Стоимость доставки</span>
            <input type="number" value={draft.defaultDeliveryCost}
              onChange={e => setDraft(d => ({ ...d, defaultDeliveryCost: Number(e.target.value) }))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-50" />
          </label>
        </div>
      </div>

      {/* Currency / FX */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b"><p className="font-bold text-gray-900 text-sm">Валюты и курсы</p></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">Валюта расчётов</span>
            <input type="text" value={draft.settlementCurrency}
              onChange={e => setDraft(d => ({ ...d, settlementCurrency: e.target.value.toUpperCase() }))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono disabled:bg-gray-50" />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">Комиссия платёжного провайдера, %</span>
            <input type="number" step="0.1" value={draft.paymentProviderFeePct}
              onChange={e => setDraft(d => ({ ...d, paymentProviderFeePct: Number(e.target.value) }))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-50" />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">Округление</span>
            <select value={draft.rounding}
              onChange={e => setDraft(d => ({ ...d, rounding: e.target.value as any }))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white disabled:bg-gray-50">
              <option value="up">Вверх</option>
              <option value="down">Вниз</option>
              <option value="nearest">Ближе</option>
            </select>
          </label>
        </div>
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Курсы (× → TMT)</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {Object.entries(draft.exchangeRates).map(([ccy, rate]) => (
              <label key={ccy} className="text-xs">
                <span className="block text-gray-500 font-mono">{ccy}</span>
                <input type="number" step="0.01" value={rate}
                  onChange={e => setDraft(d => ({ ...d, exchangeRates: { ...d.exchangeRates, [ccy]: Number(e.target.value) }}))}
                  disabled={!canManage}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs disabled:bg-gray-50" />
              </label>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            Разрешённые валюты оплаты: <span className="font-mono">{draft.allowedPaymentCurrencies.join(', ')}</span>
          </p>
        </div>
      </div>

      {/* Periods */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b"><p className="font-bold text-gray-900 text-sm">Периоды отчётов</p></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">Час закрытия дневного реестра</span>
            <input type="number" min="0" max="23" value={draft.dailyRegistryCloseHour}
              onChange={e => setDraft(d => ({ ...d, dailyRegistryCloseHour: Number(e.target.value) }))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-50" />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">День закрытия недели (0=Вс)</span>
            <input type="number" min="0" max="6" value={draft.weeklyRegistryCloseDow}
              onChange={e => setDraft(d => ({ ...d, weeklyRegistryCloseDow: Number(e.target.value) }))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-50" />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">День закрытия месяца</span>
            <input type="number" min="1" max="31" value={draft.monthlyCloseDay}
              onChange={e => setDraft(d => ({ ...d, monthlyCloseDay: Number(e.target.value) }))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-50" />
          </label>
        </div>
      </div>

      {/* Detection rule */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b"><p className="font-bold text-gray-900 text-sm">Автоопределение foreign_paid_local_delivery</p></div>
        <div className="p-4 space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={draft.foreignDetection.enabled} disabled={!canManage}
              onChange={e => setDraft(d => ({ ...d, foreignDetection: { ...d.foreignDetection, enabled: e.target.checked }}))} />
            Включить автоопределение
          </label>
          <label className="block text-sm">
            <span className="block text-xs text-gray-600 mb-1">Страна клиента ≠</span>
            <input type="text" value={draft.foreignDetection.customerCountriesNot.join(', ')}
              onChange={e => setDraft(d => ({ ...d, foreignDetection: { ...d.foreignDetection, customerCountriesNot: e.target.value.split(',').map(s => s.trim()) }}))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-50" />
          </label>
          <label className="block text-sm">
            <span className="block text-xs text-gray-600 mb-1">Страна доставки =</span>
            <input type="text" value={draft.foreignDetection.deliveryCountryIs}
              onChange={e => setDraft(d => ({ ...d, foreignDetection: { ...d.foreignDetection, deliveryCountryIs: e.target.value }}))}
              disabled={!canManage}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-50" />
          </label>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-700 mb-2">Типы расходов</p>
          <ul className="text-xs space-y-0.5 text-gray-700">
            {draft.expenseTypes.map(t => <li key={t} className="font-mono">• {EXPENSE_TYPE_LABELS[t]}</li>)}
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-700 mb-2">Типы продавцов</p>
          <ul className="text-xs space-y-0.5 text-gray-700">
            {draft.sellerTypes.map(t => <li key={t}>• {SELLER_TYPE_LABELS[t]}</li>)}
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-700 mb-2">Типы поставщиков</p>
          <ul className="text-xs space-y-0.5 text-gray-700">
            {draft.supplierKinds.map(t => <li key={t}>• {SUPPLIER_KIND_LABELS[t]}</li>)}
          </ul>
        </div>
      </div>

      {/* Companies */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b"><p className="font-bold text-gray-900 text-sm">Компании в системе</p></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">ID</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Название</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Страна</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Валюта</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Роль</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Tax ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {COMPANIES.map(c => (
              <tr key={c.companyId}>
                <td className="px-3 py-2 font-mono text-xs">{c.companyId}</td>
                <td className="px-3 py-2 font-semibold">{c.name}</td>
                <td className="px-3 py-2">{c.country}</td>
                <td className="px-3 py-2 font-mono">{c.currency}</td>
                <td className="px-3 py-2 text-xs"><span className="px-1.5 py-0 bg-blue-50 text-blue-700 rounded font-mono">{c.role}</span></td>
                <td className="px-3 py-2 text-xs font-mono">{c.taxId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save */}
      {canManage && (
        <div className="flex justify-end">
          <button onClick={save}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
            <Save className="w-4 h-4" />Сохранить настройки
          </button>
        </div>
      )}
    </div>
  );
}
