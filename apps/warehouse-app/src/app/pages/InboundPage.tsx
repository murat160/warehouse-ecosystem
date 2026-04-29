import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ScanInput } from '../components/ScanInput';
import { SkuThumb } from '../components/SkuThumb';

const STATUS_LABELS = {
  expected: 'Ожидается', arrived: 'Прибыл', receiving: 'Приёмка',
  received: 'Принято', discrepancy: 'Расхождение', closed: 'Закрыто',
};

export function InboundPage() {
  const { asns, skus, currentWorker } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  const open = openId ? asns.find(a => a.id === openId) : null;

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Приёмка" subtitle={`Поставок: ${asns.length}`} />

      <div className="px-5 -mt-5 space-y-2">
        {asns.length === 0 ? (
          <EmptyState emoji="📥" title="Поставок нет" />
        ) : asns.map(a => (
          <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{a.supplierName}</div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  Invoice {a.invoiceNumber} · {a.items.length} поз.
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]" style={{ fontWeight: 800 }}>
                {STATUS_LABELS[a.status]}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setOpenId(a.id === openId ? null : a.id)}
                className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
              >{openId === a.id ? 'Скрыть' : 'Открыть'}</button>
              {!a.invoiceUrl && (
                <button
                  onClick={() => { store.uploadInvoice(a.id); toast.success('Invoice загружен'); }}
                  className="px-3 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                >
                  <Upload className="w-3 h-3" /> Загрузить invoice
                </button>
              )}
              {a.status !== 'closed' && a.status !== 'received' && (
                <button
                  onClick={() => { store.finishReceiving(a.id); toast('Поставка закрыта'); }}
                  className="px-3 h-9 rounded-lg bg-[#10B981] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                >Закрыть приёмку</button>
              )}
            </div>

            {openId === a.id && (
              <div className="mt-3 space-y-2">
                {a.items.map(it => {
                  const sku = skus.find(s => s.sku === it.sku);
                  return (
                    <div key={it.id} className="bg-[#F9FAFB] rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        {sku
                          ? <SkuThumb sku={sku} size={44} binId={it.binId} />
                          : <div className="text-[28px]">📦</div>}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{sku?.name ?? it.sku}</div>
                          <div className="text-[11px] text-[#6B7280] font-mono" style={{ fontWeight: 600 }}>
                            {it.sku} · BC {sku?.barcode}
                          </div>
                          <div className="text-[11px] text-[#374151] mt-1" style={{ fontWeight: 600 }}>
                            ожидалось {it.expectedQty} · принято {it.receivedQty} · брак {it.damagedQty}
                          </div>
                        </div>
                      </div>
                      {currentWorker && a.status !== 'closed' && a.status !== 'received' && (
                        <ReceiveControls asnId={a.id} item={it} />
                      )}
                    </div>
                  );
                })}
                <ScanInput
                  label="Сканер штрихкода (для черновика)"
                  onScan={(code) => {
                    const found = a.items.find(i => i.sku === code) || a.items.find(i => skus.find(s => s.sku === i.sku)?.barcode === code);
                    if (!found) { toast.error('Товар не из этой поставки'); return; }
                    toast(`Найден ${found.sku}`);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReceiveControls({ asnId, item }: { asnId: string; item: any }) {
  const [received, setReceived] = useState(String(item.receivedQty || item.expectedQty));
  const [damaged, setDamaged] = useState(String(item.damagedQty || 0));
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      <Field label="Принято" value={received} onChange={setReceived} />
      <Field label="Брак"    value={damaged}  onChange={setDamaged}  />
      <button
        onClick={() => {
          const r = parseInt(received, 10) || 0;
          const d = parseInt(damaged, 10) || 0;
          store.receiveAsnItem(asnId, item.id, r, d);
          toast.success(`Принят черновик ${item.sku}`);
        }}
        className="self-end h-10 rounded-xl bg-[#10B981] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
      >Принять</button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[10px] text-[#6B7280] mb-0.5" style={{ fontWeight: 700 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-2 rounded-lg border-2 border-[#E5E7EB] focus:border-[#10B981] focus:outline-none text-[13px]"
        style={{ fontWeight: 700 }}
      />
    </div>
  );
}
