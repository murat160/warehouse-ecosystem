import { useMemo, useState } from 'react';
import { Grid3x3, Lock, Unlock, Printer, Search as SearchIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { CellStatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import type { Cell, CellSize } from '../domain/types';

export function CellsPage() {
  const { cells, orders } = useStore();
  const [zone, setZone] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<Cell | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newCell, setNewCell] = useState<{ zone: string; row: string; shelf: string; size: CellSize }>({ zone: 'BLUE', row: 'R-04', shelf: 'S-01', size: 'medium' });

  const zones = useMemo(() => Array.from(new Set(cells.map(c => c.zone))), [cells]);

  const filtered = cells.filter(c => {
    if (zone !== 'all' && c.zone !== zone) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!c.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total:    cells.length,
    empty:    cells.filter(c => c.status === 'empty').length,
    occupied: cells.filter(c => c.status === 'occupied').length,
    blocked:  cells.filter(c => c.status === 'blocked').length,
  };

  const cellOrders = active ? orders.filter(o => active.orderIds.includes(o.id)) : [];

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Ячейки / Полки"
        subtitle={`${stats.empty} свободно · ${stats.occupied} занято · ${stats.blocked} заблок.`}
        right={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 h-9 rounded-lg bg-white text-[#1F2430] text-[12px] active-press flex items-center gap-1"
            style={{ fontWeight: 800 }}
          >
            <Plus className="w-3 h-3" /> Создать ячейку
          </button>
        }
      />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <SearchIcon className="w-4 h-4 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск ячейки по ID"
              className="flex-1 text-[13px] outline-none"
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip on={zone === 'all'} onClick={() => setZone('all')}>Все зоны</Chip>
            {zones.map(z => (
              <Chip key={z} on={zone === z} onClick={() => setZone(z)}>{z}</Chip>
            ))}
            <div className="w-px bg-[#E5E7EB] mx-1" />
            {(['all','empty','occupied','blocked','damaged','reserved'] as const).map(s => (
              <Chip key={s} on={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s === 'all' ? 'Все' : s === 'empty' ? 'Свободные' : s === 'occupied' ? 'Занятые' : s === 'blocked' ? 'Заблок.' : s === 'damaged' ? 'Поврежд.' : 'Резерв'}
              </Chip>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4">
          {filtered.length === 0 ? (
            <EmptyState title="Нет ячеек" subtitle="Сбросьте фильтры" icon={<Grid3x3 className="w-5 h-5" />} />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActive(c)}
                  className="relative rounded-xl p-2 active-press text-left"
                  style={{
                    backgroundColor:
                      c.status === 'empty'    ? c.zoneColor + '15' :
                      c.status === 'occupied' ? c.zoneColor + '40' :
                      c.status === 'blocked'  ? '#6B728022' :
                      c.status === 'damaged'  ? '#EF444422' :
                                                '#A855F722',
                    border: `1.5px solid ${c.zoneColor}55`,
                  }}
                  title={c.id}
                >
                  <div className="text-[9px] text-[#6B7280]" style={{ fontWeight: 700 }}>{c.zone} {c.row}</div>
                  <div className="text-[11px] text-[#1F2430] mt-0.5" style={{ fontFamily: 'monospace', fontWeight: 800 }}>{c.shelf}</div>
                  <div className="text-[10px] text-[#6B7280]" style={{ fontFamily: 'monospace' }}>{c.id.split('-').pop()}</div>
                  {c.orderIds.length > 0 && (
                    <span className="absolute top-0.5 right-0.5 text-[8px] bg-[#0EA5E9] text-white rounded-full min-w-[14px] h-[14px] px-1 flex items-center justify-center" style={{ fontWeight: 800 }}>
                      {c.orderIds.length}
                    </span>
                  )}
                  {c.status === 'blocked' && <Lock className="absolute bottom-0.5 right-0.5 w-3 h-3 text-[#6B7280]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.id ?? ''}
        wide
        footer={
          active ? (
            <>
              <button onClick={() => setActive(null)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Закрыть</button>
              <button
                onClick={() => { store.printCellQr(active.id); toast.success('QR-метка отправлена на печать'); }}
                className="px-4 h-9 rounded-lg bg-[#F3F4F6] text-[#374151] text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 700 }}
              >
                <Printer className="w-3 h-3" /> Печать QR
              </button>
              {active.status === 'blocked' ? (
                <button
                  onClick={() => { store.unblockCell(active.id); toast.success('Ячейка разблокирована'); setActive({ ...active, status: 'empty' }); }}
                  className="px-4 h-9 rounded-lg bg-[#16A34A] text-white text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}
                >
                  <Unlock className="w-3 h-3" /> Разблокировать
                </button>
              ) : (
                <button
                  onClick={() => setBlockOpen(true)}
                  className="px-4 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}
                >
                  <Lock className="w-3 h-3" /> Заблокировать
                </button>
              )}
            </>
          ) : null
        }
      >
        {active && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
              <Cube k="Зона" v={active.zone} bg={active.zoneColor} />
              <Cube k="Ряд" v={active.row} />
              <Cube k="Полка" v={active.shelf} />
              <Cube k="Размер" v={active.size} />
              <Cube k="Статус" v={<CellStatusBadge status={active.status} />} />
              <Cube k="QR" v={active.qr} mono />
              <Cube k="Вместимость" v={String(active.capacity)} />
              <Cube k="Заказов" v={String(active.orderIds.length)} />
            </div>

            {active.notes && <div className="rounded-xl bg-[#FEF3C7] p-3 text-[12px] text-[#92400E]" style={{ fontWeight: 600 }}>{active.notes}</div>}

            <div>
              <div className="text-[12px] text-[#6B7280] mb-2 uppercase" style={{ fontWeight: 800 }}>Содержимое</div>
              {cellOrders.length === 0 ? (
                <div className="text-[12px] text-[#6B7280]">Ячейка пуста</div>
              ) : (
                <div className="space-y-2">
                  {cellOrders.map(o => (
                    <div key={o.id} className="rounded-xl bg-[#F9FAFB] p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 800 }}>{o.id}</div>
                        <div className="text-[11px] text-[#6B7280]">{o.customerName} · {o.pickupCode}</div>
                      </div>
                      <div className="text-[10px] px-2 py-0.5 rounded-full bg-[#0EA5E9] text-white" style={{ fontWeight: 800 }}>{o.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title="Заблокировать ячейку"
        footer={
          <>
            <button onClick={() => setBlockOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!active) return;
                if (!blockReason.trim()) { toast.error('Укажите причину'); return; }
                store.blockCell(active.id, blockReason.trim());
                toast.success('Ячейка заблокирована');
                setActive({ ...active, status: 'blocked', notes: blockReason.trim() });
                setBlockReason('');
                setBlockOpen(false);
              }}
              className="px-4 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Заблокировать</button>
          </>
        }
      >
        <textarea
          value={blockReason}
          onChange={e => setBlockReason(e.target.value)}
          rows={3}
          placeholder="Причина (например: ремонт)"
          className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[13px]"
        />
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Создать ячейку"
        footer={
          <>
            <button onClick={() => setCreateOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                const id = `${newCell.zone}-${newCell.row}-${newCell.shelf}-NEW`;
                if (cells.some(c => c.id === id)) { toast.error('Такая ячейка уже есть'); return; }
                const zoneColor = cells.find(c => c.zone === newCell.zone)?.zoneColor ?? '#0EA5E9';
                store.createCell({
                  id,
                  pvzId: 'PVZ-001',
                  qr: `QR-${id}`,
                  zone: newCell.zone,
                  zoneColor,
                  row: newCell.row,
                  shelf: newCell.shelf,
                  size: newCell.size,
                  status: 'empty',
                  capacity: 1,
                });
                toast.success('Ячейка создана');
                setCreateOpen(false);
              }}
              className="px-4 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Создать</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <Field label="Зона">
            <select value={newCell.zone} onChange={e => setNewCell({ ...newCell, zone: e.target.value })} className="w-full border border-[#E5E7EB] rounded-lg h-9 px-2 text-[13px]">
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </Field>
          <Field label="Размер">
            <select value={newCell.size} onChange={e => setNewCell({ ...newCell, size: e.target.value as CellSize })} className="w-full border border-[#E5E7EB] rounded-lg h-9 px-2 text-[13px]">
              <option value="small">small</option>
              <option value="medium">medium</option>
              <option value="large">large</option>
              <option value="oversized">oversized</option>
            </select>
          </Field>
          <Field label="Ряд">
            <input value={newCell.row} onChange={e => setNewCell({ ...newCell, row: e.target.value })} className="w-full border border-[#E5E7EB] rounded-lg h-9 px-2 text-[13px]" style={{ fontFamily: 'monospace' }} />
          </Field>
          <Field label="Полка">
            <input value={newCell.shelf} onChange={e => setNewCell({ ...newCell, shelf: e.target.value })} className="w-full border border-[#E5E7EB] rounded-lg h-9 px-2 text-[13px]" style={{ fontFamily: 'monospace' }} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: any }) {
  return (
    <button onClick={onClick} className={`px-3 h-8 rounded-full text-[12px] flex-shrink-0 ${on ? 'bg-[#0EA5E9] text-white' : 'bg-[#F3F4F6] text-[#374151]'}`} style={{ fontWeight: 700 }}>
      {children}
    </button>
  );
}
function Cube({ k, v, bg, mono }: { k: string; v: any; bg?: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] p-2" style={bg ? { backgroundColor: bg + '15' } : undefined}>
      <div className="text-[10px] text-[#6B7280] uppercase" style={{ fontWeight: 800 }}>{k}</div>
      <div className="text-[12px] text-[#1F2430] mt-0.5" style={{ fontWeight: 800, fontFamily: mono ? 'monospace' : undefined }}>{v}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <div className="text-[10px] text-[#6B7280] uppercase mb-1" style={{ fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}
