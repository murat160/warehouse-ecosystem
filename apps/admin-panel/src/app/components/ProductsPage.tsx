import { Search, Plus, SquarePen as Edit, Trash2, Package } from 'lucide-react';

const mockProducts = [
  { id: 1, name: 'MacBook Pro 16"', category: 'Электроника', price: 189990, stock: 15, status: 'В наличии' },
  { id: 2, name: 'iPhone 15 Pro', category: 'Электроника', price: 89990, stock: 42, status: 'В наличии' },
  { id: 3, name: 'Футболка базовая', category: 'Одежда', price: 1290, stock: 120, status: 'В наличии' },
  { id: 4, name: 'Кофе арабика 1кг', category: 'Продукты', price: 890, stock: 0, status: 'Нет в наличии' },
  { id: 5, name: 'Книга "Программирование"', category: 'Книги', price: 1590, stock: 8, status: 'В наличии' },
];

export function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState(mockProducts);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl mb-1">Продукты</h2>
          <p className="text-gray-500">Управление каталогом продуктов</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={20} />
          Добавить продукт
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Поиск продуктов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <Package size={64} className="text-white opacity-50" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    product.status === 'В наличии'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {product.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-2xl text-blue-600">₽{product.price.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">В наличии: {product.stock} шт.</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit size={18} className="text-blue-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}