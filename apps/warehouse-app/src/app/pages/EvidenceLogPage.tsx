import { useState } from 'react';
import { Eye, MessageSquare, CheckCircle2, MessagesSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { MediaPreviewModal, type MediaItem } from '../components/MediaPreviewModal';
import { SupplierChatModal } from '../components/SupplierChatModal';
import {
  EVIDENCE_SEND_STATUS_LABELS, type EvidenceSendStatus,
} from '../domain/types';

const STATUS_COLORS: Record<EvidenceSendStatus, { bg: string; fg: string }> = {
  draft:             { bg: '#F3F4F6', fg: '#374151' },
  sent_to_supplier:  { bg: '#E0E7FF', fg: '#3730A3' },
  supplier_viewed:   { bg: '#FEF3C7', fg: '#92400E' },
  response_received: { bg: '#DCFCE7', fg: '#166534' },
  closed:            { bg: '#E5E7EB', fg: '#1F2937' },
};

export function EvidenceLogPage() {
  const { evidenceSends, workers } = useStore();
  const [filter, setFilter] = useState<EvidenceSendStatus | 'ALL'>('ALL');
  const [responseFor, setResponseFor] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [closeFor, setCloseFor] = useState<string | null>(null);
  const [media, setMedia] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);

  const list = evidenceSends.filter(e => filter === 'ALL' || e.status === filter);

  const submitResponse = () => {
    if (!responseFor || !responseText.trim()) { toast.error('Введите ответ'); return; }
    store.addEvidenceResponse(responseFor, responseText);
    toast.success('Ответ сохранён');
    setResponseFor(null); setResponseText('');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Отправки доказательств" subtitle={`Всего: ${evidenceSends.length}`} />

      <div className="px-5 -mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          <Pill active={filter === 'ALL'} onClick={() => setFilter('ALL')}>Все ({evidenceSends.length})</Pill>
          {(Object.keys(EVIDENCE_SEND_STATUS_LABELS) as EvidenceSendStatus[]).map(s => {
            const count = evidenceSends.filter(e => e.status === s).length;
            return <Pill key={s} active={filter === s} onClick={() => setFilter(s)} color={STATUS_COLORS[s]}>{EVIDENCE_SEND_STATUS_LABELS[s]} ({count})</Pill>;
          })}
        </div>

        {list.length === 0 ? (
          <EmptyState emoji="📤" title="Отправок нет" subtitle="Когда отправите фото/видео поставщику — запись появится здесь." />
        ) : (
          <div className="space-y-2">
            {list.map(e => {
              const c = STATUS_COLORS[e.status];
              const sender = workers.find(w => w.id === e.sentBy);
              const items: MediaItem[] = e.items.map(it => ({
                kind: it.kind, src: it.src, title: it.title, sku: e.sku, orderId: e.invoiceNumber,
              }));
              return (
                <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{e.id}</div>
                      <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                        → {e.supplierName} · канал: {e.channel}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 800 }}>
                      {EVIDENCE_SEND_STATUS_LABELS[e.status]}
                    </span>
                  </div>

                  <div className="text-[12px] text-[#374151] mb-2" style={{ fontWeight: 500 }}>{e.comment}</div>

                  <div className="flex flex-wrap gap-1.5 text-[10px] mb-3">
                    <Tag>{sender?.name ?? e.sentBy}</Tag>
                    <Tag>{new Date(e.sentAt).toLocaleString('ru')}</Tag>
                    {e.invoiceNumber && <Tag>invoice {e.invoiceNumber}</Tag>}
                    {e.sku && <Tag>SKU {e.sku}</Tag>}
                    {e.linkedTo && <Tag>{e.linkedTo.type} {e.linkedTo.id}</Tag>}
                    <Tag>{e.items.length} файлов</Tag>
                  </div>

                  {e.responseText && (
                    <div className="bg-[#F9FAFB] border-l-4 border-[#10B981] rounded-md px-3 py-2 mb-3">
                      <div className="text-[10px] text-[#6B7280] mb-0.5" style={{ fontWeight: 700 }}>Ответ поставщика</div>
                      <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 500 }}>{e.responseText}</div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {items.length > 0 && (
                      <button
                        onClick={() => setMedia({ items, index: 0 })}
                        className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                      ><Eye className="w-3 h-3" /> Смотреть медиа</button>
                    )}
                    {e.status === 'sent_to_supplier' && (
                      <button
                        onClick={() => { store.markEvidenceViewed(e.id); toast('Отмечено: поставщик видел'); }}
                        className="px-3 h-9 rounded-lg bg-[#F59E0B] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                      ><CheckCircle2 className="w-3 h-3" /> Поставщик увидел</button>
                    )}
                    {(e.status === 'sent_to_supplier' || e.status === 'supplier_viewed') && (
                      <button
                        onClick={() => setResponseFor(e.id)}
                        className="px-3 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                      ><MessageSquare className="w-3 h-3" /> Записать ответ</button>
                    )}
                    {e.status !== 'closed' && (
                      <button
                        onClick={() => setCloseFor(e.id)}
                        className="px-3 h-9 rounded-lg bg-[#374151] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                      >Закрыть</button>
                    )}
                    <button
                      onClick={() => {
                        const id = store.getOrCreateSupplierThread({
                          supplierId: e.supplierId, supplierName: e.supplierName,
                          linkedTo: e.linkedTo, invoiceNumber: e.invoiceNumber, sku: e.sku,
                        });
                        setChatThreadId(id);
                      }}
                      className="px-3 h-9 rounded-lg bg-[#3730A3] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                    ><MessagesSquare className="w-3 h-3" /> Чат</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={!!responseFor}
        title="Ответ поставщика"
        onClose={() => { setResponseFor(null); setResponseText(''); }}
        footer={<button onClick={submitResponse} className="w-full h-11 rounded-xl bg-[#0EA5E9] text-white active-press" style={{ fontWeight: 800 }}>Сохранить</button>}
      >
        <textarea
          value={responseText}
          onChange={e => setResponseText(e.target.value)}
          rows={4}
          placeholder="Что ответил поставщик…"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#0EA5E9] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>

      <ConfirmModal
        open={!!closeFor}
        title="Закрыть отправку?"
        message="Запись уйдёт в архив. История останется, но новые действия будут недоступны."
        onConfirm={() => { if (closeFor) store.closeEvidenceSend(closeFor); toast('Закрыто'); setCloseFor(null); }}
        onCancel={() => setCloseFor(null)}
      />

      <MediaPreviewModal
        open={!!media}
        items={media?.items ?? []}
        initialIndex={media?.index ?? 0}
        onClose={() => setMedia(null)}
      />

      <SupplierChatModal
        open={!!chatThreadId}
        threadId={chatThreadId}
        onClose={() => setChatThreadId(null)}
      />
    </div>
  );
}

function Pill({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: { bg: string; fg: string } }) {
  return (
    <button
      onClick={onClick}
      className="px-3 h-8 rounded-full text-[11px] whitespace-nowrap active-press"
      style={{
        backgroundColor: active ? (color?.bg ?? '#1F2430') : 'white',
        color: active ? (color?.fg ?? 'white') : '#1F2430',
        border: '1px solid #E5E7EB',
        fontWeight: 700,
      }}
    >{children}</button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#F3F4F6] text-[#374151]" style={{ fontWeight: 700 }}>
      {children}
    </span>
  );
}
