import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ORDER_STATUS, ORDER_STATUS_LABELS } from '../domain/orderStatus';

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { orders, tasks, workers, returns, problems, audit, inventory, skus } = useStore();

  const byStatus = ORDER_STATUS.map(s => ({ status: s, count: orders.filter(o => o.status === s).length }));
  const onShift = workers.filter(w => w.shiftStatus === 'on_shift').length;

  const pickedToday = orders.filter(o => o.status === 'picked' || o.status === 'sorting' || o.status === 'packing_in_progress' || o.status === 'packed' || o.status === 'ready_for_pickup' || o.status === 'handed_to_courier').length;
  const handed = orders.filter(o => o.status === 'handed_to_courier').length;
  const damagedSku = inventory.reduce((s, i) => s + i.damaged, 0);

  const exportCSV = () => {
    const head = 'Order;Customer;City;Status;Priority;Zone;SLA\n';
    const rows = orders.map(o =>
      `${o.code};${o.customerName};${o.city};${o.status};${o.priority};${o.zone};${o.slaDeadline}`
    ).join('\n');
    downloadFile(`warehouse-orders-${Date.now()}.csv`, head + rows, 'text/csv');
    toast.success('CSV экспортирован');
  };

  const exportXLSX = () => {
    // Mock: TSV сохраняется как .xlsx — backend заменит на реальный writer
    const head = 'Order\tCustomer\tStatus\tPriority\n';
    const rows = orders.map(o => `${o.code}\t${o.customerName}\t${o.status}\t${o.priority}`).join('\n');
    downloadFile(`warehouse-orders-${Date.now()}.xlsx`, head + rows, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    toast.success('XLSX (mock) экспортирован');
  };

  const exportPDF = () => {
    const txt = `Warehouse Daily Report\n==============\nДата: ${new Date().toLocaleDateString('ru')}\n\nЗаказов: ${orders.length}\nПередано курьеру: ${handed}\nНа смене: ${onShift}\nПроблем: ${problems.length}\n`;
    downloadFile(`warehouse-daily-${Date.now()}.pdf`, txt, 'application/pdf');
    toast.success('PDF (mock) экспортирован');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Отчёты" subtitle="Сводка и экспорт" />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Дневной отчёт склада</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Cell label="Заказов"           value={orders.length} />
            <Cell label="Собрано"           value={pickedToday} />
            <Cell label="Передано курьерам" value={handed} />
            <Cell label="Возвратов"         value={returns.length} />
            <Cell label="Проблем"           value={problems.length} />
            <Cell label="На смене"          value={onShift} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ExportBtn icon={<FileText className="w-3 h-3" />} onClick={exportCSV} label="CSV" />
            <ExportBtn icon={<FileSpreadsheet className="w-3 h-3" />} onClick={exportXLSX} label="XLSX" />
            <ExportBtn icon={<Printer className="w-3 h-3" />} onClick={exportPDF} label="PDF" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Заказы по статусам</h3>
          <div className="space-y-1">
            {byStatus.map(b => (
              <div key={b.status} className="flex items-center justify-between text-[12px]">
                <span className="text-[#374151]" style={{ fontWeight: 600 }}>{ORDER_STATUS_LABELS[b.status]}</span>
                <span className="text-[#1F2430]" style={{ fontWeight: 800 }}>{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Задачи и SLA</h3>
          <div className="grid grid-cols-2 gap-2">
            <Cell label="Задач активных" value={tasks.filter(t => t.status !== 'completed').length} />
            <Cell label="Готовых задач"  value={tasks.filter(t => t.status === 'completed').length} />
            <Cell label="Брак (всего)"   value={damagedSku} />
            <Cell label="SKU"            value={skus.length} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Audit log (последние)</h3>
          {audit.length === 0 ? (
            <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>Действий пока нет</div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {audit.slice(0, 30).map(a => (
                <div key={a.id} className="text-[11px] py-1 border-b border-[#F3F4F6] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[#1F2430]" style={{ fontWeight: 800 }}>{a.action}</span>
                    <span className="text-[#9CA3AF] truncate" style={{ fontWeight: 500 }}>{a.workerName}</span>
                    <span className="text-[#9CA3AF] ml-auto" style={{ fontWeight: 500 }}>
                      {new Date(a.timestamp).toLocaleTimeString('ru')}
                    </span>
                  </div>
                  <div className="text-[#6B7280] truncate" style={{ fontWeight: 500 }}>{a.detail}</div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              const head = 'Time;Action;Worker;Role;Detail\n';
              const rows = audit.map(a => `${a.timestamp};${a.action};${a.workerName};${a.role};${a.detail.replace(/;/g, ',')}`).join('\n');
              downloadFile(`audit-${Date.now()}.csv`, head + rows, 'text/csv');
              toast.success('Audit CSV экспортирован');
            }}
            className="w-full h-9 rounded-lg bg-[#1F2430] text-white text-[12px] mt-3 active-press inline-flex items-center justify-center gap-1" style={{ fontWeight: 700 }}
          >
            <Download className="w-3 h-3" /> Экспорт audit
          </button>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-3">
      <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>{value}</div>
      <div className="text-[11px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ExportBtn({ icon, onClick, label }: { icon: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press inline-flex items-center justify-center gap-1"
      style={{ fontWeight: 700 }}
    >
      {icon} {label}
    </button>
  );
}
