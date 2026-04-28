import { useState } from 'react';
import { Lock, Unlock, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ZoneBadge } from '../components/ZoneBadge';
import { ZONE_CODES, type ZoneCode } from '../domain/zones';

export function BinsPage() {
  const { bins, inventory, skus } = useStore();
  const [zone, setZone] = useState<ZoneCode | 'ALL'>('ALL');
  const [openBin, setOpenBin] = useState<string | null>(null);
  const [qrBin, setQrBin] = useState<string | null>(null);
  const [blockBin, setBlockBin] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const list = bins.filter(b => zone === 'ALL' || b.zone === zone);
  const open = openBin ? bins.find(b => b.id === openBin) : null;
  const inOpen = open
    ? inventory.filter(i => i.bins.includes(open.id)).map(i => ({ ...i, sku: skus.find(s => s.sku === i.sku)! }))
    : [];

  const submitBlock = () => {
    if (!blockBin) return;
    if (!reason.trim()) { toast.error('Укажите причину'); return; }
    store.blockBin(blockBin, reason);
    toast('Ячейка заблокирована');
    setBlockBin(null); setReason('');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Ячейки" subtitle={`Всего: ${bins.length}`} />

      <div className="px-5 -mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          <Pill active={zone === 'ALL'} onClick={() => setZone('ALL')}>Все зоны</Pill>
          {ZONE_CODES.map(z => <Pill key={z} active={zone === z} onClick={() => setZone(z)}>{z}</Pill>)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {list.map(b => {
            const fill = b.capacity > 0 ? Math.round((b.occupied / b.capacity) * 100) : 0;
            const blocked = b.status !== 'active';
            const bar = blocked ? '#9CA3AF' : fill >= 90 ? '#EF4444' : fill >= 70 ? '#F59E0B' : '#10B981';
            return (
              <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-mono" style={{ fontWeight: 800 }}>{b.id}</span>
                  <ZoneBadge zone={b.zone} showName={false} />
                </div>
                <div className="text-[10px] text-[#9CA3AF] font-mono mb-2" style={{ fontWeight: 600 }}>
                  {b.warehouse} / {b.row} / {b.rack} / {b.shelf}
                </div>
                <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden mb-1">
                  <div className="h-full" style={{ width: `${fill}%`, backgroundColor: bar }} />
                </div>
                <div className="text-[11px] text-[#6B7280] mb-3" style={{ fontWeight: 600 }}>
                  {b.occupied}/{b.capacity}
                  {blocked && b.blockedReason && ` · ${b.blockedReason}`}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setOpenBin(b.id === openBin ? null : b.id)}
                    className="flex-1 h-9 rounded-lg bg-[#1F2430] text-white text-[11px] active-press" style={{ fontWeight: 700 }}
                  >{openBin === b.id ? 'Скрыть' : 'Открыть'}</button>
                  <button
                    onClick={() => setQrBin(b.id)}
                    className="h-9 px-3 rounded-lg bg-[#7C3AED] text-white active-press" style={{ fontWeight: 700 }}
                  ><QrCode className="w-3 h-3" /></button>
                  {blocked ? (
                    <button
                      onClick={() => { store.unblockBin(b.id); toast('Ячейка активна'); }}
                      className="h-9 px-3 rounded-lg bg-[#10B981] text-white active-press" style={{ fontWeight: 700 }}
                    ><Unlock className="w-3 h-3" /></button>
                  ) : (
                    <button
                      onClick={() => setBlockBin(b.id)}
                      className="h-9 px-3 rounded-lg bg-[#EF4444] text-white active-press" style={{ fontWeight: 700 }}
                    ><Lock className="w-3 h-3" /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {open && inOpen.length > 0 && (
          <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Содержимое {open.id}</h3>
            <div className="space-y-1.5">
              {inOpen.map(r => (
                <div key={r.sku.sku} className="flex items-center justify-between text-[12px]">
                  <span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{r.sku.photo} {r.sku.name}</span>
                  <span className="text-[#6B7280]" style={{ fontWeight: 700 }}>×{r.totalStock - r.reserved}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={!!qrBin} title={`QR ${qrBin}`} onClose={() => setQrBin(null)}>
        <div className="text-center py-6">
          <div className="inline-block bg-[#1F2430] text-white p-6 rounded-2xl">
            <QrCode className="w-32 h-32 mx-auto mb-2" />
            <div className="text-[12px] font-mono" style={{ fontWeight: 700 }}>QR://BIN/{qrBin}</div>
          </div>
          <div className="text-[12px] text-[#6B7280] mt-3" style={{ fontWeight: 600 }}>
            Распечатайте QR и наклейте на ячейку
          </div>
        </div>
      </Modal>

      <Modal
        open={!!blockBin}
        title={`Заблокировать ${blockBin}`}
        onClose={() => { setBlockBin(null); setReason(''); }}
        footer={
          <button onClick={submitBlock} className="w-full h-11 rounded-xl bg-[#EF4444] text-white active-press" style={{ fontWeight: 800 }}>
            Заблокировать
          </button>
        }
      >
        <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Причина</div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Например: плановый осмотр"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#EF4444] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 h-8 rounded-full text-[11px] whitespace-nowrap active-press"
      style={{ backgroundColor: active ? '#1F2430' : 'white', color: active ? 'white' : '#1F2430', fontWeight: 700 }}
    >{children}</button>
  );
}
