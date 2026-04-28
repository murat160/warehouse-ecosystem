import type { OrderItem, Sku, Bin, ItemStatus } from '../domain/types';
import { ZoneBadge } from './ZoneBadge';

const STATUS: Record<ItemStatus, { label: string; bg: string; fg: string }> = {
  pending:      { label: 'Ожидает',          bg: '#F3F4F6', fg: '#374151' },
  scanned_bin:  { label: 'Ячейка ✓',          bg: '#FEF3C7', fg: '#92400E' },
  scanned_item: { label: 'Товар ✓',          bg: '#E0F2FE', fg: '#0369A1' },
  found:        { label: 'Найдено',           bg: '#DCFCE7', fg: '#166534' },
  damaged:      { label: 'Брак',              bg: '#FEE2E2', fg: '#991B1B' },
  missing:      { label: 'Не найдено',        bg: '#FECACA', fg: '#7F1D1D' },
};

export interface ItemCardProps {
  item: OrderItem;
  sku: Sku;
  bin: Bin | undefined;
  orderCode: string;
  size?: 'sm' | 'lg';
  right?: React.ReactNode;
}

export function ItemCard({ item, sku, bin, orderCode, size = 'lg', right }: ItemCardProps) {
  const photoSize = size === 'lg' ? 'w-20 h-20 text-[44px]' : 'w-12 h-12 text-[26px]';
  const s = STATUS[item.status];
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`${photoSize} rounded-2xl flex items-center justify-center flex-shrink-0`}
          style={{ backgroundColor: '#F3F4F6' }}
        >
          {sku.photo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[15px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>
                {sku.name}
              </div>
              <div className="text-[11px] text-[#6B7280] mt-0.5 truncate" style={{ fontWeight: 500 }}>
                {sku.category}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[20px] text-[#1F2430]" style={{ fontWeight: 900 }}>×{item.qty}</div>
              <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>
                собрано {item.pickedQty}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <Tag>SKU {sku.sku}</Tag>
            <Tag>BC {sku.barcode}</Tag>
            {sku.sellerArticle && <Tag>Арт. {sku.sellerArticle}</Tag>}
            <Tag>{orderCode}</Tag>
            {sku.fragile && <Tag warn>Хрупкое</Tag>}
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            <ZoneBadge zone={bin?.zone ?? sku.defaultZone} binId={item.binId} />
            <span
              className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ backgroundColor: s.bg, color: s.fg, fontWeight: 800 }}
            >
              {s.label}
            </span>
          </div>

          {bin && (
            <div className="text-[10px] text-[#9CA3AF] mt-1.5 font-mono" style={{ fontWeight: 600 }}>
              {bin.warehouse} / {bin.row} / {bin.rack} / {bin.shelf}
            </div>
          )}

          {item.comment && (
            <div className="text-[11px] text-[#7F1D1D] bg-[#FEE2E2] rounded-md px-2 py-1 mt-2" style={{ fontWeight: 600 }}>
              💬 {item.comment}
            </div>
          )}
        </div>
      </div>
      {right && <div className="mt-3">{right}</div>}
    </div>
  );
}

function Tag({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded font-mono"
      style={{
        backgroundColor: warn ? '#FEF3C7' : '#F3F4F6',
        color: warn ? '#92400E' : '#1F2430',
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}
