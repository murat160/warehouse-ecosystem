import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartWrapper } from './ui/ChartWrapper';

const statsCards = [
  { title: 'Всего пользователей', value: '2,543', change: '+12%', icon: Users, color: 'bg-blue-500' },
  { title: 'Заказы', value: '1,234', change: '+8%', icon: ShoppingCart, color: 'bg-green-500' },
  { title: 'Доход', value: '₽543,210', change: '+23%', icon: DollarSign, color: 'bg-yellow-500' },
  { title: 'Рост', value: '18.2%', change: '+4%', icon: TrendingUp, color: 'bg-purple-500' },
];

const salesData = [
  { month: 'Янв', sales: 4000, orders: 240 },
  { month: 'Фев', sales: 3000, orders: 220 },
  { month: 'Мар', sales: 5000, orders: 290 },
  { month: 'Апр', sales: 4500, orders: 260 },
  { month: 'Май', sales: 6000, orders: 310 },
  { month: 'Июн', sales: 5500, orders: 280 },
];

const categoryData = [
  { name: 'Электроника', value: 400 },
  { name: 'Одежда', value: 300 },
  { name: 'Продукты', value: 200 },
  { name: 'Книги', value: 100 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-1">Дашборд</h2>
        <p className="text-gray-500">Обзор ключевых метрик</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="text-white" size={24} />
                </div>
                <span className="text-green-600 text-sm">{stat.change}</span>
              </div>
              <h3 className="text-gray-500 text-sm mb-1">{stat.title}</h3>
              <p className="text-2xl">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm min-w-0">
          <h3 className="text-lg mb-4">Продажи и заказы</h3>
          <ChartWrapper height={300}>
            {(w, h) => (
              <LineChart key={`sales-line-${w}`} width={w} height={h} data={salesData}>
                <CartesianGrid key="cg" strokeDasharray="3 3" />
                <XAxis key="xa" dataKey="month" />
                <YAxis key="ya" />
                <Tooltip key="tt" />
                <Legend key="lg" />
                <Line key="ln-sales" type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
                <Line key="ln-orders" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            )}
          </ChartWrapper>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-lg p-6 shadow-sm min-w-0">
          <h3 className="text-lg mb-4">Распределение по категориям</h3>
          <ChartWrapper height={300}>
            {(w, h) => (
              <PieChart key={`cat-pie-${w}`} width={w} height={h}>
                <Pie
                  key="pie-cat"
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip key="tt-pie" />
              </PieChart>
            )}
          </ChartWrapper>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg mb-4">Последняя активность</h3>
        <div className="space-y-4">
          {[
            { user: 'Иван Петров', action: 'создал новый заказ', time: '5 минут назад' },
            { user: 'Мария Смирнова', action: 'обновила профиль', time: '15 минут назад' },
            { user: 'Алексей Козлов', action: 'добавил продукт', time: '1 час назад' },
            { user: 'Ольга Новикова', action: 'оставила отзыв', time: '2 часа назад' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <Users size={20} className="text-gray-600" />
                </div>
                <div>
                  <p><span>{activity.user}</span> {activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}