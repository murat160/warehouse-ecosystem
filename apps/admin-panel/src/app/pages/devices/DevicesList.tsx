/**
 * Devices Management — scanners, scales, printers, cameras, RFID gates.
 *
 * Wired to /api/devices (real backend module from Stage 2). On network/auth
 * failure falls back to a demo set so the page never breaks the build.
 *
 * Visual style mirrors /warehouses: white cards, lucide icons, blue primary
 * action button.
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, ScanLine, Printer, Scale, Camera, Radio,
  Smartphone, Wifi, WifiOff, Wrench, X, Battery, Cpu, ChevronRight,
} from 'lucide-react';
import { devicesApi, type DeviceDto } from '../../lib/api';

type DeviceType = DeviceDto['type'];

const TYPE_ICON: Record<DeviceType, any> = {
  SCANNER: ScanLine,
  SCALE: Scale,
  PRINTER: Printer,
  CAMERA: Camera,
  RFID: Radio,
};

const TYPE_LABEL: Record<DeviceType, string> = {
  SCANNER: 'Сканер ШК',
  SCALE: 'Весы',
  PRINTER: 'Принтер этикеток',
  CAMERA: 'Камера',
  RFID: 'RFID-врата',
};

const STATUS_LABEL: Record<DeviceDto['status'], string> = {
  ACTIVE: 'Активно',
  OFFLINE: 'Offline',
  MAINTENANCE: 'Обслуживание',
};

const STATUS_COLOR: Record<DeviceDto['status'], string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  OFFLINE: 'bg-gray-100 text-gray-600',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
};

// Demo set — shown when /api/devices is not reachable yet.
const FALLBACK: DeviceDto[] = [
  { id: 'dev-demo-1', code: 'SCAN-001', type: 'SCANNER', name: 'Zebra TC52', assignedTo: 'W-204', status: 'ACTIVE',  lastSeenAt: new Date(Date.now() -    30_000).toISOString() },
  { id: 'dev-demo-2', code: 'SCAN-002', type: 'SCANNER', name: 'Zebra TC52', assignedTo: 'W-101', status: 'ACTIVE',  lastSeenAt: new Date(Date.now() -   180_000).toISOString() },
  { id: 'dev-demo-3', code: 'SCALE-001',type: 'SCALE',   name: 'Mettler PS60',assignedTo: 'W-506',status: 'ACTIVE',  lastSeenAt: new Date(Date.now() -   600_000).toISOString() },
  { id: 'dev-demo-4', code: 'PRN-001',  type: 'PRINTER', name: 'Zebra ZD230', assignedTo: 'W-506',status: 'MAINTENANCE', lastSeenAt: new Date(Date.now() - 3_600_000).toISOString() },
  { id: 'dev-demo-5', code: 'CAM-001',  type: 'CAMERA',  name: 'Hikvision DS-2CD',assignedTo: null,status: 'ACTIVE', lastSeenAt: new Date(Date.now() - 90_000).toISOString() },
  { id: 'dev-demo-6', code: 'RFID-001', type: 'RFID',    name: 'Impinj R420', assignedTo: null,   status: 'OFFLINE', lastSeenAt: new Date(Date.now() - 86_400_000).toISOString() },
];

export function DevicesList() {
  const [items, setItems] = useState<DeviceDto[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | DeviceType>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    devicesApi.list()
      .then(rows => { setItems(rows); setUsingFallback(false); })
      .catch(() => { setItems(FALLBACK); setUsingFallback(true); })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter(d => {
      if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (d.assignedTo ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, typeFilter, query]);

  const counts = useMemo(() => {
    const acc: Record<DeviceType, number> = { SCANNER: 0, SCALE: 0, PRINTER: 0, CAMERA: 0, RFID: 0 };
    items.forEach(d => { acc[d.type]++; });
    return acc;
  }, [items]);

  function ping(id: string) {
    devicesApi.heartbeat(id)
      .then(() => { toast.success('Heartbeat принят'); load(); })
      .catch((e) => toast.error(e.message ?? 'Не удалось'));
  }

  const drawer = drawerId ? items.find(i => i.id === drawerId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Устройства склада</h1>
          <p className="text-gray-500">Сканеры, весы, принтеры, камеры, RFID-шлюзы</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Зарегистрировать устройство
        </button>
      </div>

      {usingFallback && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          Нет связи с /api/devices — показаны демо-данные. Войдите как admin (W-002 / 0000), чтобы увидеть реальный список.
        </div>
      )}

      {/* Type counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['SCANNER','SCALE','PRINTER','CAMERA','RFID'] as DeviceType[]).map(t => {
          const Icon = TYPE_ICON[t];
          return (
            <button key={t}
              onClick={() => setTypeFilter(typeFilter === t ? 'ALL' : t)}
              className={`bg-white p-4 rounded-xl border text-left transition ${typeFilter === t ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{TYPE_LABEL[t]}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{counts[t]}</p>
                </div>
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по коду, имени или сотруднику…"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {typeFilter !== 'ALL' && (
          <button onClick={() => setTypeFilter('ALL')}
            className="px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">
            Сбросить тип ({TYPE_LABEL[typeFilter]})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Загрузка…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Устройств нет</p>
            <p className="text-sm text-gray-400 mt-1">Зарегистрируйте сканер, весы или принтер.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Тип</th>
                <th className="px-4 py-3">Модель</th>
                <th className="px-4 py-3">Сотрудник</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const Icon = TYPE_ICON[d.type];
                return (
                  <tr key={d.id} onClick={() => setDrawerId(d.id)}
                      className="border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{d.code}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-gray-700">
                        <Icon className="w-4 h-4" />
                        {TYPE_LABEL[d.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.assignedTo ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3"><Badge className={STATUS_COLOR[d.status]}>{STATUS_LABEL[d.status]}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">
                      <Wifi className="inline w-3 h-3 mr-1" />
                      {d.lastSeenAt ? relativeTime(d.lastSeenAt) : 'никогда'}
                    </td>
                    <td className="px-4 py-3 text-gray-400"><ChevronRight className="w-4 h-4" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}

      {drawer && (
        <DetailDrawer device={drawer} onClose={() => setDrawerId(null)} onPing={() => ping(drawer.id)} />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${className ?? 'bg-gray-100 text-gray-700'}`}>{children}</span>;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'только что';
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} мин`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч`;
  return `${Math.round(h / 24)} д`;
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<DeviceType>('SCANNER');
  const [assignedTo, setAssignedTo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 3 || name.trim().length < 2) {
      toast.error('Код и название обязательны');
      return;
    }
    setBusy(true);
    try {
      await devicesApi.create({
        code: code.trim(), name: name.trim(), type,
        assignedTo: assignedTo.trim() || null,
      });
      toast.success('Устройство добавлено');
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? 'Не удалось');
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold">Зарегистрировать устройство</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </header>
        <div className="p-4 space-y-3 overflow-y-auto">
          <Field label="Код устройства">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="SCAN-007"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </Field>
          <Field label="Тип">
            <select value={type} onChange={e => setType(e.target.value as DeviceType)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Модель / название">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Zebra TC52"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </Field>
          <Field label="Сотрудник (Employee ID, опционально)">
            <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="W-204"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </Field>
        </div>
        <footer className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100">Отмена</button>
          <button type="submit" disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? 'Сохраняем…' : 'Создать'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function DetailDrawer({ device, onClose, onPing }:
  { device: DeviceDto; onClose: () => void; onPing: () => void }) {
  const Icon = TYPE_ICON[device.type];
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-stretch justify-end" onClick={onClose}>
      <aside className="w-full max-w-md bg-white shadow-xl h-full flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Icon className="w-5 h-5" /> {device.code}
            </h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-gray-500">{device.name}</p>
          <Badge className={`mt-2 ${STATUS_COLOR[device.status]}`}>{STATUS_LABEL[device.status]}</Badge>
        </header>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <DetailRow label="Тип" value={TYPE_LABEL[device.type]} />
          <DetailRow label="Сотрудник" value={device.assignedTo ?? '—'} />
          <DetailRow label="Last heartbeat"
            value={device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('ru-RU') : 'никогда'} />
          {/* Mock telemetry — replaced when device telemetry endpoint ships */}
          <div className="grid grid-cols-2 gap-3">
            <Telemetry label="Заряд"   icon={Battery} value="92%" />
            <Telemetry label="Прошивка" icon={Cpu}    value="v3.4.1" />
          </div>
        </div>
        <footer className="p-4 border-t border-gray-200 flex flex-wrap gap-2">
          <button onClick={onPing} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200">
            <Wrench className="inline w-3 h-3 mr-1" /> Heartbeat ping
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}
function Telemetry({ label, icon: Icon, value }: { label: string; icon: any; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</div>
      <div className="text-sm font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
