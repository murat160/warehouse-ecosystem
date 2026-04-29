import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Undo2, PackageX, FileWarning } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { EvidenceViewer, type Evidence } from '../components/EvidenceViewer';
import {
  PROBLEM_TYPE_LABELS, DAMAGE_TYPE_LABELS, DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS,
} from '../domain/types';

type ClaimKind = 'return' | 'problem' | 'damage' | 'dispute';

interface ClaimRow {
  kind: ClaimKind;
  id: string;
  title: string;
  subtitle: string;
  status: string;
  statusColor: { bg: string; fg: string };
  orderId?: string;
  invoice?: string;
  sku?: string;
  evidence: Evidence[];
  createdAt: string;
  ownerName: string;
}

const KIND_LABELS: Record<ClaimKind, string> = {
  return: 'Возврат', problem: 'Проблема', damage: 'Повреждение', dispute: 'Спор',
};

const KIND_COLORS: Record<ClaimKind, { bg: string; fg: string; icon: any }> = {
  return:  { bg: '#FECACA', fg: '#991B1B', icon: Undo2 },
  problem: { bg: '#FEF3C7', fg: '#92400E', icon: AlertTriangle },
  damage:  { bg: '#FED7AA', fg: '#9A3412', icon: PackageX },
  dispute: { bg: '#E0E7FF', fg: '#3730A3', icon: FileWarning },
};

