/** Minimal data table with column config + optional row click. */
import React from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  rows: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  empty?: string;
  loading?: boolean;
}

export function Table<T>({ rows, columns, onRowClick, rowKey, empty = 'No data', loading }: TableProps<T>) {
  if (loading) return <div className="p-6 text-center text-sm text-slate-500">Loading…</div>;
  if (rows.length === 0) return <div className="p-10 text-center text-sm text-slate-400">{empty}</div>;
  return (
    <div className="overflow-auto bg-white border border-slate-200 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {columns.map(c => (
              <th key={c.key} className={`text-left px-4 py-2 font-medium text-slate-600 ${c.className ?? ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-slate-100 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
            >
              {columns.map(c => (
                <td key={c.key} className={`px-4 py-2.5 ${c.className ?? ''}`}>
                  {c.render ? c.render(row) : (row as any)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${className ?? 'bg-slate-100 text-slate-700'}`}>
      {children}
    </span>
  );
}
