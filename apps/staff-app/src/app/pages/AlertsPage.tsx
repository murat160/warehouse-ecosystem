import { useNavigate } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store } from '../hooks/useAppState';
import { ALERT_CFG, type WarehouseAlert } from '../data/mockData';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

export function AlertsPage() {
  const state = useAppState();
  const nav = useNavigate();

  const unread = state.alerts.filter(a => !a.read).length;
  const byPriority = (a: WarehouseAlert, b: WarehouseAlert) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  };

  const handleClick = (alert: WarehouseAlert) => {
    if (!alert.read) store.markAlertRead(alert.id);
    if (alert.actionLink) nav(alert.actionLink);
  };

  const handleMarkAll = () => {
    store.markAllAlertsRead();
    toast.success('Все уведомления прочитаны');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Уведомления" subtitle={`${unread} непрочитанных`} />

      {unread > 0 && (
        <div className="px-5 -mt-3 mb-2">
          <button
            onClick={handleMarkAll}
            className="text-[12px] text-[#2EA7E0] flex items-center gap-1"
            style={{ fontWeight: 700 }}
          >
            <CheckCheck className="w-3 h-3" />
            Отметить все как прочитанные
          </button>
        </div>
      )}

      <div className="px-5 space-y-2">
        {state.alerts.length === 0 ? (
          <EmptyState emoji="🔔" title="Уведомлений нет" subtitle="" />
        ) : (
          [...state.alerts].sort(byPriority).map(alert => {
            const cfg = ALERT_CFG[alert.type];
            return (
              <button
                key={alert.id}
                onClick={() => handleClick(alert)}
                className="w-full bg-white rounded-2xl p-4 flex items-start gap-3 shadow-sm active-press text-left"
                style={{ opacity: alert.read ? 0.7 : 1 }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[22px] flex-shrink-0"
                  style={{ backgroundColor: cfg.bg }}
                >
                  {cfg.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>
                      {alert.title}
                    </span>
                    {!alert.read && (
                      <span className="w-2 h-2 rounded-full bg-[#2EA7E0] flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    {alert.description}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] mt-1" style={{ fontWeight: 500 }}>
                    {new Date(alert.createdAt).toLocaleString('ru')}
                    {alert.actionLabel && (
                      <span className="ml-2 text-[#2EA7E0]" style={{ fontWeight: 700 }}>
                        → {alert.actionLabel}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
