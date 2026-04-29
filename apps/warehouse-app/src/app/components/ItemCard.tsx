import { useState } from 'react';
import type { OrderItem, Sku, Bin, ItemStatus } from '../domain/types';
import { ZoneBadge } from './ZoneBadge';
import { MediaPreviewModal, type MediaItem } from './MediaPreviewModal';
import { store } from '../store/useStore';

const STATUS: Record<ItemStatus, { label: string; bg: string; fg: string }> = {
  pending:      { label: 'Ожидает',          bg: '#F3F4F6', fg: '#374151' },
  scanned_bin:  { label: 'Ячейка ✓',         bg: '#FEF3C7', fg: '#92400E' },
  scanned_item: { label: 'Товар ✓',          bg: '#E0F2FE', fg: '#0369A1' },
  found:        { label: 'Найдено',          bg: '#DCFCE7', fg: '#166534' },
  damaged:      { label: 'Брак',             bg: '#FEE2E2', fg: '#991B1B' },
  missing:      { label: 'Не найдено',       bg: '#FECACA', fg: '#7F1D1D' },
};

export interface ItemCardProps {
  item: OrderItem;
  sku: Sku;
  bin: Bin | undefined;
  orderCode: string;
  size?: 'sm' | 'lg';
  right?: React.ReactNode;
  /** Срочный заказ — красная рамка. */
  urgent?: boolean;
  /** Это товар в возврате — серо-фиолетовый бейдж. */
  inReturn?: boolean;
}

function isUrl(s: string) {
  return /^(https?:|blob:|data:|mock:)/.test(s);
}

export function ItemCard({ item, sku, bin, orderCode, size = 'lg', right, urgent, inReturn }: ItemCardProps) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const photoSize = size === 'lg' ? 'w-20 h-20 text-[44px]' : 'w-12 h-12 text-[26px]';
  const s = STATUS[item.status];

  const allPhotos = [sku.photo, ...(sku.photos ?? [])];
  const mediaItems: MediaItem[] = allPhotos.map(src => ({
    kind: isUrl(src) ? 'image' : 'emoji',
    src,
    title: sku.name,
    sku: sku.sku,
    barcode: sku.barcode,
    orderId: orderCode,
    binId: item.binId,
    zone: bin?.zone ?? sku.defaultZone,
    comment: item.comment,
  }));

  const openMedia = () => {
    setMediaOpen(true);
    store.viewMedia(`Товар ${sku.sku} (${orderCode})`);
  };

  return (
    <>
      <div
        className="bg-white rounded-2xl p-4 shadow-sm"
        style={urgent ? { borderLeft: '4px solid #EF4444' } : undefined}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={openMedia}
            className={`${photoSize} rounded-2xl flex items-center justify-center flex-shrink-0 active-press`}
            style={{ backgroundColor: '#F3F4F6' }}
            aria-label="Увеличить фото"
          >
            {isUrl(sku.photo) ? (
              <img src={sku.photo} alt={sku.name} className="w-full h-full object-cover rounded-2xl"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.style.display = 'none';
                  t.parentElement!.innerText = '📦';
                }}
              />
            ) : sku.photo}
          </button>

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
              {urgent                    && <Tag tone="urgent">Срочно</Tag>}
              {sku.fragile               && <Tag tone="warn">Хрупкий</Tag>}
              {sku.temperatureControlled && <Tag tone="cold">Темп. режим</Tag>}
              {inReturn                  && <Tag tone="return">Возврат</Tag>}
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

      <MediaPreviewModal
        open={mediaOpen}
        items={mediaItems}
        onClose={() => setMediaOpen(false)}
      />
    </>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'warn' | 'cold' | 'urgent' | 'return' }) {
  const palette = {
    warn:   { bg: '#FEF3C7', fg: '#92400E' },
    cold:   { bg: '#DBEAFE', fg: '#1E3A8A' },
    urgent: { bg: '#FEE2E2', fg: '#991B1B' },
    return: { bg: '#EDE9FE', fg: '#4C1D95' },
    none:   { bg: '#F3F4F6', fg: '#1F2430' },
  };
  const p = palette[tone ?? 'none'];
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded font-mono"
      style={{ backgroundColor: p.bg, color: p.fg, fontWeight: 700 }}
    >
      {children}
    </span>
  );
}
