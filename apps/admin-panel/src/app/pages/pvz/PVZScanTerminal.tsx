import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScanLine, Package, CheckCircle2, XCircle, AlertTriangle,
  Clock, RotateCcw, Truck, MapPin, User, Phone, Store,
  Barcode, QrCode, Search, History, ChevronRight,
  ArrowRight, Banknote, AlertCircle, Shield,
  Box, Grid3X3 as Grid3x3, X, RefreshCw, Download,
} from 'lucide-react';
import {
  PVZ_ORDERS, STORAGE_CELLS, OCCUPIED_CELLS, RETURN_REASONS,
  searchPvzOrder, getStatusLabel, getErrorMessage,
  type PvzOrder, type ScanLogEntry, type ScanActionType,
} from '../../data/pvz-scan-mock';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type TerminalMode = 'scan' | 'issue' | 'receive' | 'return' | 'search';
type ConfirmStep = 'code' | 'cell' | 'reason' | 'cod' | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const PVZ_OPTIONS = [
  { id: '1', name: 'ПВЗ Тверская' },
  { id: '2', name: 'ПВЗ Арбат' },
  { id: '3', name: 'ПВЗ Сокольники' },
];

const MODE_CFG: Record<TerminalMode, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  scan:    { label: 'Быстрое сканирование', icon: ScanLine,    color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  receive: { label: 'Принять посылку',      icon: Package,     color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  issue:   { label: 'Выдать клиенту',       icon: CheckCircle2,color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  return:  { label: 'Оформить возврат',     icon: RotateCcw,   color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  search:  { label: 'Поиск по заказам',     icon: Search,      color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
};

const STATUS_ICON: Record<string, React.ElementType> = {
  in_transit:          Truck,
  at_pvz:              Package,
  issued:              CheckCircle2,
  return_processed:    RotateCcw,
  courier_transferred: Truck,
  expired:             Clock,
  wrong_pvz:           MapPin,
};

let _logSeq = 0;
function mkLogId() { return `log-${Date.now()}-${++_logSeq}`; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${bg} ${color} border`}>
      {label}
    </span>
  );
}

function OrderCard({ order, compact = false }: { order: PvzOrder; compact?: boolean }) {
  const st = getStatusLabel(order.status);
  const StatusIcon = STATUS_ICON[order.status] ?? Package;
  const storageDaysLeft = order.storageDeadline
    ? Math.ceil((new Date(order.storageDeadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{order.orderNumber}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${st.bg} ${st.color} ${st.border}`}>
              <StatusIcon className="w-3 h-3" />{st.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Трек: {order.trackingNumber}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500">Ячейка</p>
          <p className="text-sm font-bold text-gray-900">{order.storageCell ?? '—'}</p>
        </div>
      </div>

      {/* Client */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{order.clientName}</p>
          <p className="text-xs text-gray-500">{order.clientPhone}</p>
        </div>
        {order.requiresSignature && (
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200 font-semibold">Подпись</span>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Состав ({order.totalItems} поз.)</p>
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {item.imageUrl
              ? <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
              : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><Box className="w-4 h-4 text-gray-400" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-[10px] text-gray-500">× {item.qty}</p>
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <>
          {/* Flags row */}
          <div className="flex items-center gap-2 flex-wrap">
            {order.fragile && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded font-medium">
                ⚠️ Хрупкое
              </span>
            )}
            {!order.isPrepaid && order.codAmount && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded font-semibold">
                <Banknote className="w-3 h-3" />Наложенный платёж: ₽{order.codAmount.toLocaleString('ru-RU')}
              </span>
            )}
            {order.requiresSignature && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium">
                ✍️ Требует подписи
              </span>
            )}
            {order.comment && (
              <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                💬 {order.comment}
              </span>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {[
              { l: 'Продавец', v: order.storeName },
              { l: 'Магазин', v: order.storeCode },
              { l: 'Вес', v: `${order.weight} кг` },
              { l: 'Размеры', v: order.dimensions },
              { l: 'Оценочная стоимость', v: `₽${order.declaredValue.toLocaleString('ru-RU')}` },
              { l: 'Код выдачи', v: order.pickupCode },
              { l: 'Срок хранения', v: order.storageDeadline
                ? `${new Date(order.storageDeadline).toLocaleDateString('ru-RU')} ${
                    storageDaysLeft !== null && storageDaysLeft <= 2
                      ? `(⚠️ ${storageDaysLeft}д)`
                      : storageDaysLeft !== null
                        ? `(${storageDaysLeft}д)`
                        : ''
                  }`
                : '—'
              },
              { l: 'ПВЗ назначения', v: order.pvzName },
            ].map(({ l, v }) => (
              <div key={l} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                <p className="text-gray-400 mb-0.5">{l}</p>
                <p className="font-semibold text-gray-800">{v}</p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          {order.timeline.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">История</p>
              <div className="space-y-1.5">
                {order.timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${i === 0 ? 'bg-gray-300' : 'bg-blue-400'}`} />
                    <div>
                      <p className="text-[11px] font-medium text-gray-800">{t.action}</p>
                      <p className="text-[10px] text-gray-400">{new Date(t.ts).toLocaleString('ru-RU')} · {t.actor}{t.note ? ` · ${t.note}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Scan Log ─────────────────────────────────────────────────────────────────

const ACTION_CFG: Record<ScanActionType, { label: string; color: string; icon: React.ElementType }> = {
  receive: { label: 'Принято',    color: 'text-green-600 bg-green-50',  icon: Package },
  issue:   { label: 'Выдано',     color: 'text-blue-600 bg-blue-50',    icon: CheckCircle2 },
  return:  { label: 'Возврат',    color: 'text-orange-600 bg-orange-50',icon: RotateCcw },
  courier: { label: 'Курьеру',    color: 'text-purple-600 bg-purple-50',icon: Truck },
  search:  { label: 'Поиск',      color: 'text-gray-600 bg-gray-100',   icon: Search },
  error:   { label: 'Ошибка',     color: 'text-red-600 bg-red-50',      icon: XCircle },
  move:    { label: 'Перемещение',color: 'text-indigo-600 bg-indigo-50',icon: Grid3x3 },
};

function ScanLog({ entries }: { entries: ScanLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-sm font-medium text-gray-400">Журнал сканиров��ний пуст</p>
        <p className="text-xs text-gray-300 mt-1">Операции появятся здесь автоматически</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map(e => {
        const cfg = ACTION_CFG[e.action];
        const Icon = cfg.icon;
        return (
          <div key={e.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${e.result === 'error' ? 'bg-red-50 border border-red-100' : 'bg-white border border-gray-100'}`}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                {e.orderNumber && <span className="text-[11px] font-semibold text-gray-700">{e.orderNumber}</span>}
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">{e.rawInput}</p>
              {e.errorType && <p className="text-[10px] text-red-500">{e.errorType}</p>}
            </div>
            <span className="text-[10px] text-gray-400 shrink-0">{e.ts}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Cell Grid Picker ─────────────────────────────────────────────────────────

function CellPicker({ value, onChange, occupiedExtra = [] }: {
  value: string;
  onChange: (cell: string) => void;
  occupiedExtra?: string[];
}) {
  const sections = ['A', 'B', 'C', 'D'];
  return (
    <div className="space-y-3">
      {sections.map(sec => {
        const cells = STORAGE_CELLS.filter(c => c.startsWith(sec));
        return (
          <div key={sec}>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Секция {sec}</p>
            <div className="flex flex-wrap gap-1.5">
              {cells.map(cell => {
                const isOccupied = OCCUPIED_CELLS.has(cell) || occupiedExtra.includes(cell);
                const isSelected = value === cell;
                return (
                  <button
                    key={cell}
                    onClick={() => !isOccupied && onChange(cell)}
                    disabled={isOccupied}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                      isOccupied
                        ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed line-through'
                        : isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm scale-105'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-3 text-[10px] text-gray-500 pt-1">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-50 border border-red-200 rounded inline-block" />Занята</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-600 rounded inline-block" />Выбрана</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-white border border-gray-200 rounded inline-block" />Свободна</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PVZScanTerminal() {
  const [currentPvzId, setCurrentPvzId] = useState('1');
  const [mode, setMode] = useState<TerminalMode>('scan');
  const [input, setInput] = useState('');
  const [order, setOrder] = useState<PvzOrder | null>(null);
  const [scanError, setScanError] = useState<{ title: string; desc: string; icon: string } | null>(null);
  const [log, setLog] = useState<ScanLogEntry[]>([]);
  const [tab, setTab] = useState<'result' | 'log' | 'storage'>('result');
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>(null);
  const [codeInput, setCodeInput] = useState('');
  const [selectedCell, setSelectedCell] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [orders, setOrders] = useState<PvzOrder[]>(PVZ_ORDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const pvzName = PVZ_OPTIONS.find(p => p.id === currentPvzId)?.name ?? '';
  const now = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const addLog = useCallback((entry: Omit<ScanLogEntry, 'id' | 'ts' | 'pvzName'>) => {
    setLog(prev => [{
      ...entry,
      id: mkLogId(),
      ts: now(),
      pvzName,
    }, ...prev].slice(0, 50));
  }, [pvzName]);

  // Auto-focus input
  useEffect(() => { inputRef.current?.focus(); }, [mode]);
  useEffect(() => { if (confirmStep === 'code') codeRef.current?.focus(); }, [confirmStep]);

  // Keyboard shortcut F5 = clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F5') { e.preventDefault(); handleClear(); }
      if (e.key === 'Escape') { setConfirmStep(null); setOrder(null); setScanError(null); setInput(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleClear() {
    setOrder(null);
    setScanError(null);
    setInput('');
    setConfirmStep(null);
    setCodeInput('');
    setSelectedCell('');
    setReturnReason('');
    inputRef.current?.focus();
  }

  function doSearch(query: string) {
    if (!query.trim()) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const result = searchPvzOrder(query, currentPvzId);
      if (result.error && !result.order) {
        const errInfo = getErrorMessage(result.error);
        setScanError(errInfo);
        setOrder(null);
        addLog({ orderNumber: null, actor: 'Оператор', action: 'error', result: 'error', errorType: errInfo.title, rawInput: query });
        toast.error(errInfo.title, { description: errInfo.desc });
      } else if (result.error && result.order) {
        // Order found but with an issue
        const errInfo = getErrorMessage(result.error);
        setScanError(errInfo);
        setOrder(result.order);
        addLog({ orderNumber: result.order.orderNumber, actor: 'Оператор', action: 'search', result: 'error', errorType: errInfo.title, rawInput: query });
        toast.warning(errInfo.title, { description: errInfo.desc });
      } else if (result.order) {
        setScanError(null);
        setOrder(result.order);
        setTab('result');
        addLog({ orderNumber: result.order.orderNumber, actor: 'Оператор', action: 'search', result: 'ok', rawInput: query });
        // Auto-suggest action
        if (result.order.status === 'in_transit') {
          toast.info('Посылка в пути — готова к приёмке на ПВЗ');
        } else if (result.order.status === 'at_pvz') {
          toast.success('Посылка на ПВЗ — можно выдать клиенту');
        }
      }
      setInput('');
    }, 300);
  }

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    doSearch(input);
  }

  // ── Receive (accept at PVZ) ───────────────────────────────────────────────

  function startReceive() {
    if (!order || order.status !== 'in_transit') {
      toast.error('Принять можно только посылку со статусом «В пути»');
      return;
    }
    setConfirmStep('cell');
    setSelectedCell(STORAGE_CELLS.find(c => !OCCUPIED_CELLS.has(c)) ?? '');
  }

  function confirmReceive() {
    if (!order || !selectedCell) { toast.error('Выберите ячейку хранения'); return; }
    const updated: PvzOrder = {
      ...order,
      status: 'at_pvz',
      storageCell: selectedCell,
      arrivalDate: new Date().toISOString(),
      storageDeadline: new Date(Date.now() + order.storageDaysMax * 86400000).toISOString(),
      timeline: [...order.timeline, { ts: new Date().toISOString(), action: 'Принят на ПВЗ', actor: 'Оператор', note: `Ячейка ${selectedCell}` }],
    };
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
    setOrder(updated);
    OCCUPIED_CELLS.add(selectedCell);
    addLog({ orderNumber: order.orderNumber, actor: 'Оператор', action: 'receive', result: 'ok', rawInput: order.barcode });
    toast.success(`Принято! Ячейка ${selectedCell}`, { description: order.orderNumber });
    setConfirmStep(null);
  }

  // ── Issue (give to client) ────────────────────────────────────────────────

  function startIssue() {
    if (!order || order.status !== 'at_pvz') {
      toast.error('Выдать можно только посылку со статусом «На ПВЗ»');
      return;
    }
    setConfirmStep('code');
    setCodeInput('');
  }

  function confirmIssue() {
    if (!order) return;
    if (codeInput.trim() !== order.pickupCode) {
      toast.error('Неверный код выдачи!', { description: `Правильный код: ${order.pickupCode}` });
      return;
    }
    if (!order.isPrepaid && order.codAmount) {
      setConfirmStep('cod');
      return;
    }
    finalizeIssue();
  }

  function finalizeIssue() {
    if (!order) return;
    if (order.storageCell) OCCUPIED_CELLS.delete(order.storageCell);
    const updated: PvzOrder = {
      ...order,
      status: 'issued',
      storageCell: null,
      timeline: [...order.timeline, { ts: new Date().toISOString(), action: 'Выдан клиенту', actor: 'Оператор', note: `Код: ${order.pickupCode}` }],
    };
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
    setOrder(updated);
    addLog({ orderNumber: order.orderNumber, actor: 'Оператор', action: 'issue', result: 'ok', rawInput: order.barcode });
    toast.success('Заказ выдан клиенту ✓', { description: `${order.orderNumber} · ${order.clientName}` });
    setConfirmStep(null);
    setCodeInput('');
  }

  // ── Return ─────────────────────────────────────────────────────────────���──

  function startReturn() {
    if (!order || (order.status !== 'at_pvz' && order.status !== 'expired')) {
      toast.error('Возврат можно оформить только для посылок на ПВЗ или с истёкшим сроком');
      return;
    }
    setConfirmStep('reason');
    setReturnReason(RETURN_REASONS[0]);
  }

  function confirmReturn() {
    if (!order || !returnReason) return;
    if (order.storageCell) OCCUPIED_CELLS.delete(order.storageCell);
    const updated: PvzOrder = {
      ...order,
      status: 'return_processed',
      storageCell: null,
      returnReason,
      timeline: [...order.timeline, { ts: new Date().toISOString(), action: 'Возврат оформлен', actor: 'Оператор', note: returnReason }],
    };
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
    setOrder(updated);
    addLog({ orderNumber: order.orderNumber, actor: 'Оператор', action: 'return', result: 'ok', rawInput: order.barcode });
    toast.success('Возврат оформлен', { description: `${order.orderNumber} · ${returnReason}` });
    setConfirmStep(null);
  }

  // ── Transfer to courier ───────────────────────────────────────────────────

  function handleTransferCourier() {
    if (!order || order.status !== 'at_pvz') return;
    if (order.storageCell) OCCUPIED_CELLS.delete(order.storageCell);
    const updated: PvzOrder = {
      ...order,
      status: 'courier_transferred',
      storageCell: null,
      timeline: [...order.timeline, { ts: new Date().toISOString(), action: 'Передано курьеру', actor: 'Оператор' }],
    };
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
    setOrder(updated);
    addLog({ orderNumber: order.orderNumber, actor: 'Оператор', action: 'courier', result: 'ok', rawInput: order.barcode });
    toast.success('Передано курьеру ✓', { description: order.orderNumber });
  }

  // ── Search tab ────────────────────────────────────────────────────────────

  const currentPvzOrders = orders.filter(o => o.pvzId === currentPvzId);
  const searchedOrders = searchQuery.trim()
    ? currentPvzOrders.filter(o =>
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.clientPhone.includes(searchQuery) ||
        (o.storageCell ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentPvzOrders;

  // ── Storage overview ──────────────────────────────────────────────────────

  const storageSummary = {
    at_pvz: orders.filter(o => o.pvzId === currentPvzId && o.status === 'at_pvz').length,
    expired: orders.filter(o => o.pvzId === currentPvzId && o.status === 'expired').length,
    in_transit: orders.filter(o => o.pvzId === currentPvzId && o.status === 'in_transit').length,
    occupiedCells: OCCUPIED_CELLS.size,
    totalCells: STORAGE_CELLS.length,
  };

  const canReceive = order?.status === 'in_transit' && !scanError;
  const canIssue   = order?.status === 'at_pvz' && !scanError;
  const canReturn  = (order?.status === 'at_pvz' || order?.status === 'expired') && !scanError;
  const canCourier = order?.status === 'at_pvz' && !scanError;

  return (
    <div className="space-y-5 pb-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-blue-600" />
            Терминал ПВЗ
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Приёмка, выдача и возврат посылок · операционный режим</p>
        </div>
        <div className="flex items-center gap-3">
          {/* PVZ selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
            <select
              value={currentPvzId}
              onChange={e => { setCurrentPvzId(e.target.value); handleClear(); }}
              className="text-sm font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {PVZ_OPTIONS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {/* Live stats */}
          <div className="flex items-center gap-2">
            {[
              { v: storageSummary.at_pvz,    l: 'на ПВЗ',     c: 'text-green-700 bg-green-50 border-green-200' },
              { v: storageSummary.expired,   l: 'истекли',    c: 'text-red-700 bg-red-50 border-red-200' },
              { v: storageSummary.in_transit,l: 'в пути',     c: 'text-blue-700 bg-blue-50 border-blue-200' },
            ].map(s => (
              <button
                key={s.l}
                onClick={() => { setTab('storage'); }}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer hover:shadow-sm active:scale-95 transition-all ${s.c}`}
              >
                {s.v} {s.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.entries(MODE_CFG) as [TerminalMode, typeof MODE_CFG[TerminalMode]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => { setMode(key); handleClear(); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all active:scale-[0.97] ${
                mode === key ? `${cfg.bg} ring-2 ring-offset-1 ring-blue-300 shadow-sm` : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${mode === key ? cfg.color : 'text-gray-400'}`} />
              <span className={`text-xs font-semibold ${mode === key ? cfg.color : 'text-gray-600'}`}>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Left: Scanner input + actions ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Scan input */}
          {mode !== 'search' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
                <ScanLine className="w-5 h-5 text-white" />
                <p className="text-sm font-bold text-white">Сканер / Ввод</p>
                <span className="ml-auto text-[10px] text-blue-200">F5 — сброс · ESC — отмена</span>
              </div>
              <form onSubmit={handleScan} className="p-4 space-y-3">
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Штрихкод, QR, трек, номер заказа, код выдачи..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!input.trim() || isScanning}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
                  >
                    {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                    {isScanning ? 'Поиск...' : 'Найти'}
                  </button>
                  {(order || scanError || input) && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Quick-scan buttons (demo codes) */}
                <div>
                  <p className="text-[10px] text-gray-400 mb-1.5">Быстрый ввод (демо)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '📦 В пути', code: '847291' },
                      { label: '✅ На ПВЗ', code: '562034' },
                      { label: '⏰ Истёк', code: '415829' },
                      { label: '💰 Наложка', code: '391047' },
                      { label: '🔄 Возврат', code: '739182' },
                    ].map(q => (
                      <button
                        key={q.code}
                        type="button"
                        onClick={() => { setInput(q.code); setTimeout(() => doSearch(q.code), 50); }}
                        className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-mono border border-gray-200"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Search mode */}
          {mode === 'search' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-600 to-purple-700">
                <Search className="w-5 h-5 text-white" />
                <p className="text-sm font-bold text-white">Поиск по заказам ПВЗ</p>
              </div>
              <div className="p-4">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Имя, телефон, трек, ячейка..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-2 max-h-[480px] overflow-y-auto">
                  {searchedOrders.map(o => {
                    const st = getStatusLabel(o.status);
                    const SIcon = STATUS_ICON[o.status] ?? Package;
                    return (
                      <button
                        key={o.id}
                        onClick={() => { setOrder(o); setScanError(null); setTab('result'); setMode('scan'); setSearchQuery(''); }}
                        className="w-full flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 text-left transition-all active:scale-[0.98]"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${st.bg} ${st.color}`}>
                          <SIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-gray-900">{o.orderNumber}</p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}>{st.label}</span>
                          </div>
                          <p className="text-[11px] text-gray-500">{o.clientName} · {o.clientPhone}</p>
                          {o.storageCell && <p className="text-[10px] text-gray-400">Ячейка: {o.storageCell}</p>}
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-1" />
                      </button>
                    );
                  })}
                  {searchedOrders.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-8">Заказы не найдены</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action panel — appears when order found */}
          {order && !scanError && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Доступные операции</p>
              </div>
              <div className="p-3 space-y-2">
                <button
                  onClick={startReceive}
                  disabled={!canReceive}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-green-50 border-green-200 hover:bg-green-100 hover:shadow-sm"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Принять посылку</p>
                    <p className="text-[11px] text-green-600">Назначить ячейку хранения</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-green-400 ml-auto" />
                </button>

                <button
                  onClick={startIssue}
                  disabled={!canIssue}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:shadow-sm"
                >
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">Выдать клиенту</p>
                    <p className="text-[11px] text-indigo-600">Ввести код подтверждения</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400 ml-auto" />
                </button>

                <button
                  onClick={startReturn}
                  disabled={!canReturn}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-orange-50 border-orange-200 hover:bg-orange-100 hover:shadow-sm"
                >
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                    <RotateCcw className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-orange-800">Оформить возврат</p>
                    <p className="text-[11px] text-orange-600">Указать причину возврата</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-orange-400 ml-auto" />
                </button>

                <button
                  onClick={handleTransferCourier}
                  disabled={!canCourier}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-purple-50 border-purple-200 hover:bg-purple-100 hover:shadow-sm"
                >
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-800">Передать курьеру</p>
                    <p className="text-[11px] text-purple-600">Изъять из ячейки и передать</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-400 ml-auto" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Result / Log / Storage panels ── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-gray-50">
              {([
                { id: 'result', label: 'Результат', badge: order ? 1 : 0 },
                { id: 'log',    label: 'Журнал',    badge: log.length },
                { id: 'storage',label: 'Склад',     badge: storageSummary.expired > 0 ? storageSummary.expired : 0 },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                  {t.badge > 0 && (
                    <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      t.id === 'storage' && storageSummary.expired > 0 ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* ── Result tab ── */}
              {tab === 'result' && (
                <>
                  {/* Error state */}
                  {scanError && (
                    <div className="flex flex-col items-center text-center py-8">
                      <div className="text-5xl mb-4">{scanError.icon}</div>
                      <p className="text-lg font-bold text-gray-900">{scanError.title}</p>
                      <p className="text-sm text-gray-500 mt-1 max-w-xs">{scanError.desc}</p>
                      {order && (
                        <div className="mt-6 w-full text-left">
                          <p className="text-xs font-semibold text-gray-500 mb-3">Информация о заказе:</p>
                          <OrderCard order={order} compact />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Order result */}
                  {!scanError && order && <OrderCard order={order} />}
                  {/* Empty state */}
                  {!scanError && !order && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                        <ScanLine className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-500">Ожидание сканирования</p>
                      <p className="text-xs text-gray-400 mt-1">Поднесите штрихкод, введите QR или трек-номер</p>
                      <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-sm">
                        {[
                          { icon: Barcode,  label: 'Штрихкод' },
                          { icon: QrCode,   label: 'QR-код' },
                          { icon: Tag,      label: 'Код выдачи' },
                        ].map(({ icon: Icon, label }) => (
                          <div key={label} className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <Icon className="w-5 h-5 text-gray-400" />
                            <p className="text-[11px] text-gray-500">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Log tab ── */}
              {tab === 'log' && <ScanLog entries={log} />}

              {/* ── Storage tab ── */}
              {tab === 'storage' && (
                <div className="space-y-5">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { l: 'На ПВЗ',       v: storageSummary.at_pvz,      c: 'text-green-700 bg-green-50 border-green-200' },
                      { l: 'Истёк срок',   v: storageSummary.expired,     c: 'text-red-700 bg-red-50 border-red-200' },
                      { l: 'Ожидают',      v: storageSummary.in_transit,  c: 'text-blue-700 bg-blue-50 border-blue-200' },
                    ].map(s => (
                      <div key={s.l} className={`p-3 rounded-xl border text-center ${s.c}`}>
                        <p className="text-xl font-black">{s.v}</p>
                        <p className="text-[10px] font-semibold mt-0.5">{s.l}</p>
                      </div>
                    ))}
                  </div>

                  {/* Cell occupancy */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Заполненность ячеек</p>
                      <p className="text-xs text-gray-500">{storageSummary.occupiedCells} / {STORAGE_CELLS.length}</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(storageSummary.occupiedCells / STORAGE_CELLS.length) * 100}%` }}
                      />
                    </div>
                    <CellPicker value="" onChange={() => {}} />
                  </div>

                  {/* Orders needing attention */}
                  {storageSummary.expired > 0 && (
                    <div>
                      <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">⚠️ Истёк срок хранения — требуют возврата</p>
                      <div className="space-y-2">
                        {orders.filter(o => o.pvzId === currentPvzId && o.status === 'expired').map(o => {
                          const st = getStatusLabel(o.status);
                          return (
                            <button
                              key={o.id}
                              onClick={() => { setOrder(o); setScanError(null); setTab('result'); }}
                              className="w-full flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-left hover:bg-red-100 transition-colors active:scale-[0.98]"
                            >
                              <Clock className="w-5 h-5 text-red-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-red-800">{o.orderNumber}</p>
                                <p className="text-[11px] text-red-600">{o.clientName} · Ячейка {o.storageCell ?? '—'}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm overlays (portal would be cleaner, inline for simplicity) ── */}

      {/* Step: Pick storage cell */}
      {confirmStep === 'cell' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmStep(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-green-600 to-green-700 shrink-0">
              <Grid3x3 className="w-5 h-5 text-white" />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Выбор ячейки хранения</p>
                <p className="text-[11px] text-green-200">{order?.orderNumber} · {order?.clientName}</p>
              </div>
              <button onClick={() => setConfirmStep(null)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <CellPicker value={selectedCell} onChange={setSelectedCell} />
            </div>
            <div className="flex gap-3 px-5 pb-5 pt-2 shrink-0 border-t">
              <button onClick={() => setConfirmStep(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">Отмена</button>
              <button
                onClick={confirmReceive}
                disabled={!selectedCell}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors active:bg-green-800"
              >
                Принять → {selectedCell || '…'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Pickup code */}
      {confirmStep === 'code' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmStep(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-indigo-600 to-indigo-700">
              <Shield className="w-5 h-5 text-white" />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Код подтверждения выдачи</p>
                <p className="text-[11px] text-indigo-200">{order?.clientName}</p>
              </div>
              <button onClick={() => setConfirmStep(null)} className="p-1.5 bg-white/20 rounded-lg">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {order?.requiresSignature && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">Клиент должен поставить подпись в бланке выдачи</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Введите 6-значный код от клиента</label>
                <input
                  ref={codeRef}
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value.slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && confirmIssue()}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full text-center text-2xl font-mono tracking-widest border-2 border-gray-200 rounded-xl py-3 focus:outline-none focus:border-indigo-500"
                  autoComplete="off"
                />
                <p className="text-[10px] text-gray-400 text-center mt-1.5">Код хранится у клиента в SMS/email</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmStep(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
                <button
                  onClick={confirmIssue}
                  disabled={codeInput.length < 4}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Подтвердить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: COD confirmation */}
      {confirmStep === 'cod' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmStep(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-yellow-500 to-yellow-600">
              <Banknote className="w-5 h-5 text-white" />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Наложенный платёж</p>
                <p className="text-[11px] text-yellow-100">{order?.orderNumber}</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center">
                <p className="text-4xl font-black text-gray-900">₽{order?.codAmount?.toLocaleString('ru-RU')}</p>
                <p className="text-sm text-gray-500 mt-1">Необходимо получить от клиента наличными</p>
              </div>
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <Info className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800">Убедитесь, что получили оплату до выдачи. Внесите в кассу.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmStep(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
                <button
                  onClick={finalizeIssue}
                  className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-semibold hover:bg-yellow-600 transition-colors"
                >
                  Оплата получена ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: Return reason */}
      {confirmStep === 'reason' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmStep(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-orange-500 to-orange-600">
              <RotateCcw className="w-5 h-5 text-white" />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Причина возврата</p>
                <p className="text-[11px] text-orange-100">{order?.orderNumber}</p>
              </div>
              <button onClick={() => setConfirmStep(null)} className="p-1.5 bg-white/20 rounded-lg">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {RETURN_REASONS.map(r => (
                  <label
                    key={r}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      returnReason === r ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      returnReason === r ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                    }`}>
                      {returnReason === r && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <input type="radio" value={r} checked={returnReason === r} onChange={() => setReturnReason(r)} className="sr-only" />
                    <span className="text-sm text-gray-800">{r}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setConfirmStep(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
                <button
                  onClick={confirmReturn}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
                >
                  Оформить возврат
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}