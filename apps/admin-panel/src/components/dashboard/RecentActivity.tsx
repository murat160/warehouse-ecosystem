import { ShoppingCart, UserPlus, Package, AlertCircle } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: 'order',
    message: 'Новый заказ #3421',
    time: '2 мин назад',
    icon: ShoppingCart,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    id: 2,
    type: 'user',
    message: 'Новый пользователь',
    time: '15 мин назад',
    icon: UserPlus,
    color: 'text-green-600 bg-green-50',
  },
  {
    id: 3,
    type: 'product',
    message: 'Товар добавлен',
    time: '1 ч назад',
    icon: Package,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    id: 4,
    type: 'alert',
    message: 'Низкий остаток',
    time: '2 ч назад',
    icon: AlertCircle,
    color: 'text-orange-600 bg-orange-50',
  },
  {
    id: 5,
    type: 'order',
    message: 'Заказ #3420 выполнен',
    time: '3 ч назад',
    icon: ShoppingCart,
    color: 'text-blue-600 bg-blue-50',
  },
];

export function RecentActivity() {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Последние события</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${activity.color}`}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{activity.message}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
