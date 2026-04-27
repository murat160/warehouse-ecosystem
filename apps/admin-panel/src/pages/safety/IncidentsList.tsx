/**
 * Safety / Incidents — warehouse safety register.
 *
 * Wired to /api/incidents when backend module ships; otherwise falls back to
 * an in-memory store so the page never breaks the admin panel build.
 *
 * Visual style is intentionally identical to existing pages
 * (e.g. /warehouses): Tailwind utilities, lucide icons, white cards on
 * gray background, blue primary button.
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, ShieldAlert, Activity, AlertTriangle, X,
  CheckCircle2, Clock, ChevronRight, Shield,
} from 'lucide-react';
import { incidentsApi, type IncidentDto } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

type IncidentType = IncidentDto['type'];
type IncidentStatus = IncidentDto['status'];
type Severity = IncidentDto['severity'];

const TYPE_LABEL: Record<IncidentType, string> = {
  INJURY:            'Травма сотрудника',
  DAMAGED_RACK:      'Повреждённый стеллаж',
  BLOCKED_AISLE:     'Заблокированный проход',
  FORKLIFT_ISSUE:    'Проблема с погрузчиком',
  FIRE_RISK:         'Пожарная опасность',
  WET_FLOOR:         'Мокрый пол',
  EQUIPMENT_FAILURE: 'Отказ оборудования',
  SECURITY_ISSUE:    'Нарушение безопасности',
  WRONG_ZONE_ACCESS: 'Неавторизованный доступ в зону',
  HAZARDOUS_ITEM:    'Опасный товар / спор',
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  OPEN: 'Открыт', IN_REVIEW: 'На рассмотрении', ASSIGNED: 'Назначен',
  RESOLVED: 'Решён', REJECTED: 'Отклонён', ESCALATED: 'Эскалирован',
};

const STATUS_COLORS: Record<IncidentStatus, string> = {
  OPEN:       'bg-amber-100 text-amber-700',
  IN_REVIEW:  'bg-blue-100 text-blue-700',
  ASSIGNED:   'bg-violet-100 text-violet-700',
  RESOLVED:   'bg-emerald-100 text-emerald-700',
  REJECTED:   'bg-gray-100 text-gray-600',
  ESCALATED:  'bg-red-100 text-red-700',
};

const SEV_COLORS: Record<Severity, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-800',
};

// Local fallback so the page is fully usable without the backend module.
const LOCAL_KEY = 'wms_admin_incidents_v1';
function loadLocal(): IncidentDto[] {
  try { const r = localStorage.getItem(LOCAL_KEY); return r ? JSON.parse(r) : SEED_INCIDENTS; }
  catch { return SEED_INCIDENTS; }
}
function saveLocal(arr: IncidentDto[]) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(arr)); } catch { /* quota */ }
}

const SEED_INCIDENTS: IncidentDto[] = [
  {
    id: 'INC-2026-0001', type: 'WET_FLOOR', status: 'OPEN', severity: 'MEDIUM',
    zone: 'WH-01 / FLD / A04', description: 'Разлив воды в проходе у стеллажа R12, маркировка установлена.',
    reportedBy: 'W-204', reportedAt: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    id: 'INC-2026-0002', type: 'DAMAGED_RACK', status: 'IN_REVIEW', severity: 'HIGH',
    zone: 'WH-01 / BULK / A02', description: 'Изогнутая стойка R07-S03, требуется проверка инженером.',
    reportedBy: 'W-405', reportedAt: new Date(Date.now() - 4200_000).toISOString(),
  },
  {
    id: 'INC-2026-0003', type: 'EQUIPMENT_FAILURE', status: 'ASSIGNED', severity: 'LOW',
    zone: 'WH-01 / PCK', description: 'Принтер этикеток PRN-001 печатает с пропусками.',
    reportedBy: 'W-506', reportedAt: new Date(Date.now() - 10800_000).toISOString(),
    assignedTo: 'IT-1',
  },
];

