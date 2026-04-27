import { MapPin, Package, Bike, Clock, AlertTriangle, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { ChartWrapper } from '../components/ui/ChartWrapper';

const kpiData = [
  { label: 'Активные заказы', value: '2,847', change: '+12%', trend: 'up', icon: Package, color: 'blue',   href: '/orders' },
  { label: 'Просрочки SLA',   value: '23',    change: '-8%',  trend: 'down', icon: AlertTriangle, color: 'red',    href: '/orders' },
  { label: 'ПВЗ онлайн',     value: '156/162',change: '96%',  trend: 'up', icon: MapPin, color: 'green',  href: '/pvz' },
  { label: 'Курьеры в работе',value: '342/450',change: '76%',  trend: 'up', icon: Bike, color: 'purple', href: '/couriers' },
];

const hourlyData = [
  { time: '00:00', orders: 45, deliveries: 38 },
  { time: '04:00', orders: 12, deliveries: 8 },
  { time: '08:00', orders: 234, deliveries: 189 },
  { time: '12:00', orders: 456, deliveries: 423 },
  { time: '16:00', orders: 389, deliveries: 356 },
  { time: '20:00', orders: 298, deliveries: 267 },
  { time: '23:59', orders: 123, deliveries: 98 },
];

const pvzLoadData = [
  { name: 'MSK-001', load: 85, capacity: 100 },
  { name: 'MSK-002', load: 92, capacity: 100 },
  { name: 'MSK-003', load: 67, capacity: 100 },
  { name: 'MSK-004', load: 98, capacity: 100 },
  { name: 'MSK-005', load: 73, capacity: 100 },
  { name: 'SPB-001', load: 88, capacity: 100 },
];

const orderStatusData = [
  { name: 'В обработке', value: 456, color: '#3B82F6' },
  { name: 'На складе', value: 234, color: '#8B5CF6' },
  { name: 'На ПВЗ', value: 678, color: '#10B981' },
  { name: 'У курьера', value: 345, color: '#F59E0B' },
  { name: 'Доставлено', value: 1134, color: '#6B7280' },
];

const urgentActions = [
  { id: 1, type: 'pvz_overload', pvz: 'MSK-002', message: 'Превышена загрузка ПВЗ (98%)', priority: 'high', time: '5 мин назад', href: '/pvz/2' },
  { id: 2, type: 'sla_breach', order: '#ORD-45234', message: 'Просрочка SLA доставки', priority: 'high', time: '12 мин назад', href: '/orders' },
  { id: 3, type: 'courier_stuck', courier: 'Иван П.', message: 'Курьер не движется 30+ мин', priority: 'medium', time: '18 мин назад', href: '/couriers' },
  { id: 4, type: 'return_queue', pvz: 'SPB-001', message: 'Ожидает возврат: 23 посылки', priority: 'medium', time: '45 мин назад', href: '/pvz/4' },
  { id: 5, type: 'cash_discrepancy', pvz: 'MSK-003', message: 'Расхождение кассы смены', priority: 'high', time: '1 ч назад', href: '/pvz/3' },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Операцонная панель</h1>
        <p className="text-gray-500">Мониторинг сети ПВЗ и логистики в реальном времени</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, idx) => (
          <button
            key={idx}
            onClick={() => navigate(kpi.href)}
            className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer active:scale-[0.98] text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${
                kpi.color === 'blue' ? 'bg-blue-50' :
                kpi.color === 'red' ? 'bg-red-50' :
                kpi.color === 'green' ? 'bg-green-50' :
                'bg-purple-50'
              }`}>
                <kpi.icon className={`w-6 h-6 ${
                  kpi.color === 'blue' ? 'text-blue-600' :
                  kpi.color === 'red' ? 'text-red-600' :
                  kpi.color === 'green' ? 'text-green-600' :
                  'text-purple-600'
                }`} />
              </div>
              <span className={`text-sm font-medium ${
                kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {kpi.change}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
          </button>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Activity */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Активность по часам (сегодня)</h3>
          <ChartWrapper height={300}>
            {(w, h) => (
              <LineChart width={w} height={h} data={hourlyData}>
                <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis key="xa" dataKey="time" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <YAxis key="ya" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip key="tt"
                  contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
                <Legend key="lg" />
                <Line key="ln-orders" type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} name="Заказы" />
                <Line key="ln-deliveries" type="monotone" dataKey="deliveries" stroke="#10B981" strokeWidth={2} name="Доставки" />
              </LineChart>
            )}
          </ChartWrapper>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Распределение статусов заказов</h3>
          <ChartWrapper height={300}>
            {(w, h) => (
              <PieChart width={w} height={h}>
                <Pie
                  key="pie-status"
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip key="tt-pie" />
              </PieChart>
            )}
          </ChartWrapper>
        </div>
      </div>

      {/* PVZ Load and Urgent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PVZ Load */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Загрузка ПВЗ (топ-6)</h3>
            <Link to="/pvz" className="text-sm text-blue-600 hover:text-blue-700">
              Все ПВЗ →
            </Link>
          </div>
          <ChartWrapper height={300}>
            {(w, h) => (
              <BarChart width={w} height={h} data={pvzLoadData}>
                <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis key="xa" dataKey="name" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <YAxis key="ya" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip key="tt"
                  contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
                <Bar key="bar-load" dataKey="load" fill="#3B82F6" name="Загрузка" />
                <Bar key="bar-capacity" dataKey="capacity" fill="#E5E7EB" name="Вместимость" />
              </BarChart>
            )}
          </ChartWrapper>
        </div>

        {/* Urgent Actions Queue */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Срочные задачи</h3>
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              {urgentActions.length}
            </span>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {urgentActions.map((action) => (
              <div
                key={action.id}
                onClick={() => navigate(action.href)}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-200 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                    action.priority === 'high' ? 'text-red-500' : 'text-orange-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{action.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{action.time}</span>
                      {action.pvz && (
                        <span className="text-xs text-blue-600">ПВЗ: {action.pvz}</span>
                      )}
                      {action.order && (
                        <span className="text-xs text-blue-600">{action.order}</span>
                      )}
                      {action.courier && (
                        <span className="text-xs text-blue-600">{action.courier}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/logistics')}
          className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 cursor-pointer hover:shadow-md hover:border-green-300 transition-all active:scale-[0.98] text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="text-sm font-medium text-green-900">On-Time %</span>
          </div>
          <p className="text-3xl font-bold text-green-900">94.2%</p>
          <p className="text-sm text-green-700 mt-1">Доставки в SLA (за 24ч)</p>
        </button>

        <button
          onClick={() => navigate('/pvz')}
          className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all active:scale-[0.98] text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Avg Dwell Time</span>
          </div>
          <p className="text-3xl font-bold text-blue-900">8.4 ч</p>
          <p className="text-sm text-blue-700 mt-1">Среднее время на ПВЗ</p>
        </button>

        <button
          onClick={() => navigate('/orders')}
          className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 cursor-pointer hover:shadow-md hover:border-orange-300 transition-all active:scale-[0.98] text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-6 h-6 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Return Rate</span>
          </div>
          <p className="text-3xl font-bold text-orange-900">2.1%</p>
          <p className="text-sm text-orange-700 mt-1">Возвраты (не забрали)</p>
        </button>
      </div>
    </div>
  );
}