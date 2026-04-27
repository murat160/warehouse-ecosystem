import { useState } from 'react';
import { Search, ScanLine, MapPin } from 'lucide-react';
import { useAppState, lookupSkuFull } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

export function InventoryPage() {
  const state = useAppState();
  const [query, setQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [tab, setTab] = useState<'skus' | 'bins'>('skus');

  const filteredSkus = state.skus.filter(s => {
    if (!query) return true;
    const q = query.toLowerCase();
    const product = state.products.find(p => p.id === s.productId);
    return s.id.toLowerCase().includes(q)
      || s.barcode.includes(query)
      || s.color.toLowerCase().includes(q)
      || s.size.toLowerCase().includes(q)
      || product?.name.toLowerCase().includes(q);
  }).slice(0, 50);

  const filteredBins = state.bins.filter(b => {
    if (!query) return b.currentSku;  // Только заполненные
    return b.id.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 30);

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Остатки и ячейки" subtitle={`${state.skus.length} SKU · ${state.bins.length} ячеек`} />

      {/* Поиск */}
      <div className="px-5 -mt-3 mb-3">
        <div className="bg-white rounded-2xl p-2 flex items-center gap-2 shadow-sm">
          <Search className="w-5 h-5 text-[#9CA3AF] ml-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по штрихкоду, SKU, цвету, размеру..."
            className="flex-1 outline-none text-[14px]"
            style={{ fontWeight: 500 }}
          />
          <button
            onClick={() => setScannerOpen(true)}
            className="w-10 h-10 rounded-xl bg-[#2EA7E0] flex items-center justify-center active-press"
          >
            <ScanLine className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Табы */}
      <div className="px-5 mb-3 flex gap-2">
        <button
          onClick={() => setTab('skus')}
          className="flex-1 h-10 rounded-full text-[13px] active-press"
          style={{
            backgroundColor: tab === 'skus' ? '#1F2430' : 'white',
            color: tab === 'skus' ? 'white' : '#1F2430',
            fontWeight: 700,
          }}
        >
          Товары
        </button>
        <button
          onClick={() => setTab('bins')}
          className="flex-1 h-10 rounded-full text-[13px] active-press"
          style={{
            backgroundColor: tab === 'bins' ? '#1F2430' : 'white',
            color: tab === 'bins' ? 'white' : '#1F2430',
            fontWeight: 700,
          }}
        >
          Ячейки
        </button>
      </div>

      <div className="px-5 space-y-2">
        {tab === 'skus' && filteredSkus.map(sku => {
          const full = lookupSkuFull(sku.id, state.skus, state.products);
          // Находим ячейки где лежит этот товар
          const inBins = state.bins.filter(b => b.currentSku === sku.id);
          const totalUnits = inBins.reduce((s, b) => s + b.currentUnits, 0);
          return (
            <div key={sku.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[28px]">
                  {full?.product?.photoEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>
                    {full?.product?.name}
                  </div>
                  <div className="text-[12px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                    {sku.color} · {sku.size} · {sku.barcode}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>
                    {totalUnits}
                  </div>
                  <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>
                    шт.
                  </div>
                </div>
              </div>

              {inBins.length > 0 && (
                <div className="space-y-1">
                  {inBins.map(b => (
                    <div key={b.id} className="bg-[#F9FAFB] rounded-lg px-2 py-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#6B7280]" />
                      <span className="text-[11px] text-[#1F2430] font-mono flex-1" style={{ fontWeight: 700 }}>
                        {b.id}
                      </span>
                      <span className="text-[11px] text-[#6B7280]" style={{ fontWeight: 600 }}>
                        {b.currentUnits} шт.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {tab === 'bins' && filteredBins.map(b => {
          const sku = b.currentSku ? state.skus.find(s => s.id === b.currentSku) : null;
          const product = sku ? state.products.find(p => p.id === sku.productId) : null;
          return (
            <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13px] text-[#1F2430] font-mono" style={{ fontWeight: 800 }}>
                  {b.id}
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px]"
                  style={{
                    backgroundColor: '#F3F4F6',
                    color: '#1F2430',
                    fontWeight: 700,
                  }}
                >
                  {b.zone}
                </span>
              </div>
              {product && sku ? (
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{product.photoEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                      {product.name}
                    </div>
                    <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                      {sku.color} · {sku.size}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                      {b.currentUnits}/{b.capacity}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-[#6B7280] italic" style={{ fontWeight: 500 }}>
                  Пусто · вместимость {b.capacity}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => { setQuery(code); setScannerOpen(false); }}
        title="Поиск по штрихкоду"
      />
    </div>
  );
}
