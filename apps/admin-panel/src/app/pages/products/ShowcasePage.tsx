/**
 * ShowcasePage — управление витриной (первые ряды) приложения покупателя.
 * SuperAdmin (или роль с products.showcase.manage) контролирует, какие товары
 * стоят в каких слотах на главной/в категории/в поиске/на странице продавца.
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Crown, Plus, Pencil as Edit2, Trash2, X, ArrowUp, ArrowDown,
  ToggleLeft, ToggleRight, Download, History, User, Eye, ExternalLink,
} from 'lucide-react';
import {
  PRODUCTS, MEDIA, photosForProduct,
  SHOWCASE_INITIAL, SHOWCASE_LOCATION_LABELS,
  type ShowcaseSlot, type ShowcaseLocation, type Product,
} from '../../data/products-mock';
import { exportToCsv } from '../../utils/downloads';
import { ProductPreviewModal } from '../../components/products/ProductPreviewModal';

interface AuditEntry { at: string; actor: string; actorRole: string; action: string; }

export function ShowcasePage() {
  const [slots, setSlots]               = useState<ShowcaseSlot[]>(SHOWCASE_INITIAL);
  const [locationFilter, setLocationFilter] = useState<ShowcaseLocation | 'all'>('all');
  const [showAdd, setShowAdd]           = useState(false);
  const [editing, setEditing]           = useState<ShowcaseSlot | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [audit, setAudit]               = useState<AuditEntry[]>([
    { at: '01.02.2026 10:00', actor: 'Супер Админ', actorRole: 'SuperAdmin',       action: 'Добавлен в слот #1: «iPhone 15 Pro 256 GB» (главная)' },
    { at: '10.02.2026 09:30', actor: 'Карпова А.И.', actorRole: 'Showcase Manager', action: 'Добавлен в слот #2: «Пицца «Маргарита»» (главная)' },
  ]);
  const [showHistory, setShowHistory]   = useState(false);
  const [form, setForm] = useState({
    productId: PRODUCTS[0]?.id ?? '',
    location: 'home' as ShowcaseLocation,
    locationContext: '',
    active: true,
  });

  function pushAudit(action: string) {
    setAudit(prev => [{
      at: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      actor: 'Супер Админ', actorRole: 'SuperAdmin', action,
    }, ...prev]);
  }

  const filtered = useMemo(() => {
    const list = locationFilter === 'all' ? slots : slots.filter(s => s.location === locationFilter);
    return [...list].sort((a, b) => a.slotNumber - b.slotNumber);
  }, [slots, locationFilter]);

  const slotsByLocation = useMemo(() => {
    const counts: Record<string, number> = {};
    slots.forEach(s => { counts[s.location] = (counts[s.location] ?? 0) + 1; });
    return counts;
  }, [slots]);

  function nextSlotNumber(location: ShowcaseLocation): number {
    const taken = slots.filter(s => s.location === location).map(s => s.slotNumber);
    let n = 1;
    while (taken.includes(n)) n++;
    return n;
  }

  function openAdd() {
    setEditing(null);
    setForm({ productId: PRODUCTS[0]?.id ?? '', location: 'home', locationContext: '', active: true });
    setShowAdd(true);
  }

  function openEdit(s: ShowcaseSlot) {
    setEditing(s);
    setForm({ productId: s.productId, location: s.location, locationContext: s.locationContext ?? '', active: s.active });
    setShowAdd(true);
  }

  function handleSave() {
    const product = PRODUCTS.find(p => p.id === form.productId);
    if (!product) { toast.error('Выберите товар'); return; }
    if (editing) {
      setSlots(prev => prev.map(s => s.id === editing.id ? {
        ...s, productId: product.id, productName: product.name,
        location: form.location, locationContext: form.locationContext || undefined,
        active: form.active,
      } : s));
      pushAudit(`Изменён слот #${editing.slotNumber} (${SHOWCASE_LOCATION_LABELS[form.location]}): «${product.name}»`);
      toast.success(`Слот #${editing.slotNumber} обновлён`);
    } else {
      const slotN = nextSlotNumber(form.location);
      const id = `show-${Date.now()}`;
      const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setSlots(prev => [...prev, {
        id, slotNumber: slotN, productId: product.id, productName: product.name,
        location: form.location, locationContext: form.locationContext || undefined,
        active: form.active,
        addedBy: 'Супер Админ', addedByRole: 'SuperAdmin', addedAt: now,
      }]);
      pushAudit(`Добавлен в слот #${slotN} (${SHOWCASE_LOCATION_LABELS[form.location]}): «${product.name}»`);
      toast.success(`«${product.name}» в слоте #${slotN}`);
    }
    setShowAdd(false);
    setEditing(null);
  }

  function moveSlot(id: string, direction: -1 | 1) {
    const target = slots.find(s => s.id === id);
    if (!target) return;
    const sameLoc = slots.filter(s => s.location === target.location).sort((a, b) => a.slotNumber - b.slotNumber);
    const idx = sameLoc.findIndex(s => s.id === id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sameLoc.length) return;
    const other = sameLoc[swapIdx];
    setSlots(prev => prev.map(s => {
      if (s.id === target.id) return { ...s, slotNumber: other.slotNumber };
      if (s.id === other.id)  return { ...s, slotNumber: target.slotNumber };
      return s;
    }));
    pushAudit(`${direction === -1 ? 'Поднят' : 'Опущен'} слот: «${target.productName}» в ${SHOWCASE_LOCATION_LABELS[target.location]}`);
    toast.success(`«${target.productName}» ${direction === -1 ? 'поднят' : 'опущен'}`);
  }

  function toggleActive(id: string) {
    const s = slots.find(x => x.id === id);
    setSlots(prev => prev.map(x => x.id === id ? { ...x, active: !x.active } : x));
    if (s) {
      pushAudit(`${s.active ? 'Отключён' : 'Включён'} слот #${s.slotNumber}: «${s.productName}»`);
      toast.success(`«${s.productName}» ${s.active ? 'отключён' : 'включён'}`);
    }
  }

  function removeSlot(id: string) {
    const s = slots.find(x => x.id === id);
    if (!s) return;
    if (!window.confirm(`Удалить «${s.productName}» из слота #${s.slotNumber}?`)) return;
    setSlots(prev => prev.filter(x => x.id !== id));
    pushAudit(`Удалён слот #${s.slotNumber}: «${s.productName}» (${SHOWCASE_LOCATION_LABELS[s.location]})`);
    toast.success(`Слот #${s.slotNumber} удалён`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">Витрина / Первые ряды</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">SuperAdmin контролирует, какие товары стоят в первых рядах в приложении покупателя.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            <History className="w-4 h-4" />История
          </button>
          <button
            onClick={() => {
              if (slots.length === 0) { toast.info('Нет слотов'); return; }
              exportToCsv(slots as any[], [
                { key: 'slotNumber',      label: 'Слот #' },
                { key: 'location',        label: 'Локация' },
                { key: 'productId',       label: 'Товар ID' },
                { key: 'productName',     label: 'Товар' },
                { key: 'active',          label: 'Активен' },
                { key: 'addedBy',         label: 'Кем' },
                { key: 'addedByRole',     label: 'Роль' },
                { key: 'addedAt',         label: 'Когда' },
              ], 'showcase-slots');
              toast.success(`Скачан CSV: ${slots.length} слотов`);
            }}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" />Добавить в витрину
          </button>
        </div>
      </div>

      {/* Location KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button onClick={() => setLocationFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer active:scale-[0.97] ${locationFilter === 'all' ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-300/50' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1">Всего слотов</p>
          <p className="text-xl font-bold text-orange-700">{slots.length}</p>
        </button>
        {(Object.keys(SHOWCASE_LOCATION_LABELS) as ShowcaseLocation[]).map(loc => {
          const count = slotsByLocation[loc] ?? 0;
          const isActive = locationFilter === loc;
          return (
            <button key={loc}
              onClick={() => setLocationFilter(isActive ? 'all' : loc)}
              className={`p-3 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer active:scale-[0.97] ${isActive ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-300/50' : 'bg-white border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">{SHOWCASE_LOCATION_LABELS[loc]}</p>
              <p className="text-xl font-bold text-orange-700">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Slots list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Crown className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Слотов нет</p>
            <button onClick={openAdd} className="text-orange-600 underline text-xs mt-2">Создать первый слот</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(s => {
              const product = PRODUCTS.find(p => p.id === s.productId);
              const photo = product ? photosForProduct(product.id, MEDIA)[0] : null;
              return (
                <div key={s.id} className={`flex items-center gap-4 px-4 py-3 ${s.active ? '' : 'opacity-50'} hover:bg-gray-50 transition-colors`}>
                  <div className="flex-shrink-0 w-10 text-center">
                    <div className="text-2xl font-black text-orange-500">#{s.slotNumber}</div>
                    <div className="text-[9px] text-gray-400 uppercase tracking-wider">{SHOWCASE_LOCATION_LABELS[s.location]}</div>
                  </div>
                  {/* Photo preview */}
                  <button
                    onClick={() => product && setPreviewProduct(product)}
                    title="Открыть preview товара"
                    className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-orange-300 transition-all shrink-0">
                    {photo ? (
                      photo.url
                        ? <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        : <div className={`w-full h-full ${photo.bg} flex items-center justify-center text-2xl`}>{photo.emoji}</div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs">{s.productName.slice(0, 2).toUpperCase()}</div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">{s.productName}</p>
                      {!s.active && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-medium">Выключен</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{s.addedBy}</span>
                      <span className="text-gray-300">·</span>
                      <span>{s.addedByRole}</span>
                      <span className="text-gray-300">·</span>
                      <span>{s.addedAt}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveSlot(s.id, -1)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-700" title="Поднять"><ArrowUp className="w-4 h-4" /></button>
                    <button onClick={() => moveSlot(s.id, +1)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-700" title="Опустить"><ArrowDown className="w-4 h-4" /></button>
                    <button onClick={() => toggleActive(s.id)} title={s.active ? 'Отключить' : 'Включить'} className="p-1.5 hover:bg-gray-100 rounded-md">
                      {s.active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </button>
                    <button onClick={() => product && setPreviewProduct(product)} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 text-gray-500 rounded-md" title="Preview"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 text-gray-500 rounded-md" title="Редактировать"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => removeSlot(s.id)} className="p-1.5 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-md" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 px-1">
        <Crown className="w-3 h-3 inline mr-1 text-orange-500" />
        Витрина управляет тем, какие товары стоят в первых рядах в приложении покупателя. Для маркетинговых акций — раздел
        {' '}<Link to="/products/promotions" className="text-blue-600 hover:underline">Продвижение</Link>.
      </p>

      {/* Add/edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">{editing ? `Редактировать слот #${editing.slotNumber}` : 'Добавить в витрину'}</p>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Товар *</label>
                <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Где показывать</label>
                <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value as ShowcaseLocation }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  {(Object.keys(SHOWCASE_LOCATION_LABELS) as ShowcaseLocation[]).map(loc => (
                    <option key={loc} value={loc}>{SHOWCASE_LOCATION_LABELS[loc]}</option>
                  ))}
                </select>
              </div>
              {(form.location === 'category' || form.location === 'merchant_page' || form.location === 'promotion_page') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    {form.location === 'category' ? 'ID/название категории' : form.location === 'merchant_page' ? 'ID продавца' : 'ID акции'}
                  </label>
                  <input value={form.locationContext} onChange={e => setForm(f => ({ ...f, locationContext: e.target.value }))}
                    placeholder={form.location === 'category' ? 'cat-electronics' : 'm-001'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              )}
              <button onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                className={`w-full py-2 border rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${form.active ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                {form.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {form.active ? 'Активен (показывается)' : 'Выключен (скрыт)'}
              </button>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold">{editing ? 'Сохранить' : 'Добавить'}</button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900 flex items-center gap-2"><History className="w-4 h-4" />История витрины</p>
              <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {audit.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">История пуста</p>
              ) : audit.map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-700">{h.action}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{h.actor} ({h.actorRole}) · {h.at}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Product preview */}
      {previewProduct && (
        <ProductPreviewModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          onAddToShowcase={(p) => {
            const slotN = nextSlotNumber('home');
            const id = `show-${Date.now()}`;
            const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            setSlots(prev => [...prev, { id, slotNumber: slotN, productId: p.id, productName: p.name, location: 'home', active: true, addedBy: 'Супер Админ', addedByRole: 'SuperAdmin', addedAt: now }]);
            pushAudit(`Добавлен в слот #${slotN} (Главная): «${p.name}» — через preview`);
            toast.success(`«${p.name}» добавлен в слот #${slotN}`);
          }}
        />
      )}
    </div>
  );
}
