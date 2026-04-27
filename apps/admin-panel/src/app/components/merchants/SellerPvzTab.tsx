import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Plus, Eye, Pause, Play, Trash2, ArrowUp, ArrowDown, Settings,
  Package, ChevronDown, ChevronUp, ImageIcon, AlertTriangle
} from 'lucide-react';
import { getSellerPvzLinks, PvzLink } from '../../data/merchants-mock';
import { toast } from 'sonner';

interface Props { sellerId: string; }

export function SellerPvzTab({ sellerId }: Props) {
  const links = getSellerPvzLinks(sellerId);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [expandedPvz, setExpandedPvz] = useState<string | null>(null);

  const getStatusConfig = (status: string) => {
    const m: Record<string, { label: string; color: string; bg: string }> = {
      active: { label: 'Активна', color: 'text-green-700', bg: 'bg-green-100' },
      paused: { label: 'Пауза', color: 'text-orange-700', bg: 'bg-orange-100' },
      removed: { label: 'Снята', color: 'text-red-700', bg: 'bg-red-100' },
    };
    return m[status] || m.active;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Привязки к ПВЗ ({links.length})</h3>
        <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Назначить ПВЗ
        </button>
      </div>

      {/* Links as cards with inventory */}
      <div className="space-y-4">
        {links.map((link) => {
          const sc = getStatusConfig(link.status);
          const loadPct = (link.currentDaily / link.maxDaily) * 100;
          const isExpanded = expandedPvz === link.id;
          const hasInventory = link.inventory && link.inventory.length > 0;
          const totalQty = hasInventory ? link.inventory.reduce((s, i) => s + i.qty, 0) : 0;
          const awaitingTotal = hasInventory ? link.inventory.reduce((s, i) => s + i.awaitingPickup, 0) : 0;
          const outOfStockCount = hasInventory ? link.inventory.filter(i => i.qty === 0).length : 0;

          return (
            <div key={link.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Main row */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      link.priority === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {link.priority}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to={`/pvz/${link.id}`} className="font-medium text-gray-900 hover:text-blue-600">{link.pvzName}</Link>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{link.pvzCode} · {link.city} · SLA: {link.slaHours}ч · Привязан: {link.linkedAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex flex-col mr-2">
                      <button onClick={() => toast.info('Приоритет изменён')} className="p-0.5 text-gray-400 hover:text-gray-600"><ArrowUp className="w-3 h-3" /></button>
                      <button onClick={() => toast.info('Приоритет изменён')} className="p-0.5 text-gray-400 hover:text-gray-600"><ArrowDown className="w-3 h-3" /></button>
                    </div>
                    <Link to={`/pvz/${link.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Открыть ПВЗ"><Eye className="w-3.5 h-3.5" /></Link>
                    {link.status === 'active' ? (
                      <button onClick={() => toast.info('Привязка приостановлена')} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Пауза"><Pause className="w-3.5 h-3.5" /></button>
                    ) : (
                      <button onClick={() => toast.info('Привязка активирована')} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Активировать"><Play className="w-3.5 h-3.5" /></button>
                    )}
                    <button onClick={() => toast.info('Настройки лимитов...')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Настройки"><Settings className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toast.error('Удаление привязки требует подтверждения')} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-6 mt-3">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 uppercase">Лимит/день</p>
                    <p className="text-sm font-medium text-gray-900">{link.maxDaily}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 uppercase">Сегодня</p>
                    <div>
                      <span className={`text-sm font-medium ${loadPct >= 80 ? 'text-orange-600' : 'text-gray-900'}`}>{link.currentDaily}</span>
                      <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                        <div className={`h-full rounded-full ${loadPct >= 80 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(loadPct, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  {hasInventory && (
                    <div style={{display:'contents'}}>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 uppercase">На складе</p>
                        <p className="text-sm font-medium text-gray-900">{totalQty} шт.</p>
                      </div>
                      {awaitingTotal > 0 && (
                        <div className="text-center">
                          <p className="text-[10px] text-gray-500 uppercase">Ждут выдачи</p>
                          <p className="text-sm font-medium text-blue-600">{awaitingTotal} шт.</p>
                        </div>
                      )}
                      {outOfStockCount > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-xs text-red-600">{outOfStockCount} SKU нет в наличии</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inventory preview thumbnails */}
                {hasInventory && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs text-gray-600">Инвентарь на ПВЗ ({link.inventory.length} SKU)</span>
                      </div>
                      <button
                        onClick={() => setExpandedPvz(isExpanded ? null : link.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {isExpanded ? 'Скрыть' : 'Подробнее'}
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Compact thumbnails */}
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {link.inventory.filter(i => i.qty > 0).slice(0, 8).map((item) => (
                        <div
                          key={item.id}
                          className="relative w-8 h-8 rounded-md overflow-hidden border border-gray-200 shrink-0"
                          title={`${item.name} (${item.sku}) — ${item.qty} шт.`}
                        >
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-0.5 rounded-tl">
                            {item.qty}
                          </div>
                        </div>
                      ))}
                      {link.inventory.filter(i => i.qty > 0).length > 8 && (
                        <div className="w-8 h-8 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                          <span className="text-[9px] text-gray-500">+{link.inventory.filter(i => i.qty > 0).length - 8}</span>
                        </div>
                      )}
                    </div>

                    {/* Expanded inventory table */}
                    {isExpanded && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/70">
                              <th className="text-left px-2 py-1.5 font-medium text-gray-500 w-10">Фото</th>
                              <th className="text-left px-2 py-1.5 font-medium text-gray-500">SKU</th>
                              <th className="text-left px-2 py-1.5 font-medium text-gray-500">Товар</th>
                              <th className="text-right px-2 py-1.5 font-medium text-gray-500">На складе</th>
                              <th className="text-right px-2 py-1.5 font-medium text-gray-500">Ждут выдачи</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {link.inventory.map((item) => (
                              <tr key={item.id} className={`${item.qty === 0 ? 'bg-red-50/50' : 'hover:bg-gray-50/50'}`}>
                                <td className="px-2 py-1.5">
                                  <div className={`w-7 h-7 rounded overflow-hidden border shrink-0 ${item.qty === 0 ? 'border-red-200 opacity-50' : 'border-gray-200'}`}>
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                  </div>
                                </td>
                                <td className="px-2 py-1.5 text-gray-500 font-mono">{item.sku}</td>
                                <td className={`px-2 py-1.5 ${item.qty === 0 ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</td>
                                <td className="px-2 py-1.5 text-right">
                                  <span className={item.qty === 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                    {item.qty}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  <span className={item.awaitingPickup > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                                    {item.awaitingPickup}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {links.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm">Нет привязанных ПВЗ</p>
          <button onClick={() => setShowAssignModal(true)} className="mt-2 text-sm text-blue-600 hover:underline">Назначить ПВЗ</button>
        </div>
      )}

      {/* Assign PVZ Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowAssignModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="font-bold text-gray-900">Назначить ПВЗ</h3>
            <div>
              <label className="text-sm font-medium text-gray-700">Выберите ПВЗ</label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Выберите...</option>
                <option value="msk-004">ПВЗ Бутово (MSK-004)</option>
                <option value="spb-001">ПВЗ Невский (SPB-001)</option>
                <option value="spb-002">ПВЗ Василеостровский (SPB-002)</option>
                <option value="ekb-001">ПВЗ Ленина (EKB-001)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Приоритет</label>
                <input type="number" min="1" max="10" defaultValue="1" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Лимит/день</label>
                <input type="number" min="1" defaultValue="100" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">SLA (часов)</label>
              <input type="number" min="1" defaultValue="24" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={() => { toast.success('ПВЗ назначен. Событие seller.pvz_linked записано в аудит.'); setShowAssignModal(false); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Назначить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
