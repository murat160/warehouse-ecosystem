import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { copyToClipboard } from '../../utils/clipboard';
import {
  Search, Plus, Phone, MessageSquare, MapPin, Clock, Package,
  Pause, Play, AlertCircle, Download, X, Shield, Mail, Check,
  Copy, Link2, Send, ChevronRight, ScanLine, Star, User, Globe,
  UserCheck, Unlock, LayoutGrid, ChevronDown,
} from 'lucide-react';

type PVZStatus = 'active' | 'paused' | 'closed';

interface PVZ {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  status: PVZStatus;
  capacity: number;
  currentLoad: number;
  overdueItems: number;
  workingHours: string;
  phone: string;
  type: 'owned' | 'franchise' | 'partner';
  quality: number;
  operator?: string;
}

const pvzData: PVZ[] = [
  { id: '1', code: 'MSK-001', name: 'ПВЗ Тверская', city: 'Москва', address: 'ул. Тверская, 12', status: 'active', capacity: 120, currentLoad: 98, overdueItems: 3, workingHours: '09:00-21:00', phone: '+7 (495) 123-45-67', type: 'owned', quality: 95, operator: 'Иванов И.П.' },
  { id: '2', code: 'MSK-002', name: 'ПВЗ Арбат', city: 'Москва', address: 'Арбат, 24', status: 'active', capacity: 100, currentLoad: 92, overdueItems: 0, workingHours: '10:00-22:00', phone: '+7 (495) 123-45-68', type: 'franchise', quality: 98, operator: 'Смирнова Е.А.' },
  { id: '3', code: 'MSK-003', name: 'ПВЗ Лубянка', city: 'Москва', address: 'пл. Лубянка, 5', status: 'paused', capacity: 80, currentLoad: 67, overdueItems: 1, workingHours: '08:00-20:00', phone: '+7 (495) 123-45-69', type: 'partner', quality: 92 },
  { id: '4', code: 'SPB-001', name: 'ПВЗ Невский', city: 'Санкт-Петербург', address: 'Невский пр., 45', status: 'active', capacity: 150, currentLoad: 132, overdueItems: 7, workingHours: '09:00-21:00', phone: '+7 (812) 234-56-78', type: 'owned', quality: 89, operator: 'Козлов Д.М.' },
  { id: '5', code: 'SPB-002', name: 'ПВЗ Васильевский', city: 'Санкт-Петербург', address: 'В.О., 7-я линия, 12', status: 'active', capacity: 90, currentLoad: 73, overdueItems: 2, workingHours: '10:00-20:00', phone: '+7 (812) 234-56-79', type: 'franchise', quality: 96, operator: 'Петрова А.В.' },
  { id: '6', code: 'EKB-001', name: 'ПВЗ Ленина', city: 'Екатеринбург', address: 'пр. Ленина, 34', status: 'active', capacity: 100, currentLoad: 54, overdueItems: 0, workingHours: '09:00-21:00', phone: '+7 (343) 345-67-89', type: 'partner', quality: 94 },
];

const TYPE_LABELS = { owned: 'Собственный', franchise: 'Франчайзи', partner: 'Партнёр' };
const TYPE_COLORS = { owned: 'bg-blue-100 text-blue-700', franchise: 'bg-purple-100 text-purple-700', partner: 'bg-gray-100 text-gray-700' };

