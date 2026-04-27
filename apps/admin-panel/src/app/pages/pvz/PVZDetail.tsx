import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { copyToClipboard } from '../../utils/clipboard';
import { exportToCsv } from '../../utils/downloads';
import {
  ArrowLeft, Phone, MessageSquare, Pause, Play, QrCode, Package,
  Users, Wallet, History, Settings, Download, Clock, ScanLine, CheckCircle,
  XCircle, RotateCcw, AlertTriangle, Send, Search, Grid3X3 as Grid3x3, Archive,
  Truck, User, ChevronDown, RefreshCw, Bell, Copy, Mail, Shield, Keyboard,
  PackageCheck, ShoppingBag, Star, Plus, CreditCard, TrendingUp,
  ArrowUpRight, ArrowDownLeft, AlertCircle, Link2, X, Check, Camera, Upload,
  MapPin, Navigation, Calendar, Tag, Info, Printer, ChevronUp, CheckCircle2,
  ClipboardList, Activity, MoreHorizontal, DollarSign, ArrowRight,
  FileText, Eye,
} from 'lucide-react';
import { DocumentViewerModal, type DocumentRecord, type DocumentContent } from '../../components/ui/DocumentViewer';
import {
  PVZ_ORDERS, STORAGE_CELLS, OCCUPIED_CELLS, RETURN_REASONS,
  getStatusLabel, getErrorMessage,
  type PvzOrder, type SearchError,
} from '../../data/pvz-scan-mock';
import { formatCurrency } from '../../data/orders-mock';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'operations' | 'inventory' | 'shipments' | 'issues' | 'returns' | 'staff' | 'cash' | 'chat' | 'audit' | 'documents' | 'settings';
type ScanMode = 'usb' | 'camera' | 'manual';
type OpScanMode = 'universal' | 'receive' | 'issue' | 'return' | 'courier' | 'inventory';

const TAB_DEFS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview',   label: 'Обзор',     icon: Activity },
  { id: 'operations', label: 'Операции',  icon: ScanLine },
  { id: 'inventory',  label: 'Остатки',   icon: Grid3x3 },
  { id: 'shipments',  label: 'Поставки',  icon: Truck },
  { id: 'issues',     label: 'Выдачи',    icon: ShoppingBag },
  { id: 'returns',    label: 'Возвраты',  icon: RotateCcw },
  { id: 'staff',      label: 'Персонал',  icon: Users },
  { id: 'cash',       label: 'Касса',     icon: Wallet },
  { id: 'chat',       label: 'Чат',       icon: MessageSquare },
  { id: 'audit',      label: 'Аудит',     icon: History },
  { id: 'documents',  label: 'Документы', icon: FileText },
  { id: 'settings',   label: 'Настройки', icon: Settings },
];

// ─── Interfaces ───────────────────────────────────��───────────────────────────

interface UnifiedLog {
  id: string; time: string; orderNumber: string;
  mode: 'receive' | 'issue' | 'return' | 'courier' | 'move' | 'inventory' | 'error';
  operator: string; clientName: string; cell?: string; amount?: number;
  success: boolean; note?: string; rawInput?: string;
}

interface ChatMsg { id: string; from: string; role: string; text: string; time: string; isOwn?: boolean; }
interface StaffMember { id: string; name: string; role: string; phone: string; status: 'active'|'offline'|'break'; shiftStart: string; received: number; issued: number; }
interface Shipment { id: string; courierName: string; courierPhone: string; invoiceNo: string; parcels: number; receivedAt: string; status: 'pending'|'received'|'partial'; weight: number; }
interface CashEntry { id: string; type: 'income'|'expense'; description: string; amount: number; time: string; operator: string; }
interface AuditEntry { id: string; action: string; actor: string; details: string; time: string; ip: string; level: 'info'|'warning'|'critical'; }
interface OpEntry { id: string; time: string; type: 'receive'|'issue'|'return'|'move'; orderNumber: string; clientName: string; amount: number; success: boolean; operator: string; }

// ─── Static data ──────────────────────────────────────────────────────────────

const pvzData = {
  id: '1', code: 'MSK-001', name: 'ПВЗ Тверская', city: 'Москва',
  address: 'ул. Тверская, 12', status: 'active' as const,
  capacity: 120, currentLoad: 98, overdueItems: 3,
  workingHours: '09:00-21:00', phone: '+7 (495) 123-45-67',
  type: 'owned' as const, quality: 95,
  operator: 'Смирнов К.', operatorEmail: 'smirnov@pvz.ru', operatorStatus: 'active' as const,
};

const TYPE_LABELS = { owned: 'Собственный', franchise: 'Франчайзи', partner: 'Партнёр' };
const TYPE_COLORS = { owned: 'bg-blue-100 text-blue-700', franchise: 'bg-purple-100 text-purple-700', partner: 'bg-gray-100 text-gray-700' };

const MOCK_OPS: OpEntry[] = [
  { id: 'op1', time: '11:47', type: 'issue',   orderNumber: 'ORD-2026-018641', clientName: 'Алексей Петров',    amount: 24990, success: true, operator: 'Смирнов К.' },
  { id: 'op2', time: '11:32', type: 'receive', orderNumber: 'ORD-2026-018634', clientName: 'Мария Новикова',    amount: 0,     success: true, operator: 'Смирнов К.' },
  { id: 'op3', time: '11:18', type: 'issue',   orderNumber: 'ORD-2026-018621', clientName: 'Дмитрий Сергеев',   amount: 8500,  success: true, operator: 'Смирнов К.' },
  { id: 'op4', time: '11:05', type: 'return',  orderNumber: 'ORD-2026-018598', clientName: 'Анна Кузнецова',    amount: 0,     success: true, operator: 'Смирнов К.' },
  { id: 'op5', time: '10:51', type: 'issue',   orderNumber: 'ORD-2026-018581', clientName: 'Сергей Волков',     amount: 15750, success: true, operator: 'Смирнов К.' },
  { id: 'op6', time: '10:33', type: 'receive', orderNumber: 'ORD-2026-018570', clientName: 'Ольга Морозова',    amount: 0,     success: false, operator: 'Смирнов К.' },
  { id: 'op7', time: '10:12', type: 'issue',   orderNumber: 'ORD-2026-018549', clientName: 'Иван Козлов',       amount: 3290,  success: true, operator: 'Смирнов К.' },
];

const INITIAL_LOG: UnifiedLog[] = [
  { id: 'sl-1', orderNumber: 'ORD-2026-018441', mode: 'receive', time: '09:15', operator: 'Иванов И.', clientName: 'Алексей Петров',  cell: 'C-1-2', success: true,  amount: 24990 },
  { id: 'sl-2', orderNumber: 'ORD-2026-017822', mode: 'issue',   time: '09:32', operator: 'Иванов И.', clientName: 'Мария Соколова',  success: true,  amount: 3490  },
  { id: 'sl-3', orderNumber: 'ORD-2026-017100', mode: 'receive', time: '09:48', operator: 'Иванов И.', clientName: 'Дмитрий Козлов',  cell: 'A-1-5', success: true,  amount: 8750  },
  { id: 'sl-4', orderNumber: 'ORD-2026-015900', mode: 'return',  time: '10:05', operator: 'Петрова М.',clientName: 'Сергей Морозов',  success: true,  note: 'Клиент не явился' },
  { id: 'sl-5', orderNumber: 'ORD-2026-018641', mode: 'issue',   time: '10:22', operator: 'Иванов И.', clientName: 'Белов Д.О.',      success: true,  amount: 89990 },
];

// INVENTORY_ORDERS, ISSUED_ORDERS, RETURNS_LIST removed — tabs now use pvzOrders live state

const SHIPMENTS: Shipment[] = [
  { id: 's-1', courierName: 'Сидоров Пётр', courierPhone: '+7 (999) 123-00-11', invoiceNo: 'ОТ-20260214-001', parcels: 14, receivedAt: '11:35', status: 'received', weight: 18.4 },
  { id: 's-2', courierName: 'Алексеев Дмитрий', courierPhone: '+7 (999) 234-00-22', invoiceNo: 'ОТ-20260214-002', parcels: 8, receivedAt: '14:20', status: 'received', weight: 9.2 },
  { id: 's-3', courierName: 'Фёдоров Антон', courierPhone: '+7 (999) 345-00-33', invoiceNo: 'ОТ-20260214-003', parcels: 23, receivedAt: '—', status: 'pending', weight: 31.7 },
];



const STAFF: StaffMember[] = [
  { id: 'st-1', name: 'Иванов Иван Петрович',    role: 'Старший оператор', phone: '+7 (999) 111-22-33', status: 'active',  shiftStart: '09:00', received: 29, issued: 21 },
  { id: 'st-2', name: 'Петрова Мария Сергеевна', role: 'Оператор',         phone: '+7 (999) 444-55-66', status: 'break',   shiftStart: '09:00', received: 18, issued: 17 },
  { id: 'st-3', name: 'Сидоров Алексей',         role: 'Оператор',         phone: '+7 (999) 777-88-99', status: 'offline', shiftStart: '—',     received: 0,  issued: 0  },
];

const CASH_ENTRIES: CashEntry[] = [
  { id: 'c-1', type: 'income',  description: 'Оплата ORD-2026-018641 при выдаче',   amount: 89990, time: '10:22', operator: 'Иванов И.'  },
  { id: 'c-2', type: 'income',  description: 'Оплата ORD-2026-017822 при выдаче',   amount: 3490,  time: '09:32', operator: 'Иванов И.'  },
  { id: 'c-3', type: 'expense', description: 'Инкассация — передача в банк',         amount: 50000, time: '10:00', operator: 'Иванов И.'  },
  { id: 'c-4', type: 'income',  description: 'Доп. услуга: упаковка посылки',        amount: 150,   time: '09:50', operator: 'Петрова М.' },
  { id: 'c-5', type: 'expense', description: 'Расходные материалы (скотч, плёнка)', amount: 450,   time: '09:05', operator: 'Иванов И.'  },
  { id: 'c-6', type: 'income',  description: 'Наложенный платёж ORD-2026-017100',   amount: 8750,  time: '09:32', operator: 'Иванов И.'  },
];

const CHAT_MESSAGES: ChatMsg[] = [
  { id: 'm-1', from: 'Диспетчер Ольга', role: 'Диспетчер', text: 'Добрый день! Партия на 14 посылок от курьера Сидорова выедет около 11:30.', time: '09:05' },
  { id: 'm-2', from: 'Иванов И.П.',     role: 'Оператор',  text: 'Принял, буду готов.', time: '09:06', isOwn: true },
  { id: 'm-3', from: 'Диспетчер Ольга', role: 'Диспетчер', text: 'Клиент Кузнецов М.А. — ORD-2026-019010 — придёт к 15:00. Медикаменты, хранить при t° 15-25°C.', time: '10:15' },
  { id: 'm-4', from: 'Сидоров П. (курьер)', role: 'Курьер', text: 'Выехал, буду через 20 мин. 14 посылок. Накладная: ОТ-20260214-001.', time: '11:28' },
  { id: 'm-5', from: 'Иванов И.П.',     role: 'Оператор',  text: 'Ждём. Место есть.', time: '11:29', isOwn: true },
  { id: 'm-6', from: 'Диспетчер Ольга', role: 'Диспетчер', text: 'MSK-001, загрузка критическая (98%). Рекомендуем временно приостановить приём крупных посылок.', time: '13:10' },
];

const AUDIT_LOG: AuditEntry[] = [
  { id: 'a-1', action: 'SCAN_RECEIVE', actor: 'Иванов И.', details: 'Принят ORD-2026-019010 → ячейка B-2-2', time: '10:40', ip: '192.168.1.10', level: 'info' },
  { id: 'a-2', action: 'SCAN_ISSUE',   actor: 'Иванов И.', details: 'Выдан ORD-2026-018641 клиенту Белову Д. (код 5678)', time: '10:22', ip: '192.168.1.10', level: 'info' },
  { id: 'a-3', action: 'SCAN_RETURN',  actor: 'Петрова М.',details: 'Возврат ORD-2026-015900, причина: клиент не явился', time: '10:05', ip: '192.168.1.11', level: 'info' },
  { id: 'a-4', action: 'CASH_EXPENSE', actor: 'Иванов И.', details: 'Инкассация ₽50 000 — передача в банк', time: '10:00', ip: '192.168.1.10', level: 'warning' },
  { id: 'a-5', action: 'SHIFT_OPEN',   actor: 'Иванов И.', details: 'Открытие смены. Начальная касса: ₽5 000', time: '09:00', ip: '192.168.1.10', level: 'info' },
  { id: 'a-6', action: 'LOGIN',        actor: 'Иванов И.', details: 'Вход в систему (2FA подтверждён)', time: '08:58', ip: '192.168.1.10', level: 'info' },
];

const COURIERS_LIST = ['Иванов А.', 'Петров Д.', 'Жуков С.', 'Сидоров Пётр', 'Новиков В.'];

// ─── OperationsLog ────────────────────────────────────────────────────────────

