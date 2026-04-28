import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ScanInput } from '../components/ScanInput';

type ScanType = 'BIN' | 'ITEM' | 'ZONE' | 'ORDER' | 'PACKAGE' | 'COURIER' | 'RETURN' | 'INVOICE';

const TYPE_LABELS: Record<ScanType, string> = {
  BIN: 'QR ячейки', ITEM: 'Штрихкод товара', ZONE: 'QR зоны',
  ORDER: 'Order label', PACKAGE: 'Package label',
  COURIER: 'Courier ID', RETURN: 'Return label', INVOICE: 'Supplier invoice',
};

interface ScanRow { ok: boolean; type: ScanType; code: string; result: string; at: string; }

export function ScannerPage() {
  const { bins, skus, orders, couriers, returns, asns } = useStore();
  const [type, setType] = useState<ScanType>('ITEM');
  const [history, setHistory] = useState<ScanRow[]>([]);

  const onScan = (code: string) => {
    let ok = false;
    let result = '';
    switch (type) {
      case 'BIN':
      case 'ZONE': {
        const bin = bins.find(b => b.id === code || b.qrCode.endsWith(code));
        if (bin) { ok = true; result = `${bin.id} · ${bin.zone} · ${bin.warehouse}`; }
        else result = 'Ячейка не найдена';
        break;
      }
      case 'ITEM': {
        const sku = skus.find(s => s.sku === code || s.barcode === code);
        if (sku) { ok = true; result = `${sku.photo} ${sku.name} · ${sku.sku}`; }
        else result = 'Товар не найден';
        break;
      }
      case 'ORDER':
      case 'PACKAGE': {
        const o = orders.find(o => o.code === code || o.shippingLabel === code);
        if (o) { ok = true; result = `${o.code} · ${o.customerName} · ${o.status}`; }
        else result = 'Заказ/упаковка не найдены';
        break;
      }
      case 'COURIER': {
        const c = couriers.find(c => c.id === code);
        if (c) { ok = true; result = `${c.name} · ${c.vehiclePlate}`; }
        else result = 'Курьер не найден';
        break;
      }
      case 'RETURN': {
        const r = returns.find(r => r.id === code);
        if (r) { ok = true; result = `${r.id} · заказ ${r.orderId}`; }
        else result = 'Возврат не найден';
        break;
      }
      case 'INVOICE': {
        const a = asns.find(a => a.invoiceNumber === code);
        if (a) { ok = true; result = `${a.supplierName} · ${a.invoiceNumber}`; }
        else result = 'Invoice не найден';
        break;
      }
    }
    setHistory(h => [{ ok, type, code, result, at: new Date().toLocaleTimeString('ru') }, ...h].slice(0, 30));
    if (ok) toast.success(result); else toast.error(result);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Сканер" subtitle="Универсальный сканер с типами" />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>Тип сканирования</h3>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {(Object.keys(TYPE_LABELS) as ScanType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="h-9 rounded-lg text-[10px] active-press"
                style={{
                  backgroundColor: type === t ? '#7C3AED' : '#F3F4F6',
                  color: type === t ? 'white' : '#374151',
                  fontWeight: 800,
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <ScanInput
            label={TYPE_LABELS[type]}
            placeholder="Введите код или просканируйте"
            onScan={onScan}
            autoFocus
          />
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>История</h3>
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] py-1 border-b border-[#F3F4F6] last:border-0">
                  {h.ok ? <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[#1F2430] font-mono truncate" style={{ fontWeight: 700 }}>{h.type} · {h.code}</div>
                    <div className="text-[#6B7280] truncate" style={{ fontWeight: 500 }}>{h.result}</div>
                  </div>
                  <span className="text-[10px] text-[#9CA3AF]" style={{ fontWeight: 500 }}>{h.at}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
