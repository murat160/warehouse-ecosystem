import { useMemo, useState } from 'react';
import {
  Camera, Video, FileText, Eye, Send, MessagesSquare, MessageSquare,
  Download, X, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import { MediaPreviewModal, type MediaItem } from './MediaPreviewModal';
import { OwnerCard } from './OwnerCard';
import { SendToSupplierModal } from './SendToSupplierModal';
import { SupplierChatModal } from './SupplierChatModal';
import { useStore, store } from '../store/useStore';
import {
  DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS,
  type SupplierDispute, type DisputeStatus, type EvidenceSendItem,
} from '../domain/types';

const STATUS_TRANSITIONS: DisputeStatus[] = [
  'draft', 'sent_to_supplier', 'supplier_response_waiting',
  'accepted', 'rejected', 'resolved', 'escalated',
];

export interface DisputeDetailDrawerProps {
  open: boolean;
  disputeId: string | null;
  onClose: () => void;
}

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function DisputeDetailDrawer({ open, disputeId, onClose }: DisputeDetailDrawerProps) {
  const { supplierDisputes, supplierMedia, damageReports, suppliers, skus, returns: rmas, workers } = useStore();
  const [media, setMedia] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [supplierChat, setSupplierChat] = useState<string | null>(null);
  const [internalChat, setInternalChat] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [extraDocs, setExtraDocs] = useState<{ src: string; name: string }[]>([]);

  const d: SupplierDispute | undefined = disputeId ? supplierDisputes.find(x => x.id === disputeId) : undefined;
  if (!d) return null;

  const supplier = suppliers.find(s => s.id === d.supplierId);
  const sku = skus.find(s => s.sku === d.sku);
  const sm = d.supplierMediaId ? supplierMedia.find(m => m.id === d.supplierMediaId) : undefined;
  const dmg = d.damageReportId ? damageReports.find(r => r.id === d.damageReportId) : undefined;
  const linkedRma = rmas.find(r => r.linkedDisputeId === d.id || (r.asnId === d.asnId && r.items.some(it => it.sku === d.sku)));
  const responsible = d.responsibleEmployeeId ? workers.find(w => w.id === d.responsibleEmployeeId) : undefined;

  const supplierEvidence: MediaItem[] = useMemo(() => sm
    ? [
        ...sm.photos.map((src, i): MediaItem => ({ kind: 'image', src, title: `Фото поставщика ${i + 1}`, sku: d.sku })),
        ...sm.videos.map((src, i): MediaItem => ({ kind: 'video', src, title: `Видео поставщика ${i + 1}`, sku: d.sku })),
      ]
    : [], [sm, d.sku]);

  const warehouseEvidence: MediaItem[] = useMemo(() => [
    ...d.warehousePhotos.map((src, i): MediaItem => ({ kind: 'image', src, title: `Фото склада ${i + 1}`, sku: d.sku })),
    ...d.warehouseVideos.map((src, i): MediaItem => ({ kind: 'video', src, title: `Видео склада ${i + 1}`, sku: d.sku })),
    ...(dmg?.photos ?? []).map((src, i): MediaItem => ({ kind: 'image', src, title: `Damage report ${i + 1}`, sku: d.sku })),
    ...(dmg?.videos ?? []).map((src, i): MediaItem => ({ kind: 'video', src, title: `Damage video ${i + 1}`, sku: d.sku })),
  ], [d.warehousePhotos, d.warehouseVideos, d.sku, dmg]);

  const customerEvidence: MediaItem[] = useMemo(() => linkedRma
    ? [
        ...(linkedRma.photosBefore ?? []).map((src, i): MediaItem => ({ kind: 'image', src, title: `Клиент: фото до ${i + 1}` })),
        ...(linkedRma.photosDamage ?? []).map((src, i): MediaItem => ({ kind: 'image', src, title: `Клиент: повреждение ${i + 1}` })),
        ...(linkedRma.videoFromCustomer ? [{ kind: 'video' as const, src: linkedRma.videoFromCustomer, title: 'Видео клиента' }] : []),
      ]
    : [], [linkedRma]);

  const allEvidence: EvidenceSendItem[] = [
    ...supplierEvidence.map((m): EvidenceSendItem => ({ kind: m.kind === 'video' ? 'video' : 'image', src: m.src, source: 'supplier',  title: m.title })),
    ...warehouseEvidence.map((m): EvidenceSendItem => ({ kind: m.kind === 'video' ? 'video' : 'image', src: m.src, source: 'warehouse', title: m.title })),
    ...customerEvidence.map((m): EvidenceSendItem => ({ kind: m.kind === 'video' ? 'video' : 'image', src: m.src, source: 'customer',  title: m.title })),
  ];

  const onAdd = (e: React.ChangeEvent<HTMLInputElement>, kind: 'photo' | 'video' | 'document') => {
    const files = e.target.files;
    if (!files) return;
    if (kind === 'photo' || kind === 'video') {
      Array.from(files).forEach(f => {
        store.uploadDisputeMedia(d.id, kind, URL.createObjectURL(f));
      });
      toast.success(kind === 'photo' ? 'Фото добавлено' : 'Видео добавлено');
    } else {
      Array.from(files).forEach(f => {
        const src = URL.createObjectURL(f);
        setExtraDocs(prev => [...prev, { src, name: f.name }]);
      });
      toast.success('Документ прикреплён');
    }
    e.target.value = '';
  };

  const exportReport = () => {
    const text = [
      `DISPUTE REPORT: ${d.id}`,
      `=================================`,
      `Supplier: ${d.supplierName} (${d.supplierId})`,
      `Invoice:  ${d.invoiceNumber ?? '—'}`,
      `ASN:      ${d.asnId ?? '—'}`,
      `SKU:      ${d.sku}`,
      `Reason:   ${DISPUTE_REASON_LABELS[d.reason]}`,
      `Status:   ${DISPUTE_STATUS_LABELS[d.status]}`,
      `Damaged:  ${d.damagedQty ?? '—'}`,
      `Claimed:  ${d.claimedAmount ?? '—'}`,
      `Created:  ${d.createdAt}`,
      `Sent:     ${d.sentAt ?? '—'}`,
      `Resolved: ${d.resolvedAt ?? '—'}`,
      ``,
      `Description:`,
      d.description,
      ``,
      `Supplier response: ${d.supplierResponse ?? '—'}`,
      ``,
      `Evidence: supplier=${supplierEvidence.length}, warehouse=${warehouseEvidence.length}, customer=${customerEvidence.length}, docs=${extraDocs.length}`,
    ].join('\n');
    downloadFile(`dispute-${d.id}.txt`, text, 'text/plain');
    toast.success('Dispute report экспортирован');
  };

  const c = STATUS_COLORS[d.status];
  const pColor = d.status === 'rejected' || d.status === 'escalated'
    ? '#7F1D1D' : d.status === 'resolved' || d.status === 'accepted' ? '#166534' : '#3730A3';

  return (
    <>
      <Modal
        open={open} onClose={onClose} size="lg"
        title={`Спор · ${d.id}`}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setStatusOpen(true)}
              className="h-10 rounded-xl bg-[#1F2430] text-white active-press inline-flex items-center justify-center gap-1"
              style={{ fontWeight: 800 }}
            ><ChevronDown className="w-4 h-4" /> Изменить статус</button>
            <button
              onClick={() => setConfirmClose(true)}
              disabled={d.status === 'closed' || d.status === 'resolved'}
              className="h-10 rounded-xl bg-[#7F1D1D] text-white active-press disabled:opacity-50"
              style={{ fontWeight: 800 }}
            >Закрыть спор</button>
            <button onClick={exportReport} className="h-10 rounded-xl bg-[#374151] text-white active-press inline-flex items-center justify-center gap-1" style={{ fontWeight: 800 }}>
              <Download className="w-4 h-4" /> Экспорт отчёта
            </button>
            <button onClick={onClose} className="h-10 rounded-xl bg-[#F3F4F6] text-[#1F2430] active-press" style={{ fontWeight: 800 }}>
              Закрыть
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 800 }}>
              {DISPUTE_STATUS_LABELS[d.status]}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E0E7FF', color: pColor, fontWeight: 800 }}>
              {DISPUTE_REASON_LABELS[d.reason]}
            </span>
          </div>

          <OwnerCard
            supplier={supplier}
            sellerName={sku?.sellerName}
            invoiceNumber={d.invoiceNumber}
            asnId={d.asnId}
          />

          <div className="bg-[#F9FAFB] rounded-xl p-3 grid grid-cols-2 gap-2 text-[12px]" style={{ fontWeight: 600 }}>
            <Field label="SKU"          value={d.sku} />
            <Field label="Категория"    value={sku?.category ?? '—'} />
            <Field label="Барode"       value={sku?.barcode ?? '—'} />
            <Field label="Damaged qty"  value={String(d.damagedQty ?? '—')} />
            <Field label="Missing qty"  value={String((dmg?.damagedQty ?? 0) - (d.damagedQty ?? 0) || '—')} />
            <Field label="Сумма"        value={d.claimedAmount !== undefined ? `${d.claimedAmount} ₸` : '—'} />
            <Field label="Ответственный" value={responsible?.name ?? '—'} />
            <Field label="Создан"       value={new Date(d.createdAt).toLocaleString('ru')} />
            {d.sentAt &&     <Field label="Отправлен" value={new Date(d.sentAt).toLocaleString('ru')} />}
            {d.resolvedAt && <Field label="Закрыт"    value={new Date(d.resolvedAt).toLocaleString('ru')} />}
          </div>

          <div className="text-[12px] text-[#1F2430] bg-[#FEF3C7] rounded-md px-3 py-2" style={{ fontWeight: 600 }}>
            {d.description}
          </div>

          {d.supplierResponse && (
            <div className="bg-[#F9FAFB] border-l-4 border-[#10B981] rounded-md px-3 py-2">
              <div className="text-[10px] text-[#6B7280] mb-0.5" style={{ fontWeight: 700 }}>Ответ поставщика</div>
              <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 500 }}>{d.supplierResponse}</div>
            </div>
          )}

          <EvidenceBlock
            title="Evidence: От поставщика"
            color="#3730A3"
            description={sm?.description}
            items={supplierEvidence}
            onOpen={(idx) => setMedia({ items: supplierEvidence, index: idx })}
          />

          <EvidenceBlock
            title="Evidence: Со склада"
            color="#0369A1"
            description={dmg ? `Damage report: ${dmg.id}` : undefined}
            items={warehouseEvidence}
            onOpen={(idx) => setMedia({ items: warehouseEvidence, index: idx })}
          />

          {customerEvidence.length > 0 && (
            <EvidenceBlock
              title={`Evidence: От клиента (${linkedRma?.id ?? ''})`}
              color="#7F1D1D"
              description={linkedRma?.comment}
              items={customerEvidence}
              onOpen={(idx) => setMedia({ items: customerEvidence, index: idx })}
            />
          )}

          {extraDocs.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3">
              <div className="text-[12px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>Документы</div>
              <div className="space-y-1">
                {extraDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <FileText className="w-4 h-4 text-[#374151]" />
                    <span className="text-[#1F2430]" style={{ fontWeight: 600 }}>{doc.name}</span>
                    <a href={doc.src} download={doc.name} className="ml-auto text-[#0369A1] underline" style={{ fontWeight: 700 }}>скачать</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <label className="px-3 h-10 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press inline-flex items-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
              <Camera className="w-3 h-3" /> Добавить фото
              <input type="file" accept="image/*" multiple onChange={(e) => onAdd(e, 'photo')} className="hidden" />
            </label>
            <label className="px-3 h-10 rounded-lg bg-[#7C3AED] text-white text-[12px] active-press inline-flex items-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
              <Video className="w-3 h-3" /> Добавить видео
              <input type="file" accept="video/mp4,video/webm" multiple onChange={(e) => onAdd(e, 'video')} className="hidden" />
            </label>
            <label className="px-3 h-10 rounded-lg bg-[#374151] text-white text-[12px] active-press inline-flex items-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
              <FileText className="w-3 h-3" /> Добавить документ
              <input type="file" accept=".pdf,.doc,.docx,.xlsx,.csv,.txt" multiple onChange={(e) => onAdd(e, 'document')} className="hidden" />
            </label>
            <button
              onClick={() => setMedia({ items: [...supplierEvidence, ...warehouseEvidence, ...customerEvidence], index: 0 })}
              disabled={supplierEvidence.length + warehouseEvidence.length + customerEvidence.length === 0}
              className="px-3 h-10 rounded-lg bg-[#1F2430] text-white text-[12px] active-press inline-flex items-center gap-1 disabled:opacity-50" style={{ fontWeight: 700 }}
            ><Eye className="w-3 h-3" /> Смотреть доказательства</button>
            <button
              onClick={() => setSendOpen(true)}
              className="px-3 h-10 rounded-lg bg-[#0369A1] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
            ><Send className="w-3 h-3" /> Отправить поставщику</button>
            <button
              onClick={() => {
                const id = store.getOrCreateInternalThread({
                  kind: 'dispute', refId: d.id, title: `Спор ${d.id} · ${d.supplierName}`,
                  priority: 'urgent',
                });
                setInternalChat(id);
              }}
              className="px-3 h-10 rounded-lg bg-[#7C3AED] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
            ><MessagesSquare className="w-3 h-3" /> Внутренний чат</button>
            <button
              onClick={() => {
                const id = store.getOrCreateSupplierThread({
                  supplierId: d.supplierId, supplierName: d.supplierName,
                  linkedTo: { type: 'dispute', id: d.id },
                  invoiceNumber: d.invoiceNumber, sku: d.sku,
                });
                setSupplierChat(id);
              }}
              className="px-3 h-10 rounded-lg bg-[#3730A3] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
            ><MessageSquare className="w-3 h-3" /> Чат с поставщиком</button>
          </div>
        </div>
      </Modal>

      <Modal
        open={statusOpen}
        title="Изменить статус"
        onClose={() => setStatusOpen(false)}
      >
        <div className="space-y-1">
          {STATUS_TRANSITIONS.map(s => (
            <button
              key={s}
              onClick={() => { store.changeDisputeStatus(d.id, s); toast(`Статус: ${DISPUTE_STATUS_LABELS[s]}`); setStatusOpen(false); }}
              className="w-full text-left p-2 rounded-xl text-[13px]"
              style={{
                backgroundColor: d.status === s ? '#E0E7FF' : '#F9FAFB',
                border: d.status === s ? '2px solid #3730A3' : '2px solid transparent',
                fontWeight: 700,
              }}
            >{DISPUTE_STATUS_LABELS[s]}</button>
          ))}
        </div>
      </Modal>

      <ConfirmModal
        open={confirmClose}
        title="Закрыть спор?"
        message="После закрытия дисуплет уйдёт в архив. Все доказательства останутся доступны."
        onConfirm={() => {
          store.changeDisputeStatus(d.id, 'resolved');
          toast.success('Спор закрыт');
          setConfirmClose(false); onClose();
        }}
        onCancel={() => setConfirmClose(false)}
      />

      {sendOpen && (
        <SendToSupplierModal
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          defaultSupplierId={d.supplierId}
          availableItems={allEvidence}
          defaultLinkedTo={{ type: 'dispute', id: d.id }}
          defaultInvoice={d.invoiceNumber}
          defaultSku={d.sku}
          defaultComment={`Спор ${d.id}: высылаем доказательства, ждём вашу позицию.`}
        />
      )}

      <SupplierChatModal
        open={!!supplierChat}
        threadId={supplierChat}
        onClose={() => setSupplierChat(null)}
      />

      <SupplierChatModal
        open={!!internalChat}
        threadId={internalChat}
        onClose={() => setInternalChat(null)}
      />

      <MediaPreviewModal
        open={!!media}
        items={media?.items ?? []}
        initialIndex={media?.index ?? 0}
        onClose={() => setMedia(null)}
      />
    </>
  );
}

