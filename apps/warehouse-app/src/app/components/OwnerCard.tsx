import { Mail, Phone, Globe } from 'lucide-react';
import type { Supplier, SupplierContractStatus } from '../domain/types';
import { SUPPLIER_CONTRACT_LABELS } from '../domain/types';

const CONTRACT_COLORS: Record<SupplierContractStatus, { bg: string; fg: string }> = {
  active:  { bg: '#DCFCE7', fg: '#166534' },
  on_hold: { bg: '#FEF3C7', fg: '#92400E' },
  expired: { bg: '#FEE2E2', fg: '#991B1B' },
};

export interface OwnerCardProps {
  supplier?: Supplier;
  sellerName?: string;
  invoiceNumber?: string;
  asnId?: string;
  /** Опционально: подсказка с готовым следующим шагом для складчика. */
  hint?: string;
}

/**
 * Компактная карточка владельца товара. Складчик сразу видит:
 * чей товар, чей invoice/ASN, как связаться с поставщиком,
 * статус договора. Если supplier неизвестен — карточка прячется.
 */
export function OwnerCard({ supplier, sellerName, invoiceNumber, asnId, hint }: OwnerCardProps) {
  if (!supplier && !sellerName && !invoiceNumber && !asnId) return null;

  const cc = supplier?.contractStatus ? CONTRACT_COLORS[supplier.contractStatus] : null;
  const channelIcon = supplier?.notifyChannel === 'phone' ? <Phone className="w-3 h-3" />
                    : supplier?.notifyChannel === 'portal' ? <Globe className="w-3 h-3" />
                    : <Mail className="w-3 h-3" />;

  return (
    <div className="bg-[#F9FAFB] border-l-4 border-[#3730A3] rounded-md px-3 py-2 text-[12px]">
      <div className="text-[10px] text-[#3730A3] mb-1" style={{ fontWeight: 800 }}>ВЛАДЕЛЕЦ ТОВАРА</div>
      <div className="space-y-0.5">
        {supplier && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[#1F2430]" style={{ fontWeight: 800 }}>
              {supplier.name} <span className="text-[#6B7280] font-mono" style={{ fontWeight: 600 }}>· {supplier.id}</span>
            </div>
            {cc && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ ...cc, fontWeight: 800 }}>
                {SUPPLIER_CONTRACT_LABELS[supplier.contractStatus!]}
              </span>
            )}
          </div>
        )}
        {sellerName && (
          <div className="text-[#374151]" style={{ fontWeight: 600 }}>
            Продавец: <span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{sellerName}</span>
          </div>
        )}
        {(invoiceNumber || asnId) && (
          <div className="text-[#6B7280] font-mono" style={{ fontWeight: 600 }}>
            {invoiceNumber && <>Invoice: <span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{invoiceNumber}</span></>}
            {invoiceNumber && asnId && ' · '}
            {asnId && <>ASN: <span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{asnId}</span></>}
          </div>
        )}
        {supplier && (supplier.email || supplier.phone) && (
          <div className="flex items-center gap-1 text-[#374151]" style={{ fontWeight: 600 }}>
            {channelIcon}
            <span className="truncate">{supplier.email ?? supplier.phone}</span>
            {supplier.contactPerson && <span className="text-[#6B7280]">· {supplier.contactPerson}</span>}
          </div>
        )}
        {hint && (
          <div className="text-[11px] text-[#7F1D1D] bg-[#FEE2E2] rounded px-2 py-1 mt-1.5" style={{ fontWeight: 600 }}>
            👉 {hint}
          </div>
        )}
      </div>
    </div>
  );
}
