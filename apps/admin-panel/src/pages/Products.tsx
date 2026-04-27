import { Search, Plus, SquarePen as Edit, Trash2, Eye } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  sales: number;
}

const products: Product[] = [
  { id: 1, name: 'iPhone 15 Pro', category: 'Электроника', price: 89990, stock: 45, status: 'in_stock', sales: 234 },
  { id: 2, name: 'Samsung Galaxy S24', category: 'Электроника', price: 74990, stock: 12, status: 'low_stock', sales: 189 },
  { id: 3, name: 'MacBook Pro 14"', category: 'Электроника', price: 159990, stock: 0, status: 'out_of_stock', sales: 156 },
  { id: 4, name: 'AirPods Pro 2', category: 'Аксессуары', price: 22990, stock: 78, status: 'in_stock', sales: 445 },
  { id: 5, name: 'Кожаный рюкзак', category: 'Одежда', price: 12990, stock: 23, status: 'in_stock', sales: 167 },
  { id: 6, name: 'Беспроводная мышь', category: 'Аксессуары', price: 2990, stock: 156, status: 'in_stock', sales: 678 },
  { id: 7, name: 'Механическая клавиатура', category: 'Аксессуары', price: 8990, stock: 8, status: 'low_stock', sales: 234 },
  { id: 8, name: 'Спортивные кроссовки', category: 'Одежда', price: 9990, stock: 34, status: 'in_stock', sales: 289 },
];

export function Products() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: Product['status']) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-700';
      case 'low_stock':
        return 'bg-orange-100 text-orange-700';
      case 'out_of_stock':
        return 'bg-red-100 text-red-700';
    }
  };

  const getStatusText = (status: Product['status']) => {
    switch (status) {
      case 'in_stock':
        return 'В наличии';
      case 'low_stock':
        return 'Мало';
      case 'out_of_stock':
        return 'Нет в наличии';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Продукты</h1>
          <p className="text-gray-500">Управление товарами</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          Доб��вить товар
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск товаров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <div className="w-20 h-20 bg-gray-300 rounded-lg" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(product.status)}`}>
                  {getStatusText(product.status)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-3">{product.category}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-gray-900">₽{product.price.toLocaleString()}</span>
                <span className="text-sm text-gray-500">Остаток: {product.stock}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  <Edit className="w-4 h-4" />
                  Изменить
                </button>
                <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Продано: {product.sales} шт.</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}