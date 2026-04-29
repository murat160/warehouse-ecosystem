import { useState } from 'react';
import { Camera, Image as ImageIcon, Video, Eye, Send, FileWarning } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { MediaPreviewModal, type MediaItem } from '../components/MediaPreviewModal';
import { SkuThumb } from '../components/SkuThumb';
import { OwnerCard } from '../components/OwnerCard';
import { SendToSupplierModal } from '../components/SendToSupplierModal';
import { SupplierDisputeModal } from '../components/SupplierDisputeModal';
import type { ReturnRow, ReturnStatus, MediaRequest, EvidenceSendItem } from '../domain/types';

const STATUS_LABELS: Record<ReturnStatus, string> = {
  received:             'Получен',
  inspection:           'Проверка',
  restock:              'В продажу',
  damaged:              'Брак',
  write_off:            'Списание',
  returned_to_supplier: 'Возврат поставщику',
  closed:               'Закрыт',
};

const STATUS_COLORS: Record<ReturnStatus, { bg: string; fg: string }> = {
  received:             { bg: '#FEE2E2', fg: '#991B1B' },
  inspection:           { bg: '#FEF3C7', fg: '#92400E' },
  restock:              { bg: '#DCFCE7', fg: '#166534' },
  damaged:              { bg: '#FECACA', fg: '#7F1D1D' },
  write_off:            { bg: '#E5E7EB', fg: '#374151' },
  returned_to_supplier: { bg: '#E0E7FF', fg: '#3730A3' },
  closed:               { bg: '#F3F4F6', fg: '#374151' },
};

const MEDIA_REQ_LABELS: Record<MediaRequest, string> = {
  photo_requested: 'Запрошено фото',
  video_requested: 'Запрошено видео',
  media_uploaded:  'Медиа загружено',
};
const MEDIA_REQ_COLORS: Record<MediaRequest, { bg: string; fg: string }> = {
  photo_requested: { bg: '#FEF3C7', fg: '#92400E' },
  video_requested: { bg: '#FEF3C7', fg: '#92400E' },
  media_uploaded:  { bg: '#DCFCE7', fg: '#166534' },
};

const DECISIONS: ReturnStatus[] = ['restock', 'damaged', 'write_off', 'returned_to_supplier', 'closed'];

interface DecisionDraft { id: string; decision: ReturnStatus; comment: string; }