export function IncidentsList() {
  const { user } = useAuth();
  const [items, setItems] = useState<IncidentDto[]>(loadLocal());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IncidentStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | IncidentType>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // Try backend; if it returns rows, use them. Otherwise keep local fallback.
  useEffect(() => {
    incidentsApi.list().then(remote => {
      if (remote && remote.length > 0) setItems(remote);
    });
  }, []);

  // Persist local fallback
  useEffect(() => { saveLocal(items); }, [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && i.type !== typeFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        i.id.toLowerCase().includes(q) ||
        TYPE_LABEL[i.type].toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.zone ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, statusFilter, typeFilter, query]);

  const open      = items.filter(i => i.status === 'OPEN').length;
  const escalated = items.filter(i => i.status === 'ESCALATED').length;
  const resolved  = items.filter(i => i.status === 'RESOLVED').length;
  const inReview  = items.filter(i => i.status === 'IN_REVIEW' || i.status === 'ASSIGNED').length;

  function onCreate(payload: Omit<IncidentDto, 'id' | 'status' | 'reportedAt' | 'reportedBy'>) {
    const local: IncidentDto = {
      ...payload,
      id: `INC-${new Date().getFullYear()}-${String(items.length + 1).padStart(4, '0')}`,
      status: 'OPEN',
      reportedAt: new Date().toISOString(),
      reportedBy: user?.email ?? user?.name ?? 'unknown',
    };
    setItems(arr => [local, ...arr]);
    incidentsApi.create(payload).then(remote => {
      if (remote) setItems(arr => arr.map(x => x.id === local.id ? remote : x));
    });
    setShowCreate(false);
    toast.success('Инцидент создан');
  }

  function changeStatus(id: string, status: IncidentStatus) {
    setItems(arr => arr.map(x => x.id === id ? { ...x, status } : x));
    incidentsApi.setStatus(id, status);
    toast.success(`Статус: ${STATUS_LABEL[status]}`);
  }

  const drawer = drawerId ? items.find(i => i.id === drawerId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Безопасность склада</h1>
          <p className="text-gray-500">Инциденты, происшествия и техника безопасности</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Зарегистрировать инцидент
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Открытых"     value={open}      icon={AlertTriangle} color="amber" />
        <KpiCard label="В работе"     value={inReview}  icon={Activity}      color="blue" />
        <KpiCard label="Эскалаций"    value={escalated} icon={ShieldAlert}   color="red" />
        <KpiCard label="Решено"       value={resolved}  icon={CheckCircle2}  color="emerald" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по ID, типу, описанию, зоне…"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="ALL">Все статусы</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="ALL">Все типы</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Инцидентов нет</p>
            <p className="text-sm text-gray-400 mt-1">
              {items.length === 0 ? 'Когда сотрудник зарегистрирует первый инцидент, он появится здесь.' : 'Под текущие фильтры ничего не подходит.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Тип</th>
                <th className="px-4 py-3">Зона</th>
                <th className="px-4 py-3">Тяжесть</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Кто сообщил</th>
                <th className="px-4 py-3">Когда</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it => (
                <tr key={it.id}
                    onClick={() => setDrawerId(it.id)}
                    className="border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{it.id}</td>
                  <td className="px-4 py-3">{TYPE_LABEL[it.type]}</td>
                  <td className="px-4 py-3 text-gray-600">{it.zone ?? '—'}</td>
                  <td className="px-4 py-3"><Badge className={SEV_COLORS[it.severity]}>{it.severity}</Badge></td>
                  <td className="px-4 py-3"><Badge className={STATUS_COLORS[it.status]}>{STATUS_LABEL[it.status]}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{it.reportedBy}</td>
                  <td className="px-4 py-3 text-gray-500"><Clock className="inline w-3 h-3 mr-1" />{relativeTime(it.reportedAt)}</td>
                  <td className="px-4 py-3 text-gray-400"><ChevronRight className="w-4 h-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSubmit={onCreate} />}

      {drawer && (
        <DetailDrawer
          incident={drawer}
          onClose={() => setDrawerId(null)}
          onChangeStatus={s => changeStatus(drawer.id, s)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color }:
  { label: string; value: number; icon: any; color: 'amber' | 'blue' | 'red' | 'emerald' }) {
  const ring = {
    amber:   'bg-amber-50 text-amber-600',
    blue:    'bg-blue-50 text-blue-600',
    red:     'bg-red-50 text-red-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }[color];
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${ring}`}><Icon className="w-5 h-5" /></div>
      </div>
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${className ?? 'bg-gray-100 text-gray-700'}`}>{children}</span>;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч`;
  return `${Math.round(h / 24)} д`;
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateModal({ onClose, onSubmit }:
  { onClose: () => void; onSubmit: (p: Omit<IncidentDto, 'id' | 'status' | 'reportedAt' | 'reportedBy'>) => void }) {
  const [type, setType] = useState<IncidentType>('WET_FLOOR');
  const [severity, setSeverity] = useState<Severity>('MEDIUM');
  const [zone, setZone] = useState('');
  const [description, setDescription] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 5) {
      toast.error('Опишите инцидент подробнее (минимум 5 символов)');
      return;
    }
    onSubmit({ type, severity, zone: zone || null, description: description.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold">Зарегистрировать инцидент</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </header>
        <div className="p-4 space-y-3 overflow-y-auto">
          <Field label="Тип инцидента">
            <select value={type} onChange={e => setType(e.target.value as IncidentType)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Тяжесть">
            <select value={severity} onChange={e => setSeverity(e.target.value as Severity)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="LOW">LOW · Низкая</option>
              <option value="MEDIUM">MEDIUM · Средняя</option>
              <option value="HIGH">HIGH · Высокая</option>
              <option value="CRITICAL">CRITICAL · Критическая</option>
            </select>
          </Field>
          <Field label="Зона / адрес ячейки (опционально)">
            <input value={zone} onChange={e => setZone(e.target.value)}
              placeholder="WH-01 / FLD / A04-R12-S03"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </Field>
          <Field label="Описание">
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={4} placeholder="Что произошло, какие меры приняты, какая помощь нужна…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          </Field>
        </div>
        <footer className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100">Отмена</button>
          <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">Создать</button>
        </footer>
      </form>
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

// ── Detail drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ incident, onClose, onChangeStatus }:
  { incident: IncidentDto; onClose: () => void; onChangeStatus: (s: IncidentStatus) => void }) {
  const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
    OPEN:      ['IN_REVIEW', 'ASSIGNED', 'REJECTED', 'ESCALATED'],
    IN_REVIEW: ['ASSIGNED', 'RESOLVED', 'REJECTED', 'ESCALATED'],
    ASSIGNED:  ['RESOLVED', 'ESCALATED'],
    RESOLVED:  [],
    REJECTED:  [],
    ESCALATED: ['ASSIGNED', 'RESOLVED'],
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-stretch justify-end" onClick={onClose}>
      <aside className="w-full max-w-md bg-white shadow-xl h-full flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-900">{incident.id}</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-gray-500">{TYPE_LABEL[incident.type]}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge className={SEV_COLORS[incident.severity]}>{incident.severity}</Badge>
            <Badge className={STATUS_COLORS[incident.status]}>{STATUS_LABEL[incident.status]}</Badge>
          </div>
        </header>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <DetailRow label="Зона" value={incident.zone ?? '—'} />
          <DetailRow label="Описание" value={incident.description} />
          <DetailRow label="Сообщил" value={incident.reportedBy} />
          <DetailRow label="Когда" value={new Date(incident.reportedAt).toLocaleString('ru-RU')} />
          {incident.assignedTo && <DetailRow label="Назначен на" value={incident.assignedTo} />}
          {incident.resolvedAt && <DetailRow label="Решён" value={new Date(incident.resolvedAt).toLocaleString('ru-RU')} />}
        </div>
        <footer className="p-4 border-t border-gray-200 flex flex-wrap gap-2">
          {TRANSITIONS[incident.status].length === 0 ? (
            <p className="text-xs text-gray-400">Финальный статус — переходов нет.</p>
          ) : (
            TRANSITIONS[incident.status].map(s => (
              <button key={s}
                onClick={() => onChangeStatus(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200">
                → {STATUS_LABEL[s]}
              </button>
            ))
          )}
        </footer>
      </aside>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-900 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