export function PVZList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PVZStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create PVZ wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    name: '', code: '', city: '', address: '', phone: '', workingHours: '09:00-21:00',
    capacity: '100', type: 'owned', operatorEmail: '', operatorRole: 'PVZOperator',
  });
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [pvzList, setPvzList] = useState<PVZ[]>(pvzData);

  const filteredPVZ = pvzList.filter(pvz => {
    const q = searchQuery.toLowerCase();
    const matchSearch = pvz.code.toLowerCase().includes(q) || pvz.name.toLowerCase().includes(q) || pvz.city.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || pvz.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusColor = (s: PVZStatus) => ({ active: 'bg-green-100 text-green-700', paused: 'bg-orange-100 text-orange-700', closed: 'bg-red-100 text-red-700' }[s]);
  const getStatusText = (s: PVZStatus) => ({ active: 'Активен', paused: 'Пауза', closed: 'Закрыт' }[s]);
  const getLoadColor = (load: number, cap: number) => {
    const p = (load / cap) * 100;
    return p >= 95 ? 'text-red-600' : p >= 85 ? 'text-orange-600' : 'text-green-600';
  };
  const getBarColor = (load: number, cap: number) => {
    const p = (load / cap) * 100;
    return p >= 95 ? 'bg-red-500' : p >= 85 ? 'bg-orange-500' : 'bg-green-500';
  };

  const handleCreatePvz = () => {
    const token = Math.random().toString(36).slice(2, 10).toUpperCase();
    const link = `https://platform.pvz.ru/invite/${form.code || 'NEW-001'}?token=${token}&role=${form.operatorRole}&pvz=${encodeURIComponent(form.name)}`;
    setInviteLink(link);
    // Add to list (demo)
    setPvzList(prev => [...prev, {
      id: String(Date.now()),
      code: form.code || `NEW-${Math.floor(Math.random() * 999)}`,
      name: form.name || 'Новый ПВЗ',
      city: form.city || 'Москва',
      address: form.address || '—',
      status: 'paused',
      capacity: Number(form.capacity) || 100,
      currentLoad: 0,
      overdueItems: 0,
      workingHours: form.workingHours,
      phone: form.phone,
      type: form.type as any,
      quality: 100,
    }]);
    setStep(3);
  };

  const handleCopyLink = () => {
    copyToClipboard(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setStep(1);
    setForm({ name: '', code: '', city: '', address: '', phone: '', workingHours: '09:00-21:00', capacity: '100', type: 'owned', operatorEmail: '', operatorRole: 'PVZOperator' });
    setInviteLink('');
    setLinkCopied(false);
  };

  const [pendingActivations, setPendingActivations] = useState<{pvzId: string; pvzCode: string; pvzName: string; email: string; registeredAt: string}[]>([
    { pvzId: '3', pvzCode: 'MSK-003', pvzName: 'ПВЗ Лубянка', email: 'kozlov@pvz.ru', registeredAt: new Date(Date.now() - 7200000).toISOString() },
  ]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Пункты выдачи заказов</h1>
          <p className="text-gray-500">Управление сетью · {pvzList.filter(p => p.status === 'active').length} активных из {pvzList.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/pvz/1"
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-sm">
            <ScanLine className="w-5 h-5" />
            Сканировать
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Создать ПВЗ
          </button>
        </div>
      </div>

      {/* ── Pending activations banner ── */}
      {pendingActivations.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-900">Ожидают активации — {pendingActivations.length} оператор(а)</p>
              <p className="text-xs text-amber-700">Операторы зарегистрировались по приглашению и ждут вашего подтверждения</p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingActivations.map(pa => (
              <div key={pa.pvzId} className="flex items-center gap-3 p-3 bg-white/70 rounded-xl border border-amber-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{pa.pvzName}</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{pa.pvzCode}</span>
                  </div>
                  <p className="text-xs text-amber-700">{pa.email} · зарегистрировался {new Date(pa.registeredAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/pvz/${pa.pvzId}`}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />Просмотреть
                  </Link>
                  <button
                    onClick={() => {
                      setPendingActivations(prev => prev.filter(p => p.pvzId !== pa.pvzId));
                    }}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Unlock className="w-3.5 h-3.5" />Активировать
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Поиск по коду, названию, городу..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="all">Все статусы</option>
          <option value="active">Активен</option>
          <option value="paused">Пауза</option>
          <option value="closed">Закрыт</option>
        </select>
        <button onClick={() => {
            import('../../utils/downloads').then(({ exportToCsv }) => {
              import('sonner').then(({ toast }) => {
                if (filteredPVZ.length === 0) { toast.info('Нет ПВЗ для экспорта'); return; }
                exportToCsv(filteredPVZ as any[], [
                  { key: 'code',        label: 'Код' },
                  { key: 'name',        label: 'Название' },
                  { key: 'city',        label: 'Город' },
                  { key: 'address',     label: 'Адрес' },
                  { key: 'status',      label: 'Статус' },
                  { key: 'capacity',    label: 'Вместимость' },
                  { key: 'currentLoad', label: 'Загрузка' },
                ], 'pvz');
                toast.success(`Скачан CSV: ${filteredPVZ.length} ПВЗ`);
              });
            });
          }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors">
          <Download className="w-4 h-4" />Экспорт
        </button>
      </div>

      {/* PVZ Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPVZ.map(pvz => (
          <div key={pvz.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link to={`/pvz/${pvz.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                      {pvz.name}
                    </Link>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pvz.status)}`}>
                      {getStatusText(pvz.status)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[pvz.type]}`}>
                      {TYPE_LABELS[pvz.type]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-mono">{pvz.code}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <a href={`tel:${pvz.phone}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Phone className="w-4 h-4" />
                  </a>
                  <Link to={`/pvz/${pvz.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <MessageSquare className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  {pvz.city}, {pvz.address}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  {pvz.workingHours}
                </div>
                {pvz.operator && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    {pvz.operator}
                    <span className="flex items-center gap-0.5 text-xs text-green-600"><Shield className="w-3 h-3" />Доступ открыт</span>
                  </div>
                )}
                {!pvz.operator && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span>Оператор не назначен</span>
                    <Link to={`/pvz/${pvz.id}`} className="underline text-blue-600 hover:text-blue-700">Пригласить →</Link>
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Загрузка</p>
                  <p className={`font-bold ${getLoadColor(pvz.currentLoad, pvz.capacity)}`}>
                    {pvz.currentLoad}/{pvz.capacity}
                  </p>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${getBarColor(pvz.currentLoad, pvz.capacity)}`}
                      style={{ width: `${Math.min((pvz.currentLoad / pvz.capacity) * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Просрочки</p>
                  <p className={`font-bold ${pvz.overdueItems > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                    {pvz.overdueItems}
                  </p>
                  {pvz.overdueItems > 0 && <p className="text-xs text-orange-500 mt-0.5">нужен возврат</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Качество</p>
                  <p className={`font-bold ${pvz.quality >= 95 ? 'text-green-600' : pvz.quality >= 90 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {pvz.quality}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link to={`/pvz/${pvz.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
                  <LayoutGrid className="w-4 h-4" />Открыть ПВЗ
                </Link>
                <Link to={`/pvz/${pvz.id}`}
                  className="px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors text-sm flex items-center gap-1">
                  <ScanLine className="w-4 h-4" />
                </Link>
                {pvz.status === 'active'
                  ? <button onClick={() => { import('sonner').then(m => m.toast.success(`ПВЗ ${pvz.code} приостановлен`)); }} title="Приостановить" className="px-3 py-2 border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"><Pause className="w-4 h-4" /></button>
                  : <button onClick={() => { import('sonner').then(m => m.toast.success(`ПВЗ ${pvz.code} активирован`)); }} title="Активировать" className="px-3 py-2 border border-green-200 text-green-600 hover:bg-green-50 rounded-xl transition-colors"><Play className="w-4 h-4" /></button>
                }
              </div>

              {pvz.currentLoad / pvz.capacity >= 0.95 && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">Критическая загрузка! Рекомендуется пауза приёма.</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ════════════ CREATE PVZ MODAL ════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Создание нового ПВЗ</h2>
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        step > s ? 'bg-green-500 text-white' : step === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {step > s ? <Check className="w-3 h-3" /> : s}
                      </div>
                      <span className={`text-xs ${step === s ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                        {s === 1 ? 'Данные ПВЗ' : s === 2 ? 'Оператор' : 'Готово'}
                      </span>
                      {s < 3 && <ChevronRight className="w-3 h-3 text-gray-300 ml-1" />}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* ── Step 1: PVZ Info ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Заполните основные данные нового пункта выдачи</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Название ПВЗ *</label>
                      <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                        placeholder="ПВЗ Новослободская"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Код ПВЗ *</label>
                      <input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))}
                        placeholder="MSK-007"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Тип</label>
                      <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                        <option value="owned">Собственный</option>
                        <option value="franchise">Франчайзи</option>
                        <option value="partner">Партнёр</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Город *</label>
                      <input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}
                        placeholder="Москва"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Телефон</label>
                      <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                        placeholder="+7 (495) 000-00-00"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Адрес *</label>
                      <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))}
                        placeholder="ул. Новослободская, 45"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Часы работы</label>
                      <input value={form.workingHours} onChange={e => setForm(f => ({...f, workingHours: e.target.value}))}
                        placeholder="09:00-21:00"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Вместимость (ячеек)</label>
                      <input type="number" value={form.capacity} onChange={e => setForm(f => ({...f, capacity: e.target.value}))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} disabled={!form.name || !form.code || !form.city || !form.address}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                    Далее: Назначить оператора <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Step 2: Operator invite ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Пригласите сотрудника, который будет управлять ПВЗ <span className="font-semibold text-gray-700">{form.code} — {form.name}</span>.
                    Он получит email с персональной ссылкой для регистрации.
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-blue-800 mb-1.5 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />Email сотрудника *
                      </label>
                      <input type="email" value={form.operatorEmail} onChange={e => setForm(f => ({...f, operatorEmail: e.target.value}))}
                        placeholder="operator@example.com"
                        className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-blue-800 mb-1.5 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />Роль
                      </label>
                      <select value={form.operatorRole} onChange={e => setForm(f => ({...f, operatorRole: e.target.value}))}
                        className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                        <option value="PVZOperator">Оператор ПВЗ</option>
                        <option value="PVZSenior">Старший оператор</option>
                        <option value="PVZManager">Управляющий</option>
                        <option value="Partner">Партнёр-франчайзи</option>
                      </select>
                    </div>
                  </div>

                  {/* What happens */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Что происходит после создания ПВЗ:</p>
                    <div className="space-y-2.5">
                      {[
                        { step: '1', icon: Globe, text: `ПВЗ ${form.code || 'NEW'} создаётся в системе со статусом «На паузе»` },
                        { step: '2', icon: Mail, text: `На ${form.operatorEmail || 'email'} отправляется приглашение с уникальной ссылкой (72 ч)` },
                        { step: '3', icon: Shield, text: 'Сотрудник регистрируется, задаёт пароль и подключает 2FA' },
                        { step: '4', icon: ScanLine, text: `Открывается личный кабинет: только ${form.code || 'этот ПВЗ'} — сканер, выдачи, чат, касса` },
                        { step: '5', icon: Check, text: 'Вы активируете ПВЗ и он начинает принимать заказы' },
                      ].map(item => (
                        <div key={item.step} className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{item.step}</div>
                          <p className="text-sm text-gray-700">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium text-sm transition-colors">
                      Назад
                    </button>
                    <button onClick={handleCreatePvz}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />Создать ПВЗ и отправить приглашение
                    </button>
                  </div>
                  <p className="text-center text-xs text-gray-400">Приглашение можно пропустить — оператора можно добавить позже в настройках ПВЗ</p>
                  <button onClick={handleCreatePvz} className="w-full text-sm text-gray-500 hover:text-gray-700 underline">
                    Создать без оператора
                  </button>
                </div>
              )}

              {/* ── Step 3: Done ── */}
              {step === 3 && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">ПВЗ создан!</h3>
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold text-gray-700">{form.name} ({form.code})</span> добавлен в систему.
                      {form.operatorEmail && <> Приглашение отправлено на <span className="font-semibold">{form.operatorEmail}</span>.</>}
                    </p>
                  </div>

                  {inviteLink && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                      <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                        <Link2 className="w-4 h-4" />Ссылка для регистрации (отправьте вручную если нужно)
                      </p>
                      <div className="flex gap-2">
                        <div className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg font-mono text-xs text-gray-700 overflow-x-auto whitespace-nowrap">
                          {inviteLink}
                        </div>
                        <button onClick={handleCopyLink}
                          className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-all shrink-0 ${
                            linkCopied ? 'bg-green-600 text-white' : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
                          }`}>
                          {linkCopied ? <><Check className="w-3.5 h-3.5" />Скопировано</> : <><Copy className="w-3.5 h-3.5" />Копировать</>}
                        </button>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">Ссылка активна 72 часа</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={closeModal} className="flex-1 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors">
                      Закрыть
                    </button>
                    <Link to={`/pvz/${pvzList[pvzList.length - 1]?.id || '1'}`} onClick={closeModal}
                      className="flex-1 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                      <ScanLine className="w-4 h-4" />Открыть ПВЗ
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}