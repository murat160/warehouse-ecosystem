import { useState } from 'react';
import { Search, Download, Shield, User, Package, DollarSign, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  ip: string;
  riskLevel: 'low' | 'medium' | 'high';
  details?: string;
}

const auditEvents: AuditEvent[] = [
  { id: '1', timestamp: '14.02.2026 12:45:23', actor: 'admin@platform.com', actorRole: 'Admin', action: 'ORDER_STATUS_CHANGED', entityType: 'Order', entityId: 'ORD-2024-000456', ip: '192.168.1.100', riskLevel: 'low', details: 'Status: preparing → ready' },
  { id: '2', timestamp: '14.02.2026 12:30:15', actor: 'finance@platform.com', actorRole: 'Finance', action: 'PAYOUT_APPROVED', entityType: 'Payout', entityId: 'PAY-2024-001234', ip: '192.168.1.101', riskLevel: 'high', details: 'Amount: ₽234,500' },
  { id: '3', timestamp: '14.02.2026 11:20:45', actor: 'support@platform.com', actorRole: 'Support', action: 'ORDER_CANCELLED', entityType: 'Order', entityId: 'ORD-2024-000455', ip: '192.168.1.102', riskLevel: 'medium', details: 'Reason: Customer request' },
  { id: '4', timestamp: '14.02.2026 10:15:30', actor: 'admin@platform.com', actorRole: 'Admin', action: 'ROLE_ASSIGNED', entityType: 'User', entityId: 'USR-123', ip: '192.168.1.100', riskLevel: 'high', details: 'Role: RegionalManager, Scope: Moscow' },
  { id: '5', timestamp: '14.02.2026 09:05:12', actor: 'finance@platform.com', actorRole: 'Finance', action: 'COMMISSION_CHANGED', entityType: 'Partner', entityId: 'PRT-456', ip: '192.168.1.101', riskLevel: 'high', details: 'Old: 12%, New: 15%' },
];

const riskColors = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const actionIcons = {
  ORDER_STATUS_CHANGED: Package,
  ORDER_CANCELLED: Package,
  PAYOUT_APPROVED: DollarSign,
  ROLE_ASSIGNED: User,
  COMMISSION_CHANGED: DollarSign,
};

export function AuditLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const filteredEvents = auditEvents.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchSearch = e.actor.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.entityId.toLowerCase().includes(q);
    const matchRisk = riskFilter === 'all' || e.riskLevel === riskFilter;
    return matchSearch && matchRisk;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Аудит-лог</h1>
        <p className="text-gray-500">Неизменяемый журнал всех критических действий</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">Защищённый журнал</p>
            <p className="text-sm text-blue-700">Все записи неизменяемы и хранятся для расследований</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по пользователю, действию, entity ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          >
            <option value="all">Все риски</option>
            <option value="high">Высокий</option>
            <option value="medium">Средний</option>
            <option value="low">Низкий</option>
          </select>
          <button
            onClick={() => toast.success('Лог экспортирован', { description: `${filteredEvents.length} записей в CSV` })}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Download className="w-5 h-5" />
            Экспорт CSV
          </button>
          <button
            onClick={() => toast.success('Данные обновлены')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действие</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Риск</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Детали</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEvents.map((event) => {
              const Icon = actionIcons[event.action as keyof typeof actionIcons] || Package;
              return (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{event.timestamp}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{event.actor}</p>
                      <p className="text-sm text-gray-500">{event.actorRole}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{event.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{event.entityType}</p>
                      <p className="text-xs text-gray-500">{event.entityId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{event.ip}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${riskColors[event.riskLevel]}`}>
                      {event.riskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{event.details}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}