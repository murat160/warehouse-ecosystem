import React from 'react';
import { AlertTriangle, AlertCircle, XCircle, TrendingUp, TrendingDown, Package, ImageIcon } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import {
  SellerDetail, getDemandMetrics, getTopProducts, getSellerTickets,
  formatCurrency, formatNumber
} from '../../data/merchants-mock';
import { ChartWrapper } from '../ui/ChartWrapper';

interface Props {
  sellerId: string;
  seller: SellerDetail;
}

const CANCEL_REASONS = [
  { reason: 'Нет товара', count: 6, pct: 42.9, color: '#ef4444' },
  { reason: 'Клиент передумал', count: 4, pct: 28.6, color: '#f97316' },
  { reason: 'Просрочка SLA', count: 2, pct: 14.3, color: '#eab308' },
  { reason: 'Другое', count: 2, pct: 14.2, color: '#94a3b8' },
];

const ALERTS = [
  { type: 'warning', text: 'Stock-out rate вырос до 8.9% (порог: 5%)', time: '2ч назад' },
  { type: 'info', text: 'Выплата PAY-2026-0212 ожидает подтверждения', time: '5ч назад' },
  { type: 'error', text: 'Тикет TKT-2026-089 — задержка доставки (P2)', time: '6ч назад' },
];

export function SellerOverviewTab({ sellerId, seller }: Props) {
  const metrics = getDemandMetrics(sellerId);
  const topProducts = getTopProducts(sellerId);
  const tickets = getSellerTickets(sellerId);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {ALERTS.length > 0 && (
        <div className="space-y-2">
          {ALERTS.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                alert.type === 'error' ? 'bg-red-50 border-red-200' :
                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              {alert.type === 'error' ? <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /> :
               alert.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" /> :
               <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className={`text-sm ${
                  alert.type === 'error' ? 'text-red-700' :
                  alert.type === 'warning' ? 'text-yellow-700' :
                  'text-blue-700'
                }`}>{alert.text}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{alert.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* GMV Chart */}
        <div className="bg-gray-50 rounded-xl p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 text-sm">GMV по дням (7д)</h4>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="w-3 h-3" /> +12.4%
            </div>
          </div>
          <ChartWrapper height={180}>
            {(w, h) => (
              <AreaChart key={`gmv-area-${w}`} width={w} height={h} data={metrics}>
                <defs>
                  <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis key="xa" dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis key="ya" tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip key="tt" formatter={(v: number) => [`₽${v.toLocaleString()}`, 'GMV']} />
                <Area key="area-rev" type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#gmvGrad)" strokeWidth={2} />
              </AreaChart>
            )}
          </ChartWrapper>
        </div>

        {/* Orders Chart */}
        <div className="bg-gray-50 rounded-xl p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 text-sm">Заказы по дням (7д)</h4>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="w-3 h-3" /> +8.2%
            </div>
          </div>
          <ChartWrapper height={180}>
            {(w, h) => (
              <BarChart key={`orders-bar-${w}`} width={w} height={h} data={metrics}>
                <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis key="xa" dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis key="ya" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip key="tt" />
                <Bar key="bar-orders" dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Заказы" />
                <Bar key="bar-cancels" dataKey="cancels" fill="#ef4444" radius={[4, 4, 0, 0]} name="Отмены" />
              </BarChart>
            )}
          </ChartWrapper>
        </div>
      </div>

      {/* Cancel reasons + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cancel Reasons */}
        <div className="bg-gray-50 rounded-xl p-4 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm mb-3">Отмены по причинам (7д)</h4>
          <div className="flex items-center gap-6">
            <div className="w-28 h-28 shrink-0">
              <PieChart width={112} height={112}>
                <Pie data={CANCEL_REASONS} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2}>
                  {CANCEL_REASONS.map((entry, i) => (
                    <Cell key={`cell-${entry.reason}-${i}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="space-y-2 flex-1">
              {CANCEL_REASONS.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-xs text-gray-700">{r.reason}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-600">{r.count} ({r.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-gray-50 rounded-xl p-4 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm mb-3">Топ товаров по выручке (30д)</h4>
          <div className="space-y-3">
            {topProducts.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-200 border border-gray-300 shrink-0">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category} · {p.orders} заказов</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(p.revenue)}</p>
                  <div className={`flex items-center gap-0.5 justify-end text-xs ${p.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {p.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {p.trend > 0 ? '+' : ''}{p.trend}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Tickets */}
      {tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 text-sm mb-3">Открытые тикеты</h4>
          <div className="space-y-2">
            {tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    t.priority === 'p1' ? 'bg-red-100 text-red-700' :
                    t.priority === 'p2' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{t.priority.toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{t.subject}</p>
                    <p className="text-xs text-gray-500">{t.ticketCode} · {t.category} · {t.assignee}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  t.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                }`}>{t.status === 'open' ? 'Открыт' : 'В работе'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}