import { useState } from 'react';
import type { Sku } from '../domain/types';
import { MediaPreviewModal, type MediaItem } from './MediaPreviewModal';

export interface SkuThumbProps {
  sku: Sku;
  /** размер квадрата в px */
  size?: number;
  orderId?: string;
  binId?: string;
  className?: string;
}

const isUrl = (s: string) => /^(https?:|blob:|data:|mock:)/.test(s);

export function SkuThumb({ sku, size = 36, orderId, binId, className = '' }: SkuThumbProps) {
  const [open, setOpen] = useState(false);
  const items: MediaItem[] = [
    {
      kind: isUrl(sku.photo) ? 'image' : 'emoji',
      src: sku.photo,
      title: sku.name,
      sku: sku.sku,
      barcode: sku.barcode,
      orderId,
      binId,
      zone: sku.defaultZone,
    },
    ...(sku.photos ?? []).map((src): MediaItem => ({
      kind: 'image', src, title: sku.name, sku: sku.sku, barcode: sku.barcode, orderId, binId,
    })),
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`rounded-lg bg-[#F3F4F6] flex items-center justify-center active-press flex-shrink-0 overflow-hidden ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}
        aria-label={`Фото ${sku.name}`}
      >
        {isUrl(sku.photo) ? (
          <img src={sku.photo} alt={sku.name} className="w-full h-full object-cover" />
        ) : sku.photo}
      </button>
      <MediaPreviewModal open={open} items={items} onClose={() => setOpen(false)} />
    </>
  );
}
