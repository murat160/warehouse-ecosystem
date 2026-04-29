import { useState } from 'react';
import { Upload, AlertTriangle, FileWarning, Camera, Video, Eye, MessageSquare, Send, Lock, ListTree } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ScanInput } from '../components/ScanInput';
import { SkuThumb } from '../components/SkuThumb';
import { Modal } from '../components/Modal';
import { DamageReportModal } from '../components/DamageReportModal';
import { SupplierDisputeModal } from '../components/SupplierDisputeModal';
import { SendToSupplierModal } from '../components/SendToSupplierModal';
import { OwnerCard } from '../components/OwnerCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { MediaPreviewModal, type MediaItem } from '../components/MediaPreviewModal';
import { LocationBadge } from '../components/LocationBadge';
import {
  SUPPLIER_MEDIA_STATUS_LABELS,
  type SupplierMediaStatus, type EvidenceSendItem,
} from '../domain/types';

const STATUS_LABELS = {
  expected: 'Ожидается', arrived: 'Прибыл', receiving: 'Приёмка',
  received: 'Принято', discrepancy: 'Расхождение', closed: 'Закрыто',
};

const SM_COLORS: Record<SupplierMediaStatus, { bg: string; fg: string }> = {
  received:     { bg: '#E0F2FE', fg: '#0369A1' },
  under_review: { bg: '#FEF3C7', fg: '#92400E' },
  approved:     { bg: '#DCFCE7', fg: '#166534' },
  rejected:     { bg: '#FEE2E2', fg: '#991B1B' },
  mismatch:     { bg: '#FED7AA', fg: '#9A3412' },
};

