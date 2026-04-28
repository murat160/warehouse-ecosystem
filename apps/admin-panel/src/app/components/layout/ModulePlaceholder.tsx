/**
 * ModulePlaceholder — reusable real-looking page used by sidebar entries
 * that don't have a dedicated screen yet (Accounting, Legal, Reports, etc).
 *
 * Now interactive:
 *  - KPI cards accept `kpiHref` (Link) or `kpiOnClick` (handler) and
 *    become real navigation / filter buttons.
 *  - Each row gets `onClick` when caller passes `onRowClick` — opens
 *    its detail drawer.
 *  - Header actions: caller may override the default Export / Add
 *    handlers via `onExport` / `onCreate` (CSV download is built-in).
 *  - Search box is wired to `searchValue` / `onSearchChange` props,
 *    falls back to internal state when uncontrolled.
 */
import { Search, Download, Plus, FileText, Lock, ChevronRight } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Locked } from '../rbac/PermissionLock';
import { exportToCsv } from '../../utils/downloads';

export interface KPI {
  label: string;
  value: string | number;
  hint?: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray' | 'amber' | 'rose';
  /** When set, KPI renders as `<Link to={...}>` */
  href?:    string;
  /** When set, KPI renders as `<button onClick={...}>` */
  onClick?: () => void;
  /** Visual highlight when selected (e.g. when filter is active). */
  active?:  boolean;
}

export interface Column {
  key:    string;
  label:  string;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export interface PlaceholderRow {
  /** Optional original record id, used as React key + drawer payload. */
  id?: string;
  [key: string]: any;
}

interface Props {
  /** Permission base, e.g. 'accounting' or 'legal.contracts'. */
  permKey: string;
  icon:    any;
  title:   string;
  subtitle?: string;
  /** Section breadcrumb shown above the title. */
  section?: string;
  kpis?:   KPI[];
  columns?: Column[];
  rows?:    PlaceholderRow[];
  /** Empty-state message when no rows are provided. */
  emptyText?: string;
  /** Optional extra slot above the table. */
  toolbarExtra?: ReactNode;
  /** Optional explanatory note. */
  note?: ReactNode;
  /** Search input wiring (uncontrolled if both omitted). */
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  /** Per-row click handler (opens drawer). */
  onRowClick?: (row: PlaceholderRow) => void;
  /** Custom Export handler. Defaults to CSV download of `rows`. */
  onExport?: () => void;
  /** Custom Add handler. When omitted, the button is disabled. */
  onCreate?: () => void;
  /** Optional extra header buttons (e.g. "Audit", "Filter"). */
  headerExtra?: ReactNode;
  /** Hide the default Add button (e.g. for read-only sections). */
  hideCreate?: boolean;
}

const KPI_COLOR: Record<NonNullable<KPI['color']>, string> = {
  blue:   'bg-blue-50 border-blue-200 text-blue-700',
  green:  'bg-green-50 border-green-200 text-green-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  red:    'bg-red-50 border-red-200 text-red-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  gray:   'bg-white border-gray-200 text-gray-800',
  amber:  'bg-amber-50 border-amber-200 text-amber-700',
  rose:   'bg-rose-50 border-rose-200 text-rose-700',
};

export function ModulePlaceholder({
  permKey, icon: Icon, title, subtitle, section,
  kpis = [], columns = [], rows = [], emptyText, toolbarExtra, note,
  searchValue, onSearchChange, onRowClick,
  onExport, onCreate, headerExtra, hideCreate,
}: Props) {
  const { hasPermission } = useAuth();
  const canView   = hasPermission(`${permKey}.view`);
  const canExport = hasPermission(`${permKey}.export`);
  const canCreate = hasPermission(`${permKey}.create`);

  const [internalSearch, setInternalSearch] = useState('');
  const search = searchValue ?? internalSearch;
  const setSearch = onSearchChange ?? setInternalSearch;

  if (!canView) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2>
        <p className="text-sm text-gray-500 mt-1">У вашей роли нет права <span className="font-mono text-gray-700">{permKey}.view</span></p>
      </div>
    );
  }

  // Default CSV export — builds from rows + columns.
  function defaultExport() {
    if (rows.length === 0 || columns.length === 0) {
      onExport?.();
      return;
    }
    exportToCsv(rows as any[], columns.map(c => ({ key: c.key, label: c.label })),
      permKey.replace(/\./g, '-'));
  }

  const exportFn = onExport ?? defaultExport;

  function renderKpi(k: KPI, i: number) {
    const cls = KPI_COLOR[k.color ?? 'gray'];
    const inner = (
      <>
        <p className="text-xs text-gray-500 mb-1">{k.label}</p>
        <p className="text-xl font-bold">{k.value}</p>
        {k.hint && <p className="text-[10px] text-gray-500 mt-0.5">{k.hint}</p>}
      </>
    );
    const ringCls = k.active ? 'ring-2 ring-current/40 ring-offset-1' : '';
    const activeCls = 'transition-all hover:shadow-md cursor-pointer active:scale-[0.97]';

    if (k.href) {
      return <Link key={i} to={k.href} className={`p-3 rounded-xl border ${cls} ${activeCls} ${ringCls} block`}>{inner}</Link>;
    }
    if (k.onClick) {
      return <button key={i} onClick={k.onClick} className={`p-3 rounded-xl border ${cls} ${activeCls} ${ringCls} text-left`}>{inner}</button>;
    }
    return <div key={i} className={`p-3 rounded-xl border ${cls}`}>{inner}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {section && <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">{section}</p>}
          <div className="flex items-center gap-2">
            <Icon className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
              {permKey}
            </span>
          </div>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          <Locked perm={`${permKey}.export`}>
            <button onClick={exportFn} disabled={!canExport}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              <Download className="w-4 h-4" />Экспорт
            </button>
          </Locked>
          {!hideCreate && (
            <Locked perm={`${permKey}.create`}>
              <button onClick={onCreate} disabled={!canCreate || !onCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold">
                <Plus className="w-4 h-4" />Добавить
              </button>
            </Locked>
          )}
        </div>
      </div>

      {/* KPI strip */}
      {kpis.length > 0 && (
        <div className={`grid grid-cols-2 ${
          kpis.length >= 4 ? 'md:grid-cols-4'
          : kpis.length === 3 ? 'md:grid-cols-3'
          : 'md:grid-cols-2'
        } gap-3`}>
          {kpis.map(renderKpi)}
        </div>
      )}

      {note && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
          {note}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {toolbarExtra}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {rows.length === 0 || columns.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{emptyText ?? 'Пока нет записей'}</p>
            <p className="text-[11px] text-gray-400 mt-1">Раздел подключён к RBAC. Действия активируются после получения прав.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/70 border-b border-gray-100">
                <tr>
                  {columns.map(c => (
                    <th key={c.key} className={`px-3 py-3 font-medium text-gray-500 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'} ${c.className ?? ''}`}>
                      {c.label}
                    </th>
                  ))}
                  {onRowClick && <th className="px-3 py-3 w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, i) => {
                  const isClickable = !!onRowClick;
                  return (
                    <tr key={row.id ?? i}
                      onClick={isClickable ? () => onRowClick!(row) : undefined}
                      className={`transition-colors ${isClickable ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-gray-50/40'}`}>
                      {columns.map(c => (
                        <td key={c.key} className={`px-3 py-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'} ${c.className ?? ''}`}>
                          {row[c.key] ?? <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      {isClickable && (
                        <td className="px-3 py-3 text-center text-gray-300">
                          <ChevronRight className="w-4 h-4 inline" />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