export function ClaimsPage() {
  const { returns, problems, damageReports, supplierDisputes, skus, workers, asns } = useStore();
  const nav = useNavigate();
  const [filter, setFilter] = useState<ClaimKind | 'ALL'>('ALL');

  const rows: ClaimRow[] = useMemo(() => {
    const out: ClaimRow[] = [];

    for (const r of returns) {
      const sku = r.items[0]?.sku;
      const evidence: Evidence[] = [
        ...(r.photosBefore ?? []).map(src => ({ kind: 'image' as const, src, source: 'return' as const, title: 'Фото до', refId: r.id })),
        ...(r.photosDamage ?? []).map(src => ({ kind: 'image' as const, src, source: 'return' as const, title: 'Повреждение', refId: r.id })),
        ...(r.photosAfter  ?? []).map(src => ({ kind: 'image' as const, src, source: 'return' as const, title: 'Фото после', refId: r.id })),
        ...(r.videoFromCustomer   ? [{ kind: 'video' as const, src: r.videoFromCustomer,   source: 'customer'  as const, title: 'Видео клиента',  refId: r.id }] : []),
        ...(r.videoFromInspection ? [{ kind: 'video' as const, src: r.videoFromInspection, source: 'warehouse' as const, title: 'Видео склада',  refId: r.id }] : []),
      ];
      out.push({
        kind: 'return', id: r.id,
        title: `${r.id} · ${r.customerName}`,
        subtitle: r.reason,
        status: r.status,
        statusColor: KIND_COLORS.return,
        orderId: r.orderId, sku,
        evidence,
        createdAt: r.receivedAt,
        ownerName: r.customerName,
      });
    }

    for (const p of problems) {
      const evidence: Evidence[] = [
        ...(p.photos ?? []).map(src => ({ kind: 'image' as const, src, source: 'warehouse' as const, title: 'Фото проблемы', refId: p.id })),
        ...(p.videos ?? []).map(src => ({ kind: 'video' as const, src, source: 'warehouse' as const, title: 'Видео проблемы', refId: p.id })),
      ];
      const reporter = workers.find(w => w.id === p.reportedBy);
      out.push({
        kind: 'problem', id: p.id,
        title: `${p.id} · ${PROBLEM_TYPE_LABELS[p.type]}`,
        subtitle: p.description,
        status: p.status,
        statusColor: KIND_COLORS.problem,
        orderId: p.orderId, sku: p.sku,
        evidence,
        createdAt: p.createdAt,
        ownerName: reporter?.name ?? p.reportedBy,
      });
    }

    for (const d of damageReports) {
      const evidence: Evidence[] = [
        ...d.photos.map(src => ({ kind: 'image' as const, src, source: 'receiving' as const, title: 'Фото повреждения', refId: d.id })),
        ...d.videos.map(src => ({ kind: 'video' as const, src, source: 'receiving' as const, title: 'Видео повреждения', refId: d.id })),
      ];
      const reporter = workers.find(w => w.id === d.reportedBy);
      out.push({
        kind: 'damage', id: d.id,
        title: `${d.id} · ${DAMAGE_TYPE_LABELS[d.damageType]} ×${d.damagedQty}`,
        subtitle: d.description,
        status: d.status,
        statusColor: KIND_COLORS.damage,
        invoice: d.invoiceNumber, sku: d.sku,
        evidence,
        createdAt: d.createdAt,
        ownerName: reporter?.name ?? d.reportedBy,
      });
    }

    for (const dsp of supplierDisputes) {
      const evidence: Evidence[] = [
        ...dsp.warehousePhotos.map(src => ({ kind: 'image' as const, src, source: 'warehouse' as const, title: 'Фото склада',   refId: dsp.id })),
        ...dsp.warehouseVideos.map(src => ({ kind: 'video' as const, src, source: 'warehouse' as const, title: 'Видео склада', refId: dsp.id })),
      ];
      out.push({
        kind: 'dispute', id: dsp.id,
        title: `${dsp.id} · ${DISPUTE_REASON_LABELS[dsp.reason]}`,
        subtitle: dsp.description,
        status: DISPUTE_STATUS_LABELS[dsp.status],
        statusColor: KIND_COLORS.dispute,
        invoice: dsp.invoiceNumber, sku: dsp.sku,
        evidence,
        createdAt: dsp.createdAt,
        ownerName: dsp.supplierName,
      });
    }

    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [returns, problems, damageReports, supplierDisputes, workers, asns]);

  const filtered = filter === 'ALL' ? rows : rows.filter(r => r.kind === filter);

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Жалобы / Доказательства" subtitle={`Всего: ${rows.length}`} />

      <div className="px-5 -mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          <Pill active={filter === 'ALL'} onClick={() => setFilter('ALL')}>Все ({rows.length})</Pill>
          {(['return','problem','damage','dispute'] as ClaimKind[]).map(k => {
            const count = rows.filter(r => r.kind === k).length;
            return (
              <Pill key={k} active={filter === k} onClick={() => setFilter(k)} color={KIND_COLORS[k]}>
                {KIND_LABELS[k]} ({count})
              </Pill>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState emoji="✅" title="Жалоб нет" subtitle="Возвраты, проблемы, повреждения и споры с поставщиками появятся здесь." />
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const Icon = KIND_COLORS[r.kind].icon;
              const sku = r.sku ? skus.find(s => s.sku === r.sku) : null;
              return (
                <div key={`${r.kind}-${r.id}`} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: r.statusColor.bg }}>
                        <Icon className="w-4 h-4" style={{ color: r.statusColor.fg }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{r.title}</div>
                        <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 600 }}>
                          {KIND_LABELS[r.kind]} · {r.ownerName}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: r.statusColor.bg, color: r.statusColor.fg, fontWeight: 800 }}>
                      {r.status}
                    </span>
                  </div>

                  {sku && (
                    <div className="flex items-center gap-2 mb-2 text-[12px] text-[#1F2430]" style={{ fontWeight: 600 }}>
                      <span className="text-[20px]">{sku.photo}</span>
                      <span className="truncate">{sku.name}</span>
                      <span className="text-[#6B7280] font-mono ml-auto">{sku.sku}</span>
                    </div>
                  )}

                  <div className="text-[12px] text-[#374151] mb-2" style={{ fontWeight: 500 }}>{r.subtitle}</div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {r.orderId && <Tag>заказ {r.orderId}</Tag>}
                    {r.invoice && <Tag>invoice {r.invoice}</Tag>}
                    <Tag>{new Date(r.createdAt).toLocaleString('ru')}</Tag>
                    {r.evidence.length > 0 && <Tag tone="info">{r.evidence.length} доказательств</Tag>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {r.kind === 'return'  && <button onClick={() => nav('/returns')}            className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Открыть возврат</button>}
                    {r.kind === 'problem' && <button onClick={() => nav('/problems')}           className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Открыть проблему</button>}
                    {r.kind === 'damage'  && <button onClick={() => nav('/inbound')}            className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Открыть приёмку</button>}
                    {r.kind === 'dispute' && <button onClick={() => nav('/supplier-disputes')}  className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Открыть спор</button>}
                  </div>

                  {r.evidence.length > 0 && (
                    <div className="mt-3">
                      <EvidenceViewer items={r.evidence} title="Доказательства" withFilters={r.evidence.length > 3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
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

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'info' }) {
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded font-mono"
      style={{
        backgroundColor: tone === 'info' ? '#E0F2FE' : '#F3F4F6',
        color: tone === 'info' ? '#0369A1' : '#374151',
        fontWeight: 700,
      }}
    >{children}</span>
  );
}