export function InboundPage() {
  const { asns, skus, supplierMedia, bins, suppliers } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [damage, setDamage] = useState<null | { asnId: string; asnItemId: string; sku: string; supplierId: string; supplierName: string; invoiceNumber: string }>(null);
  const [dispute, setDispute] = useState<null | { asnId: string; supplierId: string; supplierName: string; invoiceNumber: string; sku: string; supplierMediaId?: string }>(null);
  const [reviewSm, setReviewSm] = useState<null | { id: string; decision: SupplierMediaStatus }>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [explanation, setExplanation] = useState<{ id: string; text: string } | null>(null);
  const [media, setMedia] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [warehousePhotos, setWarehousePhotos] = useState<Record<string, string[]>>({});
  const [sendFor, setSendFor] = useState<null | { asnId: string; asnItemId: string; supplierId: string; sku: string; invoice: string; items: EvidenceSendItem[] }>(null);
  const [partialFor, setPartialFor] = useState<string | null>(null);
  const [blockFor, setBlockFor] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const submitReview = () => {
    if (!reviewSm) return;
    store.reviewSupplierMedia(reviewSm.id, reviewSm.decision, reviewComment);
    toast.success(`Supplier media: ${SUPPLIER_MEDIA_STATUS_LABELS[reviewSm.decision]}`);
    setReviewSm(null); setReviewComment('');
  };

  const sendExplanation = () => {
    if (!explanation || !explanation.text.trim()) { toast.error('Введите текст'); return; }
    // Меняем статус supplier media на mismatch и добавляем комментарий + audit
    store.reviewSupplierMedia(explanation.id, 'mismatch', explanation.text);
    toast.success('Запрос объяснения отправлен поставщику');
    setExplanation(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Приёмка" subtitle={`Поставок: ${asns.length}`} />

      <div className="px-5 -mt-5 space-y-2">
        {asns.length === 0 ? (
          <EmptyState emoji="📥" title="Поставок нет" />
        ) : asns.map(a => {
          const isOpen = openId === a.id;
          return (
            <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{a.supplierName}</div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    {a.id} · Invoice {a.invoiceNumber} · {a.items.length} поз.
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]" style={{ fontWeight: 800 }}>
                  {STATUS_LABELS[a.status]}
                </span>
              </div>

              <div className="mb-2">
                <OwnerCard
                  supplier={suppliers.find(s => s.id === a.supplierId)}
                  invoiceNumber={a.invoiceNumber}
                  asnId={a.id}
                  hint={a.status === 'discrepancy' ? 'По поставке расхождение — отправь поставщику фото и создай спор.' : undefined}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setOpenId(isOpen ? null : a.id)}
                  className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                >{isOpen ? 'Скрыть' : 'Открыть'}</button>
                {!a.invoiceUrl && (
                  <button
                    onClick={() => { store.uploadInvoice(a.id); toast.success('Invoice загружен'); }}
                    className="px-3 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                  >
                    <Upload className="w-3 h-3" /> Invoice
                  </button>
                )}
                {a.status !== 'closed' && a.status !== 'received' && (
                  <>
                    <button
                      onClick={() => { store.finishReceiving(a.id); toast('Поставка закрыта'); }}
                      className="px-3 h-9 rounded-lg bg-[#10B981] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                    >Закрыть приёмку</button>
                    <button
                      onClick={() => setPartialFor(a.id)}
                      className="px-3 h-9 rounded-lg bg-[#F59E0B] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                    ><ListTree className="w-3 h-3" /> Принять частично</button>
                    <button
                      onClick={() => { setBlockFor(a.id); setBlockReason(''); }}
                      className="px-3 h-9 rounded-lg bg-[#7F1D1D] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                    ><Lock className="w-3 h-3" /> Заблокировать партию</button>
                  </>
                )}
                <button
                  onClick={() => setDispute({
                    asnId: a.id, supplierId: a.supplierId, supplierName: a.supplierName,
                    invoiceNumber: a.invoiceNumber, sku: a.items[0]?.sku ?? '',
                  })}
                  className="px-3 h-9 rounded-lg bg-[#3730A3] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                ><FileWarning className="w-3 h-3" /> Спор с поставщиком</button>
              </div>

              {isOpen && (
                <div className="mt-3 space-y-2">
                  {a.items.map(it => {
                    const sku = skus.find(s => s.sku === it.sku);
                    const sm = supplierMedia.find(m => m.asnId === a.id && m.sku === it.sku);
                    const bin = it.binId ? bins.find(b => b.id === it.binId) : null;
                    const whPhotos = warehousePhotos[`${a.id}/${it.id}`] ?? [];

                    const supplierMediaItems: MediaItem[] = sm
                      ? [
                          ...sm.photos.map((src, i): MediaItem => ({ kind: 'image', src, title: `Фото поставщика ${i + 1}`, sku: it.sku })),
                          ...sm.videos.map((src, i): MediaItem => ({ kind: 'video', src, title: `Видео поставщика ${i + 1}`, sku: it.sku })),
                        ]
                      : [];
                    const warehouseMediaItems: MediaItem[] = whPhotos.map((src, i): MediaItem => ({
                      kind: 'image', src, title: `Фото склада ${i + 1}`, sku: it.sku,
                    }));

                    const onWhPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const uri = URL.createObjectURL(file);
                      setWarehousePhotos(p => ({ ...p, [`${a.id}/${it.id}`]: [...(p[`${a.id}/${it.id}`] ?? []), uri] }));
                      toast.success('Фото склада добавлено');
                      e.target.value = '';
                    };

                    return (
                      <div key={it.id} className="bg-[#F9FAFB] rounded-xl p-3 space-y-3">
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
                            {bin && <div className="mt-1"><LocationBadge bin={bin} /></div>}
                          </div>
                        </div>

                        {/* Сравнение supplier vs warehouse */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="bg-white rounded-lg p-2 border-l-4 border-[#3730A3]">
                            <div className="text-[10px] text-[#3730A3] mb-1" style={{ fontWeight: 800 }}>ОТ ПОСТАВЩИКА</div>
                            {sm ? (
                              <>
                                <div className="text-[11px] text-[#1F2430] mb-1.5" style={{ fontWeight: 600 }}>{sm.description}</div>
                                <div className="flex items-center gap-1 mb-1.5">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ ...SM_COLORS[sm.status], fontWeight: 800 }}>
                                    {SUPPLIER_MEDIA_STATUS_LABELS[sm.status]}
                                  </span>
                                  <span className="text-[10px] text-[#6B7280] font-mono" style={{ fontWeight: 600 }}>
                                    {sm.photos.length}📷 · {sm.videos.length}🎬 · ×{sm.expectedQty}
                                  </span>
                                </div>
                                {supplierMediaItems.length > 0 && (
                                  <button
                                    onClick={() => setMedia({ items: supplierMediaItems, index: 0 })}
                                    className="px-2 h-7 rounded bg-[#3730A3] text-white text-[10px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                                  ><Eye className="w-3 h-3" /> Открыть</button>
                                )}
                                <div className="flex flex-wrap gap-1 mt-2">
                                  <button onClick={() => setReviewSm({ id: sm.id, decision: 'approved' })} className="px-2 h-6 rounded bg-[#10B981] text-white text-[9px]" style={{ fontWeight: 800 }}>Approve</button>
                                  <button onClick={() => setReviewSm({ id: sm.id, decision: 'rejected' })} className="px-2 h-6 rounded bg-[#EF4444] text-white text-[9px]" style={{ fontWeight: 800 }}>Reject</button>
                                  <button onClick={() => setReviewSm({ id: sm.id, decision: 'mismatch' })} className="px-2 h-6 rounded bg-[#F59E0B] text-white text-[9px]" style={{ fontWeight: 800 }}>Не совпадает</button>
                                  <button onClick={() => setExplanation({ id: sm.id, text: '' })}                className="px-2 h-6 rounded bg-[#374151] text-white text-[9px] inline-flex items-center gap-1" style={{ fontWeight: 800 }}>
                                    <MessageSquare className="w-3 h-3" /> Запросить объяснение
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="text-[11px] text-[#9CA3AF] py-3 text-center" style={{ fontWeight: 600 }}>
                                Поставщик не прислал медиа
                              </div>
                            )}
                          </div>

                          <div className="bg-white rounded-lg p-2 border-l-4 border-[#0369A1]">
                            <div className="text-[10px] text-[#0369A1] mb-1" style={{ fontWeight: 800 }}>СО СКЛАДА</div>
                            <div className="text-[11px] text-[#1F2430] mb-1.5" style={{ fontWeight: 600 }}>
                              Факт: ×{it.receivedQty}, брак ×{it.damagedQty}
                            </div>
                            <div className="flex items-center gap-1 mb-1.5">
                              <span className="text-[10px] text-[#6B7280] font-mono" style={{ fontWeight: 600 }}>
                                {whPhotos.length}📷
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <label className="px-2 h-7 rounded bg-[#0369A1] text-white text-[10px] inline-flex items-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
                                <Camera className="w-3 h-3" /> Фото
                                <input type="file" accept="image/*" onChange={onWhPhoto} className="hidden" />
                              </label>
                              {warehouseMediaItems.length > 0 && (
                                <button onClick={() => setMedia({ items: warehouseMediaItems, index: 0 })} className="px-2 h-7 rounded bg-[#1F2430] text-white text-[10px] inline-flex items-center gap-1" style={{ fontWeight: 700 }}>
                                  <Eye className="w-3 h-3" /> Открыть
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Comparison verdicts */}
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => store.scanValidate({ type: 'ITEM', value: sku?.barcode ?? it.sku, expected: it.sku, context: `Compare ${it.sku}` })}
                            className="px-3 h-8 rounded-lg bg-[#10B981] text-white text-[11px] active-press" style={{ fontWeight: 700 }}
                          >Совпадает</button>
                          <button
                            onClick={() => setDamage({
                              asnId: a.id, asnItemId: it.id, sku: it.sku,
                              supplierId: a.supplierId, supplierName: a.supplierName, invoiceNumber: a.invoiceNumber,
                            })}
                            className="px-3 h-8 rounded-lg bg-[#EF4444] text-white text-[11px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                          ><AlertTriangle className="w-3 h-3" /> Повреждение</button>
                          <button
                            onClick={() => store.scanValidate({ type: 'ITEM', value: 'wrong', expected: it.sku, context: `Wrong item ${it.sku}`, blockOnFail: true })}
                            className="px-3 h-8 rounded-lg bg-[#F59E0B] text-white text-[11px] active-press" style={{ fontWeight: 700 }}
                          >Не тот товар</button>
                          <button
                            onClick={() => {
                              store.receiveAsnItem(a.id, it.id, Math.max(0, it.receivedQty), it.damagedQty);
                              toast('Зафиксировано как недостача');
                              if (sm) store.reviewSupplierMedia(sm.id, 'mismatch', 'Недостача при приёмке');
                            }}
                            className="px-3 h-8 rounded-lg bg-[#7C2D12] text-white text-[11px] active-press" style={{ fontWeight: 700 }}
                          >Недостача</button>
                          <button
                            onClick={() => setDispute({
                              asnId: a.id, supplierId: a.supplierId, supplierName: a.supplierName,
                              invoiceNumber: a.invoiceNumber, sku: it.sku, supplierMediaId: sm?.id,
                            })}
                            className="px-3 h-8 rounded-lg bg-[#3730A3] text-white text-[11px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                          ><FileWarning className="w-3 h-3" /> Создать спор</button>
                          <button
                            onClick={() => setSendFor({
                              asnId: a.id, asnItemId: it.id, supplierId: a.supplierId,
                              sku: it.sku, invoice: a.invoiceNumber,
                              items: [
                                ...(sm?.photos ?? []).map(src => ({ kind: 'image' as const, src, source: 'supplier' as const, title: 'Фото поставщика' })),
                                ...(sm?.videos ?? []).map(src => ({ kind: 'video' as const, src, source: 'supplier' as const, title: 'Видео поставщика' })),
                                ...whPhotos.map(src => ({ kind: 'image' as const, src, source: 'warehouse' as const, title: 'Фото склада' })),
                              ],
                            })}
                            className="px-3 h-8 rounded-lg bg-[#0369A1] text-white text-[11px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                          ><Send className="w-3 h-3" /> Отправить поставщику</button>
                        </div>

                        <ReceiveControls asnId={a.id} item={it} />
                      </div>
                    );
                  })}

                  <ScanInput
                    label="Сканер штрихкода (быстрый поиск)"
                    onScan={(code) => {
                      const r = store.scanValidate({ type: 'ITEM', value: code, context: `Inbound ${a.id}` });
                      if (r.ok) toast.success('Найден');
                      else toast.error(r.reason ?? 'Не найден');
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {damage && (
        <DamageReportModal
          open={!!damage}
          onClose={() => setDamage(null)}
          defaults={damage}
        />
      )}

      {dispute && (
        <SupplierDisputeModal
          open={!!dispute}
          onClose={() => setDispute(null)}
          defaults={{ ...dispute, initialReason: 'damaged_goods' }}
        />
      )}

      {sendFor && (
        <SendToSupplierModal
          open={!!sendFor}
          onClose={() => setSendFor(null)}
          defaultSupplierId={sendFor.supplierId}
          availableItems={sendFor.items}
          defaultLinkedTo={{ type: 'asn', id: sendFor.asnId, asnItemId: sendFor.asnItemId }}
          defaultInvoice={sendFor.invoice}
          defaultSku={sendFor.sku}
          defaultComment={`По поставке ${sendFor.invoice}, SKU ${sendFor.sku}: пришлите пожалуйста объяснение.`}
        />
      )}

      <ConfirmModal
        open={!!partialFor}
        title="Принять только годное?"
        message="Из этой поставки в available stock попадёт только то, что без брака. Битое уйдёт в damaged stock и в discrepancy_act."
        confirmLabel="Принять частично"
        onConfirm={() => {
          if (!partialFor) return;
          const r = store.partialReceiveAsn(partialFor);
          if (r.ok) toast.success('Частичная приёмка зафиксирована');
          else      toast.error(r.reason ?? 'Ошибка');
          setPartialFor(null);
        }}
        onCancel={() => setPartialFor(null)}
      />

      <Modal
        open={!!blockFor}
        title={`Заблокировать партию ${blockFor ?? ''}`}
        onClose={() => { setBlockFor(null); setBlockReason(''); }}
        footer={
          <button
            onClick={() => {
              if (!blockFor || !blockReason.trim()) { toast.error('Укажите причину'); return; }
              store.blockAsnBatch(blockFor, blockReason);
              toast('Партия заблокирована, создана проблема');
              setBlockFor(null); setBlockReason('');
            }}
            className="w-full h-11 rounded-xl bg-[#7F1D1D] text-white active-press" style={{ fontWeight: 800 }}
          >Заблокировать</button>
        }
      >
        <div className="text-[12px] text-[#374151] mb-2" style={{ fontWeight: 500 }}>
          Партия не пойдёт в обработку, пока проблему не решат. Создастся problem-ticket для Shift Manager / Warehouse Admin.
        </div>
        <textarea
          rows={3}
          value={blockReason}
          onChange={e => setBlockReason(e.target.value)}
          placeholder="Причина блокировки…"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#7F1D1D] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>

      <Modal
        open={!!reviewSm}
        title={`Решение по supplier media`}
        onClose={() => { setReviewSm(null); setReviewComment(''); }}
        footer={<button onClick={submitReview} className="w-full h-11 rounded-xl bg-[#1F2430] text-white active-press" style={{ fontWeight: 800 }}>Подтвердить</button>}
      >
        <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Комментарий склада</div>
        <textarea
          value={reviewComment}
          onChange={e => setReviewComment(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#1F2430] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>

      <Modal
        open={!!explanation}
        title="Запросить объяснение у поставщика"
        onClose={() => setExplanation(null)}
        footer={<button onClick={sendExplanation} className="w-full h-11 rounded-xl bg-[#374151] text-white active-press" style={{ fontWeight: 800 }}>Отправить</button>}
      >
        <textarea
          value={explanation?.text ?? ''}
          onChange={e => setExplanation(s => s ? { ...s, text: e.target.value } : s)}
          rows={4}
          placeholder="Опишите расхождение, на что обратить внимание поставщика…"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#374151] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>

      <MediaPreviewModal
        open={!!media}
        items={media?.items ?? []}
        initialIndex={media?.index ?? 0}
        onClose={() => setMedia(null)}
      />
    </div>
  );
}

function ReceiveControls({ asnId, item }: { asnId: string; item: any }) {
  const [received, setReceived] = useState(String(item.receivedQty || item.expectedQty));
  const [damaged, setDamaged] = useState(String(item.damagedQty || 0));
  return (
    <div className="grid grid-cols-3 gap-2">
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
