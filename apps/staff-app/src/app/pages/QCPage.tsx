import { useState } from 'react';
import { Camera, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store, lookupSkuFull } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { RiskBadge } from '../components/Badges';

export function QCPage() {
  const state = useAppState();
  const [selectedAsn, setSelectedAsn] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [decision, setDecision] = useState<'passed' | 'failed' | 'quarantine' | 'repack' | null>(null);
  const [notes, setNotes] = useState('');
  const [photoTaken, setPhotoTaken] = useState(false);

  // Все ASN с qc_pending или с непроверенными items
  const asnsForQC = state.asns.filter(a =>
    a.status === 'qc_pending' || a.items.some(it => it.checked && it.qcStatus === 'pending')
  );

  const handleDecision = () => {
    if (!selectedAsn || !selectedItem || !decision) return;
    store.qcDecision(selectedAsn, selectedItem, decision, notes);
    toast.success('Решение QC принято');
    setSelectedAsn(null);
    setSelectedItem(null);
    setDecision(null);
    setNotes('');
    setPhotoTaken(false);
  };

  if (selectedAsn && selectedItem) {
    const asn = state.asns.find(a => a.id === selectedAsn)!;
    const item = asn.items.find(i => i.id === selectedItem)!;
    const seller = store.findSeller(asn.sellerId);
    const full = lookupSkuFull(item.skuId, state.skus, state.products);

    return (
      <div className="min-h-screen bg-[#F5F6F8] pb-24">
        <PageHeader title="QC проверка" subtitle={asn.id} onBack={() => { setSelectedAsn(null); setSelectedItem(null); }} />

        <div className="px-5 -mt-3 space-y-3">
          {/* Карточка товара */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[40px]">
                {full?.product?.photoEmoji || '📦'}
              </div>
              <div className="flex-1">
                <div className="text-[15px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                  {full?.product?.name}
                </div>
                <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {full?.sku?.color} · {full?.sku?.size}
                </div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {full?.sku?.barcode}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <Cell label="Принято" value={item.actualQty.toString()} />
              <Cell label="Ожидалось" value={item.expectedQty.toString()} />
              <Cell label="Брак" value={item.damagedQty.toString()} bad={item.damagedQty > 0} />
            </div>

            {seller && (
              <div className="flex items-center gap-2 pt-2 border-t border-[#F3F4F6]">
                <span className="text-[12px] text-[#6B7280]" style={{ fontWeight: 600 }}>Продавец:</span>
                <span className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>{seller.name}</span>
                <RiskBadge risk={seller.riskScore} />
              </div>
            )}
          </div>

          {/* Чек-лист проверки */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>
              Что проверить
            </h3>
            <div className="space-y-2 text-[13px] text-[#1F2430]" style={{ fontWeight: 500 }}>
              <div>✓ Соответствие товара описанию</div>
              <div>✓ Размер и цвет указаны верно</div>
              <div>✓ Бирка с штрихкодом и материал</div>
              <div>✓ Качество ткани/швов</div>
              <div>✓ Нет пятен, дыр, следов носки</div>
              <div>✓ Упаковка целая</div>
            </div>
          </div>

          {/* Решение */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Решение</h3>
            <div className="grid grid-cols-2 gap-2">
              <DecisionBtn active={decision === 'passed'}     onClick={() => setDecision('passed')}     color="#00D27A" icon={<Check className="w-4 h-4" />}>
                Принять
              </DecisionBtn>
              <DecisionBtn active={decision === 'failed'}     onClick={() => setDecision('failed')}     color="#EF4444" icon={<X className="w-4 h-4" />}>
                Брак
              </DecisionBtn>
              <DecisionBtn active={decision === 'quarantine'} onClick={() => setDecision('quarantine')} color="#FBBF24" icon={<AlertTriangle className="w-4 h-4" />}>
                Карантин
              </DecisionBtn>
              <DecisionBtn active={decision === 'repack'}     onClick={() => setDecision('repack')}     color="#A855F7" icon={<Camera className="w-4 h-4" />}>
                Переупаковать
              </DecisionBtn>
            </div>
          </div>

          {decision && (decision === 'failed' || decision === 'quarantine') && (
            <>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <button
                  onClick={() => setPhotoTaken(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed"
                  style={{
                    borderColor: photoTaken ? '#00D27A' : '#D1D5DB',
                    backgroundColor: photoTaken ? '#D1FAE5' : 'transparent',
                    color: photoTaken ? '#065F46' : '#6B7280',
                    fontWeight: 600,
                  }}
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[14px]">{photoTaken ? '✓ Фото прикреплено' : 'Сфотографировать брак'}</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-[13px] text-[#6B7280] mb-2 block" style={{ fontWeight: 600 }}>
                  Комментарий
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Опишите проблему..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2EA7E0] focus:outline-none text-[14px] resize-none"
                  style={{ fontWeight: 500 }}
                />
              </div>
            </>
          )}

          <button
            onClick={handleDecision}
            disabled={!decision}
            className="w-full h-14 rounded-2xl bg-[#2EA7E0] text-white shadow-md active-press"
            style={{ fontWeight: 800, opacity: decision ? 1 : 0.4 }}
          >
            Подтвердить решение
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Контроль качества" subtitle={`${asnsForQC.length} поставок ожидают`} />

      <div className="px-5 -mt-3 space-y-2">
        {asnsForQC.length === 0 ? (
          <EmptyState emoji="✅" title="Очередь QC пуста" subtitle="Все товары проверены" />
        ) : (
          asnsForQC.flatMap(asn => {
            const seller = store.findSeller(asn.sellerId);
            return asn.items
              .filter(it => it.checked && it.qcStatus === 'pending')
              .map(item => {
                const full = lookupSkuFull(item.skuId, state.skus, state.products);
                return (
                  <button
                    key={`${asn.id}-${item.id}`}
                    onClick={() => { setSelectedAsn(asn.id); setSelectedItem(item.id); }}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm active-press text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[30px]">
                        {full?.product?.photoEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                          {full?.product?.name}
                        </div>
                        <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                          {full?.sku?.color} · {full?.sku?.size} · {asn.id}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                            {item.actualQty} шт.
                          </span>
                          {item.damagedQty > 0 && (
                            <span className="text-[11px] text-[#EF4444]" style={{ fontWeight: 700 }}>
                              брак: {item.damagedQty}
                            </span>
                          )}
                          {seller && <RiskBadge risk={seller.riskScore} />}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              });
          })
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-2">
      <div className="text-[18px]" style={{ fontWeight: 900, color: bad ? '#EF4444' : '#1F2430' }}>{value}</div>
      <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function DecisionBtn({ active, onClick, color, icon, children }: { active: boolean; onClick: () => void; color: string; icon: any; children: any }) {
  return (
    <button
      onClick={onClick}
      className="h-12 rounded-xl flex items-center justify-center gap-2 text-[13px] active-press"
      style={{
        backgroundColor: active ? color : '#F9FAFB',
        color: active ? 'white' : color,
        fontWeight: 700,
        border: `2px solid ${active ? color : 'transparent'}`,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
