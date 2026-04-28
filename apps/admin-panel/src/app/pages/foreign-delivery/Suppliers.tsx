/**
 * Suppliers + SupplierPayables pages.
 * Supports multi-country suppliers (TM / CN / TR / EU / etc).
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ReactDOM from 'react-dom';
import {
  Boxes, Search, Plus, Lock, Download, Upload, FileText, Receipt,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Globe, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Locked } from '../../components/rbac/PermissionLock';
import { exportToCsv } from '../../utils/downloads';
import {
  SUPPLIERS, SUPPLIER_INVOICES, SUPPLIER_KIND_LABELS,
  PAYABLE_STATUS_LABELS, DOC_STATUS_LABELS,
  fmtMoney,
  type Supplier, type SupplierInvoice, type PayableStatus, type SupplierKind,
} from '../../data/foreign-delivery';

// ─── Suppliers ───────────────────────────────────────────────────────────────

export function Suppliers() {
  const { hasPermission } = useAuth();
  if (!hasPermission('foreign_delivery.suppliers.view')) {
    return <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2></div>;
  }
  const canManage = hasPermission('foreign_delivery.suppliers.manage');

  const [suppliers, setSuppliers] = useState<Supplier[]>(SUPPLIERS);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Supplier>>({
    name: '', country: 'Туркменистан', kind: 'local_supplier',
    contact: '', phone: '', email: '', address: '',
    currency: 'TMT', bankDetails: '', taxId: '', status: 'pending',
  });

  function createSupplier() {
    if (!canManage) return;
    if (!draft.name?.trim()) { toast.error('Введите название'); return; }
    if (!draft.country?.trim()) { toast.error('Введите страну'); return; }
    const newSup: Supplier = {
      supplierId:  `sup-${Date.now()}`,
      name:        draft.name!.trim(),
      country:     draft.country!.trim(),
      kind:        draft.kind ?? 'local_supplier',
      contact:     draft.contact?.trim() ?? '',
      phone:       draft.phone?.trim() ?? '',
      email:       draft.email?.trim() ?? '',
      address:     draft.address?.trim() ?? '',
      currency:    draft.currency ?? 'TMT',
      bankDetails: draft.bankDetails ?? '',
      taxId:       draft.taxId ?? '',
      status:      draft.status ?? 'pending',
      ordersCount: 0, outstanding: 0, documents: [],
    };
    setSuppliers(prev => [newSup, ...prev]);
    SUPPLIERS.unshift(newSup);
    setCreateOpen(false);
    setDraft({ name: '', country: 'Туркменистан', kind: 'local_supplier', contact: '', phone: '', email: '', address: '', currency: 'TMT', bankDetails: '', taxId: '', status: 'pending' });
    toast.success(`Создан поставщик: ${newSup.name}`);
  }

  const countries = useMemo(() => Array.from(new Set(suppliers.map(s => s.country))), [suppliers]);
  const filtered = useMemo(() => suppliers.filter(s => {
    const q = search.toLowerCase();
    const ms = !q || s.name.toLowerCase().includes(q) || s.contact.toLowerCase().includes(q) || s.country.toLowerCase().includes(q);
    const mc = countryFilter === 'all' || s.country === countryFilter;
    return ms && mc;
  }), [suppliers, search, countryFilter]);

  function exportCsv() {
    exportToCsv(filtered as any[], [
      { key: 'supplierId',  label: 'ID' },
      { key: 'name',        label: 'Название' },
      { key: 'country',     label: 'Страна' },
      { key: 'kind',        label: 'Тип' },
      { key: 'contact',     label: 'Контакт' },
      { key: 'phone',       label: 'Телефон' },
      { key: 'email',       label: 'Email' },
      { key: 'address',     label: 'Адрес' },
      { key: 'currency',    label: 'Валюта' },
      { key: 'taxId',       label: 'Tax ID' },
      { key: 'status',      label: 'Статус' },
      { key: 'ordersCount', label: 'Заказов' },
      { key: 'outstanding', label: 'Долг' },
    ], 'suppliers');
    toast.success(`Экспорт: ${filtered.length} поставщиков`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Поставщики</h1>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-mono">{suppliers.length}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Турция, Китай, Германия, Туркменистан и любые другие. Расширяемая модель.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <Locked perm="foreign_delivery.suppliers.manage">
            <button onClick={() => setCreateOpen(true)} disabled={!canManage}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
              <Plus className="w-4 h-4" />Добавить поставщика
            </button>
          </Locked>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">Все страны</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/70 border-b border-gray-100">
            <tr>
              <th className="text-left px-3 py-3 font-medium text-gray-500">Поставщик</th>
              <th className="text-left px-3 py-3 font-medium text-gray-500 hidden md:table-cell">Страна / Тип</th>
              <th className="text-left px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">Контакт</th>
              <th className="text-left px-3 py-3 font-medium text-gray-500 hidden xl:table-cell">Tax ID / Bank</th>
              <th className="text-right px-3 py-3 font-medium text-gray-500">Заказов</th>
              <th className="text-right px-3 py-3 font-medium text-gray-500">Долг</th>
              <th className="text-center px-3 py-3 font-medium text-gray-500">→</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(s => (
              <tr key={s.supplierId} className="hover:bg-gray-50/40">
                <td className="px-3 py-3">
                  <p className="font-bold text-gray-900">{s.name}</p>
                  <p className="text-[10px] text-gray-500">{s.supplierId} · {s.address}</p>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                    <Globe className="w-2.5 h-2.5" />{s.country}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">{SUPPLIER_KIND_LABELS[s.kind]}</p>
                </td>
                <td className="px-3 py-3 hidden lg:table-cell">
                  <p className="text-xs">{s.contact}</p>
                  <p className="text-[10px] text-gray-500">{s.phone}</p>
                  <p className="text-[10px] text-gray-500">{s.email}</p>
                </td>
                <td className="px-3 py-3 hidden xl:table-cell">
                  <p className="text-[10px] font-mono text-gray-700">{s.taxId}</p>
                  <p className="text-[10px] text-gray-500 truncate max-w-[160px]">{s.bankDetails}</p>
                </td>
                <td className="px-3 py-3 text-right text-sm">{s.ordersCount}</td>
                <td className="px-3 py-3 text-right">
                  <p className={`text-sm font-bold ${s.outstanding > 0 ? 'text-rose-700' : 'text-green-700'}`}>{fmtMoney(s.outstanding, s.currency)}</p>
                </td>
                <td className="px-3 py-3 text-center">
                  <Link to="/foreign-delivery/supplier-payables" className="p-1.5 inline-block text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {createOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">Новый поставщик</p>
              <button onClick={() => setCreateOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Название *</label>
                <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} autoFocus
                  placeholder="Yiwu Trading Co."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Страна *</label>
                <input value={draft.country} onChange={e => setDraft(d => ({ ...d, country: e.target.value }))}
                  placeholder="Китай"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Тип</label>
                <select value={draft.kind} onChange={e => setDraft(d => ({ ...d, kind: e.target.value as SupplierKind }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  {Object.entries(SUPPLIER_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Валюта</label>
                <input value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value.toUpperCase() }))}
                  placeholder="CNY"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Контакт</label>
                <input value={draft.contact} onChange={e => setDraft(d => ({ ...d, contact: e.target.value }))}
                  placeholder="Mr Wang"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Телефон</label>
                <input value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
                  placeholder="+86 579 8550 0001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
                  placeholder="orders@yiwu-trading.cn"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Адрес</label>
                <input value={draft.address} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))}
                  placeholder="Yiwu, Zhejiang"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tax ID</label>
                <input value={draft.taxId} onChange={e => setDraft(d => ({ ...d, taxId: e.target.value }))}
                  placeholder="CN91330782…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Банк (mock)</label>
                <input value={draft.bankDetails} onChange={e => setDraft(d => ({ ...d, bankDetails: e.target.value }))}
                  placeholder="ICBC · 6228 4810 …"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setCreateOpen(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={createSupplier} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">Создать</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── SupplierPayables ─────────────────────────────────────────────────────────

export function SupplierPayables() {
  const { hasPermission } = useAuth();
  if (!hasPermission('foreign_delivery.supplier_payables.view')) {
    return <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2></div>;
  }
  const canManage = hasPermission('foreign_delivery.supplier_payables.manage');

  const [invs, setInvs] = useState<SupplierInvoice[]>(SUPPLIER_INVOICES);
  const [filter, setFilter] = useState<'all' | PayableStatus>('all');

  const filtered = useMemo(() => filter === 'all' ? invs : invs.filter(i => i.status === filter), [invs, filter]);

  const stats = useMemo(() => ({
    pending:  invs.filter(i => i.status === 'pending' || i.status === 'partially_paid').length,
    paid:     invs.filter(i => i.status === 'paid').length,
    overdue:  invs.filter(i => i.status === 'overdue').length,
    totalDebt: invs.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + (i.amount - i.paid), 0),
  }), [invs]);

  function markPaid(id: string) {
    if (!canManage) return;
    setInvs(prev => prev.map(i => i.invoiceId === id ? { ...i, paid: i.amount, status: 'paid' } : i));
    toast.success('Invoice оплачен');
  }
  function partial(id: string) {
    if (!canManage) return;
    setInvs(prev => prev.map(i => {
      if (i.invoiceId !== id) return i;
      const half = Math.round((i.amount - i.paid) / 2);
      return { ...i, paid: i.paid + half, status: i.paid + half >= i.amount ? 'paid' : 'partially_paid' };
    }));
    toast.success('Частичная оплата');
  }
  function approve(id: string) {
    if (!canManage) return;
    setInvs(prev => prev.map(i => i.invoiceId === id ? { ...i, invoiceState: 'verified' } : i));
    toast.success('Invoice проверен');
  }
  function reject(id: string) {
    if (!canManage) return;
    setInvs(prev => prev.map(i => i.invoiceId === id ? { ...i, invoiceState: 'rejected', status: 'disputed' } : i));
    toast.warning('Invoice отклонён');
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
        <div className="flex items-center gap-2">
          <Receipt className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Задолженность поставщикам</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Invoice'ы, статусы, частичные оплаты, проверка документов.</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setFilter('pending')} className={`p-3 rounded-xl border text-left ${filter === 'pending' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
          <p className="text-xs text-blue-700 mb-1">Ожидают оплаты</p>
          <p className="text-xl font-bold text-blue-700">{stats.pending}</p>
        </button>
        <button onClick={() => setFilter('paid')} className={`p-3 rounded-xl border text-left ${filter === 'paid' ? 'bg-green-50 border-green-300 ring-2 ring-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
          <p className="text-xs text-green-700 mb-1">Оплачены</p>
          <p className="text-xl font-bold text-green-700">{stats.paid}</p>
        </button>
        <button onClick={() => setFilter('overdue')} className={`p-3 rounded-xl border text-left ${filter === 'overdue' ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
          <p className="text-xs text-red-700 mb-1">Просрочены</p>
          <p className="text-xl font-bold text-red-700">{stats.overdue}</p>
        </button>
        <button onClick={() => setFilter('all')} className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-left">
          <p className="text-xs text-rose-700 mb-1">Открытый долг (все валюты)</p>
          <p className="text-xl font-bold text-rose-700">≈ {fmtMoney(stats.totalDebt)}</p>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/70 border-b border-gray-100">
            <tr>
              <th className="text-left px-3 py-3 font-medium text-gray-500">Invoice</th>
              <th className="text-left px-3 py-3 font-medium text-gray-500">Поставщик / Заказ</th>
              <th className="text-right px-3 py-3 font-medium text-gray-500">Сумма</th>
              <th className="text-right px-3 py-3 font-medium text-gray-500 hidden md:table-cell">Оплачено</th>
              <th className="text-right px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">Срок</th>
              <th className="text-left px-3 py-3 font-medium text-gray-500">Статус</th>
              <th className="text-center px-3 py-3 font-medium text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(i => {
              const sup = SUPPLIERS.find(s => s.supplierId === i.supplierId);
              const ps = PAYABLE_STATUS_LABELS[i.status];
              const ds = DOC_STATUS_LABELS[i.invoiceState];
              const remaining = i.amount - i.paid;
              return (
                <tr key={i.invoiceId} className="hover:bg-gray-50/40">
                  <td className="px-3 py-3">
                    <p className="text-xs font-mono font-bold">{i.number}</p>
                    <p className="text-[10px] text-gray-500">{i.date}</p>
                    <span className={`inline-flex items-center w-fit gap-1 px-1.5 py-0 mt-1 rounded text-[9px] font-bold ${ds.cls}`}>
                      <FileText className="w-2.5 h-2.5" />{ds.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs font-semibold">{sup?.name ?? i.supplierId}</p>
                    <p className="text-[10px] text-gray-500">{sup?.country}</p>
                    {i.orderId && <Link to={`/foreign-delivery/orders?order=${i.orderId}`} className="text-[10px] text-blue-700 hover:underline">→ {i.orderId}</Link>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <p className="text-sm font-bold">{fmtMoney(i.amount, i.currency)}</p>
                    {remaining > 0 && <p className="text-[10px] text-rose-700">остаток {fmtMoney(remaining, i.currency)}</p>}
                  </td>
                  <td className="px-3 py-3 text-right hidden md:table-cell">
                    <p className="text-sm">{fmtMoney(i.paid, i.currency)}</p>
                  </td>
                  <td className="px-3 py-3 text-right hidden lg:table-cell">
                    <p className="text-xs">{i.dueDate}</p>
                    {i.status === 'overdue' && (
                      <p className="text-[10px] text-red-700 flex items-center gap-0.5 justify-end"><AlertTriangle className="w-2.5 h-2.5" />просрочен</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center w-fit px-1.5 py-0 rounded text-[9px] font-bold ${ps.cls}`}>{ps.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Locked perm="foreign_delivery.supplier_payables.manage">
                        <button disabled={!canManage} onClick={() => markPaid(i.invoiceId)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md" title="Оплачено"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                      </Locked>
                      <Locked perm="foreign_delivery.supplier_payables.manage">
                        <button disabled={!canManage} onClick={() => partial(i.invoiceId)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md" title="Частично">½</button>
                      </Locked>
                      <Locked perm="foreign_delivery.supplier_payables.manage">
                        <button disabled={!canManage} onClick={() => approve(i.invoiceId)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Проверить"><FileText className="w-3.5 h-3.5" /></button>
                      </Locked>
                      <Locked perm="foreign_delivery.supplier_payables.manage">
                        <button disabled={!canManage} onClick={() => reject(i.invoiceId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Отклонить"><XCircle className="w-3.5 h-3.5" /></button>
                      </Locked>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
