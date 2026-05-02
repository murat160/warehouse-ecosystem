import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Plus, Warehouse, Package, TrendingUp, AlertCircle, X } from 'lucide-react';
import { PreciseLocationPicker } from '../../components/location/PreciseLocationPicker';
import {
  emptyLocation, isLocationUsable, assertCanActivate,
  type Location,
} from '../../data/location';
import { useI18n } from '../../i18n';

interface WarehouseData {
  id: string;
  code: string;
  name: string;
  city: string;
  type: 'hub' | 'warehouse' | 'dark_store';
  status: 'active' | 'maintenance';
  capacity: number;
  currentLoad: number;
  inboundToday: number;
  outboundToday: number;
  pickingInProgress: number;
  /** Confirmed coordinates of the warehouse gate / dock entrance. */
  location?: Location;
}

const warehouses: WarehouseData[] = [
  { id: '1', code: 'MSK-WH-01', name: 'Московский хаб', city: 'Москва', type: 'hub', status: 'active', capacity: 10000, currentLoad: 7450, inboundToday: 234, outboundToday: 312, pickingInProgress: 45 },
  { id: '2', code: 'SPB-WH-01', name: 'Петербургский склад', city: 'Санкт-Петербург', type: 'warehouse', status: 'active', capacity: 5000, currentLoad: 3200, inboundToday: 123, outboundToday: 156, pickingInProgress: 23 },
  { id: '3', code: 'MSK-DS-01', name: 'Дарк-стор Центр', city: 'Москва', type: 'dark_store', status: 'active', capacity: 2000, currentLoad: 1890, inboundToday: 89, outboundToday: 134, pickingInProgress: 12 },
];

export function WarehousesList() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', code: '', city: '', type: 'warehouse', capacity: '5000' });
  const [whLocation, setWhLocation] = useState<Location>(emptyLocation());
  const [extraWarehouses, setExtraWarehouses] = useState<WarehouseData[]>([]);

  const allWarehouses = [...extraWarehouses, ...warehouses];

  const filteredWarehouses = allWarehouses.filter(wh =>
    wh.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wh.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Склады и хабы</h1>
          <p className="text-gray-500">Управление складской сетью</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить склад
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по коду или названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredWarehouses.map((wh) => (
          <div key={wh.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link to={`/warehouses/${wh.id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                    {wh.name}
                  </Link>
                  <p className="text-sm text-gray-500">{wh.code} • {wh.city}</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                  Активен
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Загрузка</p>
                  <p className="text-lg font-bold text-gray-900">{wh.currentLoad}/{wh.capacity}</p>
                  <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(wh.currentLoad / wh.capacity) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Приёмка</p>
                  <p className="text-lg font-bold text-green-600">{wh.inboundToday}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Отгрузка</p>
                  <p className="text-lg font-bold text-purple-600">{wh.outboundToday}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-900">Пикинг в процессе:</span>
                <span className="font-semibold text-blue-900">{wh.pickingInProgress} волн</span>
              </div>

              <Link
                to={`/warehouses/${wh.id}`}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Package className="w-4 h-4" />
                Операции
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Add Warehouse Modal — basic info + precise map point in a single
          scrollable form (warehouses don't have a multi-step wizard) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">Добавить склад</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Название *</label>
                <input
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Новосибирский хаб"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Код *</label>
                  <input
                    value={addForm.code}
                    onChange={e => setAddForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="NSK-WH-01"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Город *</label>
                  <input
                    value={addForm.city}
                    onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Новосибирск"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Тип</label>
                  <select
                    value={addForm.type}
                    onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="hub">Хаб</option>
                    <option value="warehouse">Склад</option>
                    <option value="dark_store">Дарк-стор</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Вместимость</label>
                  <input
                    type="number"
                    value={addForm.capacity}
                    onChange={e => setAddForm(f => ({ ...f, capacity: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* New: precise map point — required to activate. */}
              <div className="pt-3 border-t border-gray-100">
                <PreciseLocationPicker
                  value={whLocation}
                  onChange={setWhLocation}
                  mode="warehouse"
                  cityHint={addForm.city}
                  required
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">Отмена</button>
                <button
                  onClick={() => {
                    if (!addForm.name || !addForm.code || !addForm.city) { toast.error('Заполните обязательные поля'); return; }
                    // Activation gate: warehouses can never go straight to
                    // active without a confirmed coordinate. Operators that
                    // need a draft should switch status='maintenance'.
                    const err = assertCanActivate(whLocation, 'warehouse');
                    if (err) {
                      toast.error(t(err as any));
                      return;
                    }
                    const newWh: WarehouseData = {
                      id: `wh-${Date.now()}`,
                      code: addForm.code,
                      name: addForm.name,
                      city: whLocation.city || addForm.city,
                      type: addForm.type as WarehouseData['type'],
                      status: 'active',
                      capacity: Number(addForm.capacity) || 5000,
                      currentLoad: 0,
                      inboundToday: 0,
                      outboundToday: 0,
                      pickingInProgress: 0,
                      location: whLocation,
                    };
                    setExtraWarehouses(prev => [newWh, ...prev]);
                    setShowAddModal(false);
                    setAddForm({ name: '', code: '', city: '', type: 'warehouse', capacity: '5000' });
                    setWhLocation(emptyLocation());
                    toast.success('Склад создан', { description: `${newWh.code} — ${newWh.name}` });
                  }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}