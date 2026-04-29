import { useState } from 'react';
import { QrCode, MapPin, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Bin, Sku } from '../domain/types';
import { zoneOf } from '../domain/zones';
import { Modal } from './Modal';
import { ScanInput } from './ScanInput';
import { store } from '../store/useStore';

export interface LocationGuideProps {
  open: boolean;
  bin: Bin;
  sku?: Sku;
  expectedQty?: number;
  orderCode?: string;
  onClose: () => void;
  /** Сообщить, что складчик "на месте" — пишется в audit. */
  onArrived?: () => void;
  /** Сообщить, что товар не найден — открывает создание проблемы. */
  onNotFound?: () => void;
}

export function LocationGuide({ open, bin, sku, expectedQty, orderCode, onClose, onArrived, onNotFound }: LocationGuideProps) {
  const z = zoneOf(bin.zone);
  const [scanned, setScanned] = useState(false);

  const onScanBin = (code: string) => {
    const r = store.scanValidate({
      type: 'BIN', value: code, expected: bin.id,
      context: `LocationGuide ${orderCode ?? ''}`,
    });
    if (r.ok) { setScanned(true); toast.success('Ячейка верная'); }
    else      { toast.error(r.reason ?? 'Не та ячейка'); }
  };

  return (
    <Modal open={open} title="Как найти товар" onClose={onClose} size="md">
      <div className="space-y-3">
        {sku && (
          <div className="flex items-center gap-3 bg-[#F9FAFB] rounded-xl p-3">
            <div className="text-[36px]">{sku.photo}</div>
            <div className="min-w-0">
              <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{sku.name}</div>
              <div className="text-[11px] text-[#6B7280] font-mono truncate" style={{ fontWeight: 600 }}>
                {sku.sku} · BC {sku.barcode}
                {expectedQty !== undefined && ` · ×${expectedQty}`}
              </div>
            </div>
          </div>
        )}

        <div
          className="rounded-xl p-3 border-2 flex items-center gap-3"
          style={{ borderColor: z.color, backgroundColor: z.bg }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: z.color }}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[14px]" style={{ color: z.fg, fontWeight: 800 }}>{z.name}</div>
            <div className="text-[11px] font-mono" style={{ color: z.fg, fontWeight: 700 }}>
              {bin.warehouse} / Row {bin.row} / Aisle {bin.aisle} / Rack {bin.rack} / Shelf {bin.shelf} / Cell {bin.cell}
            </div>
          </div>
        </div>

        <ol className="space-y-1.5 text-[13px] text-[#1F2430]" style={{ fontWeight: 600 }}>
          <Step n={1}>Иди в зону <b style={{ color: z.color }}>{z.name}</b>.</Step>
          <Step n={2}>Найди ряд <b>{bin.row}</b>.</Step>
          <Step n={3}>Перейди в проход <b>{bin.aisle}</b>.</Step>
          <Step n={4}>Найди стеллаж <b>{bin.rack}</b>.</Step>
          <Step n={5}>Открой полку <b>{bin.shelf}</b>.</Step>
          <Step n={6}>Возьми товар из ячейки <b>{bin.cell}</b>.</Step>
          <Step n={7}>Сканируй QR ячейки, потом штрихкод товара.</Step>
        </ol>

        <div className="bg-[#1F2430] rounded-xl p-3 flex items-center gap-3">
          <QrCode className="w-12 h-12 text-white flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] text-white/60" style={{ fontWeight: 700 }}>QR ячейки</div>
            <div className="text-[12px] text-white font-mono truncate" style={{ fontWeight: 700 }}>{bin.qrCode}</div>
          </div>
        </div>

        <ScanInput
          label={scanned ? 'Ячейка подтверждена' : 'Сканируй QR / введи код ячейки'}
          placeholder={bin.id}
          onScan={onScanBin}
          buttonText={scanned ? 'OK' : 'Сканер'}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { onArrived?.(); store.viewMedia(`Я на месте: ${bin.id}`); toast('Отметка «на месте»'); onClose(); }}
            className="h-10 rounded-xl bg-[#10B981] text-white active-press inline-flex items-center justify-center gap-1"
            style={{ fontWeight: 800 }}
          >
            <Check className="w-4 h-4" /> Я на месте
          </button>
          <button
            onClick={() => { onNotFound?.(); onClose(); }}
            className="h-10 rounded-xl bg-[#EF4444] text-white active-press inline-flex items-center justify-center gap-1"
            style={{ fontWeight: 800 }}
          >
            <X className="w-4 h-4" /> Товар не найден
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className="w-5 h-5 rounded-full bg-[#1F2430] text-white text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ fontWeight: 800 }}
      >{n}</span>
      <span>{children}</span>
    </li>
  );
}
