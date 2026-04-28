/**
 * LocalSellers + SellerSettlements pages.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ReactDOM from 'react-dom';
import {
  Store, Search, Plus, Lock, Star, FileText, Download, HandCoins,
  Phone, MapPin, ArrowRight, Pencil, CheckCircle2, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Locked } from '../../components/rbac/PermissionLock';
import { exportToCsv } from '../../utils/downloads';
import {
  LOCAL_SELLERS, SELLER_SETTLEMENTS, SELLER_TYPE_LABELS,
  fmtMoney,
  type LocalSeller, type SellerSettlement, type SellerType, type SellerStatus,
} from '../../data/foreign-delivery';

const STATUS_CFG: Record<SellerStatus, { label: string; cls: string }> = {
  active:                { label: 'Активен',          cls: 'bg-green-100 text-green-700'   },
  inactive:              { label: 'Неактивен',        cls: 'bg-gray-100 text-gray-700'     },
  pending_verification:  { label: 'На проверке',      cls: 'bg-yellow-100 text-yellow-700' },
  blocked:               { label: 'Заблокирован',     cls: 'bg-red-100 text-red-700'       },
};

// ─── LocalSellers ────────────────────────────────────────────────────────────

export function LocalSellers() {
  const { hasPermission } = useAuth();
  if (!hasPermission('foreign_delivery.local_sellers.view')) {
    return <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2></div>;
  }
  const canManage = hasPermission('foreign_delivery.local_sellers.manage');

  const [sellers, setSellers] = useState<LocalSeller[]>(LOCAL_SELLERS);
  const [search, setSearch]   = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SellerType>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<LocalSeller>>({
    name: '', type: 'shop', contactName: '', phone: '', address: '',
    status: 'pending_verification', contract: 'pending',
  });

  function createSeller() {
    if (!canManage) return;
    if (!draft.name?.trim()) { toast.error('Введите название'); return; }
    if (!draft.contactName?.trim()) { toast.error('Введите контактное лицо'); return; }
    const id = `s-${Date.now()}`;
    const newSeller: LocalSeller = {
      sellerId:    id,
      name:        draft.name!.trim(),
      type:        draft.type ?? 'shop',
      contactName: draft.contactName!.trim(),
      phone:       draft.phone?.trim() ?? '',
      address:     draft.address?.trim() ?? '',
      status:      draft.status ?? 'pending_verification',
      contract:    draft.contract ?? 'pending',
      rating: 0, qualityScore: 0, ordersCount: 0,
      totalDue: 0, totalPaid: 0, outstanding: 0,
      documents: [], createdAt: new Date().toLocaleDateString('ru-RU'),
    };
    setSellers(prev => [newSeller, ...prev]);
    LOCAL_SELLERS.unshift(newSeller);
    setCreateOpen(false);
    setDraft({ name: '', type: 'shop', contactName: '', phone: '', address: '', status: 'pending_verification', contract: 'pending' });
    toast.success(`Создан продавец: ${newSeller.name}`);
  }

  const filtered = useMemo(() => sellers.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.contactName.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || s.type === typeFilter;
    return matchSearch && matchType;
  }), [sellers, search, typeFilter]);

  const stats = useMemo(() => ({
    total:   sellers.length,
    active:  sellers.filter(s => s.status === 'active').length,
    pending: sellers.filter(s => s.status === 'pending_verification').length,
    debt:    sellers.reduce((sum, s) => sum + s.outstanding, 0),
  }), [sellers]);

  function exportCsv() {
    exportToCsv(filtered as any[], [
      { key: 'sellerId',     label: 'ID' },
      { key: 'name',         label: 'Название' },
      { key: 'type',         label: 'Тип' },
      { key: 'contactName',  label: 'Контакт' },
      { key: 'phone',        label: 'Телефон' },
      { key: 'address',      label: 'Адрес' },
      { key: 'status',       label: 'Статус' },
      { key: 'rating',       label: 'Рейтинг' },
      { key: 'qualityScore', label: 'Качество' },
      { key: 'ordersCount',  label: 'Заказов' },
      { key: 'totalDue',     label: 'Долг' },
      { key: 'totalPaid',    label: 'Оплачено' },
      { key: 'outstanding',  label: 'Остаток' },
    ], 'local-sellers');
    toast.success(`Экспорт: ${filtered.length} продавцов`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Местные продавцы</h1>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-mono">{sellers.length}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Магазины, кафе, цветочные, склады, частные поставщики Туркменистана.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <Locked perm="foreign_delivery.local_sellers.manage">
            <button onClick={() => setCreateOpen(true)} disabled={!canManage}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
              <Plus className="w-4 h-4" />Добавить продавца
            </button>
          </Locked>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border bg-blue-50 border-blue-200"><p className="text-xs text-blue-700 mb-1">Всего</p><p className="text-xl font-bold text-blue-700">{stats.total}</p></div>
        <div className="p-3 rounded-xl border bg-green-50 border-green-200"><p className="text-xs text-green-700 mb-1">Активных</p><p className="text-xl font-bold text-green-700">{stats.active}</p></div>
        <div className="p-3 rounded-xl border bg-yellow-50 border-yellow-200"><p className="text-xs text-yellow-700 mb-1">На проверке</p><p className="text-xl font-bold text-yellow-700">{stats.pending}</p></div>
        <div className="p-3 rounded-xl border bg-rose-50 border-rose-200"><p className="text-xs text-rose-700 mb-1">Долг продавцам</p><p className="text-xl font-bold text-rose-700">{fmtMoney(stats.debt)}</p></div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">Все типы</option>
          {Object.entries(SELLER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(s => {
          const sc = STATUS_CFG[s.status];
          return (
            <div key={s.sellerId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{s.name}</p>
                    <p className="text-[10px] text-gray-500">{SELLER_TYPE_LABELS[s.type]}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.cls}`}>{sc.label}</span>
                </div>
                <div className="text-xs space-y-1">
                  <p className="flex items-center gap-1.5 text-gray-700"><Phone className="w-3 h-3 text-gray-400" />{s.phone}</p>
                  <p className="flex items-center gap-1.5 text-gray-700"><MapPin className="w-3 h-3 text-gray-400" />{s.address}</p>
                  <p className="text-gray-500">Контакт: {s.contactName}</p>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-1 border-t border-gray-50">
                  <div><p className="text-gray-500">★</p><p className="font-bold">{s.rating || '—'}</p></div>
                  <div><p className="text-gray-500">Качество</p><p className="font-bold">{s.qualityScore || '—'}</p></div>
                  <div><p className="text-gray-500">Заказов</p><p className="font-bold">{s.ordersCount}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-center pt-1 border-t border-gray-50">
                  <div><p className="text-gray-500">К выплате</p><p className="font-bold">{fmtMoney(s.totalDue)}</p></div>
                  <div><p className="text-gray-500">Долг</p><p className={`font-bold ${s.outstanding > 0 ? 'text-rose-700' : 'text-green-700'}`}>{fmtMoney(s.outstanding)}</p></div>
                </div>
                <div className="flex gap-1 pt-1">
                  <Link to="/foreign-delivery/seller-settlements" className="flex-1 py-1.5 border border-gray-200 rounded text-[10px] text-center hover:bg-gray-50">Расчёты</Link>
                  <Locked perm="foreign_delivery.local_sellers.manage">
                    <button disabled={!canManage} className="flex-1 py-1.5 border border-gray-200 rounded text-[10px] hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-1">
                      <Pencil className="w-2.5 h-2.5" />Редакт.
                    </button>
                  </Locked>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 py-16 text-center text-gray-400">
            <Store className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Продавцы не найдены</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {createOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">Новый продавец</p>
              <button onClick={() => setCreateOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Название *</label>
                <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} autoFocus
                  placeholder="Магазин «Гулистан»"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Тип</label>
                <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as SellerType }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  {Object.entries(SELLER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Договор</label>
                <select value={draft.contract} onChange={e => setDraft(d => ({ ...d, contract: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  <option value="pending">Ожидает</option>
                  <option value="has">Есть</option>
                  <option value="missing">Нет</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Контакт *</label>
                <input value={draft.contactName} onChange={e => setDraft(d => ({ ...d, contactName: e.target.value }))}
                  placeholder="Огулджемал М."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Телефон</label>
                <input value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
                  placeholder="+993 12 444-001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Адрес</label>
                <input value={draft.address} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))}
                  placeholder="Ашхабад, ул. Магтымгулы 14"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setCreateOpen(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={createSeller} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">Создать</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── SellerSettlements ───────────────────────────────────────────────────────

export function SellerSettlements() {
  const { hasPermission } = useAuth();
  if (!hasPermission('foreign_delivery.seller_settlements.view')) {
    return <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2></div>;
  }
  const canManage = hasPermission('foreign_delivery.seller_settlements.manage');

  const [data, setData] = useState<SellerSettlement[]>(SELLER_SETTLEMENTS);

  function markPaid(sellerId: string) {
    if (!canManage) return;
    setData(prev => prev.map(s => s.sellerId === sellerId ? {
      ...s, totalPaid: s.totalDue, outstanding: 0,
      payments: [...s.payments, { date: new Date().toLocaleDateString('ru-RU'), amount: s.outstanding, method: 'Bank', note: 'Закрыто' }],
    } : s));
    toast.success('Расчёт закрыт');
  }

  function partialPay(sellerId: string) {
    if (!canManage) return;
    setData(prev => prev.map(s => {
      if (s.sellerId !== sellerId) return s;
      const half = Math.round(s.outstanding / 2);
      return {
        ...s, totalPaid: s.totalPaid + half, outstanding: s.outstanding - half,
        payments: [...s.payments, { date: new Date().toLocaleDateString('ru-RU'), amount: half, method: 'Bank', note: 'Частичная оплата' }],
      };
    }));
    toast.success('Частичная оплата записана');
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
        <div className="flex items-center gap-2">
          <HandCoins className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Расчёты с продавцами</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">По каждому продавцу: заказы, выплаты, остаток долга, документы.</p>
      </div>

      <div className="space-y-3">
        {data.map(s => {
          const seller = LOCAL_SELLERS.find(x => x.sellerId === s.sellerId);
          const closed = s.outstanding === 0;
          return (
            <div key={s.sellerId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{seller?.name ?? s.sellerId}</p>
                  <p className="text-xs text-gray-500">{s.period} · {s.ordersCount} заказов · {s.ordersCompleted} выполнено · {s.ordersCancelled} отмен · {s.ordersReturned} возврат</p>
                </div>
                <div className="flex items-center gap-2">
                  {closed ? (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Закрыто</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">Долг {fmtMoney(s.outstanding)}</span>
                  )}
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-blue-700 uppercase">К выплате</p>
                  <p className="text-lg font-bold text-blue-700">{fmtMoney(s.totalDue)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-green-700 uppercase">Оплачено</p>
                  <p className="text-lg font-bold text-green-700">{fmtMoney(s.totalPaid)}</p>
                </div>
                <div className={`${closed ? 'bg-green-50' : 'bg-rose-50'} rounded-lg p-2.5`}>
                  <p className={`text-[10px] uppercase ${closed ? 'text-green-700' : 'text-rose-700'}`}>Остаток</p>
                  <p className={`text-lg font-bold ${closed ? 'text-green-700' : 'text-rose-700'}`}>{fmtMoney(s.outstanding)}</p>
                </div>
              </div>
              {s.payments.length > 0 && (
                <div className="px-4 pb-3">
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">История выплат</p>
                  <div className="space-y-1">
                    {s.payments.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-gray-50 rounded">
                        <span className="text-gray-500">{p.date}</span>
                        <span className="font-mono">{p.method}</span>
                        <span className="flex-1 text-gray-600">{p.note}</span>
                        <span className="font-bold">{fmtMoney(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!closed && canManage && (
                <div className="px-4 py-3 border-t bg-gray-50 flex flex-wrap gap-2">
                  <button onClick={() => markPaid(s.sellerId)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3" />Отметить оплачено
                  </button>
                  <button onClick={() => partialPay(s.sellerId)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold">
                    Частичная оплата
                  </button>
                  <Link to="/foreign-delivery/orders" className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-xs">
                    Открыть заказы<ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
