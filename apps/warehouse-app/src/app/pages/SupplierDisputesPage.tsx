import { useState } from 'react';
import { Camera, Video, Send, Download, MessageSquare, MessagesSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { SupplierDisputeModal } from '../components/SupplierDisputeModal';
import { SupplierChatModal } from '../components/SupplierChatModal';
import { DisputeDetailDrawer } from '../components/DisputeDetailDrawer';
import { InternalChatButton } from '../components/InternalChatButton';
import { EvidenceViewer, type Evidence } from '../components/EvidenceViewer';
import {
  DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS,
  type DisputeStatus,
} from '../domain/types';

const STATUS_COLORS: Record<DisputeStatus, { bg: string; fg: string }> = {
  draft:                     { bg: '#F3F4F6', fg: '#374151' },
  sent_to_supplier:          { bg: '#E0E7FF', fg: '#3730A3' },
  supplier_response_waiting: { bg: '#FEF3C7', fg: '#92400E' },
  accepted:                  { bg: '#DCFCE7', fg: '#166534' },
  rejected:                  { bg: '#FEE2E2', fg: '#991B1B' },
  resolved:                  { bg: '#D1FAE5', fg: '#065F46' },
  escalated:                 { bg: '#FECACA', fg: '#7F1D1D' },
};

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function SupplierDisputesPage() {
  const { supplierDisputes, suppliers, asns, skus } = useStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [resolveFor, setResolveFor] = useState<string | null>(null);
  const [responseFor, setResponseFor] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | DisputeStatus>('ALL');
  const [detailFor, setDetailFor] = useState<string | null>(null);

  const exportReport = (id: string) => {
    const d = supplierDisputes.find(x => x.id === id);
    if (!d) return;
    const text = [
      `DISPUTE REPORT: ${d.id}`,
      `=================================`,
      `Supplier:     ${d.supplierName} (${d.supplierId})`,
      `Invoice:      ${d.invoiceNumber ?? '—'}`,
      `ASN:          ${d.asnId ?? '—'}`,
      `SKU:          ${d.sku}`,
      `Reason:       ${DISPUTE_REASON_LABELS[d.reason]}`,
      `Damaged qty:  ${d.damagedQty ?? '—'}`,
      `Claimed:      ${d.claimedAmount ?? '—'}`,
      `Status:       ${DISPUTE_STATUS_LABELS[d.status]}`,
      `Created:      ${d.createdAt}`,
      `Sent:         ${d.sentAt ?? '—'}`,
      `Resolved:     ${d.resolvedAt ?? '—'}`,
      ``,
      `Description:`,
      d.description,
      ``,
      `Supplier response: ${d.supplierResponse ?? '—'}`,
      ``,
      `Photos:       ${d.warehousePhotos.length}`,
      `Videos:       ${d.warehouseVideos.length}`,
    ].join('\n');
    downloadFile(`dispute-${d.id}.txt`, text, 'text/plain');
    toast.success('Dispute report экспортирован');
  };

  const sendResponse = () => {
    if (!responseFor || !responseText.trim()) { toast.error('Введите ответ поставщика'); return; }
    store.addDisputeResponse(responseFor, responseText);
    toast.success('Ответ поставщика сохранён');
    setResponseFor(null); setResponseText('');
  };

  const resolveDispute = () => {
    if (!resolveFor) return;
    store.changeDisputeStatus(resolveFor, 'resolved');
    toast.success('Спор закрыт');
    setResolveFor(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Споры с поставщиками" subtitle={`Всего: ${supplierDisputes.length}`} />

      <div className="px-5 -mt-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm grid grid-cols-3 md:grid-cols-4 gap-2 mb-3">
          <FilterPill label="Все"        value={supplierDisputes.length}                                                  active={filter === 'ALL'}                       onClick={() => setFilter('ALL')} />
          <FilterPill label="Черновики"  value={supplierDisputes.filter(x => x.status === 'draft').length}               active={filter === 'draft'}                     onClick={() => setFilter('draft')}                     color="#374151" />
          <FilterPill label="Отправлены" value={supplierDisputes.filter(x => x.status === 'sent_to_supplier').length}    active={filter === 'sent_to_supplier'}          onClick={() => setFilter('sent_to_supplier')}          color="#3730A3" />
          <FilterPill label="Ждём ответ" value={supplierDisputes.filter(x => x.status === 'supplier_response_waiting').length} active={filter === 'supplier_response_waiting'} onClick={() => setFilter('supplier_response_waiting')} color="#92400E" />
          <FilterPill label="Решены"     value={supplierDisputes.filter(x => x.status === 'resolved').length}            active={filter === 'resolved'}                  onClick={() => setFilter('resolved')}                  color="#166534" />
          <FilterPill label="Отклонены"  value={supplierDisputes.filter(x => x.status === 'rejected').length}            active={filter === 'rejected'}                  onClick={() => setFilter('rejected')}                  color="#991B1B" />
          <FilterPill label="Эскалированы" value={supplierDisputes.filter(x => x.status === 'escalated').length}        active={filter === 'escalated'}                 onClick={() => setFilter('escalated')}                 color="#7F1D1D" />
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="w-full h-11 rounded-2xl bg-[#3730A3] text-white mb-3 active-press"
          style={{ fontWeight: 800 }}
        >
          + Новый спор
        </button>

        {(() => {
          const list = filter === 'ALL' ? supplierDisputes : supplierDisputes.filter(x => x.status === filter);
          if (list.length === 0) return <EmptyState emoji="🤝" title="Споров нет" subtitle="Когда обнаруживается расхождение с поставкой — создайте спор отсюда." />;
          return (
          <div className="space-y-2">
            {list.map(d => {
              const c = STATUS_COLORS[d.status];
              const sku = skus.find(s => s.sku === d.sku);
              const evidence: Evidence[] = [
                ...d.warehousePhotos.map(src => ({ kind: 'image' as const, src, source: 'warehouse' as const, title: 'Фото склада',  refId: d.id })),
                ...d.warehouseVideos.map(src => ({ kind: 'video' as const, src, source: 'warehouse' as const, title: 'Видео склада', refId: d.id })),
              ];
              return (
                <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{d.id}</div>
                      <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                        {d.supplierName} · {d.invoiceNumber ?? '—'}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 800 }}>
                      {DISPUTE_STATUS_LABELS[d.status]}
                    </span>
                  </div>

                  {sku && (
                    <div className="flex items-center gap-2 text-[12px] mb-2" style={{ fontWeight: 600 }}>
                      <span className="text-[20px]">{sku.photo}</span>
                      <span className="text-[#1F2430] truncate">{sku.name}</span>
                      <span className="text-[#6B7280] font-mono ml-auto">{sku.sku}</span>
                    </div>
                  )}

                  <div className="text-[12px] text-[#374151] mb-2" style={{ fontWeight: 500 }}>
                    Причина: {DISPUTE_REASON_LABELS[d.reason]} · {d.description}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {d.damagedQty !== undefined  && <Tag>×{d.damagedQty}</Tag>}
                    {d.claimedAmount !== undefined && <Tag>{d.claimedAmount} ₸</Tag>}
                    {d.sentAt && <Tag>отправлен {new Date(d.sentAt).toLocaleDateString('ru')}</Tag>}
                  </div>

                  {d.supplierResponse && (
                    <div className="bg-[#F9FAFB] border-l-4 border-[#3730A3] rounded-md px-3 py-2 mb-3">
                      <div className="text-[10px] text-[#6B7280] mb-0.5" style={{ fontWeight: 700 }}>Ответ поставщика</div>
                      <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 500 }}>{d.supplierResponse}</div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <UploadDisputeMedia disputeId={d.id} kind="photo" />
                    <UploadDisputeMedia disputeId={d.id} kind="video" />
                    {d.status === 'draft' && (
                      <button
                        onClick={() => { store.changeDisputeStatus(d.id, 'sent_to_supplier'); toast.success('Спор отправлен'); }}
                        className="px-3 h-9 rounded-lg bg-[#3730A3] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                      ><Send className="w-3 h-3" /> Отправить</button>
                    )}
                    {(d.status === 'sent_to_supplier' || d.status === 'supplier_response_waiting') && (
                      <button
                        onClick={() => setResponseFor(d.id)}
                        className="px-3 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                      ><MessageSquare className="w-3 h-3" /> Ответ поставщика</button>
                    )}
                    {d.status === 'sent_to_supplier' && (
                      <>
                        <button onClick={() => { store.changeDisputeStatus(d.id, 'accepted'); toast.success('Спор принят'); }}  className="px-3 h-9 rounded-lg bg-[#10B981] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Принят</button>
                        <button onClick={() => { store.changeDisputeStatus(d.id, 'rejected'); toast('Отклонён'); }}            className="px-3 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Отклонён</button>
                      </>
                    )}
                    {d.status !== 'resolved' && d.status !== 'escalated' && (
                      <>
                        <button onClick={() => setResolveFor(d.id)} className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Закрыть</button>
                        <button onClick={() => { store.changeDisputeStatus(d.id, 'escalated'); toast('Эскалировано'); }} className="px-3 h-9 rounded-lg bg-[#7F1D1D] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Эскалировать</button>
                      </>
                    )}
                    <button onClick={() => exportReport(d.id)} className="px-3 h-9 rounded-lg bg-[#374151] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}>
                      <Download className="w-3 h-3" /> Отчёт
                    </button>
                    <button
                      onClick={() => {
                        const id = store.getOrCreateSupplierThread({
                          supplierId: d.supplierId, supplierName: d.supplierName,
                          linkedTo: { type: 'dispute', id: d.id },
                          invoiceNumber: d.invoiceNumber, sku: d.sku,
                        });
                        setChatThreadId(id);
                      }}
                      className="px-3 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                    ><MessagesSquare className="w-3 h-3" /> Чат с поставщиком</button>
                    <InternalChatButton kind="dispute" refId={d.id} title={`Спор ${d.id}`} priority="urgent" />
                    <button
                      onClick={() => setDetailFor(d.id)}
                      className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                    >Открыть детали</button>
                  </div>

                  {evidence.length > 0 && (
                    <div className="mt-3">
                      <EvidenceViewer items={evidence} title="Доказательства склада" withFilters={false} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>

      <Modal
        open={createOpen}
        title="Создать спор с поставщиком"
        onClose={() => setCreateOpen(false)}
      >
        <div className="text-[13px] text-[#374151] mb-3" style={{ fontWeight: 500 }}>
          Выберите поставщика и SKU, затем нажмите «Открыть форму».
        </div>
        <NewDispute onClose={() => setCreateOpen(false)} suppliers={suppliers} asns={asns} skus={skus} />
      </Modal>

      <Modal
        open={!!responseFor}
        title="Ответ поставщика"
        onClose={() => { setResponseFor(null); setResponseText(''); }}
        footer={<button onClick={sendResponse} className="w-full h-11 rounded-xl bg-[#0EA5E9] text-white active-press" style={{ fontWeight: 800 }}>Сохранить ответ</button>}
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
        open={!!resolveFor}
        title="Закрыть спор?"
        message="После закрытия спор перейдёт в архив. Документы и доказательства останутся."
        onConfirm={resolveDispute}
        onCancel={() => setResolveFor(null)}
      />

      <SupplierChatModal
        open={!!chatThreadId}
        threadId={chatThreadId}
        onClose={() => setChatThreadId(null)}
      />

      <DisputeDetailDrawer
        open={!!detailFor}
        disputeId={detailFor}
        onClose={() => setDetailFor(null)}
      />
    </div>
  );
}

function FilterPill({ label, value, active, onClick, color = '#1F2430' }: { label: string; value: number; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-2 active-press"
      style={{ backgroundColor: active ? color : '#F9FAFB' }}
    >
      <div className="text-[16px]" style={{ fontWeight: 900, color: active ? 'white' : color }}>{value}</div>
      <div className="text-[9px]" style={{ fontWeight: 700, color: active ? 'rgba(255,255,255,0.85)' : '#6B7280' }}>{label}</div>
    </button>
  );
}

function NewDispute({ onClose, suppliers, asns, skus }: { onClose: () => void; suppliers: any[]; asns: any[]; skus: any[] }) {
  const [supplierId, setSupplierId] = useState('');
  const [asnId, setAsnId]           = useState('');
  const [sku, setSku]               = useState('');
  const supplier = suppliers.find(s => s.id === supplierId);
  const asn = asns.find(a => a.id === asnId);
  const [open, setOpen] = useState(false);

  const start = () => {
    if (!supplier || !sku) { toast.error('Выберите поставщика и SKU'); return; }
    setOpen(true);
  };

  return (
    <>
      <Sel label="Поставщик" value={supplierId} onChange={setSupplierId} options={suppliers.map(s => ({ value: s.id, label: `${s.name} (${s.id})` }))} />
      <Sel label="ASN / Поставка (опционально)" value={asnId} onChange={setAsnId} options={asns.map(a => ({ value: a.id, label: `${a.id} · ${a.invoiceNumber}` }))} />
      <Sel label="SKU" value={sku} onChange={setSku} options={skus.map(s => ({ value: s.sku, label: `${s.photo} ${s.name} (${s.sku})` }))} />
      <button onClick={start} className="w-full h-10 rounded-xl bg-[#3730A3] text-white mt-2 active-press" style={{ fontWeight: 800 }}>
        Открыть форму спора
      </button>

      {supplier && sku && (
        <SupplierDisputeModal
          open={open}
          onClose={() => { setOpen(false); onClose(); }}
          defaults={{
            supplierId: supplier.id, supplierName: supplier.name,
            asnId: asn?.id, invoiceNumber: asn?.invoiceNumber,
            sku,
          }}
        />
      )}
    </>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] text-[14px]"
        style={{ fontWeight: 600 }}
      >
        <option value="">Выберите…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function UploadDisputeMedia({ disputeId, kind }: { disputeId: string; kind: 'photo' | 'video' }) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    store.uploadDisputeMedia(disputeId, kind, uri);
    toast.success(kind === 'photo' ? 'Фото добавлено' : 'Видео добавлено');
    e.target.value = '';
  };
  const Icon = kind === 'photo' ? Camera : Video;
  const accept = kind === 'photo' ? 'image/*' : 'video/mp4,video/webm';
  return (
    <label className="px-3 h-9 rounded-lg text-white text-[12px] active-press inline-flex items-center gap-1 cursor-pointer"
      style={{ backgroundColor: kind === 'photo' ? '#0EA5E9' : '#7C3AED', fontWeight: 700 }}>
      <Icon className="w-3 h-3" /> {kind === 'photo' ? 'Фото' : 'Видео'}
      <input type="file" accept={accept} onChange={onChange} className="hidden" />
    </label>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#F3F4F6] text-[#374151]" style={{ fontWeight: 700 }}>
      {children}
    </span>
  );
}