export function ReturnsPage() {
  const { returns, skus, suppliers } = useStore();
  const [decideDraft, setDecideDraft] = useState<DecisionDraft | null>(null);
  const [confirmDraft, setConfirmDraft] = useState<DecisionDraft | null>(null);
  const [media, setMedia] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [sendFor, setSendFor] = useState<{ rmaId: string; items: EvidenceSendItem[]; supplierId?: string; sku?: string; invoice?: string } | null>(null);
  const [disputeFor, setDisputeFor] = useState<{ rmaId: string; supplierId: string; supplierName: string; sku: string; invoice?: string; asnId?: string } | null>(null);

  const resolveSupplier = (r: ReturnRow) => {
    if (r.supplierId) return suppliers.find(s => s.id === r.supplierId);
    const firstSkuId = r.items[0]?.sku;
    if (!firstSkuId) return undefined;
    const sku = skus.find(s => s.sku === firstSkuId);
    return sku?.supplierId ? suppliers.find(s => s.id === sku.supplierId) : undefined;
  };

  const buildMediaForReturn = (r: ReturnRow): MediaItem[] => {
    const items: MediaItem[] = [];
    const meta = { orderId: r.orderId };
    (r.photosBefore ?? []).forEach((src, i) => items.push({ kind: 'image', src, title: `Фото ДО · ${i + 1}`, ...meta }));
    (r.photosAfter  ?? []).forEach((src, i) => items.push({ kind: 'image', src, title: `Фото ПОСЛЕ · ${i + 1}`, ...meta }));
    (r.photosDamage ?? []).forEach((src, i) => items.push({ kind: 'image', src, title: `Фото повреждения · ${i + 1}`, comment: r.comment, ...meta }));
    if (r.videoFromCustomer)   items.push({ kind: 'video', src: r.videoFromCustomer,   title: 'Видео клиента',  ...meta });
    if (r.videoFromInspection) items.push({ kind: 'video', src: r.videoFromInspection, title: 'Видео склада',   ...meta });
    return items;
  };

  const openDecision = (r: ReturnRow, d: ReturnStatus) => {
    setDecideDraft({ id: r.id, decision: d, comment: '' });
  };

  const submitDecision = () => {
    if (!decideDraft) return;
    if (!decideDraft.comment.trim()) { toast.error('Опишите решение'); return; }
    if (decideDraft.decision === 'write_off') {
      // двойное подтверждение для опасной операции
      setConfirmDraft(decideDraft);
      return;
    }
    store.decideReturn(decideDraft.id, decideDraft.decision, decideDraft.comment);
    toast.success(`Решение: ${STATUS_LABELS[decideDraft.decision]}`);
    setDecideDraft(null);
  };

  const confirmWriteOff = () => {
    if (!confirmDraft) return;
    store.decideReturn(confirmDraft.id, confirmDraft.decision, confirmDraft.comment);
    toast.success('Товар списан');
    setConfirmDraft(null);
    setDecideDraft(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Возвраты" subtitle={`Активных: ${returns.length}`} />

      <div className="px-5 -mt-5 space-y-2">
        {returns.length === 0 ? (
          <EmptyState emoji="↩️" title="Возвратов нет" subtitle="Возвраты от клиентов и поставщиков появятся здесь." />
        ) : returns.map(r => {
          const c = STATUS_COLORS[r.status];
          const mediaItems = buildMediaForReturn(r);
          const hasVideo = !!(r.videoFromCustomer || r.videoFromInspection);
          const totalPhotos = (r.photosBefore?.length ?? 0) + (r.photosAfter?.length ?? 0) + (r.photosDamage?.length ?? 0);
          const supplier = resolveSupplier(r);
          const sku = r.items[0]?.sku;

          // Файлы, доступные к отправке поставщику
          const sendItems: EvidenceSendItem[] = [
            ...(r.photosBefore ?? []).map(src => ({ kind: 'image' as const, src, source: 'return'   as const, title: 'Фото клиента (до)' })),
            ...(r.photosDamage ?? []).map(src => ({ kind: 'image' as const, src, source: 'warehouse' as const, title: 'Фото повреждения' })),
            ...(r.photosAfter  ?? []).map(src => ({ kind: 'image' as const, src, source: 'warehouse' as const, title: 'Фото после проверки' })),
            ...(r.videoFromCustomer   ? [{ kind: 'video' as const, src: r.videoFromCustomer,   source: 'customer'  as const, title: 'Видео клиента' }] : []),
            ...(r.videoFromInspection ? [{ kind: 'video' as const, src: r.videoFromInspection, source: 'warehouse' as const, title: 'Видео проверки' }] : []),
          ];

          const hint = supplier && (r.status === 'inspection' || r.status === 'damaged')
            ? `Этот возврат связан с поставщиком ${supplier.name}. Отправь доказательства, если товар бракованный.`
            : undefined;

          return (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{r.id}</div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    Заказ {r.orderId} · {r.customerName}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {r.mediaRequest && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ ...MEDIA_REQ_COLORS[r.mediaRequest], fontWeight: 800 }}
                    >
                      {MEDIA_REQ_LABELS[r.mediaRequest]}
                    </span>
                  )}
                  {hasVideo && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#4C1D95] inline-flex items-center gap-1" style={{ fontWeight: 800 }}>
                      <Video className="w-3 h-3" /> Есть видео
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 800 }}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
              </div>

              <div className="text-[12px] text-[#374151] mb-2" style={{ fontWeight: 600 }}>
                Причина: {r.reason}
              </div>

              <div className="space-y-1 mb-3">
                {r.items.map((it, i) => {
                  const sku = skus.find(s => s.sku === it.sku);
                  return (
                    <div key={i} className="text-[12px] text-[#1F2430] flex items-center gap-2" style={{ fontWeight: 600 }}>
                      {sku
                        ? <SkuThumb sku={sku} size={32} orderId={r.orderId} />
                        : <span className="text-[20px]">📦</span>}
                      <span className="flex-1 truncate">{sku?.name ?? it.sku}</span>
                      <span className="text-[#6B7280]">×{it.qty}</span>
                      {it.condition && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: it.condition === 'damaged' ? '#FEE2E2' : it.condition === 'used' ? '#FEF3C7' : '#DCFCE7',
                            color: it.condition === 'damaged' ? '#991B1B' : it.condition === 'used' ? '#92400E' : '#166534',
                            fontWeight: 700,
                          }}
                        >
                          {it.condition === 'damaged' ? 'брак' : it.condition === 'used' ? 'б/у' : 'новое'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {r.comment && (
                <div className="text-[11px] text-[#6B7280] bg-[#F9FAFB] rounded-md px-2 py-1.5 mb-3" style={{ fontWeight: 500 }}>
                  💬 {r.comment}
                </div>
              )}

              {(supplier || r.sellerName || r.invoiceNumber || r.asnId) && (
                <div className="mb-3">
                  <OwnerCard
                    supplier={supplier}
                    sellerName={r.sellerName}
                    invoiceNumber={r.invoiceNumber}
                    asnId={r.asnId}
                    hint={hint}
                  />
                </div>
              )}

              {mediaItems.length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] text-[#6B7280] mb-1.5" style={{ fontWeight: 700 }}>
                    {totalPhotos} фото · {hasVideo ? '+ видео' : 'без видео'}
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {mediaItems.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => setMedia({ items: mediaItems, index: i })}
                        className="w-16 h-16 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0 active-press relative overflow-hidden"
                      >
                        {m.kind === 'video' ? (
                          <Video className="w-6 h-6 text-[#1F2430]" />
                        ) : m.kind === 'image' ? (
                          <ImageIcon className="w-6 h-6 text-[#1F2430]" />
                        ) : (
                          <span className="text-[28px]">{m.src}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {r.status !== 'closed' && (
                <div className="flex gap-1.5 flex-wrap">
                  {mediaItems.length > 0 && (
                    <button
                      onClick={() => setMedia({ items: mediaItems, index: 0 })}
                      className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                    >
                      <Eye className="w-3 h-3" /> Смотреть доказательства
                    </button>
                  )}
                  <button
                    onClick={() => { store.requestReturnPhoto(r.id); toast('Запрос фото отправлен клиенту'); }}
                    disabled={r.mediaRequest === 'photo_requested'}
                    className="px-3 h-9 rounded-lg text-white text-[12px] active-press inline-flex items-center gap-1 disabled:opacity-50"
                    style={{ backgroundColor: r.mediaRequest === 'photo_requested' ? '#9CA3AF' : '#0EA5E9', fontWeight: 700 }}
                  >
                    <Send className="w-3 h-3" /> {r.mediaRequest === 'photo_requested' ? 'Фото запрошено' : 'Запросить фото'}
                  </button>
                  <button
                    onClick={() => { store.requestReturnVideo(r.id); toast('Запрос видео отправлен клиенту'); }}
                    disabled={r.mediaRequest === 'video_requested'}
                    className="px-3 h-9 rounded-lg text-white text-[12px] active-press inline-flex items-center gap-1 disabled:opacity-50"
                    style={{ backgroundColor: r.mediaRequest === 'video_requested' ? '#9CA3AF' : '#7C3AED', fontWeight: 700 }}
                  >
                    <Video className="w-3 h-3" /> {r.mediaRequest === 'video_requested' ? 'Видео запрошено' : 'Запросить видео'}
                  </button>
                  <UploadInspectionMedia rmaId={r.id} />
                  <button
                    onClick={() => setSendFor({ rmaId: r.id, items: sendItems, supplierId: supplier?.id, sku, invoice: r.invoiceNumber })}
                    disabled={!supplier && !r.supplierId}
                    className="px-3 h-9 rounded-lg text-white text-[12px] active-press inline-flex items-center gap-1 disabled:opacity-50"
                    style={{ backgroundColor: '#3730A3', fontWeight: 700 }}
                    title={!supplier ? 'Поставщик неизвестен' : undefined}
                  ><Send className="w-3 h-3" /> Отправить поставщику</button>
                  {supplier && (
                    <button
                      onClick={() => setDisputeFor({
                        rmaId: r.id, supplierId: supplier.id, supplierName: supplier.name,
                        sku: sku ?? '', invoice: r.invoiceNumber, asnId: r.asnId,
                      })}
                      className="px-3 h-9 rounded-lg bg-[#7F1D1D] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                    ><FileWarning className="w-3 h-3" /> Создать спор</button>
                  )}
                  <button onClick={() => openDecision(r, 'restock')}              className="px-3 h-9 rounded-lg bg-[#10B981] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>В продажу</button>
                  <button onClick={() => openDecision(r, 'damaged')}              className="px-3 h-9 rounded-lg bg-[#F59E0B] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>В брак</button>
                  <button onClick={() => openDecision(r, 'write_off')}            className="px-3 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Списать</button>
                  <button onClick={() => openDecision(r, 'returned_to_supplier')} className="px-3 h-9 rounded-lg bg-[#3730A3] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Поставщику</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={!!decideDraft}
        title={decideDraft ? `${STATUS_LABELS[decideDraft.decision]} · ${decideDraft.id}` : ''}
        onClose={() => setDecideDraft(null)}
        footer={
          <button
            onClick={submitDecision}
            className="w-full h-11 rounded-xl text-white active-press"
            style={{ backgroundColor: decideDraft?.decision === 'write_off' ? '#EF4444' : '#1F2430', fontWeight: 800 }}
          >
            Подтвердить
          </button>
        }
      >
        <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Решение</div>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {DECISIONS.map(d => {
            const cc = STATUS_COLORS[d];
            const active = decideDraft?.decision === d;
            return (
              <button
                key={d}
                onClick={() => setDecideDraft(s => s ? { ...s, decision: d } : s)}
                className="text-left px-2 py-2 rounded-xl text-[12px]"
                style={{
                  backgroundColor: active ? cc.bg : '#F9FAFB',
                  border: active ? `2px solid ${cc.fg}` : '2px solid transparent',
                  color: active ? cc.fg : '#1F2430',
                  fontWeight: 700,
                }}
              >
                {STATUS_LABELS[d]}
              </button>
            );
          })}
        </div>
        <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Комментарий инспектора</div>
        <textarea
          value={decideDraft?.comment ?? ''}
          onChange={(e) => setDecideDraft(s => s ? { ...s, comment: e.target.value } : s)}
          rows={3}
          placeholder="Что осмотрели, что обнаружили…"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#1F2430] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>

      <ConfirmModal
        open={!!confirmDraft}
        title="Списать товар?"
        message={`Списание ${confirmDraft?.id ?? ''} необратимо. Товар уйдёт в учёт списания и больше не будет доступен в остатках.`}
        confirmLabel="Списать"
        danger
        onConfirm={confirmWriteOff}
        onCancel={() => setConfirmDraft(null)}
      />

      <MediaPreviewModal
        open={!!media}
        items={media?.items ?? []}
        initialIndex={media?.index ?? 0}
        onClose={() => setMedia(null)}
      />

      {sendFor && (
        <SendToSupplierModal
          open={!!sendFor}
          onClose={() => setSendFor(null)}
          defaultSupplierId={sendFor.supplierId}
          availableItems={sendFor.items}
          defaultLinkedTo={{ type: 'return', id: sendFor.rmaId }}
          defaultInvoice={sendFor.invoice}
          defaultSku={sendFor.sku}
          defaultComment={`Возврат ${sendFor.rmaId}: прошу пояснения по товару ${sendFor.sku ?? ''}.`}
        />
      )}

      {disputeFor && (
        <SupplierDisputeModal
          open={!!disputeFor}
          onClose={() => setDisputeFor(null)}
          defaults={{
            supplierId: disputeFor.supplierId, supplierName: disputeFor.supplierName,
            sku: disputeFor.sku, invoiceNumber: disputeFor.invoice, asnId: disputeFor.asnId,
            initialReason: 'damaged_goods',
          }}
        />
      )}
    </div>
  );
}

function UploadInspectionMedia({ rmaId }: { rmaId: string }) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    store.uploadReturnMedia(rmaId, isVideo ? 'video_inspection' : 'photo_damage', uri);
    toast.success(isVideo ? 'Видео склада загружено' : 'Фото повреждения загружено');
    e.target.value = '';
  };
  return (
    <label className="px-3 h-9 rounded-lg bg-[#374151] text-white text-[12px] active-press inline-flex items-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
      <Camera className="w-3 h-3" /> Загрузить медиа
      <input type="file" accept="image/*,video/mp4,video/webm" onChange={onChange} className="hidden" />
    </label>
  );
}
