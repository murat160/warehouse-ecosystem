import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Clock, Phone, Wifi, WifiOff, Loader2, XCircle,
  Plus, MoreHorizontal, Star, Package, ChevronDown, ChevronUp,
  LayoutGrid, Navigation, Map, CheckCircle, AlertCircle,
  ExternalLink, PhoneCall, X, Save, Building2,
} from 'lucide-react';
import { getSellerStores, SellerStore, StoreStatus } from '../../data/merchants-mock';
import { StoreDetailDrawer } from './StoreDetailDrawer';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

// ─── Add Store Modal ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: StoreStatus; label: string; dot: string }[] = [
  { value: 'online',  label: 'Онлайн',   dot: 'bg-green-500' },
  { value: 'offline', label: 'Офлайн',   dot: 'bg-gray-400' },
  { value: 'busy',    label: 'Загружен', dot: 'bg-orange-500' },
  { value: 'closed',  label: 'Закрыт',   dot: 'bg-red-500' },
];

interface AddStoreModalProps {
  onAdd: (store: SellerStore) => void;
  onClose: () => void;
}

function AddStoreModal({ onAdd, onClose }: AddStoreModalProps) {
  const [name, setName]               = useState('');
  const [city, setCity]               = useState('');
  const [address, setAddress]         = useState('');
  const [phone, setPhone]             = useState('+7 (');
  const [hoursOpen, setHoursOpen]     = useState('09:00');
  const [hoursClose, setHoursClose]   = useState('21:00');
  const [serviceZone, setServiceZone] = useState('');
  const [status, setStatus]           = useState<StoreStatus>('online');
  const [prepTime, setPrepTime]       = useState('20');
  const [errors, setErrors]           = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Введите название магазина';
    if (!city.trim()) errs.city = 'Введите город';
    if (!address.trim()) errs.address = 'Введите адрес';
    if (!phone.trim() || phone.length < 7) errs.phone = 'Введите корректный телефон';
    if (!serviceZone.trim()) errs.serviceZone = 'Укажите зону обслуживания';
    const prep = parseInt(prepTime, 10);
    if (isNaN(prep) || prep < 0 || prep > 999) errs.prepTime = 'Укажите время от 0 до 999 мин';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const newStore: SellerStore = {
      id: `st-new-${Date.now()}`,
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      phone: phone.trim(),
      workingHours: `${hoursOpen}–${hoursClose}`,
      status,
      avgPrepTime: parseInt(prepTime, 10),
      ordersToday: 0,
      rating: 0,
      serviceZone: serviceZone.trim(),
      menuItems: [],
    };
    onAdd(newStore);
    toast.success(`Магазин «${newStore.name}» успешно добавлен ✓`);
    onClose();
  }

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );

  const inputCls = (err?: string) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
      err ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gray-900/55 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 18 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Добавить магазин</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Новая точка продажи продавца</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <Field label="Название магазина *" error={errors.name}>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Например: Основной магазин, Филиал Юг..."
              className={inputCls(errors.name)}
              autoFocus
            />
          </Field>

          {/* City + Zone */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Город *" error={errors.city}>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Москва" className={inputCls(errors.city)} />
            </Field>
            <Field label="Зона обслуживания *" error={errors.serviceZone}>
              <input value={serviceZone} onChange={e => setServiceZone(e.target.value)} placeholder="ЦАО, ЮЗАО..." className={inputCls(errors.serviceZone)} />
            </Field>
          </div>

          {/* Address */}
          <Field label="Адрес *" error={errors.address}>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="ул. Тверская, 15" className={inputCls(errors.address)} />
          </Field>

          {/* Phone */}
          <Field label="Телефон *" error={errors.phone}>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+7 (495) 000-00-00"
                className={`${inputCls(errors.phone)} pl-8`}
              />
            </div>
          </Field>

          {/* Working hours */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Рабочие часы</label>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 font-medium">Открытие</span>
              <input
                type="time" value={hoursOpen} onChange={e => setHoursOpen(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <span className="text-gray-300">—</span>
              <span className="text-xs text-gray-500 font-medium">Закрытие</span>
              <input
                type="time" value={hoursClose} onChange={e => setHoursClose(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              График: {hoursOpen}–{hoursClose}
            </p>
          </div>

          {/* Status + Prep time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Статус</label>
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-medium transition-all ${
                      status === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Ср. время подготовки (мин)" error={errors.prepTime}>
              <input
                type="number" min="0" max="999"
                value={prepTime} onChange={e => setPrepTime(e.target.value)}
                className={inputCls(errors.prepTime)}
              />
            </Field>
          </div>

          {/* Preview summary */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide mb-1.5">Предпросмотр</p>
            <p className="text-xs font-bold text-gray-900">{name || '—'}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{city ? `${city}${address ? ', ' + address : ''}` : '—'}</p>
            <p className="text-[10px] text-gray-500">{hoursOpen}–{hoursClose} · {serviceZone || 'Зона не указана'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 pb-5 pt-2 shrink-0 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <Save className="w-4 h-4" />Добавить магазин
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Mock coords for each store ───────────────────────────────────────────────
const STORE_COORDS: Record<string, [number, number]> = {
  'st-1': [55.7644, 37.6027],  // ул. Тверская, Москва, ЦАО
  'st-2': [55.6827, 37.5660],  // ул. Профсоюзная, Москва, ЮЗАО
  'st-3': [55.4287, 37.5472],  // пр. Ленина, Подольск
  'st-4': [55.8356, 37.4919],  // ТЦ Метрополис, САО
};

// ─── Working hours helpers ────────────────────────────────────────────────────

function parseWorkingHours(wh: string): { open: string; close: string } | null {
  const m = wh.match(/(\d{2}:\d{2})[–-](\d{2}:\d{2})/);
  if (!m) return null;
  return { open: m[1], close: m[2] };
}

function isOpenNow(wh: string): boolean {
  const p = parseWorkingHours(wh);
  if (!p) return false;
  const now = new Date();
  const [oh, om] = p.open.split(':').map(Number);
  const [ch, cm] = p.close.split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  return cur >= open && cur < close;
}

function minutesUntilClose(wh: string): number | null {
  const p = parseWorkingHours(wh);
  if (!p) return null;
  const now = new Date();
  const [ch, cm] = p.close.split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const close = ch * 60 + cm;
  return Math.max(0, close - cur);
}

function minutesUntilOpen(wh: string): number | null {
  const p = parseWorkingHours(wh);
  if (!p) return null;
  const now = new Date();
  const [oh, om] = p.open.split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = oh * 60 + om;
  const diff = open - cur;
  return diff > 0 ? diff : 24 * 60 + diff;
}

function WorkingHoursBadge({ hours, storeStatus }: { hours: string; storeStatus: string }) {
  if (storeStatus === 'offline' || storeStatus === 'closed') {
    const minsUntilOpen = minutesUntilOpen(hours);
    const p = parseWorkingHours(hours);
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <div className="flex items-center gap-1 text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{hours}</span>
        </div>
        {p && (
          <span className="text-orange-600 font-medium">
            · Откроется в {p.open}
          </span>
        )}
      </div>
    );
  }
  const open = isOpenNow(hours);
  const minsClose = minutesUntilClose(hours);
  const p = parseWorkingHours(hours);
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className="flex items-center gap-1 text-gray-500">
        <Clock className="w-3.5 h-3.5" />
        <span>{hours}</span>
      </div>
      {open && minsClose !== null && minsClose <= 60 ? (
        <span className="text-orange-600 font-semibold">
          · Закроется через {minsClose} мин
        </span>
      ) : open ? (
        <span className="flex items-center gap-0.5 text-green-600 font-semibold">
          <CheckCircle className="w-3 h-3" />Сейчас открыт
        </span>
      ) : null}
    </div>
  );
}

// ─── Leaflet Map (dynamic import to avoid SSR issues) ──────────���──────────────

interface StoreMapProps {
  stores: SellerStore[];
  selectedId: string | null;
  onSelectStore: (id: string) => void;
}

function StoreMap({ stores, selectedId, onSelectStore }: StoreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    let L: any;
    let map: any;

    import('leaflet').then(mod => {
      L = mod.default || mod;
      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      map = L.map(mapRef.current!, {
        center: [55.7558, 37.6176],
        zoom: 10,
        zoomControl: true,
        attributionControl: false,
      });
      leafletRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Add store markers
      stores.forEach(store => {
        const coords = STORE_COORDS[store.id];
        if (!coords) return;

        const statusColors: Record<string, string> = {
          online: '#16a34a', offline: '#6b7280', busy: '#ea580c', closed: '#dc2626',
        };
        const color = statusColors[store.status] ?? '#6b7280';

        const icon = L.divIcon({
          html: `
            <div style="
              position:relative; width:36px; height:36px;
              background:${color}; border-radius:50% 50% 50% 0;
              transform:rotate(-45deg); border:3px solid white;
              box-shadow:0 2px 8px rgba(0,0,0,0.3);
            ">
              <div style="
                position:absolute; inset:0; border-radius:50%;
                display:flex; align-items:center; justify-content:center;
                transform:rotate(45deg); color:white;
                font-size:14px; font-weight:bold;
              ">📍</div>
            </div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -38],
        });

        const statusLabel: Record<string, string> = {
          online: '🟢 Онлайн', offline: '⚫ Офлайн', busy: '🟠 Загружен', closed: '🔴 Закрыт',
        };

        const marker = L.marker(coords, { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:system-ui;min-width:180px;padding:4px">
              <p style="font-weight:700;font-size:14px;margin:0 0 4px">${store.name}</p>
              <p style="font-size:12px;color:#6b7280;margin:0 0 2px">📍 ${store.address}, ${store.city}</p>
              <p style="font-size:12px;color:#6b7280;margin:0 0 2px">🕐 ${store.workingHours}</p>
              <p style="font-size:12px;color:#6b7280;margin:0 0 4px">📞 ${store.phone}</p>
              <span style="font-size:11px;font-weight:600">${statusLabel[store.status] ?? store.status}</span>
              · <span style="font-size:11px;color:#6b7280">★ ${store.rating}</span>
            </div>
          `, { maxWidth: 240 })
          .on('click', () => onSelectStore(store.id));

        markersRef.current[store.id] = marker;
      });

      // Fit bounds
      const coords = stores.map(s => STORE_COORDS[s.id]).filter(Boolean) as [number, number][];
      if (coords.length > 1) {
        map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
      } else if (coords.length === 1) {
        map.setView(coords[0], 13);
      }
    }).catch(err => console.warn('Leaflet load error', err));

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        markersRef.current = {};
      }
    };
  }, []);

  // Pan to selected store
  useEffect(() => {
    if (!leafletRef.current || !selectedId) return;
    const coords = STORE_COORDS[selectedId];
    if (!coords) return;
    leafletRef.current.flyTo(coords, 14, { duration: 0.8 });
    const marker = markersRef.current[selectedId];
    if (marker) setTimeout(() => marker.openPopup(), 850);
  }, [selectedId]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden border border-gray-200"
      style={{ height: 280, zIndex: 0 }}
    />
  );
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any; dot: string }> = {
  online:  { label: 'Онлайн',   color: 'text-green-700',  bg: 'bg-green-100',  icon: Wifi,     dot: 'bg-green-500' },
  offline: { label: 'Офлайн',   color: 'text-gray-600',   bg: 'bg-gray-100',   icon: WifiOff,  dot: 'bg-gray-400' },
  busy:    { label: 'Загружен', color: 'text-orange-700', bg: 'bg-orange-100', icon: Loader2,  dot: 'bg-orange-500' },
  closed:  { label: 'Закрыт',   color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle,  dot: 'bg-red-500' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { sellerId: string; }

export function SellerStoresTab({ sellerId }: Props) {
  const [stores, setStores] = useState<SellerStore[]>(() => getSellerStores(sellerId));
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [drawerStore, setDrawerStore] = useState<SellerStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [storeStatuses, setStoreStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(stores.map(s => [s.id, s.status]))
  );

  function handleAddStore(newStore: SellerStore) {
    setStores(prev => [...prev, newStore]);
    setStoreStatuses(prev => ({ ...prev, [newStore.id]: newStore.status }));
    // Auto-select the new store card
    setTimeout(() => {
      setSelectedStoreId(newStore.id);
      const card = document.getElementById(`store-card-${newStore.id}`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  function toggleStatus(store: SellerStore) {
    const current = storeStatuses[store.id] ?? store.status;
    const next = current === 'online' || current === 'busy' ? 'offline' : 'online';
    setStoreStatuses(prev => ({ ...prev, [store.id]: next }));
    toast.success(`${store.name}: ${next === 'online' ? 'переведён в онлайн ✓' : 'переведён в офлайн'}`);
  }

  function selectStore(id: string) {
    setSelectedStoreId(id);
    const card = document.getElementById(`store-card-${id}`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Магазины / точки продавца ({stores.length})</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMap(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${showMap ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Map className="w-3.5 h-3.5" />{showMap ? 'Скрыть карту' : 'Показать карту'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />Добавить магазин
          </button>
        </div>
      </div>

      {/* ── Map ── */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Leaflet CSS */}
            <link
              rel="stylesheet"
              href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            />
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-gray-900">Расположение магазинов</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span>{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-2 relative">
                <StoreMap
                  stores={stores.map(s => ({ ...s, status: storeStatuses[s.id] ?? s.status }))}
                  selectedId={selectedStoreId}
                  onSelectStore={selectStore}
                />
              </div>
              {/* Legend row under map */}
              <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-100 overflow-x-auto">
                {stores.map(store => {
                  const status = storeStatuses[store.id] ?? store.status;
                  const cfg = STATUS_CFG[status] ?? STATUS_CFG.offline;
                  const isSelected = selectedStoreId === store.id;
                  return (
                    <button
                      key={store.id}
                      onClick={() => selectStore(store.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                        isSelected ? 'bg-blue-600 text-white' : `${cfg.bg} ${cfg.color} hover:opacity-80`
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : cfg.dot}`} />
                      {store.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Store cards grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stores.map((store) => {
          const currentStatus = storeStatuses[store.id] ?? store.status;
          const sc = STATUS_CFG[currentStatus] ?? STATUS_CFG.offline;
          const Icon = sc.icon;
          const isExpanded = expandedStore === store.id;
          const isSelected = selectedStoreId === store.id;
          const hasItems = store.menuItems && store.menuItems.length > 0;
          const inStockCount = hasItems ? store.menuItems.filter(m => m.inStock).length : 0;
          const outOfStockCount = hasItems ? store.menuItems.filter(m => !m.inStock).length : 0;
          const phoneHref = `tel:${store.phone.replace(/\s|\(|\)|-/g, '')}`;
          const openNow = isOpenNow(store.workingHours) && (currentStatus === 'online' || currentStatus === 'busy');
          const parsed = parseWorkingHours(store.workingHours);

          return (
            <button
              id={`store-card-${store.id}`}
              key={store.id}
              onClick={() => setSelectedStoreId(isSelected ? null : store.id)}
              className={`border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer text-left w-full active:scale-[0.98] ${
                isSelected
                  ? 'border-blue-400 shadow-md ring-2 ring-blue-100 bg-blue-50/30'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* ── Card header ── */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900">{store.name}</h4>
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${sc.bg} ${sc.color}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{store.city}, {store.address}</span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); toast.info(`Меню: ${store.name}`); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg shrink-0 ml-2"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* ── Stats row ── */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Заказы</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{store.ordersToday}</p>
                  <p className="text-[10px] text-gray-400">сегодня</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Подготовка</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{store.avgPrepTime > 0 ? `${store.avgPrepTime}м` : '—'}</p>
                  <p className="text-[10px] text-gray-400">ср. время</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Рейтинг</p>
                  <p className="text-sm font-bold text-yellow-600 mt-0.5 flex items-center justify-center gap-0.5">
                    <Star className="w-3 h-3" />{store.rating}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Зона</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{store.serviceZone}</p>
                </div>
              </div>

              {/* ── Product/Menu preview strip ── */}
              {hasItems && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        Товары: <span className="text-green-600 font-medium">{inStockCount} в наличии</span>
                        {outOfStockCount > 0 && <span className="text-red-500 font-medium ml-1">· {outOfStockCount} нет</span>}
                      </span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setExpandedStore(prev => prev === store.id ? null : store.id); }}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      {isExpanded ? 'Скрыть' : 'Все товары'}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Compact thumbnails */}
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {store.menuItems.slice(0, 6).map(item => (
                      <div
                        key={item.id}
                        className={`relative w-9 h-9 rounded-md overflow-hidden border shrink-0 ${item.inStock ? 'border-gray-200' : 'border-red-200 opacity-50'}`}
                        title={`${item.name} — ₽${item.price.toLocaleString()}${item.inStock ? '' : ' (нет в наличии)'}`}
                      >
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                        {!item.inStock && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <XCircle className="w-3 h-3 text-red-600" />
                          </div>
                        )}
                      </div>
                    ))}
                    {store.menuItems.length > 6 && (
                      <div className="w-9 h-9 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <span className="text-[10px] text-gray-500">+{store.menuItems.length - 6}</span>
                      </div>
                    )}
                  </div>

                  {/* Expanded product list */}
                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                      {store.menuItems.map(item => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-2.5 p-1.5 rounded-lg ${item.inStock ? 'bg-gray-50' : 'bg-red-50/50'}`}
                        >
                          <div className={`w-8 h-8 rounded overflow-hidden border shrink-0 ${item.inStock ? 'border-gray-200' : 'border-red-200'}`}>
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs truncate ${item.inStock ? 'text-gray-900' : 'text-gray-500 line-through'}`}>{item.name}</p>
                          </div>
                          <span className="text-xs font-medium text-gray-600 shrink-0">₽{item.price.toLocaleString()}</span>
                          <span className={`text-[10px] px-1 py-0.5 rounded ${item.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.inStock ? 'Есть' : 'Нет'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Contact row: phone + hours ── */}
              <div
                className="mt-3 pt-3 border-t border-gray-100 space-y-2"
                onClick={e => e.stopPropagation()}
              >
                {/* Phone — clickable tel: link */}
                <div className="flex items-center justify-between">
                  <a
                    href={phoneHref}
                    className="flex items-center gap-2 text-xs text-gray-700 hover:text-blue-700 transition-colors group"
                    title="Позвонить"
                  >
                    <div className="w-6 h-6 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
                      <PhoneCall className="w-3.5 h-3.5 text-green-700" />
                    </div>
                    <span className="font-medium group-hover:underline">{store.phone}</span>
                  </a>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(store.address + ', ' + store.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <Navigation className="w-3 h-3" />Google Maps
                  </a>
                </div>

                {/* Working hours — rich display */}
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <WorkingHoursBadge hours={store.workingHours} storeStatus={currentStatus} />
                  </div>
                  {/* Visual hours bar */}
                  {parsed && (
                    <div className="mt-2">
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        {(() => {
                          const dayStart = 6 * 60; // 6:00
                          const dayEnd = 24 * 60;  // 24:00
                          const dayRange = dayEnd - dayStart;
                          const [oh, om] = parsed.open.split(':').map(Number);
                          const [ch, cm] = parsed.close.split(':').map(Number);
                          const openMin = oh * 60 + om - dayStart;
                          const closeMin = ch * 60 + cm - dayStart;
                          const openPct = Math.max(0, (openMin / dayRange) * 100);
                          const widthPct = Math.max(0, ((closeMin - openMin) / dayRange) * 100);
                          const now = new Date();
                          const nowMin = now.getHours() * 60 + now.getMinutes() - dayStart;
                          const nowPct = Math.min(100, Math.max(0, (nowMin / dayRange) * 100));
                          const isOpen = openNow;
                          return (
                            <div style={{display:'contents'}}>
                              <div
                                className={`absolute top-0 bottom-0 rounded-full ${isOpen ? 'bg-green-400' : 'bg-gray-400'}`}
                                style={{ left: `${openPct}%`, width: `${widthPct}%` }}
                              />
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full border border-white shadow-sm z-10"
                                style={{ left: `${nowPct}%` }}
                                title="Сейчас"
                              />
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[10px] text-gray-400">6:00</span>
                        <span className="text-[10px] text-blue-500 font-medium">сейчас</span>
                        <span className="text-[10px] text-gray-400">24:00</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Action buttons ── */}
              <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                {currentStatus === 'online' || currentStatus === 'busy' ? (
                  <button
                    onClick={() => toggleStatus(store)}
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    Перевести offline
                  </button>
                ) : (
                  <button
                    onClick={() => toggleStatus(store)}
                    className="flex-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Перевести online
                  </button>
                )}
                <button
                  onClick={() => setDrawerStore(store)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />Каталог товаров
                </button>
              </div>
            </button>
          );
        })}
      </div>

      {/* Store Detail Drawer */}
      {drawerStore && (
        <StoreDetailDrawer store={drawerStore} sellerId={sellerId} onClose={() => setDrawerStore(null)} />
      )}

      {/* Add Store Modal */}
      {showAddModal && (
        <AddStoreModal
          onAdd={handleAddStore}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}