const OP_TYPE_CFG = {
  receive: { label: 'Приёмка', cls: 'bg-blue-100 text-blue-700',   icon: Truck },
  issue:   { label: 'Выдача',  cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  return:  { label: 'Возврат', cls: 'bg-orange-100 text-orange-700', icon: RotateCcw },
  move:    { label: 'Перем.',  cls: 'bg-purple-100 text-purple-700', icon: RefreshCw },
};

function OperationsLog({ ops }: { ops: OpEntry[] }) {
  return (
    <div className="space-y-2">
      {ops.map(op => {
        const cfg = OP_TYPE_CFG[op.type];
        const Icon = cfg.icon;
        return (
          <div key={op.id} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
            <span className="text-xs text-gray-400 w-10 shrink-0 font-mono">{op.time}</span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 ${cfg.cls}`}>
              <Icon className="w-3.5 h-3.5" />{cfg.label}
            </div>
            <span className="text-sm font-mono text-gray-700 flex-1 truncate">{op.orderNumber}</span>
            <span className="text-xs text-gray-500 hidden sm:block truncate max-w-[120px]">{op.clientName}</span>
            {op.amount > 0 && <span className="text-xs font-semibold text-gray-700 shrink-0">{op.amount.toLocaleString()} ₽</span>}
            {op.success ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// ���── StatsStrip (from PVZScan) ────────────────────────────────────────────────

function StatsStrip({ orders, receivedToday, issuedToday }: { orders: PvzOrder[]; receivedToday: number; issuedToday: number; }) {
  const atPvz     = orders.filter(o => o.pvzId === '1' && o.status === 'at_pvz').length;
  const inTransit = orders.filter(o => o.pvzId === '1' && o.status === 'in_transit').length;
  const expired   = orders.filter(o => o.pvzId === '1' && (o.status === 'expired')).length;
  const courier   = orders.filter(o => o.pvzId === '1' && o.status === 'courier_transferred').length;
  const errors    = orders.filter(o => o.pvzId === '1' && o.status === 'wrong_pvz').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
      {[
        { label: 'Принято',       value: receivedToday, icon: PackageCheck, bg: 'bg-indigo-50', border: 'border-indigo-200', color: 'text-indigo-700' },
        { label: 'Выдано',        value: issuedToday,   icon: CheckCircle2, bg: 'bg-green-50',  border: 'border-green-200',  color: 'text-green-700'  },
        { label: 'Ждут выдачи',   value: atPvz,         icon: Archive,      bg: 'bg-blue-50',   border: 'border-blue-200',   color: 'text-blue-700'   },
        { label: 'К передаче',    value: courier,       icon: Navigation,   bg: 'bg-purple-50', border: 'border-purple-200', color: 'text-purple-700' },
        { label: 'Срок истёк',    value: expired + errors, icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', color: 'text-red-700' },
      ].map(s => {
        const Icon = s.icon;
        return (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 flex items-center gap-2.5`}>
            <Icon className={`w-5 h-5 ${s.color} shrink-0`} />
            <div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ScanLogPanel (from PVZScan) ──────────────────────────────────────────────

function ScanLogPanel({ log }: { log: UnifiedLog[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? log : log.slice(0, 6);

  const cfg: Record<string, { label: string; cls: string; icon: any }> = {
    receive:   { label: 'Приём',       cls: 'text-indigo-600 bg-indigo-50', icon: PackageCheck },
    issue:     { label: 'Выдача',      cls: 'text-green-600 bg-green-50',   icon: CheckCircle2 },
    return:    { label: 'Возврат',     cls: 'text-orange-600 bg-orange-50', icon: RotateCcw },
    courier:   { label: 'Курьеру',     cls: 'text-purple-600 bg-purple-50', icon: Navigation },
    move:      { label: 'Перемещение', cls: 'text-blue-600 bg-blue-50',     icon: RefreshCw },
    inventory: { label: 'Инвентарь',   cls: 'text-teal-600 bg-teal-50',     icon: ClipboardList },
    error:     { label: 'Ошибка',      cls: 'text-red-600 bg-red-50',       icon: XCircle },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-bold text-gray-800">Журнал сканирований</p>
          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] font-semibold">{log.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {log.length > 6 && (
            <button onClick={() => setExpanded(e => !e)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              {expanded ? 'Свернуть' : `Ещё ${log.length - 6}`}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button
            onClick={() => {
              if (log.length === 0) { toast.info('Журнал пуст'); return; }
              exportToCsv(log as any[], [
                { key: 'time',        label: 'Время' },
                { key: 'mode',        label: 'Тип' },
                { key: 'orderNumber', label: 'Заказ' },
                { key: 'operator',    label: 'Оператор' },
                { key: 'clientName',  label: 'Клиент' },
                { key: 'cell',        label: 'Ячейка' },
                { key: 'amount',      label: 'Сумма' },
                { key: 'success',     label: 'Успех' },
                { key: 'note',        label: 'Заметка' },
              ], 'pvz-scan-log');
              toast.success(`Скачан CSV: ${log.length} записей`);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <Download className="w-3 h-3" />Экспорт
          </button>
        </div>
      </div>
      {log.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-gray-400">
          <History className="w-8 h-8 mb-2" />
          <p className="text-sm">Сканирований ещё нет</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {visible.map(entry => {
            const c = cfg[entry.mode] ?? cfg.error;
            const Icon = c.icon;
            return (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${c.cls}`}>
                  <Icon className="w-3 h-3" />{c.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{entry.orderNumber || <span className="text-gray-400 italic">Не найдено</span>}</p>
                  <p className="text-[10px] text-gray-400 truncate">{entry.clientName}{entry.note ? ` · ${entry.note}` : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  {entry.cell && <p className="text-[10px] font-mono font-bold text-indigo-600">{entry.cell}</p>}
                  {entry.amount && entry.amount > 0 && <p className="text-[10px] text-gray-600">{entry.amount.toLocaleString()}₽</p>}
                  <p className="text-[10px] text-gray-400">{entry.time}</p>
                </div>
                <div className={`w-2 h-2 rounded-full shrink-0 ${entry.success ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Camera Scanner ───────────────────────────────────────────────────────────

function CameraScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [camError, setCamError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [detected, setDetected] = useState<string | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const tick = useCallback(() => {
    if (detectedRef.current) return;
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) { rafRef.current = requestAnimationFrame(tick); return; }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(id.data, id.width, id.height, { inversionAttempts: 'dontInvert' });
    if (code?.data) { detectedRef.current = true; setDetected(code.data); setScanning(false); setTimeout(() => onDetected(code.data), 600); return; }
    rafRef.current = requestAnimationFrame(tick);
  }, [onDetected]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(stream => { streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().then(() => { rafRef.current = requestAnimationFrame(tick); }); } })
      .catch(err => setCamError(`Камера недоступна: ${err.message}`));
    return () => { cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [tick]);

  return ReactDOM.createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-black/80">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${scanning ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
          <span className="text-white text-sm font-medium">{scanning ? 'Наведите на QR-код или штрихкод...' : `Код: ${detected}`}</span>
        </div>
        <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {camError ? (
          <div className="text-center px-8">
            <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-white text-sm">{camError}</p>
            <button onClick={onClose} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Закрыть ��� введите вручную</button>
          </div>
        ) : (
          <div style={{display:'contents'}}>
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {!detected && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64">
                  {[['top-0 left-0','border-t-4 border-l-4'],['top-0 right-0','border-t-4 border-r-4'],
                    ['bottom-0 left-0','border-b-4 border-l-4'],['bottom-0 right-0','border-b-4 border-r-4']
                  ].map(([pos,border],i) => <div key={i} className={`absolute ${pos} w-8 h-8 ${border} border-white rounded-sm`} />)}
                  <motion.div className="absolute left-2 right-2 h-0.5 bg-green-400/80"
                    initial={{ top:'0%' }} animate={{ top:'100%' }} transition={{ duration:1.8, repeat:Infinity, ease:'linear' }} />
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-white/60 text-xs">QR клиента · штрихкод · код выдачи · трек-номер</span>
                  </div>
                </div>
              </div>
            )}
            {detected && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <motion.div initial={{ scale:0.5,opacity:0 }} animate={{ scale:1,opacity:1 }}
                  className="bg-green-500 rounded-2xl p-6 flex flex-col items-center gap-3">
                  <CheckCircle className="w-12 h-12 text-white" />
                  <p className="text-white font-bold">Считан: {detected}</p>
                </motion.div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="shrink-0 px-4 py-3 bg-black/80 text-center">
        <p className="text-white/50 text-xs">QR клиента · штрихкод посылки · код выдачи · трек-номер</p>
      </div>
    </motion.div>,
    document.body
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ onClose, children, maxW='max-w-lg' }: { onClose:()=>void; children:React.ReactNode; maxW?:string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/70 backdrop-blur-sm"
        onClick={onClose}>
        <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:20 }}
          transition={{ duration:0.22, ease:[0.16,1,0.3,1] }}
          className={`bg-white w-full ${maxW} rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col`}
          onClick={e => e.stopPropagation()}>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── ReceiveModal (from PVZScan) ──────────────────────────────────────────────

function ReceiveModal({ order, onConfirm, onClose }: {
  order: PvzOrder; onConfirm: (cell: string) => void; onClose: () => void;
}) {
  const [cellInput, setCellInput] = useState('');
  const [cellMode, setCellMode] = useState<'select'|'scan'>('select');
  const [saving, setSaving] = useState(false);
  const freeCells = STORAGE_CELLS.filter(c => !OCCUPIED_CELLS.has(c));
  const selected = cellInput.trim().toUpperCase();
  const isValid = STORAGE_CELLS.includes(selected);

  async function confirm() {
    if (!isValid) { toast.error('Укажите корректную ячейку хранения'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    onConfirm(selected);
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-indigo-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><Truck className="w-5 h-5 text-indigo-600" /></div>
          <div><p className="font-bold text-gray-900">Приём на ПВЗ</p><p className="text-xs text-gray-500">{order.orderNumber} · {order.clientName}</p></div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-indigo-200 rounded-lg"><X className="w-4 h-4 text-gray-600" /></button>
      </div>
      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <Package className="w-5 h-5 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">{order.storeName}</p>
            <p className="text-xs text-gray-500">{order.totalItems} товар(а) · {order.weight} кг · {order.dimensions}</p>
          </div>
          {order.fragile && <span className="text-xs text-red-600 font-semibold shrink-0">⚠ Хрупкое</span>}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ячейка хранени�� *</label>
            <div className="flex gap-1">
              <button onClick={() => setCellMode('select')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${cellMode==='select'?'bg-blue-100 text-blue-700':'text-gray-500 hover:bg-gray-100'}`}>Выбрать</button>
              <button onClick={() => setCellMode('scan')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${cellMode==='scan'?'bg-blue-100 text-blue-700':'text-gray-500 hover:bg-gray-100'}`}><ScanLine className="w-3 h-3" />Ввести</button>
            </div>
          </div>
          {cellMode === 'select' ? (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {STORAGE_CELLS.map(cell => {
                const occupied = OCCUPIED_CELLS.has(cell);
                const sel = selected === cell;
                return (
                  <button key={cell} onClick={() => !occupied && setCellInput(cell)} disabled={occupied}
                    className={`py-2 px-1 rounded-lg text-[10px] font-bold text-center transition-all border ${sel?'bg-indigo-600 text-white border-indigo-600 shadow-md':occupied?'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed':'bg-white text-gray-600 border-gray-200 hover:border-indigo-400 hover:text-indigo-600'}`}>
                    {cell}
                  </button>
                );
              })}
            </div>
          ) : (
            <input value={cellInput} onChange={e => setCellInput(e.target.value.toUpperCase())}
              placeholder="Напр.: A-3-2"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus />
          )}
          {cellInput && !isValid && <p className="text-xs text-red-500 mt-1">Ячейка не найдена в реестре</p>}
          {isValid && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Ячейка {selected} свободна и выбрана</p>}
        </div>
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700">
          <Info className="w-4 h-4 shrink-0" />После приёма статус изменится «В пути» → «На ПВЗ». Клиент получит уведомление.
        </div>
      </div>
      <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
        <button onClick={confirm} disabled={saving||!isValid} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
          {saving?<span style={{display:'contents'}}><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Приём...</span>:<span style={{display:'contents'}}><Check className="w-4 h-4" />Принять на ПВЗ</span>}
        </button>
      </div>
    </Modal>
  );
}

// ─── IssueModal (from PVZScan) ────────────────────────────────────────────────

function IssueModal({ order, onConfirm, onClose }: {
  order: PvzOrder; onConfirm: () => void; onClose: () => void;
}) {
  const [codeInput, setCodeInput] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const codeOk = codeInput.trim() === order.pickupCode;

  function verifyCode() {
    if (codeOk) { setCodeVerified(true); toast.success('Код подтверждён!'); }
    else toast.error('Неверный код выдачи');
  }

  async function confirm() {
    if (order.requiresSignature && !codeVerified && order.pickupCode) { toast.error('Сначала подтвердите код выдачи'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    onConfirm();
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-green-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
          <div><p className="font-bold text-gray-900">Выдача клиенту</p><p className="text-xs text-gray-500">{order.orderNumber} · Ячейка: {order.storageCell}</p></div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-green-200 rounded-lg"><X className="w-4 h-4 text-gray-600" /></button>
      </div>
      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0"><User className="w-5 h-5 text-blue-600" /></div>
          <div><p className="font-bold text-gray-900">{order.clientName}</p><p className="text-xs text-gray-500">{order.clientPhone}</p></div>
        </div>
        {!order.isPrepaid && order.codAmount && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
            <DollarSign className="w-6 h-6 text-green-600 shrink-0" />
            <div><p className="font-bold text-green-800">Наложенный платёж!</p>
              <p className="text-sm text-green-700">Получите от клиента: <span className="font-black text-lg">{order.codAmount.toLocaleString()} ₽</span></p></div>
          </div>
        )}
        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">Код выдачи клиента *</label>
          <div className="flex gap-2">
            <input value={codeInput} onChange={e => { setCodeInput(e.target.value); setCodeVerified(false); }}
              placeholder="6-значный код" maxLength={6}
              onKeyDown={e => e.key === 'Enter' && verifyCode()}
              className={`flex-1 px-4 py-3 border rounded-xl text-lg font-mono text-center tracking-[0.3em] focus:outline-none focus:ring-2 transition-all ${codeVerified?'border-green-400 bg-green-50 ring-green-400 text-green-800':codeInput&&!codeOk?'border-red-300 bg-red-50':'border-gray-200 focus:ring-blue-400'}`} />
            <button onClick={verifyCode} className={`px-4 rounded-xl font-medium text-sm transition-colors ${codeVerified?'bg-green-100 text-green-700':'bg-green-600 text-white hover:bg-green-700'}`}>
              {codeVerified ? <Check className="w-5 h-5" /> : 'Проверить'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Ожидаемый код: <span className="font-mono tracking-widest text-blue-600">{order.pickupCode}</span></p>
        </div>
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700">
          <Info className="w-4 h-4 shrink-0" />После выдачи статус изменится «На ПВЗ» → «Выдано». Действие необратимо.
        </div>
      </div>
      <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
        <button onClick={confirm} disabled={saving} className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
          {saving?<span style={{display:'contents'}}><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Выдача...</span>:<span style={{display:'contents'}}><CheckCircle2 className="w-4 h-4" />Выдать клиенту</span>}
        </button>
      </div>
    </Modal>
  );
}

// ─── ReturnModal (from PVZScan) ───────────────────────────────────────────────

function ReturnModal({ order, onConfirm, onClose, initialReason }: {
  order: PvzOrder; onConfirm: (reason: string) => void; onClose: () => void; initialReason?: string;
}) {
  const [reason, setReason] = useState(initialReason || '');
  const [otherReason, setOtherReason] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Sync initialReason in case state sets it just before modal opens
  useEffect(() => {
    if (initialReason && !reason) setReason(initialReason);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReason]);

  async function confirm() {
    const finalReason = reason === 'Другая причина' ? otherReason.trim() : reason;
    if (!finalReason) { toast.error('Укажите причину возврата'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    onConfirm(finalReason);
  }

  return (
    <Modal onClose={onClose} maxW="max-w-xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-orange-200 bg-gradient-to-r from-orange-500 to-red-500 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><RotateCcw className="w-5 h-5 text-white" /></div>
          <div>
            <p className="font-bold text-white">Оформление возврата</p>
            <p className="text-xs text-orange-100">{order.orderNumber} · {order.clientName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-4 h-4 text-white" /></button>
      </div>
      <div className="p-6 space-y-4 overflow-y-auto flex-1">

        {/* Product preview */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 border border-gray-200 shrink-0">
            {order.items.find(i => i.imageUrl)?.imageUrl
              ? <img src={order.items.find(i => i.imageUrl)!.imageUrl!} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{order.storeName}</p>
            <p className="text-xs text-gray-500">{order.items.map(i => `${i.name} ×${i.qty}`).join(' · ')}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">Ценность</p>
            <p className="font-bold text-gray-900">{order.declaredValue.toLocaleString()}₽</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
            <label className="text-sm font-bold text-gray-800 uppercase tracking-wide">Выберите причину возврата</label>
            <span className="text-red-500 font-bold text-sm">*</span>
          </div>
          <div className="space-y-2">
            {RETURN_REASONS.map((r, idx) => (
              <button key={r} onClick={() => setReason(r)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm transition-all flex items-center gap-3 ${reason===r?'border-orange-500 bg-orange-50 text-orange-900 font-semibold shadow-sm ring-2 ring-orange-200':'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50/50'}`}>
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${reason===r?'bg-orange-500 border-orange-500':'border-gray-300'}`}>
                  {reason===r ? <Check className="w-3.5 h-3.5 text-white" /> : <span className="text-[10px] text-gray-400 font-bold">{idx+1}</span>}
                </span>
                <span className="flex-1">{r}</span>
              </button>
            ))}
          </div>
          {reason === 'Другая причина' && (
            <textarea value={otherReason} onChange={e => setOtherReason(e.target.value)} rows={3}
              placeholder="Подробно опишите причину возврата..."
              className="mt-2 w-full px-3 py-2 border-2 border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none bg-orange-50" autoFocus />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Фотофиксация <span className="text-gray-400 font-normal normal-case text-xs">(рекомендуется)</span></label>
          </div>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
          {photo ? (
            <div className="relative">
              <img src={photo} alt="Фото возврата" className="w-full max-h-40 object-cover rounded-xl border border-gray-200" />
              <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => photoRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-5 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors">
              <Upload className="w-6 h-6" /><span className="text-sm">Нажмите для съёмки или загрузки фото</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />Возврат необратим. Статус изменится на «Возврат оформлен», магазин получит уведомление.
        </div>
      </div>
      <div className="px-6 pb-6 pt-3 space-y-2 shrink-0 border-t border-gray-100 bg-gray-50">
        {!reason && (
          <div className="flex items-center gap-2 p-2.5 bg-orange-50 border border-orange-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
            <p className="text-xs text-orange-700 font-medium">Выберите причину возврата выше, затем нажмите «Подтвердить»</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">Отмена</button>
          <button onClick={confirm} disabled={saving || (!reason || (reason === 'Другая причина' && !otherReason.trim()))}
            className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black transition-colors flex items-center justify-center gap-2 shadow-md shadow-orange-100">
            {saving
              ? <span style={{display:'contents'}}><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Оформление возврата...</span>
              : reason
                ? <span style={{display:'contents'}}><RotateCcw className="w-5 h-5" />Подтвердить возврат — {reason.length > 25 ? reason.slice(0,25)+'...' : reason}</span>
                : <span style={{display:'contents'}}><RotateCcw className="w-5 h-5" />Выберите причину</span>
            }
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── CourierModal ─────────────────────────────────────────────────────────────

function CourierModal({ order, onConfirm, onClose }: {
  order: PvzOrder; onConfirm: (courierName: string) => void; onClose: () => void;
}) {
  const [courier, setCourier] = useState('');
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!courier.trim()) { toast.error('Укажите курьера'); return; }
    setSaving(true); await new Promise(r => setTimeout(r, 600)); onConfirm(courier.trim());
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-purple-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><Navigation className="w-5 h-5 text-purple-600" /></div>
          <div><p className="font-bold text-gray-900">Передача курьеру</p><p className="text-xs text-gray-500">{order.orderNumber} · {order.clientName}</p></div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-purple-200 rounded-lg"><X className="w-4 h-4 text-gray-600" /></button>
      </div>
      <div className="p-6 space-y-4 overflow-y-auto flex-1">
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <Package className="w-5 h-5 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-900">{order.storeName}</p><p className="text-xs text-gray-500">{order.totalItems} товар(а) · {order.weight} кг</p></div>
          {order.storageCell && <span className="text-xs font-bold text-gray-600 shrink-0">Ячейка: {order.storageCell}</span>}
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-3">Выберите курьера *</label>
          <div className="space-y-2 mb-3">
            {COURIERS_LIST.map(c => (
              <button key={c} onClick={() => setCourier(c)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all flex items-center gap-3 ${courier===c?'border-purple-400 bg-purple-50 text-purple-800 font-medium':'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-gray-600">{c.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                {c}{courier===c && <Check className="w-4 h-4 text-purple-600 ml-auto" />}
              </button>
            ))}
          </div>
          <input value={courier} onChange={e => setCourier(e.target.value)} placeholder="Или введите имя вручную..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700">
          <Info className="w-4 h-4 shrink-0" />Статус изменится на «Передано курьеру». В системе зафиксируются курьер, время и ПВЗ.
        </div>
      </div>
      <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
        <button onClick={confirm} disabled={saving||!courier.trim()} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
          {saving?<span style={{display:'contents'}}><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Передача...</span>:<span style={{display:'contents'}}><Navigation className="w-4 h-4" />Передать курьеру</span>}
        </button>
      </div>
    </Modal>
  );
}

// ─── MoveModal (from PVZScan) ─────────────────────────────────────────────────

function MoveModal({ order, onConfirm, onClose }: {
  order: PvzOrder; onConfirm: (cell: string) => void; onClose: () => void;
}) {
  const [newCell, setNewCell] = useState('');
  const [saving, setSaving] = useState(false);
  const freeCells = STORAGE_CELLS.filter(c => !OCCUPIED_CELLS.has(c) && c !== order.storageCell);
  const selected = newCell.trim().toUpperCase();
  const isValid = freeCells.includes(selected);

  async function confirm() {
    if (!isValid) { toast.error('Выберите свободную ячейку'); return; }
    setSaving(true); await new Promise(r => setTimeout(r, 400)); onConfirm(selected);
  }

  return (
    <Modal onClose={onClose} maxW="max-w-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2"><RefreshCw className="w-5 h-5 text-gray-500" /><p className="font-bold text-gray-900">Переместить посылку</p></div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <div className="p-6 space-y-4 overflow-y-auto flex-1">
        <p className="text-sm text-gray-600">Текущая ячейка: <span className="font-bold text-blue-700">{order.storageCell}</span></p>
        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">Новая ячейка</label>
          <input value={newCell} onChange={e => setNewCell(e.target.value.toUpperCase())}
            placeholder="Напр.: B-3-1"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="grid grid-cols-6 gap-1 mt-3 max-h-36 overflow-y-auto">
            {freeCells.map(c => (
              <button key={c} onClick={() => setNewCell(c)}
                className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${selected===c?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>{c}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Отмена</button>
        <button onClick={confirm} disabled={saving||!isValid} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
          {saving?<span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />:<ArrowRight className="w-4 h-4" />}Переместить
        </button>
      </div>
    </Modal>
  );
}

// ─── InventoryScanPanel ───────────────────────────────────────────────────────

function InventoryScanPanel({ pvzOrders }: { pvzOrders: PvzOrder[] }) {
  const [cellInput, setCellInput] = useState('');
  const [activeCell, setActiveCell] = useState<string|null>(null);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [parcelInput, setParcelInput] = useState('');
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const expectedInCell = pvzOrders.filter(o => o.storageCell === activeCell);

  const startInventory = () => {
    if (!cellInput.trim()) return;
    setActiveCell(cellInput.toUpperCase()); setScannedCodes([]); setDone(false); setParcelInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleScanParcel = () => {
    const code = parcelInput.trim();
    if (!code) return;
    if (scannedCodes.includes(code)) { toast.warning('Этот код уже отсканирован'); setParcelInput(''); return; }
    setScannedCodes(prev => [...prev, code]); setParcelInput(''); inputRef.current?.focus(); toast.success(`Посылка ${code} добавлена`);
  };

  const finishInventory = () => {
    setDone(true);
    const missing = expectedInCell.filter(o => !scannedCodes.includes(o.barcode) && !scannedCodes.includes(o.orderNumber) && !scannedCodes.includes(o.pickupCode));
    if (missing.length > 0) toast.error(`Инцидент: ${missing.length} посылок не найдено в ячейке ${activeCell}`);
    else toast.success(`Инвент��ризация ячейки ${activeCell} завершена. Всё на месте.`);
  };

  if (done && activeCell) {
    const missing = expectedInCell.filter(o => !scannedCodes.includes(o.barcode) && !scannedCodes.includes(o.orderNumber) && !scannedCodes.includes(o.pickupCode));
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl border p-5 ${missing.length>0?'bg-red-50 border-red-200':'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${missing.length>0?'bg-red-100':'bg-green-100'}`}>
              {missing.length>0?<AlertTriangle className="w-6 h-6 text-red-600" />:<CheckCircle className="w-6 h-6 text-green-600" />}
            </div>
            <div>
              <p className={`font-bold ${missing.length>0?'text-red-900':'text-green-900'}`}>{missing.length>0?`Инцидент: ${missing.length} расхождений`:'Инвентаризация пройдена'}</p>
              <p className="text-sm text-gray-600">Ячейка {activeCell} · Отсканировано: {scannedCodes.length}</p>
            </div>
          </div>
          {missing.length>0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-red-700 uppercase">Не найдено:</p>
              {missing.map(o => <div key={o.id} className="flex items-center justify-between p-2 bg-red-100 rounded-lg text-xs"><span className="font-mono font-bold text-red-800">{o.orderNumber}</span><span className="text-red-600">{o.clientName}</span></div>)}
            </div>
          )}
        </div>
        <button onClick={() => { setActiveCell(null); setCellInput(''); setScannedCodes([]); setDone(false); }}
          className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" />Новая инвентаризация
        </button>
      </div>
    );
  }

  if (!activeCell) {
    return (
      <div className="space-y-4">
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-teal-900 mb-1 flex items-center gap-2"><ClipboardList className="w-4 h-4" />Инвентаризация ячейки</p>
          <p className="text-xs text-teal-700 mb-4">Скан��руйте ячейку хранения, затем сканируйте все посылки внутри. Система сравнит данные с базой и зафиксирует инцидент при расхождении.</p>
          <div className="flex gap-2">
            <input value={cellInput} onChange={e => setCellInput(e.target.value.toUpperCase())} onKeyDown={e => e.key==='Enter'&&startInventory()}
              placeholder="A-1-1 или сканируйте ячейку..."
              className="flex-1 px-4 py-3 border-2 border-teal-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-center tracking-wider" />
            <button onClick={startInventory} disabled={!cellInput.trim()} className="px-5 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors disabled:opacity-50">Начать</button>
          </div>
          <div className="mt-3">
            <p className="text-xs text-teal-600 mb-2">Ячейки с посылками:</p>
            <div className="flex flex-wrap gap-1.5">
              {[...OCCUPIED_CELLS].map(c => (
                <button key={c} onClick={() => setCellInput(c)} className="px-2 py-1 bg-white border border-teal-200 text-teal-700 rounded-lg text-xs font-mono font-bold hover:bg-teal-100">{c}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-teal-900">Ячейка: <span className="font-mono text-xl">{activeCell}</span></p>
            <p className="text-xs text-teal-700">Ожидается: {expectedInCell.length} · Отсканировано: {scannedCodes.length}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={finishInventory} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors flex items-center gap-1.5"><Check className="w-4 h-4" />Завершить</button>
            <button onClick={() => setActiveCell(null)} className="p-2 border border-teal-200 text-teal-600 hover:bg-white rounded-xl"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex gap-2">
          <input ref={inputRef} value={parcelInput} onChange={e => setParcelInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleScanParcel()}
            placeholder="Штрихкод / номер заказа / код выдачи..."
            className="flex-1 px-4 py-2.5 border-2 border-teal-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
          <button onClick={handleScanParcel} disabled={!parcelInput.trim()} className="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5"><ScanLine className="w-4 h-4" />Скан</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Ожидается ({expectedInCell.length})</p>
          <div className="space-y-1.5">
            {expectedInCell.length === 0 ? <p className="text-xs text-gray-400">Нет данных</p> : expectedInCell.map(o => {
              const isScanned = scannedCodes.includes(o.barcode)||scannedCodes.includes(o.orderNumber)||scannedCodes.includes(o.pickupCode);
              return <div key={o.id} className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${isScanned?'bg-green-50 border-green-200':'bg-gray-50 border-gray-100'}`}>
                {isScanned?<Check className="w-3.5 h-3.5 text-green-600 shrink-0" />:<Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                <span className="font-mono font-bold text-gray-800 truncate">{o.orderNumber}</span>
              </div>;
            })}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Отсканировано ({scannedCodes.length})</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {scannedCodes.length === 0 ? <p className="text-xs text-gray-400">Начните сканирование...</p>
              : scannedCodes.map((code,i) => <div key={i} className="flex items-center gap-2 p-2 bg-teal-50 border border-teal-200 rounded-lg text-xs"><ScanLine className="w-3.5 h-3.5 text-teal-600 shrink-0" /><span className="font-mono font-bold text-teal-800 truncate">{code}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── InviteLinkCard ───────────────────────────────────────────────────────────

function InviteLinkCard({ pvzCode, pvzName }: { pvzCode: string; pvzName: string }) {
  const [copied, setCopied] = useState(false);
  const link = `https://platform.pvz.ru/invite/${pvzCode}?token=DEMO&role=PVZOperator&pvz=${encodeURIComponent(pvzName)}`;
  const handleCopy = () => { copyToClipboard(link); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
      <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5"><Link2 className="w-4 h-4" />Ссылка-приглашение для оператора</p>
      <div className="flex gap-2 mb-2">
        <div className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono text-xs text-gray-600 overflow-x-auto whitespace-nowrap">{link}</div>
        <button onClick={handleCopy} className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${copied?'bg-green-600 text-white':'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'}`}>
          {copied?<span style={{display:'contents'}}><Check className="w-3.5 h-3.5" />Скопировано</span>:<span style={{display:'contents'}}><Copy className="w-3.5 h-3.5" />Копировать</span>}
        </button>
      </div>
      <p className="text-xs text-blue-600">Ссылка активна 72 часа · При переходе оператор пройдёт регистрацию</p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysStored(arrivalDate: string | null): number {
  if (!arrivalDate) return 0;
  const diff = Date.now() - new Date(arrivalDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getDaysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ProductThumb({ items, size = 'md' }: { items: PvzOrder['items']; size?: 'sm' | 'md' | 'lg' }) {
  const main = items.find(i => i.imageUrl) || items[0];
  const sz = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';
  return (
    <div className={`${sz} rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 relative`}>
      {main?.imageUrl ? (
        <img src={main.imageUrl} alt={main.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package className="w-5 h-5 text-gray-400" />
        </div>
      )}
      {items.length > 1 && (
        <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] font-bold px-1 rounded-tl-md">
          +{items.length - 1}
        </div>
      )}
    </div>
  );
}

function getCellForOrder(): string {
  const free = STORAGE_CELLS.filter(c => !OCCUPIED_CELLS.has(c));
  return free[Math.floor(Math.random() * free.length)] || 'A-1-1';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PVZ DOCUMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function PvzDocumentsTab({ docs }: { docs: DocumentRecord[] }) {
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'signed' | 'pending' | 'expired'>('all');

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    signed: { label: 'Подписан', cls: 'bg-green-100 text-green-700' },
    pending: { label: 'Ожидает', cls: 'bg-yellow-100 text-yellow-700' },
    draft: { label: 'Черновик', cls: 'bg-gray-100 text-gray-600' },
    expired: { label: 'Истёк', cls: 'bg-red-100 text-red-700' },
    rejected: { label: 'Отклонён', cls: 'bg-red-100 text-red-700' },
  };

  const filtered = filter === 'all' ? docs : docs.filter(d => d.status === filter);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Документы ПВЗ</h3>
          <p className="text-sm text-gray-500">Договоры, лицензии, акты проверок и сертификаты</p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'signed', 'pending', 'expired'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'all' ? `Все (${docs.length})` : f === 'signed' ? `Подписаны (${docs.filter(d=>d.status==='signed').length})` : f === 'pending' ? `Ожидают (${docs.filter(d=>d.status==='pending').length})` : `Истекли (${docs.filter(d=>d.status==='expired').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Документ</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Номер</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Дата</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Статус</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Размер</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(doc => {
              const sc = STATUS_MAP[doc.status] || STATUS_MAP.draft;
              return (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-400">{doc.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{doc.number || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{doc.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.cls}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{doc.size}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewingDoc(doc)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Просмотреть">
                        <Eye className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => {
                          const text = `Документ: ${doc.name}\nНомер: ${doc.number ?? '—'}\nТип: ${doc.type}\nРазмер: ${doc.size}\nДата: ${doc.date}\nСтатус: ${doc.status}`;
                          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `${doc.name}.txt`.replace(/[\\/:*?"<>|]/g, '_');
                          document.body.appendChild(a); a.click(); a.remove();
                          URL.revokeObjectURL(url);
                          toast.success(`Скачан: ${doc.name}`);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Скачать">
                        <Download className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">Нет документов по выбранному фильтру</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && ReactDOM.createPortal(
        <DocumentViewerModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          allDocs={docs}
          onNavigate={d => setViewingDoc(d)}
        />,
        document.body
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PVZDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [pvz] = useState(pvzData);

  // ─ Live order state ─
  const [pvzOrders, setPvzOrders] = useState<PvzOrder[]>([...PVZ_ORDERS]);
  const updateOrder = useCallback((orderId: string, patch: Partial<PvzOrder>) => {
    setPvzOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o));
  }, []);

  // ─ Scanner state ─
  const [scanMode, setScanMode] = useState<ScanMode>('usb');
  const [opMode, setOpMode] = useState<OpScanMode>('universal');
  const [searchInput, setSearchInput] = useState('');
  const [foundOrder, setFoundOrder] = useState<PvzOrder | null>(null);
  const [searchError, setSearchError] = useState<{ error: SearchError; order?: PvzOrder } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // ─ Modals ─
  const [receiveOrder, setReceiveOrder] = useState<PvzOrder | null>(null);
  const [issueOrder, setIssueOrder] = useState<PvzOrder | null>(null);
  const [returnOrder, setReturnOrder] = useState<PvzOrder | null>(null);
  const [returnInitialReason, setReturnInitialReason] = useState<string>('');
  const [moveOrder, setMoveOrder] = useState<PvzOrder | null>(null);
  const [courierOrder, setCourierOrder] = useState<PvzOrder | null>(null);

  const openReturn = (order: PvzOrder, preReason = '') => {
    setReturnInitialReason(preReason);
    setReturnOrder(order);
  };

  // ─ Stats ─
  const [receivedToday, setReceivedToday] = useState(43);
  const [issuedToday, setIssuedToday] = useState(38);
  const [returnsToday, setReturnsToday] = useState(3);
  const [scanLog, setScanLog] = useState<UnifiedLog[]>(INITIAL_LOG);
  const [mockOps] = useState<OpEntry[]>(MOCK_OPS);

  // ─ Courier shipment ─
  const [courierName, setCourierName] = useState('Сидоров Пётр');
  const [invoiceNo, setInvoiceNo] = useState('ОТ-20260214-001');
  const [showCourierForm, setShowCourierForm] = useState(false);

  // ─ Chat ─
  const [messages, setMessages] = useState<ChatMsg[]>(CHAT_MESSAGES);
  const [msgInput, setMsgInput] = useState('');
  const msgEndRef = useRef<HTMLDivElement>(null);

  // ─ Invite ─
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('PVZOperator');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // ─ Pause ─
  const [paused, setPaused] = useState(false);

  // ─ Shift / Cash / Settings runtime state ─
  const [shiftClosed, setShiftClosed]         = useState(false);
  const [shiftClosedAt, setShiftClosedAt]     = useState<string | null>(null);
  const [shipmentClosed, setShipmentClosed]   = useState(false);
  const [encashmentRequested, setEncashmentRequested] = useState(false);
  const [encashmentRequestedAt, setEncashmentRequestedAt] = useState<string | null>(null);
  const [pvzSettingsSavedAt, setPvzSettingsSavedAt] = useState<string | null>(null);
  const [actionsMenuOpenForId, setActionsMenuOpenForId] = useState<string | null>(null);

  const [now] = useState(new Date());
  const timeNow = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const today = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (activeTab === 'operations') setTimeout(() => scanInputRef.current?.focus(), 150);
  }, [activeTab]);

  // ── Scan handler ──────────────────────────────────────────────────────────

  const findOrderInState = useCallback((q: string): PvzOrder | null => {
    const qLow = q.trim().toLowerCase();
    if (!qLow) return null;
    return pvzOrders.find(o =>
      o.orderNumber.toLowerCase().includes(qLow) ||
      o.trackingNumber.toLowerCase().includes(qLow) ||
      o.pickupCode === qLow || o.barcode === qLow || o.qrContent === qLow ||
      o.clientPhone.replace(/\D/g,'').includes(qLow.replace(/\D/g,'')) ||
      o.clientName.toLowerCase().includes(qLow)
    ) ?? null;
  }, [pvzOrders]);

  const handleScan = useCallback((raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setSearchInput(q); setProcessing(true); setFoundOrder(null); setSearchError(null);

    setTimeout(() => {
      setProcessing(false);
      const order = findOrderInState(q);
      if (!order) {
        setSearchError({ error: 'not_found' });
        setScanLog(prev => [{ id:`sl-${Date.now()}`, orderNumber: q, mode:'error', time:timeNow, operator:'Иванов И.', clientName:'—', success:false, rawInput:q }, ...prev]);
        toast.error('Заказ не найден');
        return;
      }
      if (order.status === 'issued') { setSearchError({ error:'already_issued', order }); return; }
      if (order.status === 'courier_transferred') { setSearchError({ error:'return_processed', order }); return; }
      if (order.pvzId !== '1' && order.status !== 'return_processed') { setSearchError({ error:'wrong_pvz', order }); return; }
      setFoundOrder(order);
      // ── Auto-trigger action modal based on scan mode ──
      if (opMode === 'receive' && order.status === 'in_transit') {
        setTimeout(() => setReceiveOrder(order), 50); return;
      }
      if (opMode === 'issue' && order.status === 'at_pvz') {
        setTimeout(() => setIssueOrder(order), 50); return;
      }
      if (opMode === 'return' && (order.status === 'at_pvz' || order.status === 'expired')) {
        const pre = order.status === 'expired' ? 'Клиент не явился в срок' : '';
        setReturnInitialReason(pre);
        setTimeout(() => setReturnOrder(order), 50);
        return;
      }
      if (opMode === 'courier' && order.status === 'return_processed') {
        setTimeout(() => setCourierOrder(order), 50); return;
      }
    }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findOrderInState, timeNow, opMode]);

  const handleCameraDetected = useCallback((code: string) => {
    setShowCamera(false); setSearchInput(code); handleScan(code); toast.success(`Считан: ${code}`);
  }, [handleScan]);

  // ── Action handlers ───────────────────────────────────────────────────────

  function addLog(entry: Omit<UnifiedLog, 'id'>) {
    setScanLog(prev => [{ ...entry, id: `sl-${Date.now()}` }, ...prev].slice(0, 100));
  }

  function doReceive(order: PvzOrder, cell: string) {
    const now = new Date().toISOString();
    updateOrder(order.id, {
      status: 'at_pvz', storageCell: cell, arrivalDate: now,
      storageDeadline: new Date(Date.now() + order.storageDaysMax * 86400000).toISOString(),
      timeline: [...order.timeline, { ts: now, action: 'Принят на ПВЗ', actor: 'Иванов И.', note: `Ячейка ${cell}` }],
    });
    addLog({ orderNumber: order.orderNumber, mode:'receive', time:timeNow, operator:'Иванов И.', clientName:order.clientName, cell, success:true, amount:order.declaredValue });
    setReceivedToday(c => c + 1);
    setReceiveOrder(null); setFoundOrder(null); setSearchInput('');
    toast.success(`✅ ${order.orderNumber} принят → ячейка ${cell}`);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  }

  function doIssue(order: PvzOrder) {
    const now = new Date().toISOString();
    updateOrder(order.id, {
      status: 'issued', storageCell: null,
      timeline: [...order.timeline, { ts: now, action: 'Выдан клиенту', actor: 'Иванов И.' }],
    });
    addLog({ orderNumber: order.orderNumber, mode:'issue', time:timeNow, operator:'Иванов И.', clientName:order.clientName, success:true, amount:order.declaredValue });
    setIssuedToday(c => c + 1);
    setIssueOrder(null); setFoundOrder(null); setSearchInput('');
    toast.success(`✅ ${order.orderNumber} выдан клиенту`);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  }

  function doReturn(order: PvzOrder, reason: string) {
    const now = new Date().toISOString();
    updateOrder(order.id, {
      status: 'return_processed', returnReason: reason,
      timeline: [...order.timeline, { ts: now, action: 'Возврат оформлен', actor: 'Иванов И.', note: reason }],
    });
    addLog({ orderNumber: order.orderNumber, mode:'return', time:timeNow, operator:'Иванов И.', clientName:order.clientName, success:true, note:reason });
    setReturnsToday(c => c + 1);
    setReturnOrder(null); setFoundOrder(null); setSearchInput('');
    toast.success(`↩️ Возврат оформлен: ${order.orderNumber}`);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  }

  function doCourier(order: PvzOrder, courier: string) {
    const now = new Date().toISOString();
    updateOrder(order.id, {
      status: 'courier_transferred', storageCell: null,
      timeline: [...order.timeline, { ts: now, action: 'Передано курьеру', actor: 'Иванов И.', note: courier }],
    });
    addLog({ orderNumber: order.orderNumber, mode:'courier', time:timeNow, operator:'Иванов И.', clientName:order.clientName, success:true, note:courier });
    setCourierOrder(null); setFoundOrder(null); setSearchInput('');
    toast.success(`🚚 Передано курьеру ${courier}`);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  }

  function doMove(order: PvzOrder, cell: string) {
    const now = new Date().toISOString();
    updateOrder(order.id, {
      storageCell: cell,
      timeline: [...order.timeline, { ts: now, action: 'Перемещено', actor: 'Иванов И.', note: `Ячейка ${cell}` }],
    });
    addLog({ orderNumber: order.orderNumber, mode:'move', time:timeNow, operator:'Иванов И.', clientName:order.clientName, cell, success:true });
    setMoveOrder(null); setFoundOrder(prev => prev ? { ...prev, storageCell: cell } : null);
    toast.success(`Перемещено в ячейку ${cell}`);
  }

  // ── Quick action from Overview ────────────────────────────────────────────
  function goToScan(mode: OpScanMode) { setOpMode(mode); setActiveTab('operations'); }

  // ── Chat ──────────────────────────────────────────────────────────────────
  const handleSendMsg = () => {
    if (!msgInput.trim()) return;
    setMessages(prev => [...prev, { id:`m-${Date.now()}`, from:'Иванов И.П.', role:'Оператор', text:msgInput.trim(), time:timeNow, isOwn:true }]);
    setMsgInput('');
  };

  // ── Invite ────────────────────────────────────────────────────────────────
  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return;
    const token = Math.random().toString(36).slice(2,10).toUpperCase();
    setInviteLink(`https://platform.pvz.ru/invite/${pvz.code}?token=${token}&role=${inviteRole}`);
    setInviteSent(true);
  };
  const handleCopyLink = () => { copyToClipboard(inviteLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); };
  const resetInvite = () => { setInviteSent(false); setInviteLink(''); setInviteEmail(''); setLinkCopied(false); };

  // ── Auto-trigger action modal from foundOrder ─────────────────────────────
  function openActionForOrder(order: PvzOrder) {
    if (opMode === 'receive' || (opMode === 'universal' && order.status === 'in_transit')) { setReceiveOrder(order); return; }
    if (opMode === 'issue' || (opMode === 'universal' && order.status === 'at_pvz')) { setIssueOrder(order); return; }
    if (opMode === 'return' || (opMode === 'universal' && (order.status === 'expired'))) { openReturn(order, order.status === 'expired' ? 'Клиент не явился в срок' : ''); return; }
    if (opMode === 'courier' || (opMode === 'universal' && order.status === 'return_processed')) { setCourierOrder(order); return; }
    // fallback by status
    if (order.status === 'in_transit') setReceiveOrder(order);
    else if (order.status === 'at_pvz') setIssueOrder(order);
    else if (order.status === 'return_processed') setCourierOrder(order);
    else setReturnOrder(order);
  }

  const loadPct = Math.round((pvz.currentLoad / pvz.capacity) * 100);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Portal Modals ── */}
      <AnimatePresence>
        {showCamera && <CameraScanner onDetected={handleCameraDetected} onClose={() => setShowCamera(false)} />}
      </AnimatePresence>
      {receiveOrder && <ReceiveModal order={receiveOrder} onConfirm={cell => doReceive(receiveOrder, cell)} onClose={() => setReceiveOrder(null)} />}
      {issueOrder   && <IssueModal   order={issueOrder}   onConfirm={() => doIssue(issueOrder)}                onClose={() => setIssueOrder(null)}   />}
      {returnOrder  && <ReturnModal  order={returnOrder}   onConfirm={reason => doReturn(returnOrder, reason)}  onClose={() => { setReturnOrder(null); setReturnInitialReason(''); }} initialReason={returnInitialReason} />}
      {moveOrder    && <MoveModal    order={moveOrder}     onConfirm={cell => doMove(moveOrder, cell)}          onClose={() => setMoveOrder(null)}    />}
      {courierOrder && <CourierModal order={courierOrder}  onConfirm={c => doCourier(courierOrder, c)}          onClose={() => setCourierOrder(null)} />}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/pvz" className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{pvz.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${paused?'bg-orange-100 text-orange-700 border border-orange-200':'bg-green-100 text-green-700 border border-green-200'}`}>{paused?'Пауза':'Активен'}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[pvz.type]}`}>{TYPE_LABELS[pvz.type]}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap mt-0.5">
              <span className="font-mono font-semibold text-gray-700">{pvz.code}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{pvz.city}, {pvz.address}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{pvz.workingHours}</span>
            </div>
            {pvz.operator && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5" />Оператор: <span className="font-medium text-gray-700">{pvz.operator}</span>
                <span className="flex items-center gap-0.5 text-xs text-green-600"><Shield className="w-3 h-3" />Доступ открыт</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => goToScan('universal')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm">
            <ScanLine className="w-4 h-4" />Открыть сканер
          </button>
          <a href={`tel:${pvz.phone}`} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"><Phone className="w-4 h-4" />Позвонить</a>
          <button onClick={() => setActiveTab('chat')} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"><MessageSquare className="w-4 h-4" />Написать</button>
          <button onClick={() => setPaused(p=>!p)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors text-sm font-medium ${paused?'bg-green-600 hover:bg-green-700':'bg-orange-600 hover:bg-orange-700'}`}>
            {paused?<Play className="w-4 h-4" />:<Pause className="w-4 h-4" />}{paused?'Возобновить':'Пауза'}
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-start justify-between mb-3"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Truck className="w-5 h-5 text-blue-600" /></div><TrendingUp className="w-4 h-4 text-green-500" /></div>
          <p className="text-2xl font-bold text-gray-900">{receivedToday}</p><p className="text-sm font-medium text-gray-600">Принято сегодня</p><p className="text-xs text-gray-400">посылок / смена</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-start justify-between mb-3"><div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-600" /></div><TrendingUp className="w-4 h-4 text-green-500" /></div>
          <p className="text-2xl font-bold text-gray-900">{issuedToday}</p><p className="text-sm font-medium text-gray-600">Выдано сегодня</p><p className="text-xs text-gray-400">клиентам</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-start justify-between mb-3"><div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center"><Package className="w-5 h-5 text-purple-600" /></div></div>
          <p className="text-2xl font-bold text-gray-900">{pvz.currentLoad}</p><p className="text-sm font-medium text-gray-600">Ждут выдачи</p><p className="text-xs text-gray-400">из {pvz.capacity} ячеек</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-start justify-between mb-3"><div className={`w-10 h-10 ${pvz.overdueItems>0?'bg-orange-50':'bg-green-50'} rounded-xl flex items-center justify-center`}><AlertCircle className={`w-5 h-5 ${pvz.overdueItems>0?'text-orange-600':'text-green-600'}`} /></div></div>
          <p className={`text-2xl font-bold ${pvz.overdueItems>0?'text-orange-600':'text-gray-900'}`}>{pvz.overdueItems}</p><p className="text-sm font-medium text-gray-600">Просрочки</p><p className="text-xs text-gray-400">нужен возврат</p>
        </div>
      </div>

      {/* ── Current Shift ── */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-white" /></div>
            <div><p className="text-sm font-semibold text-white">Иванов Иван Петрович</p><p className="text-xs text-blue-200">Текущая смена · Начало: 09:00</p></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center"><p className="text-lg font-bold text-white">{receivedToday}</p><p className="text-xs text-blue-200">принято</p></div>
            <div className="text-center"><p className="text-lg font-bold text-white">{issuedToday}</p><p className="text-xs text-blue-200">выдано</p></div>
            <div className="text-center"><p className="text-lg font-bold text-white">{returnsToday}</p><p className="text-xs text-blue-200">возврат</p></div>
            {shiftClosed ? (
              <span className="px-4 py-2 bg-green-500/30 text-white rounded-lg text-sm font-medium border border-green-300/40">
                Закрыта в {shiftClosedAt}
              </span>
            ) : (
              <button
                onClick={() => {
                  const t = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                  setShiftClosed(true); setShiftClosedAt(t);
                  toast.success('Смена закрыта', { description: `Касса инкассирована в ${t}. Z-отчёт сформирован.` });
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-sm font-medium border border-white/30">
                Закрыть смену
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px min-w-max">
            {TAB_DEFS.map(tab => {
              const badges: Partial<Record<Tab, number>> = {
                inventory: pvzOrders.filter(o => (o.status === 'at_pvz' || o.status === 'expired') && o.pvzId === '1').length,
                issues:    pvzOrders.filter(o => o.status === 'at_pvz' && o.pvzId === '1').length,
                returns:   pvzOrders.filter(o => (o.status === 'expired' || o.status === 'return_processed') && o.pvzId === '1').length,
                chat: 2,
              };
              const badge = badges[tab.id];
              const isAlert = tab.id === 'returns' && (badge ?? 0) > 0;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-5 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors relative ${activeTab===tab.id?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                  {badge !== undefined && badge > 0 && (
                    <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab===tab.id ? 'bg-blue-100 text-blue-700' : isAlert ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ════════ OVERVIEW TAB (from PVZOperatorCabinet) ════════ */}
        {activeTab === 'overview' && (
          <div className="p-5 space-y-5">
            {/* Quick actions */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Быстрые действия</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:'Принять посылку',    icon:Truck,       color:'blue',   action:()=>goToScan('receive') },
                  { label:'Выдать клиенту',     icon:CheckCircle2,color:'green',  action:()=>goToScan('issue') },
                  { label:'Просрочки/Возврат',  icon:RotateCcw,   color:'orange', action:()=>setActiveTab('returns') },
                  { label:'Напечатать этикетку',icon:Printer,     color:'gray',   action:()=>window.print() },
                ].map((a,i) => {
                  const Icon = a.icon;
                  const cm: Record<string,string> = {
                    blue:'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                    green:'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
                    orange:'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
                    gray:'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
                  };
                  return (
                    <button key={i} onClick={a.action} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors text-sm font-medium ${cm[a.color]}`}>
                      <Icon className="w-5 h-5" />{a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent ops + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <History className="w-3.5 h-3.5" />Последние операции · {today}
                </p>
                <OperationsLog ops={mockOps.slice(0, 5)} />
                <button onClick={() => setActiveTab('operations')}
                  className="mt-3 w-full py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-1">
                  Показать все операции →
                </button>
              </div>

              <div className="space-y-4">
                {/* Load indicator */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Загрузка ПВЗ</p>
                  <div className="text-center mb-3">
                    <p className={`text-4xl font-black ${loadPct>=95?'text-red-600':loadPct>=85?'text-orange-600':'text-green-600'}`}>{loadPct}%</p>
                    <p className="text-xs text-gray-500">{pvz.currentLoad} из {pvz.capacity} ячеек</p>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${loadPct>=95?'bg-red-500':loadPct>=85?'bg-orange-500':'bg-green-500'}`}
                      style={{ width:`${Math.min(loadPct,100)}%` }} />
                  </div>
                  {loadPct>=95 && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />Критическая загрузка</p>}
                </div>

                {/* Quality */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Рейтинг качества</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black ${pvz.quality>=95?'bg-green-100 text-green-700':pvz.quality>=90?'bg-blue-100 text-blue-700':'bg-orange-100 text-orange-700'}`}>
                      {pvz.quality>=95?'A':pvz.quality>=90?'B':'C'}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{pvz.quality}%</p>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s<=Math.round(pvz.quality/20)?'text-yellow-400 fill-yellow-400':'text-gray-200'}`} />)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invite link */}
                <InviteLinkCard pvzCode={pvz.code} pvzName={pvz.name} />
              </div>
            </div>
          </div>
        )}

        {/* ════════ OPERATIONS TAB (full scanner from PVZScan) ════════ */}
        {activeTab === 'operations' && (
          <div className="p-5 space-y-5">
            {/* Stats strip */}
            <StatsStrip orders={pvzOrders} receivedToday={receivedToday} issuedToday={issuedToday} />

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
              {/* LEFT: scanner */}
              <div className="xl:col-span-3 space-y-4">

                {/* Op-mode selector */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {([
                    { id:'universal', label:'Авто',     sub:'Определяет сам',    icon:QrCode,       active:'bg-blue-600',   hover:'hover:border-blue-300' },
                    { id:'receive',   label:'Приёмка',  sub:'От курьера',         icon:PackageCheck,  active:'bg-indigo-600', hover:'hover:border-indigo-300' },
                    { id:'issue',     label:'Выдача',   sub:'Клиенту',            icon:ShoppingBag,  active:'bg-green-600',  hover:'hover:border-green-300' },
                    { id:'return',    label:'Возврат',  sub:'Оформить',           icon:RotateCcw,    active:'bg-orange-600', hover:'hover:border-orange-300' },
                    { id:'courier',   label:'Курьеру',  sub:'Передать возврат',   icon:Navigation,   active:'bg-purple-600', hover:'hover:border-purple-300' },
                    { id:'inventory', label:'Инвентарь',sub:'Ячейка → посылки',  icon:ClipboardList, active:'bg-teal-600',   hover:'hover:border-teal-300' },
                  ] as const).map(m => {
                    const Icon = m.icon;
                    const isActive = opMode === m.id;
                    return (
                      <button key={m.id} onClick={() => { setOpMode(m.id as OpScanMode); setFoundOrder(null); setSearchError(null); setSearchInput(''); }}
                        className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-xl transition-all ${isActive?`${m.active} border-transparent text-white shadow-md`:`bg-white border-gray-200 hover:shadow-sm ${m.hover}`}`}>
                        <Icon className={`w-5 h-5 ${isActive?'text-white':'text-gray-600'}`} />
                        <span className={`text-xs font-semibold ${isActive?'text-white':'text-gray-700'}`}>{m.label}</span>
                        <span className={`text-[10px] leading-tight text-center ${isActive?'text-white/75':'text-gray-400'}`}>{m.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Courier acceptance */}
                {(opMode==='receive'||opMode==='universal') && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <button onClick={() => setShowCourierForm(p=>!p)} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-amber-700" />
                        <span className="font-semibold text-amber-900">Приём от курьера</span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{courierName}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-amber-700 transition-transform ${showCourierForm?'rotate-180':''}`} />
                    </button>
                    {showCourierForm && (
                      <div className="mt-3 pt-3 border-t border-amber-200 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="block text-xs font-semibold text-amber-800 mb-1">Имя курьера</label>
                            <input value={courierName} onChange={e => setCourierName(e.target.value)} className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" /></div>
                          <div><label className="block text-xs font-semibold text-amber-800 mb-1">№ накладной</label>
                            <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-mono" /></div>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-100 rounded-lg p-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Сканируйте каждую посылку по отдельности. После окончания нажмите «Закрыть приёмку».</span>
                        </div>
                        {shipmentClosed ? (
                          <div className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium text-center">
                            ✓ Приёмка закрыта · {SHIPMENTS[0].parcels} посылок принято
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setShipmentClosed(true);
                              setReceivedToday(prev => prev + SHIPMENTS[0].parcels);
                              setShowCourierForm(false);
                              toast.success(`Приёмка закрыта · ${SHIPMENTS[0].parcels} посылок принято`, { description: `Накладная: ${invoiceNo}` });
                            }}
                            className="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium">
                            Закрыть приёмку ({SHIPMENTS[0].parcels} посылок)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Inventory mode */}
                {opMode === 'inventory' ? (
                  <InventoryScanPanel pvzOrders={pvzOrders} />
                ) : (
                  <div style={{display:'contents'}}>
                    {/* Scan method selector */}
                    <div className="flex gap-2 flex-wrap">
                      {([
                        { id:'usb' as ScanMode, label:'USB/BT-сканер', icon:Keyboard },
                        { id:'camera' as ScanMode, label:'Камера', icon:Camera },
                        { id:'manual' as ScanMode, label:'Ручной ввод', icon:Search },
                      ] as const).map(m => (
                        <button key={m.id} onClick={() => { setScanMode(m.id); if (m.id==='camera') setShowCamera(true); setTimeout(()=>scanInputRef.current?.focus(),100); }}
                          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${scanMode===m.id?'bg-blue-600 text-white border-blue-600 shadow-sm':'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
                          <m.icon className="w-4 h-4" />{m.label}
                        </button>
                      ))}
                    </div>

                    {/* Scan input */}
                    <div className="space-y-3">
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          {processing ? <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" /> : <Search className="w-5 h-5 text-gray-400" />}
                        </div>
                        <input ref={scanInputRef} value={searchInput}
                          onChange={e => { setSearchInput(e.target.value); setSearchError(null); }}
                          onKeyDown={e => e.key==='Enter' && handleScan(searchInput)}
                          placeholder="ORD · штрихкод · код выдачи · трек · телефон · имя клиента..."
                          className="w-full pl-12 pr-28 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 text-sm font-mono"
                          autoFocus />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5">
                          <button onClick={() => { setShowCamera(true); setScanMode('camera'); }} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors" title="Камера">
                            <Camera className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleScan(searchInput)} disabled={!searchInput.trim()||processing}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl text-xs font-semibold transition-colors">Найти</button>
                        </div>
                      </div>

                      {/* Demo chips */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-gray-400 font-medium">Демо:</span>
                        {pvzOrders.map(o => {
                          const sc = getStatusLabel(o.status);
                          const isDisabled = o.status === 'issued' || o.status === 'courier_transferred';
                          return (
                            <button key={o.id} onClick={() => !isDisabled && (setSearchInput(o.orderNumber), handleScan(o.orderNumber))}
                              disabled={isDisabled}
                              title={`${o.clientName} · ${sc.label}`}
                              className={`text-xs px-2.5 py-1 border rounded-lg transition-colors font-mono flex items-center gap-1.5 ${
                                isDisabled ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed' :
                                o.status === 'expired' ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' :
                                o.status === 'return_processed' ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' :
                                o.status === 'in_transit' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' :
                                'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                o.status === 'expired' ? 'bg-red-500' :
                                o.status === 'return_processed' ? 'bg-orange-500' :
                                o.status === 'in_transit' ? 'bg-indigo-500' :
                                o.status === 'at_pvz' ? 'bg-green-500' : 'bg-gray-300'
                              }`} />
                              {o.orderNumber.replace('ORD-2026-', '')}
                            </button>
                          );
                        })}
                        <button onClick={() => { setSearchInput('847291'); handleScan('847291'); }}
                          className="text-xs px-2.5 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-mono">📱 847291 QR</button>
                        <span className="text-[10px] text-gray-400 ml-1">
                          <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" /> в пути</span>
                          {' · '}
                          <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> на ПВЗ</span>
                          {' · '}
                          <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> просрочен</span>
                          {' · '}
                          <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" /> возврат</span>
                        </span>
                      </div>
                    </div>

                    {/* Error banner */}
                    <AnimatePresence>
                      {searchError && (
                        <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                          className={`rounded-2xl border p-4 flex items-start gap-3 ${
                            searchError.error==='already_issued'?'bg-gray-50 border-gray-200':
                            searchError.error==='wrong_pvz'?'bg-purple-50 border-purple-200':
                            searchError.error==='return_processed'?'bg-orange-50 border-orange-200':
                            'bg-red-50 border-red-200'}`}>
                          <span className="text-2xl shrink-0">{getErrorMessage(searchError.error).icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900">{getErrorMessage(searchError.error).title}</p>
                            <p className="text-sm text-gray-600 mt-0.5">{getErrorMessage(searchError.error).desc}</p>
                            {searchError.order && <p className="text-xs text-gray-400 mt-1 font-mono">{searchError.order.orderNumber} · {searchError.order.clientName}</p>}
                          </div>
                          <button onClick={() => setSearchError(null)}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Found order card */}
                    <AnimatePresence>
                      {foundOrder && (() => {
                        const sc = getStatusLabel(foundOrder.status);
                        const daysLeft = getDaysLeft(foundOrder.storageDeadline);
                        const isExpired = foundOrder.status === 'expired';
                        const isAtPvz   = foundOrder.status === 'at_pvz';
                        const isTransit = foundOrder.status === 'in_transit';
                        const isReturn  = foundOrder.status === 'return_processed';
                        const isSent    = foundOrder.status === 'courier_transferred';
                        const isIssued  = foundOrder.status === 'issued';
                        const cardBorder = isExpired ? 'border-red-300' : isAtPvz ? 'border-green-300' : isTransit ? 'border-indigo-300' : 'border-blue-200';
                        const headerBg   = isExpired ? 'bg-red-50 border-red-200' : isAtPvz ? 'bg-green-50 border-green-200' : isTransit ? 'bg-indigo-50 border-indigo-200' : isReturn ? 'bg-orange-50 border-orange-200' : isSent ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200';
                        return (
                          <motion.div key={foundOrder.id} initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:8 }}
                            className={`bg-white border-2 ${cardBorder} rounded-2xl overflow-hidden shadow-xl`}>

                            {/* Expired banner */}
                            {isExpired && (
                              <div className="flex items-center gap-3 px-5 py-3 bg-red-600 text-white">
                                <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
                                <div className="flex-1">
                                  <p className="font-bold text-sm">Срок хранения истёк! Требуется возврат.</p>
                                  <p className="text-xs text-red-200">Оформите возврат и укажите причину — она будет передана продавцу</p>
                                </div>
                                <span className="text-2xl">⏰</span>
                              </div>
                            )}

                            {/* Header */}
                            <div className={`flex items-center justify-between px-5 py-3.5 border-b ${headerBg}`}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-gray-900 text-sm">{foundOrder.orderNumber}</span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.color} ${sc.border}`}>{sc.label}</span>
                                {foundOrder.fragile && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">⚠ Хрупкое</span>}
                                {!foundOrder.isPrepaid && foundOrder.codAmount && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-300">💵 Наложка {foundOrder.codAmount.toLocaleString()}₽</span>}
                                {daysLeft !== null && daysLeft <= 1 && !isExpired && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300 animate-pulse">⚠ Срок истекает!</span>}
                              </div>
                              <button onClick={() => { setFoundOrder(null); setSearchInput(''); }} className="p-1.5 hover:bg-black/10 rounded-lg transition-colors ml-2 shrink-0">
                                <X className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>

                            <div className="p-5 space-y-4">

                              {/* Product image + info */}
                              <div className="flex gap-4">
                                <div className="shrink-0">
                                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 relative">
                                    {foundOrder.items.find(i => i.imageUrl)?.imageUrl ? (
                                      <img src={foundOrder.items.find(i => i.imageUrl)!.imageUrl!} alt={foundOrder.items[0].name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-300" /></div>
                                    )}
                                    {foundOrder.items.length > 1 && (
                                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">+{foundOrder.items.length - 1}</div>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-center text-gray-400 mt-1 max-w-[80px] truncate">{foundOrder.storeName}</p>
                                </div>
                                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Клиент</p>
                                    <p className="font-bold text-gray-900 text-sm leading-tight">{foundOrder.clientName}</p>
                                    <a href={`tel:${foundOrder.clientPhone}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Phone className="w-3 h-3" />{foundOrder.clientPhone}</a>
                                    {foundOrder.clientEmail && <p className="text-xs text-gray-400">{foundOrder.clientEmail}</p>}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Посылка</p>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600"><Package className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span>{foundOrder.totalItems} поз. · {foundOrder.weight} кг · {foundOrder.dimensions}</span></div>
                                    {foundOrder.storageCell && <div className="flex items-center gap-1.5"><Archive className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs font-black text-gray-800">Ячейка: {foundOrder.storageCell}</span></div>}
                                    {foundOrder.storageDeadline && (
                                      <div className={`flex items-center gap-1.5 text-xs ${isExpired ? 'text-red-600 font-bold' : daysLeft !== null && daysLeft <= 2 ? 'text-orange-600 font-semibold' : 'text-gray-500'}`}>
                                        <Calendar className="w-3.5 h-3.5" />
                                        {isExpired ? '⚠ Срок истёк' : `До: ${new Date(foundOrder.storageDeadline).toLocaleDateString('ru-RU')}`}
                                        {daysLeft !== null && !isExpired && ` · осталось ${daysLeft}д`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Items with images */}
                              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                <div className="px-4 py-2 border-b border-gray-100 bg-gray-100 flex items-center gap-2">
                                  <ShoppingBag className="w-3.5 h-3.5 text-gray-500" />
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Состав заказа · {foundOrder.items.length} поз.</p>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {foundOrder.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                                      {item.imageUrl
                                        ? <img src={item.imageUrl} alt={item.name} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-200" />
                                        : <div className="w-9 h-9 rounded-lg bg-gray-200 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-gray-400" /></div>
                                      }
                                      <span className="flex-1 text-sm text-gray-700 leading-tight">{item.name}</span>
                                      <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full shrink-0">× {item.qty}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t-2 border-gray-100">
                                  <span className="text-xs text-gray-500">Объявленная ценность</span>
                                  <span className="font-black text-gray-900">{foundOrder.declaredValue.toLocaleString()} ₽</span>
                                </div>
                              </div>

                              {/* Pickup code */}
                              {(isAtPvz || isIssued) && (
                                <div className="flex items-center justify-between bg-blue-50 border-2 border-blue-200 rounded-xl px-5 py-3">
                                  <div><p className="text-[10px] text-blue-500 uppercase font-bold tracking-wider">Код выдачи клиента</p><p className="text-3xl font-black text-blue-800 tracking-[0.25em]">{foundOrder.pickupCode}</p></div>
                                  <QrCode className="w-10 h-10 text-blue-400" />
                                </div>
                              )}

                              {/* COD */}
                              {!foundOrder.isPrepaid && foundOrder.codAmount && (
                                <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                                  <DollarSign className="w-6 h-6 text-green-600 shrink-0" />
                                  <div><p className="font-bold text-green-900">Наложенный платёж</p><p className="text-sm text-green-700">Получите от клиента: <span className="font-black text-xl">{foundOrder.codAmount.toLocaleString()} ₽</span></p></div>
                                </div>
                              )}

                              {/* Comment */}
                              {foundOrder.comment && (
                                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-300 rounded-xl">
                                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                  <p className="text-xs text-yellow-800 font-medium">{foundOrder.comment}</p>
                                </div>
                              )}

                              {/* Return reason */}
                              {(isReturn || isSent) && foundOrder.returnReason && (
                                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                                  <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                  <div><p className="text-xs font-bold text-orange-800 uppercase mb-0.5">Причина возврата</p><p className="text-sm text-orange-700">{foundOrder.returnReason}</p></div>
                                </div>
                              )}

                              {/* Timeline */}
                              {foundOrder.timeline.length > 0 && (
                                <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                                  <div className="px-4 py-2 border-b border-gray-100 bg-gray-100 flex items-center gap-2">
                                    <History className="w-3.5 h-3.5 text-gray-500" />
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">История заказа</p>
                                  </div>
                                  <div className="px-4 py-2 divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                    {[...foundOrder.timeline].reverse().map((tl, i) => (
                                      <div key={i} className="flex gap-3 py-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                        <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-800">{tl.action}</p>{tl.note && <p className="text-[10px] text-gray-500 mt-0.5">{tl.note}</p>}</div>
                                        <div className="text-right shrink-0"><p className="text-[10px] text-gray-400">{tl.actor}</p><p className="text-[10px] text-gray-400 font-mono">{new Date(tl.ts).toLocaleDateString('ru-RU', { day:'numeric', month:'short' })}</p></div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* ══ ACTIONS ══ */}
                              <div className="space-y-2 pt-1 border-t border-gray-100">

                                {isTransit && (
                                  <button onClick={() => setReceiveOrder(foundOrder)}
                                    className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-colors shadow-lg shadow-indigo-100">
                                    <Truck className="w-5 h-5" />Принять на ПВЗ — выбрать ячейку хранения
                                  </button>
                                )}

                                {isAtPvz && (
                                  <div className="space-y-2">
                                    <button onClick={() => setIssueOrder(foundOrder)}
                                      className="w-full flex items-center justify-center gap-3 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-black transition-colors shadow-lg shadow-green-100">
                                      <CheckCircle2 className="w-5 h-5" />Выдать клиенту — проверить код выдачи
                                    </button>
                                    <div className="grid grid-cols-3 gap-2">
                                      <button onClick={() => openReturn(foundOrder, '')}
                                        className="flex flex-col items-center gap-1.5 py-3 border-2 border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl text-xs font-bold transition-colors">
                                        <RotateCcw className="w-4 h-4" /><span>Возврат</span><span className="text-[10px] font-normal text-orange-400">выбрать причину</span>
                                      </button>
                                      <button onClick={() => setMoveOrder(foundOrder)}
                                        className="flex flex-col items-center gap-1.5 py-3 border-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors">
                                        <RefreshCw className="w-4 h-4" /><span>Переместить</span><span className="text-[10px] font-normal text-gray-400">другая ячейка</span>
                                      </button>
                                      <button onClick={() => window.print()}
                                        className="flex flex-col items-center gap-1.5 py-3 border-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors">
                                        <Printer className="w-4 h-4" /><span>Печать</span><span className="text-[10px] font-normal text-gray-400">этикетка</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {isExpired && (
                                  <div className="space-y-2">
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                                      <p className="text-xs text-red-700 font-medium">Клиент не забрал посылку в срок. Укажите причину — она будет передана продавцу.</p>
                                    </div>
                                    <button onClick={() => openReturn(foundOrder, 'Клиент не явился в срок')}
                                      className="w-full flex items-center justify-center gap-3 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black transition-colors shadow-lg shadow-red-100">
                                      <RotateCcw className="w-5 h-5" />Оформить возврат — выбрать причину
                                    </button>
                                  </div>
                                )}

                                {isReturn && (
                                  <div className="space-y-2">
                                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-center">
                                      <p className="text-xs text-orange-700 font-medium">Возврат оформлен. Передайте посылку курьеру для отправки на склад продавца.</p>
                                    </div>
                                    <button onClick={() => setCourierOrder(foundOrder)}
                                      className="w-full flex items-center justify-center gap-3 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-black transition-colors shadow-lg shadow-purple-100">
                                      <Navigation className="w-5 h-5" />Передать курьеру — выбрать курьера
                                    </button>
                                  </div>
                                )}

                                {isIssued && (
                                  <div className="flex items-center gap-3 p-4 bg-gray-100 rounded-xl">
                                    <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                                    <div><p className="font-bold text-gray-700">Заказ уже выдан клиенту</p><p className="text-xs text-gray-500">Операция завершена</p></div>
                                  </div>
                                )}

                                {isSent && (
                                  <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                    <Navigation className="w-6 h-6 text-purple-500 shrink-0" />
                                    <div><p className="font-bold text-purple-700">Посылка передана курьеру</p><p className="text-xs text-purple-500">Возврат на склад продавца оформлен</p></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>

                    {/* Empty state */}
                    {!foundOrder && !searchError && (
                      <div className={`border-2 border-dashed rounded-2xl p-8 text-center ${opMode==='return'?'bg-orange-50 border-orange-200':'bg-gray-50 border-gray-200'}`}>
                        {opMode==='return'
                          ? <RotateCcw className="w-10 h-10 text-orange-300 mx-auto mb-3" />
                          : <ScanLine className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        }
                        <p className={`font-semibold mb-1 ${opMode==='return'?'text-orange-700':'text-gray-600'}`}>
                          {opMode==='return' ? '🔴 Режим возврата активен' : 'Ожидание сканирования'}
                        </p>
                        <p className={`text-sm mb-4 ${opMode==='return'?'text-orange-600':'text-gray-400'}`}>
                          {opMode==='universal'&&'Авторежим: система автоматически определит нужное действие по статусу заказа'}
                          {opMode==='receive'&&'Режим приёмки: отсканируйте штрихкод посылки от курьера'}
                          {opMode==='issue'&&'Режим выдачи: попросите клиента показать QR или введите код выдачи'}
                          {opMode==='return'&&'Найдите заказ — откроется форма возврата с выбором причины'}
                          {opMode==='courier'&&'Передача курьеру: найдите посылку со статусом «Возврат оформлен»'}
                        </p>
                        {opMode==='return' && (
                          <div className="flex flex-wrap justify-center gap-2 mb-3">
                            {pvzOrders.filter(o => o.pvzId==='1' && (o.status==='at_pvz'||o.status==='expired')).map(o => (
                              <button key={o.id} onClick={() => { setSearchInput(o.orderNumber); handleScan(o.orderNumber); }}
                                className={`text-xs px-3 py-1.5 rounded-lg border font-mono font-medium transition-colors flex items-center gap-1.5 ${o.status==='expired'?'bg-red-100 border-red-300 text-red-700 hover:bg-red-200':'bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${o.status==='expired'?'bg-red-500':'bg-orange-500'}`} />
                                {o.orderNumber.replace('ORD-2026-','')}
                                {o.status==='expired'&&<span className="text-[10px]">⏰ Просрочен</span>}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
                          {['📦 Штрихкод посылки','📱 QR-код клиента','🔢 Код выдачи','📋 Номер заказа','📞 Телефон клиента'].map(t=>(
                            <span key={t} className="px-3 py-1 bg-white rounded-full border border-gray-200">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: scan log */}
              <div className="xl:col-span-2">
                <div className="sticky top-4">
                  <ScanLogPanel log={scanLog} />

                  {/* Ops summary */}
                  <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-3">Итог смены</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label:'Принято', v:receivedToday, cls:'bg-indigo-50 border-indigo-200 text-indigo-700' },
                        { label:'Выдано',  v:issuedToday,   cls:'bg-green-50 border-green-200 text-green-700'  },
                        { label:'Возврат', v:returnsToday,  cls:'bg-orange-50 border-orange-200 text-orange-700' },
                      ].map(s => (
                        <div key={s.label} className={`p-2 rounded-xl border text-center ${s.cls}`}>
                          <p className="text-lg font-bold">{s.v}</p><p className="text-[10px] font-medium">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════ INVENTORY TAB ════════ */}
        {activeTab === 'inventory' && (() => {
          const myOrders = pvzOrders.filter(o => (o.status === 'at_pvz' || o.status === 'expired') && o.pvzId === '1');
          const expiredList = myOrders.filter(o => o.status === 'expired');
          const atPvzList = myOrders.filter(o => o.status === 'at_pvz');
          return (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div><h3 className="font-semibold text-gray-900">Остатки на ПВЗ</h3><p className="text-sm text-gray-500">Хранится: {myOrders.length} посылок · {expiredList.length > 0 && <span className="text-red-600 font-medium">{expiredList.length} просрочено</span>}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => { setOpMode('inventory'); setActiveTab('operations'); }}
                    className="flex items-center gap-2 px-4 py-2 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium"><ClipboardList className="w-4 h-4" />Инвентаризация</button>
                  <button
                    onClick={() => {
                      if (myOrders.length === 0) { toast.info('Нет посылок для экспорта'); return; }
                      exportToCsv(myOrders as any[], [
                        { key: 'orderNumber',    label: 'Номер заказа' },
                        { key: 'trackingNumber', label: 'Трек' },
                        { key: 'pickupCode',     label: 'Код выдачи' },
                        { key: 'cell',           label: 'Ячейка' },
                        { key: 'status',         label: 'Статус' },
                        { key: 'customerName',   label: 'Клиент' },
                        { key: 'customerPhone',  label: 'Телефон' },
                        { key: 'updatedAt',      label: 'Обновлён' },
                      ], `inventory-${pvz.code}`);
                      toast.success(`Скачан CSV: ${myOrders.length} посылок`);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"><Download className="w-4 h-4" />Экспорт</button>
                </div>
              </div>

              {/* ── Expired alert block ── */}
              {expiredList.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-bold text-red-900">Срок хранения истёк — {expiredList.length} посылок</p>
                      <p className="text-xs text-red-700">Необходимо немедленно оформить возврат и передать курьеру</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {expiredList.map(order => {
                      const daysOver = getDaysStored(order.storageDeadline);
                      return (
                        <div key={order.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-200">
                          <ProductThumb items={order.items} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-gray-900">{order.orderNumber}</span>
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">⏰ Просрочен {daysOver > 0 ? `+${daysOver}д` : ''}</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-0.5">{order.clientName} · {order.storeName}</p>
                            <p className="text-xs text-gray-500 truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</p>
                          </div>
                          <div className="text-center shrink-0 mr-2">
                            <p className="text-[10px] text-gray-400 uppercase">Ячейка</p>
                            <p className="font-bold font-mono text-red-700">{order.storageCell}</p>
                          </div>
                          <div className="text-center shrink-0 mr-2">
                            <p className="text-[10px] text-gray-400 uppercase">Ценность</p>
                            <p className="font-bold text-gray-800">{order.declaredValue.toLocaleString()}₽</p>
                          </div>
                          <button
                            onClick={() => openReturn(order, 'Клиент не явился в срок')}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" />Оформить возврат
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Active at_pvz orders ── */}
              <div className="space-y-2">
                {atPvzList.length === 0 && expiredList.length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                    <Archive className="w-10 h-10 mx-auto mb-2" />
                    <p>Нет посылок на хранении</p>
                  </div>
                )}
                {atPvzList.map(order => {
                  const daysStored = getDaysStored(order.arrivalDate);
                  const daysLeft = getDaysLeft(order.storageDeadline);
                  const isAlmostExpired = daysLeft !== null && daysLeft <= 1;
                  return (
                    <div key={order.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-2xl transition-colors hover:shadow-sm ${isAlmostExpired ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                      <ProductThumb items={order.items} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono font-bold text-sm text-gray-900">{order.orderNumber}</span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">На ПВЗ</span>
                          {order.fragile && <span className="text-xs text-red-500 font-medium">⚠ Хрупкое</span>}
                          {!order.isPrepaid && order.codAmount && <span className="text-xs text-green-700 font-medium bg-green-100 px-2 py-0.5 rounded-full">💵 Наложка {order.codAmount.toLocaleString()}₽</span>}
                          {isAlmostExpired && <span className="text-xs text-orange-700 font-bold bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">⚠ Последний день!</span>}
                        </div>
                        <p className="text-sm font-medium text-gray-800">{order.clientName}</p>
                        <p className="text-xs text-gray-500">{order.storeName} · {order.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</p>
                        {order.comment && <p className="text-xs text-yellow-700 mt-0.5 font-medium">{order.comment}</p>}
                      </div>
                      <div className="flex items-center gap-4 sm:gap-3 shrink-0">
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase">Ячейка</p>
                          <p className="font-bold font-mono text-gray-900">{order.storageCell}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase">Дней</p>
                          <p className={`font-bold text-sm ${daysStored >= 5 ? 'text-red-600' : daysStored >= 3 ? 'text-orange-600' : 'text-green-600'}`}>{daysStored}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase">Осталось</p>
                          <p className={`font-bold text-sm ${daysLeft !== null && daysLeft <= 1 ? 'text-red-600' : daysLeft !== null && daysLeft <= 3 ? 'text-orange-600' : 'text-gray-700'}`}>
                            {daysLeft !== null ? `${daysLeft}д` : '—'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase">Ценность</p>
                          <p className="font-bold text-gray-800">{order.declaredValue.toLocaleString()}₽</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => setIssueOrder(order)}
                            className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors">
                            <ShoppingBag className="w-3.5 h-3.5" />Выдать
                          </button>
                          <button onClick={() => setMoveOrder(order)}
                            className="p-2 border border-gray-200 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors" title="Переместить">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openReturn(order, '')}
                            className="p-2 border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl transition-colors" title="Возврат">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ════════ SHIPMENTS TAB ════════ */}
        {activeTab === 'shipments' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Поставки сегодня</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">{SHIPMENTS.reduce((s,sh)=>s+sh.parcels,0)} посылок / {SHIPMENTS.reduce((s,sh)=>s+sh.weight,0).toFixed(1)} кг</span>
            </div>
            <div className="space-y-3">
              {SHIPMENTS.map(sh => (
                <div key={sh.id} className={`p-4 border rounded-xl ${sh.status==='pending'?'border-amber-200 bg-amber-50':'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sh.status==='pending'?'bg-amber-100':'bg-green-100'}`}><Truck className={`w-5 h-5 ${sh.status==='pending'?'text-amber-600':'text-green-600'}`} /></div>
                      <div>
                        <div className="flex items-center gap-2"><p className="font-semibold text-gray-900">{sh.courierName}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${sh.status==='received'?'bg-green-100 text-green-700':sh.status==='pending'?'bg-amber-100 text-amber-700':'bg-yellow-100 text-yellow-700'}`}>{sh.status==='received'?'Принято':sh.status==='pending'?'Ожидается':'Частично'}</span></div>
                        <p className="text-sm text-gray-500">{sh.courierPhone} · Накладная: <span className="font-mono font-medium text-gray-700">{sh.invoiceNo}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center"><p className="text-lg font-bold text-gray-900">{sh.parcels}</p><p className="text-xs text-gray-400">посылок</p></div>
                      <div className="text-center"><p className="text-lg font-bold text-gray-900">{sh.weight}</p><p className="text-xs text-gray-400">кг</p></div>
                      <div className="text-center"><p className="text-sm font-medium text-gray-900">{sh.receivedAt}</p><p className="text-xs text-gray-400">{sh.status==='pending'?'ожидаем':'принято'}</p></div>
                      {sh.status==='pending' && (
                        <button onClick={() => { setOpMode('receive'); setActiveTab('operations'); }}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1.5"><ScanLine className="w-4 h-4" />Начать приёмку</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════ ISSUES TAB ════════ */}
        {activeTab === 'issues' && (() => {
          const waitingOrders = pvzOrders.filter(o => o.status === 'at_pvz' && o.pvzId === '1');
          const issuedOrders = pvzOrders.filter(o => o.status === 'issued' && o.pvzId === '1');
          return (
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Выдачи</h3>
                  <p className="text-sm text-gray-500">
                    Выдано сегодня: <span className="font-semibold text-green-700">{issuedToday}</span> · Ожидают выдачи: <span className="font-semibold text-blue-700">{waitingOrders.length}</span>
                  </p>
                </div>
                <button onClick={() => { setOpMode('issue'); setActiveTab('operations'); }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                  <ScanLine className="w-4 h-4" />Сканировать для выдачи
                </button>
              </div>

              {/* Waiting for issue */}
              {waitingOrders.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Archive className="w-3.5 h-3.5" />Ожидают выдачи — {waitingOrders.length}
                  </p>
                  <div className="space-y-2">
                    {waitingOrders.map(order => {
                      const daysLeft = getDaysLeft(order.storageDeadline);
                      const urgent = daysLeft !== null && daysLeft <= 1;
                      return (
                        <div key={order.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-2 rounded-2xl transition-colors ${urgent ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm'}`}>
                          <ProductThumb items={order.items} size="lg" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono font-bold text-sm text-gray-900">{order.orderNumber}</span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">На ПВЗ</span>
                              {urgent && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-300">⚠ Срок истекает!</span>}
                              {order.fragile && <span className="text-xs text-red-500">⚠ Хрупкое</span>}
                              {!order.isPrepaid && order.codAmount && <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">💵 {order.codAmount.toLocaleString()}₽ наложка</span>}
                            </div>
                            <p className="text-sm font-medium text-gray-800">{order.clientName}</p>
                            <p className="text-xs text-gray-500">{order.clientPhone} · {order.storeName}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-gray-500 flex items-center gap-1"><Archive className="w-3 h-3" />Ячейка: <span className="font-bold font-mono text-gray-800">{order.storageCell}</span></span>
                              <span className="text-xs text-gray-500 flex items-center gap-1"><Tag className="w-3 h-3" />Код: <span className="font-bold font-mono text-blue-700">{order.pickupCode}</span></span>
                              {daysLeft !== null && <span className={`text-xs font-medium ${daysLeft <= 1 ? 'text-red-600' : daysLeft <= 3 ? 'text-orange-600' : 'text-gray-500'}`}>⏱ Осталось: {daysLeft}д</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</p>
                          </div>
                          <div className="text-right shrink-0 mr-2">
                            <p className="font-bold text-gray-900">{order.declaredValue.toLocaleString()}₽</p>
                            <p className="text-xs text-gray-400">{order.weight} кг</p>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button onClick={() => setIssueOrder(order)}
                              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors">
                              <ShoppingBag className="w-4 h-4" />Выдать клиенту
                            </button>
                            <button onClick={() => openReturn(order, '')}
                              className="flex items-center gap-1.5 px-3 py-2 border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl text-xs font-medium transition-colors">
                              <RotateCcw className="w-3.5 h-3.5" />Оформить возврат
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Already issued today */}
              {issuedOrders.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />Выдано — {issuedOrders.length}
                  </p>
                  <div className="space-y-2">
                    {issuedOrders.map(order => (
                      <div key={order.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
                        <ProductThumb items={order.items} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-gray-700">{order.orderNumber}</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Выдано</span>
                          </div>
                          <p className="text-xs text-gray-500">{order.clientName} · {order.items.map(i => i.name).slice(0,2).join(', ')}</p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                        <p className="text-sm font-semibold text-gray-700 shrink-0">{order.declaredValue.toLocaleString()}₽</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {waitingOrders.length === 0 && issuedOrders.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2" />
                  <p>Нет заказов для выдачи</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ════════ RETURNS TAB ════════ */}
        {activeTab === 'returns' && (() => {
          const expiredNeedReturn = pvzOrders.filter(o => o.status === 'expired' && o.pvzId === '1');
          const returnProcessed = pvzOrders.filter(o => o.status === 'return_processed' && o.pvzId === '1');
          const courierTransferred = pvzOrders.filter(o => o.status === 'courier_transferred' && o.pvzId === '1');
          return (
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Возвраты</h3>
                  <p className="text-sm text-gray-500">
                    Требуют оформления: <span className="font-semibold text-red-700">{expiredNeedReturn.length}</span> · Готовы к передаче: <span className="font-semibold text-orange-700">{returnProcessed.length}</span> · Передано: <span className="font-semibold text-purple-700">{courierTransferred.length}</span>
                  </p>
                </div>
                <button onClick={() => { setOpMode('return'); setActiveTab('operations'); }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                  <ScanLine className="w-4 h-4" />Сканировать для возврата
                </button>
              </div>

              {/* ── Section 1: Need return processing (expired) ── */}
              {expiredNeedReturn.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />Требуют оформления возврата — {expiredNeedReturn.length}
                  </p>
                  <div className="space-y-2">
                    {expiredNeedReturn.map(order => (
                      <div key={order.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-2 border-red-300 bg-red-50 rounded-2xl">
                        <ProductThumb items={order.items} size="lg" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono font-bold text-sm text-gray-900">{order.orderNumber}</span>
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-300">⏰ Срок истёк</span>
                          </div>
                          <p className="text-sm font-medium text-gray-800">{order.clientName} · <a href={`tel:${order.clientPhone}`} className="text-blue-600 hover:underline">{order.clientPhone}</a></p>
                          <p className="text-xs text-gray-500">{order.storeName} · Ячейка: <span className="font-mono font-bold text-red-700">{order.storageCell}</span></p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</p>
                        </div>
                        <div className="text-center shrink-0">
                          <p className="text-[10px] text-gray-400">Ценность</p>
                          <p className="font-bold text-gray-900">{order.declaredValue.toLocaleString()}₽</p>
                        </div>
                        <button onClick={() => openReturn(order, 'Клиент не явился в срок')}
                          className="shrink-0 flex items-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-colors">
                          <RotateCcw className="w-4 h-4" />Выбрать причину и оформить
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Section 2: Return processed — awaiting courier ── */}
              {returnProcessed.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5" />Возврат оформлен — ожидают курьера ({returnProcessed.length})
                  </p>
                  <div className="space-y-2">
                    {returnProcessed.map(order => (
                      <div key={order.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-orange-200 bg-orange-50 rounded-2xl">
                        <ProductThumb items={order.items} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono font-bold text-sm text-gray-900">{order.orderNumber}</span>
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full border border-orange-200">Возврат оформлен</span>
                          </div>
                          <p className="text-sm text-gray-700">{order.clientName} · {order.storeName}</p>
                          {order.returnReason && (
                            <p className="text-xs text-orange-700 font-medium mt-0.5 flex items-center gap-1">
                              <Info className="w-3 h-3" />Причина: {order.returnReason}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</p>
                        </div>
                        <div className="text-center shrink-0">
                          <p className="text-[10px] text-gray-400">Ценность</p>
                          <p className="font-bold text-gray-900">{order.declaredValue.toLocaleString()}₽</p>
                        </div>
                        <button onClick={() => setCourierOrder(order)}
                          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-colors">
                          <Navigation className="w-4 h-4" />Передать курьеру
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Section 3: Already sent to courier ── */}
              {courierTransferred.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5" />Передано курьеру — {courierTransferred.length}
                  </p>
                  <div className="space-y-2">
                    {courierTransferred.map(order => (
                      <div key={order.id} className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                        <ProductThumb items={order.items} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-gray-700">{order.orderNumber}</span>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Передано курьеру</span>
                          </div>
                          <p className="text-xs text-gray-500">{order.clientName} · {order.storeName}</p>
                          {order.returnReason && <p className="text-xs text-gray-400">{order.returnReason}</p>}
                        </div>
                        <CheckCircle className="w-5 h-5 text-purple-500 shrink-0" />
                        <p className="text-sm font-bold text-gray-700 shrink-0">{order.declaredValue.toLocaleString()}₽</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expiredNeedReturn.length === 0 && returnProcessed.length === 0 && courierTransferred.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <RotateCcw className="w-10 h-10 mx-auto mb-2" />
                  <p>Нет активных возвратов</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ════════ STAFF TAB ════════ */}
        {activeTab === 'staff' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-semibold text-gray-900">Персонал ПВЗ</h3><p className="text-sm text-gray-500">Сотрудники и их доступ</p></div>
              <button onClick={() => setActiveTab('settings')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"><Plus className="w-4 h-4" />Пригласить</button>
            </div>
            {/* Active operator */}
            {pvz.operator && (
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-all mb-3">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">{pvz.operator.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900">{pvz.operator}</p><p className="text-xs text-gray-500">{pvz.operatorEmail}</p></div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">Оператор ПВЗ</span>
                  <span className="flex items-center gap-0.5 px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium"><Shield className="w-3 h-3" />Активен</span>
                </div>
                <div className="relative">
                  <button onClick={() => setActionsMenuOpenForId(actionsMenuOpenForId === 'main-operator' ? null : 'main-operator')}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Действия"><MoreHorizontal className="w-4 h-4" /></button>
                  {actionsMenuOpenForId === 'main-operator' && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-48">
                      <a href={`mailto:${pvz.operatorEmail}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Mail className="w-3.5 h-3.5" />Написать email
                      </a>
                      <button onClick={() => { setActiveTab('settings'); setActionsMenuOpenForId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                        <Settings className="w-3.5 h-3.5" />Настройки доступа
                      </button>
                      <button onClick={() => { copyToClipboard(pvz.operatorEmail); toast.success('Email скопирован'); setActionsMenuOpenForId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                        <Copy className="w-3.5 h-3.5" />Скопировать email
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {STAFF.map(member => (
                <div key={member.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">{member.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5"><p className="font-semibold text-gray-900">{member.name}</p>
                      <span className={`w-2 h-2 rounded-full ${member.status==='active'?'bg-green-500':member.status==='break'?'bg-yellow-500':'bg-gray-300'}`} />
                      <span className="text-xs text-gray-500">{member.status==='active'?'В работе':member.status==='break'?'Перерыв':'Не в смене'}</span>
                    </div>
                    <p className="text-sm text-gray-500">{member.role} · {member.phone}</p>
                  </div>
                  <div className="text-center shrink-0"><p className="text-lg font-bold text-blue-600">{member.received}</p><p className="text-xs text-gray-400">принято</p></div>
                  <div className="text-center shrink-0"><p className="text-lg font-bold text-green-600">{member.issued}</p><p className="text-xs text-gray-400">выд��но</p></div>
                  <div className="text-center shrink-0"><p className="text-sm font-medium text-gray-700">{member.shiftStart}</p><p className="text-xs text-gray-400">начало смены</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════ CASH TAB ════════ */}
        {activeTab === 'cash' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-semibold text-gray-900">Касса смены</h3>
                <p className="text-sm text-gray-500">Остаток: <span className="font-bold text-green-700">{formatCurrency(CASH_ENTRIES.reduce((s,e)=>e.type==='income'?s+e.amount:s-e.amount,5000))}</span></p></div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (CASH_ENTRIES.length === 0) { toast.info('Касса пуста'); return; }
                    exportToCsv(CASH_ENTRIES as any[], [
                      { key: 'time',        label: 'Время' },
                      { key: 'type',        label: 'Тип' },
                      { key: 'description', label: 'Описание' },
                      { key: 'amount',      label: 'Сумма' },
                      { key: 'operator',    label: 'Оператор' },
                    ], `cash-report-${pvz.code}`);
                    toast.success(`Скачан кассовый отчёт: ${CASH_ENTRIES.length} операций`);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium"><Download className="w-4 h-4" />Отчёт</button>
                {encashmentRequested ? (
                  <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                    <Check className="w-4 h-4" />Инкассация запрошена в {encashmentRequestedAt}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      const t = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                      setEncashmentRequested(true); setEncashmentRequestedAt(t);
                      toast.success('Инкассация запущена', { description: 'Курьер банка приедет в течение часа.' });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><CreditCard className="w-4 h-4" />Инкассация</button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4"><p className="text-xs text-green-600 mb-1 flex items-center gap-1"><ArrowDownLeft className="w-3 h-3" />Поступления</p><p className="text-xl font-bold text-green-700">{formatCurrency(CASH_ENTRIES.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0))}</p></div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4"><p className="text-xs text-red-600 mb-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />Расходы</p><p className="text-xl font-bold text-red-700">{formatCurrency(CASH_ENTRIES.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0))}</p></div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><p className="text-xs text-blue-600 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Начальная касса</p><p className="text-xl font-bold text-blue-700">₽5 000</p></div>
            </div>
            <div className="space-y-2">
              {CASH_ENTRIES.map(entry => (
                <div key={entry.id} className="flex items-center gap-4 p-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${entry.type==='income'?'bg-green-100':'bg-red-100'}`}>{entry.type==='income'?<ArrowDownLeft className="w-4 h-4 text-green-600" />:<ArrowUpRight className="w-4 h-4 text-red-600" />}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900">{entry.description}</p><p className="text-xs text-gray-400">{entry.operator}</p></div>
                  <p className="text-sm text-gray-400">{entry.time}</p>
                  <p className={`font-bold ${entry.type==='income'?'text-green-700':'text-red-700'}`}>{entry.type==='income'?'+':'−'}{formatCurrency(entry.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════ CHAT TAB ════════ */}
        {activeTab === 'chat' && (
          <div className="p-5">
            <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden" style={{ height:'520px' }}>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="font-semibold text-gray-900">Чат: {pvz.code} ↔ Диспетчер</span></div>
                <div className="flex items-center gap-2 text-xs text-gray-500"><Bell className="w-3.5 h-3.5" /><span>{messages.length} сообщений</span></div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.isOwn?'flex-row-reverse':''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${msg.isOwn?'bg-blue-600':msg.role==='Диспетчер'?'bg-purple-500':msg.role==='Курьер'?'bg-amber-500':'bg-teal-500'}`}>{msg.from.split(' ')[0][0]}</div>
                    <div className={`max-w-[75%] flex flex-col gap-0.5 ${msg.isOwn?'items-end':'items-start'}`}>
                      <div className={`flex items-center gap-1.5 ${msg.isOwn?'flex-row-reverse':''}`}><span className="text-xs font-semibold text-gray-700">{msg.from}</span><span className="text-xs text-gray-400">{msg.time}</span></div>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${msg.isOwn?'bg-blue-600 text-white rounded-tr-sm':'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>{msg.text}</div>
                    </div>
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>
              <div className="p-3 border-t border-gray-200 bg-gray-50 shrink-0">
                <div className="flex gap-2">
                  <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSendMsg()}
                    placeholder="Написать диспетчеру..." className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  <button onClick={handleSendMsg} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium text-sm"><Send className="w-4 h-4" />Отправить</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════ AUDIT TAB ════════ */}
        {activeTab === 'audit' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Журнал аудита</h3>
              <button
                onClick={() => {
                  if (AUDIT_ENTRIES.length === 0) { toast.info('Журнал пуст'); return; }
                  exportToCsv(AUDIT_ENTRIES as any[], [
                    { key: 'time',    label: 'Время' },
                    { key: 'action',  label: 'Действие' },
                    { key: 'actor',   label: 'Оператор' },
                    { key: 'details', label: 'Детали' },
                    { key: 'ip',      label: 'IP' },
                    { key: 'level',   label: 'Уровень' },
                  ], `audit-${pvz.code}`);
                  toast.success(`Скачан CSV: ${AUDIT_ENTRIES.length} событий`);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium"><Download className="w-4 h-4" />Экспорт</button>
            </div>
            <div className="space-y-2">
              {AUDIT_LOG.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${entry.level==='critical'?'bg-red-100':entry.level==='warning'?'bg-orange-100':'bg-blue-100'}`}>
                    <Shield className={`w-4 h-4 ${entry.level==='critical'?'text-red-600':entry.level==='warning'?'text-orange-600':'text-blue-600'}`} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{entry.action}</span><span className="text-sm font-medium text-gray-900">{entry.actor}</span></div>
                    <p className="text-sm text-gray-600 mt-0.5">{entry.details}</p><p className="text-xs text-gray-400 mt-0.5">IP: {entry.ip}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{entry.time}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════ DOCUMENTS TAB ════════ */}
        {activeTab === 'documents' && (() => {
          const pvzDocs: DocumentRecord[] = [
            { id: 'pvz-doc-1', name: 'Договор аренды помещения', type: 'PDF', size: '3.2 МБ', date: '15.01.2025', status: 'signed', signedBy: 'Иванов А.С.', signedAt: '15.01.2025', number: 'ДА-2025/001',
              content: { title: 'Договор аренды помещения', subtitle: 'ПВЗ Тверская — MSK-001', number: 'ДА-2025/001', date: '15.01.2025', organization: 'ООО «ПВЗ-Ритейл»',
                headerFields: [{ label: 'Арендатор', value: 'ООО «ПВЗ-Ритейл»' }, { label: 'Арендодатель', value: 'ООО «Тверская Недвижимость»' }, { label: 'Площадь', value: '85 м²' }, { label: 'Срок', value: '36 мес.' }],
                tableHeaders: ['Условие', 'Значение'], tableRows: [['Ежемесячная аренда', '185 000 ₽'], ['Залог', '370 000 ₽'], ['Коммунальные', 'Включены'], ['Страховка', 'За счёт арендатора'], ['Ремонт', 'Текущий — арендатор']],
                signatures: [{ role: 'Арендатор', name: 'Иванов А.С.', signed: true, date: '15.01.2025' }, { role: 'Арендодатель', name: 'Смирнова Е.В.', signed: true, date: '15.01.2025' }], stamp: 'Печать ООО «ПВЗ-Ритейл»', qrCode: true }},
            { id: 'pvz-doc-2', name: 'Лицензия на торговую деятельность', type: 'PDF', size: '1.8 МБ', date: '20.02.2025', status: 'signed', signedBy: 'ФНС России', signedAt: '20.02.2025', number: 'ЛИЦ-77-2025/0412',
              content: { title: 'Лицензия на торговую деятельность', number: 'ЛИЦ-77-2025/0412', date: '20.02.2025', organization: 'ФНС России',
                headerFields: [{ label: 'Лицензиат', value: 'ООО «ПВЗ-Ритейл»' }, { label: 'ИНН', value: '7701234567' }, { label: 'Действует до', value: '20.02.2028' }],
                tableHeaders: ['Параметр', 'Значение'], tableRows: [['Вид деятельности', 'Розничная торговля / выдача заказов'], ['Регион', 'г. Москва'], ['Адрес', 'ул. Тверская, 12']],
                signatures: [{ role: 'Руководитель ИФНС', name: 'Козлов П.Д.', signed: true, date: '20.02.2025' }], stamp: 'Печать ИФНС №77', qrCode: true }},
            { id: 'pvz-doc-3', name: 'Акт пожарной проверки', type: 'PDF', size: '0.9 МБ', date: '10.03.2026', status: 'signed', signedBy: 'МЧС — Инспектор Белов', signedAt: '10.03.2026', number: 'АПП-2026/087',
              content: { title: 'Акт пожарной проверки', subtitle: 'Плановая проверка', number: 'АПП-2026/087', date: '10.03.2026', organization: 'МЧС России',
                headerFields: [{ label: 'Объект', value: 'ПВЗ Тверская' }, { label: 'Адрес', value: 'ул. Тверская, 12' }, { label: 'Результат', value: 'Соответствует' }],
                tableHeaders: ['Проверка', 'Результат'], tableRows: [['Огнетушители', '✓ В норме (4 шт.)'], ['Эвакуационные выходы', '✓ Свободны'], ['Пожарная сигнализация', '✓ Исправна'], ['План эвакуации', '✓ Актуален']],
                signatures: [{ role: 'Инспектор МЧС', name: 'Белов А.Н.', signed: true, date: '10.03.2026' }], notes: ['Следующая проверка: 10.03.2027'] }},
            { id: 'pvz-doc-4', name: 'Договор на охранные услуги', type: 'PDF', size: '2.1 МБ', date: '01.04.2025', status: 'signed', signedBy: 'Иванов А.С.', signedAt: '01.04.2025', number: 'ОХ-2025/034',
              content: { title: 'Договор на охранные услуги', number: 'ОХ-2025/034', date: '01.04.2025', organization: 'ООО «Щит-Секьюрити»',
                headerFields: [{ label: 'Исполнитель', value: 'ООО «Щит-Секьюрити»' }, { label: 'Заказчик', value: 'ООО «ПВЗ-Ритейл»' }],
                tableHeaders: ['Услуга', 'Стоимость/мес.'], tableRows: [['Видеонаблюдение (8 камер)', '15 000 ₽'], ['Пультовая охрана', '8 000 ₽'], ['Тревожная кнопка', '3 000 ₽'], ['Техобслуживание', '5 000 ₽']],
                totalRow: ['Итого', '31 000 ₽'],
                signatures: [{ role: 'Заказчик', name: 'Иванов А.С.', signed: true, date: '01.04.2025' }, { role: 'Исполнитель', name: 'Краснов В.В.', signed: true, date: '01.04.2025' }] }},
            { id: 'pvz-doc-5', name: 'Сертификат СЭС (санитарная проверка)', type: 'PDF', size: '0.7 МБ', date: '05.06.2025', status: 'pending', number: 'СЭС-2025/1120',
              content: { title: 'Санитарно-эпидемиологическое заключение', number: 'СЭС-2025/1120', date: '05.06.2025', organization: 'Роспотребнадзор',
                headerFields: [{ label: 'Объект', value: 'ПВЗ Тверская' }, { label: 'Статус', value: 'Ожидает подписания' }],
                tableHeaders: ['Параметр', 'Норма', 'Факт'], tableRows: [['Температура', '18-25°C', '22°C'], ['Влажность', '40-60%', '48%'], ['Освещённость', '>300 lx', '450 lx'], ['Вентиляция', 'Приточно-вытяжная', 'Есть']],
                signatures: [{ role: 'Инспектор', name: 'Петрова М.А.', signed: false }], notes: ['Ожидает финального подписания инспектором'] }},
            { id: 'pvz-doc-6', name: 'Страховой полис (имущество)', type: 'PDF', size: '1.5 МБ', date: '01.01.2026', status: 'signed', signedBy: 'СК «Ингосстрах»', signedAt: '01.01.2026', number: 'СП-2026/00567',
              content: { title: 'Страховой полис имущества', number: 'СП-2026/00567', date: '01.01.2026', organization: 'СК «Ингосстрах»',
                headerFields: [{ label: 'Страхователь', value: 'ООО «ПВЗ-Ритейл»' }, { label: 'Покрытие', value: '5 000 000 ₽' }, { label: 'Действует до', value: '31.12.2026' }],
                tableHeaders: ['Риск', 'Покрытие'], tableRows: [['Пожар', '5 000 000 ₽'], ['Затопление', '3 000 000 ₽'], ['Кража', '2 000 000 ₽'], ['Порча товара', '1 000 000 ₽']],
                totalRow: ['Премия', '48 000 ₽/год'],
                signatures: [{ role: 'Страхователь', name: 'Иванов А.С.', signed: true, date: '01.01.2026' }, { role: 'Страховщик', name: 'СК «Ингосстрах»', signed: true, date: '01.01.2026' }], qrCode: true }},
            { id: 'pvz-doc-7', name: 'Акт приёмки оборудования', type: 'PDF', size: '1.1 МБ', date: '20.01.2025', status: 'signed', signedBy: 'Иванов А.С.', signedAt: '20.01.2025', number: 'АПО-2025/003',
              content: { title: 'Акт приёмки оборудования', number: 'АПО-2025/003', date: '20.01.2025', organization: 'ООО «ПВЗ-Ритейл»',
                headerFields: [{ label: 'Поставщик', value: 'ООО «ТехноСклад»' }, { label: 'Получатель', value: 'ПВЗ Тверская' }],
                tableHeaders: ['№', 'Наименование', 'Кол-во', 'Состояние'], tableRows: [['1', 'Стеллаж складской 200×100', '8', 'Без замечаний'], ['2', 'Сканер ШК Zebra DS2208', '3', 'Без замечаний'], ['3', 'Термопринтер этикеток', '2', 'Без замечаний'], ['4', 'ПК + монитор (рабочее место)', '2', 'Без замечаний'], ['5', 'Камера видеонаблюдения', '8', 'Без замечаний']],
                signatures: [{ role: 'Поставщик', name: 'Кузнецов Д.А.', signed: true, date: '20.01.2025' }, { role: 'Получатель', name: 'Иванов А.С.', signed: true, date: '20.01.2025' }] }},
          ];
          return (
            <PvzDocumentsTab docs={pvzDocs} />
          );
        })()}

        {/* ════════ SETTINGS TAB ════════ */}
        {activeTab === 'settings' && (
          <div className="p-5 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Основные настройки</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[['Название ПВЗ', pvz.name],['Код ПВЗ',pvz.code],['Часы работы',pvz.workingHours],['Вместимость (ячеек)',String(pvz.capacity)],['Телефон ПВЗ',pvz.phone],[`Адрес`,`${pvz.city}, ${pvz.address}`]].map(([label,val],i) => (
                  <div key={i}><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    <input defaultValue={val} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" /></div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => {
                    const t = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    setPvzSettingsSavedAt(t);
                    toast.success('Настройки ПВЗ сохранены', { description: `Изменения применены в ${t}` });
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
                  Сохранить изменения
                </button>
                {pvzSettingsSavedAt && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600">
                    <Check className="w-3.5 h-3.5" />Сохранено в {pvzSettingsSavedAt}
                  </span>
                )}
              </div>
            </div>

            <hr className="border-gray-200" />

            <div>
              <div className="flex items-center gap-2 mb-1"><Shield className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-gray-900">Пригласить оператора / сотрудника</h3></div>
              <p className="text-sm text-gray-500 mb-4">Отправьте сотруднику приглашение по email с персональной ссылкой для регистрации в ПВЗ {pvz.code}.</p>
              {!inviteSent ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-semibold text-blue-800 mb-1.5 flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Email сотрудника *</label>
                      <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="operator@example.com" className="w-full px-4 py-2.5 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" /></div>
                    <div><label className="block text-sm font-semibold text-blue-800 mb-1.5 flex items-center gap-1"><Shield className="w-3.5 h-3.5" />Роль</label>
                      <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full px-4 py-2.5 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                        <option value="PVZOperator">Оператор ПВЗ</option>
                        <option value="PVZSenior">Старший оператор</option>
                        <option value="PVZManager">Управляющий ПВЗ</option>
                        <option value="Partner">Партнёр (франчайзи)</option>
                      </select></div>
                  </div>
                  <button onClick={handleSendInvite} disabled={!inviteEmail.trim()} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />Отправить приглашение на {inviteEmail||'email...'}
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                    <div><p className="font-semibold text-green-900">Приглашение отправлено!</p><p className="text-sm text-green-700 mt-0.5">Письмо направлено на <span className="font-semibold">{inviteEmail}</span>. Ссылка активна 72 часа.</p></div>
                  </div>
                  <div className="bg-white border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Link2 className="w-4 h-4 text-blue-600" />Ссылка для регистрации</p>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs text-gray-700 overflow-x-auto whitespace-nowrap">{inviteLink}</div>
                      <button onClick={handleCopyLink} className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5 transition-all ${linkCopied?'bg-green-600 text-white':'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                        {linkCopied?<span style={{display:'contents'}}><Check className="w-4 h-4" />Скопировано</span>:<span style={{display:'contents'}}><Copy className="w-4 h-4" />Копировать</span>}</button>
                    </div>
                  </div>
                  <button onClick={resetInvite} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"><Plus className="w-4 h-4" />Пригласить ещё одного</button>
                </div>
              )}
            </div>

            <hr className="border-gray-200" />

            <div>
              <h3 className="font-semibold text-red-600 mb-3">Опасная зона</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-orange-200 rounded-xl">
                  <div><p className="font-medium text-gray-900">Поставить ПВЗ на паузу</p><p className="text-sm text-gray-500">Временно прекращает приём новых посылок</p></div>
                  <button onClick={() => setPaused(p=>!p)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${paused?'bg-green-600 text-white hover:bg-green-700':'border border-orange-300 text-orange-600 hover:bg-orange-50'}`}>{paused?'Возобновить работу':'Поставить на паузу'}</button>
                </div>
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-xl">
                  <div><p className="font-medium text-gray-900">Закрыть ПВЗ</p><p className="text-sm text-gray-500">Полная деактивация. Требует подтверждения руководства</p></div>
                  <button onClick={() => { if (confirm('Полностью деактивировать этот ПВЗ?')) toast.success('Запрос на закрытие ПВЗ отправлен руководству'); }} className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">Закрыть ПВЗ</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Info Footer (from PVZOperatorCabinet) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><p className="text-xs text-gray-400 mb-1">Телефон</p>
            <a href={`tel:${pvz.phone}`} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{pvz.phone}</a></div>
          <div><p className="text-xs text-gray-400 mb-1">Режим работы</p>
            <p className="text-sm font-medium text-gray-700 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" />{pvz.workingHours}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">Код ПВЗ</p><p className="text-sm font-mono font-bold text-gray-700">{pvz.code}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">Тип</p><span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${TYPE_COLORS[pvz.type]}`}>{TYPE_LABELS[pvz.type]}</span></div>
        </div>
      </div>
    </div>
  );
}