const STATUS_COLORS: Record<DisputeStatus, { bg: string; fg: string }> = {
  draft:                     { bg: '#F3F4F6', fg: '#374151' },
  sent_to_supplier:          { bg: '#E0E7FF', fg: '#3730A3' },
  supplier_response_waiting: { bg: '#FEF3C7', fg: '#92400E' },
  accepted:                  { bg: '#DCFCE7', fg: '#166534' },
  rejected:                  { bg: '#FEE2E2', fg: '#991B1B' },
  resolved:                  { bg: '#D1FAE5', fg: '#065F46' },
  escalated:                 { bg: '#FECACA', fg: '#7F1D1D' },
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-[#6B7280] mb-0.5" style={{ fontWeight: 700 }}>{label}</div>
      <div className="text-[#1F2430] font-mono truncate" style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function EvidenceBlock({ title, color, description, items, onOpen }: {
  title: string; color: string; description?: string;
  items: MediaItem[]; onOpen: (idx: number) => void;
}) {
  return (
    <div className="bg-white border-l-4 rounded-xl p-3" style={{ borderColor: color }}>
      <div className="text-[12px] mb-1" style={{ color, fontWeight: 800 }}>{title} · {items.length}</div>
      {description && <div className="text-[11px] text-[#6B7280] mb-2" style={{ fontWeight: 600 }}>{description}</div>}
      {items.length === 0 ? (
        <div className="text-[11px] text-[#9CA3AF] py-1" style={{ fontWeight: 500 }}>Нет файлов</div>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {items.map((m, i) => (
            <button
              key={i}
              onClick={() => onOpen(i)}
              className="w-14 h-14 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0 active-press"
            >
              <span className="text-[20px]">{m.kind === 'video' ? '🎬' : '🖼'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
