import { useState } from 'react';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

export function InventoryPage() {
  const { inventory } = useStore();
  const [q, setQ] = useState('');

  const filtered = inventory.filter(i => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return i.sku.toLowerCase().includes(needle) || i.name.toLowerCase().includes(needle);
  });

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Остатки" subtitle={`Позиций: ${inventory.length}`} />

      <div className="px-5 -mt-5">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Поиск по SKU или названию"
          className="w-full px-3 py-3 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2EA7E0] focus:outline-none text-[14px] mb-3"
          style={{ fontWeight: 500 }}
        />

        {filtered.length === 0 ? (
          <EmptyState emoji="📦" title="Ничего не найдено" />
        ) : (
          <div className="space-y-2">
            {filtered.map(i => (
              <div key={i.sku} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>{i.name}</div>
                  <div className="text-[11px] text-[#6B7280] font-mono truncate" style={{ fontWeight: 600 }}>
                    {i.sku} · {i.bins.join(', ')}
                  </div>
                </div>
                <div className="text-right pl-3">
                  <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>
                    {i.qty - i.reserved}
                  </div>
                  <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>
                    из {i.qty} (резерв {i.reserved})
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
