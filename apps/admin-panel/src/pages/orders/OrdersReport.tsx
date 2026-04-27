import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  FileText, Download, TrendingUp, TrendingDown, Package,
  CheckCircle2, XCircle, Clock, AlertTriangle, RotateCcw,
  Truck, MapPin, Store, Bike, Building2, Calendar,
  Users, DollarSign, Star, Filter, Search, ChevronDown,
  ArrowUpRight, ArrowDownRight, BarChart2, Activity,
  BadgeCheck, Zap, CircleAlert, RefreshCw, Shield,
  Receipt, Banknote, Target, Eye,
} from 'lucide-react';
import { ChartWrapper } from '../../components/ui/ChartWrapper';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'today' | '7d' | '30d' | 'custom';

interface ManagerStat {
  id:          string;
  name:        string;
  role:        string;
  avatar:      string;
  ordersHandled: number;
  refundsCreated: number;
  refundsApproved: number;
  refundsRejected: number;
  avgHandleTime: number; // minutes
  slaBreaches: number;
  rating:      number;
  gmvHandled:  number;
}

// ─── Mock Data ──────────────────────────���─────────────────────────────────────

const CHART_DATA_7D = [
  { date: '01.02', orders: 234, delivered: 218, cancelled: 8, refunds: 8,  gmv: 1240000 },
  { date: '02.02', orders: 198, delivered: 185, cancelled: 6, refunds: 7,  gmv: 1050000 },
  { date: '03.02', orders: 267, delivered: 249, cancelled: 12, refunds: 6, gmv: 1410000 },
  { date: '04.02', orders: 312, delivered: 290, cancelled: 15, refunds: 7, gmv: 1650000 },
  { date: '05.02', orders: 289, delivered: 271, cancelled: 10, refunds: 8, gmv: 1530000 },
  { date: '06.02', orders: 341, delivered: 318, cancelled: 14, refunds: 9, gmv: 1800000 },
  { date: '07.02', orders: 278, delivered: 261, cancelled: 9,  refunds: 8, gmv: 1470000 },
];

const STATUS_PIE = [
  { name: 'Доставлен',    value: 1792, color: '#10B981' },
  { name: 'В пути',       value: 184,  color: '#3B82F6' },
  { name: 'Ожидает',      value: 96,   color: '#F59E0B' },
  { name: 'Отменён',      value: 74,   color: '#EF4444' },
  { name: 'Возврат',      value: 53,   color: '#8B5CF6' },
];

const DELIVERY_TYPES = [
  { name: 'Курьер',    count: 1124, pct: 51, color: '#F59E0B', icon: '🚴' },
  { name: 'Самовывоз', count: 694,  pct: 31, color: '#3B82F6', icon: '🏪' },
  { name: 'ПВЗ',       count: 381,  pct: 17, color: '#10B981', icon: '📦' },
];

const TOP_PARTNERS = [
  { name: 'Кафе «Уют»',       type: 'merchant', orders: 412, gmv: 780000,  rating: 4.8, refunds: 8,  icon: '🍕' },
  { name: 'TechStore MSK',    type: 'merchant', orders: 287, gmv: 2140000, rating: 4.6, refunds: 5,  icon: '💻' },
  { name: 'FreshMarket',      type: 'merchant', orders: 364, gmv: 920000,  rating: 4.7, refunds: 12, icon: '🥦' },
  { name: 'Пекарня «Хлеб»',   type: 'merchant', orders: 318, gmv: 490000,  rating: 4.9, refunds: 3,  icon: '🥖' },
  { name: 'ПВЗ «Центральный»',type: 'pvz',      orders: 456, gmv: 380000,  rating: 4.1, refunds: 7,  icon: '📦' },
];

const MANAGERS: ManagerStat[] = [
  { id: 'm1', name: 'Карпова А.И.',    role: 'Оператор поддержки',  avatar: 'КА', ordersHandled: 428, refundsCreated: 34, refundsApproved: 0, refundsRejected: 0, avgHandleTime: 4.2, slaBreaches: 2,  rating: 4.8, gmvHandled: 890000 },
  { id: 'm2', name: 'Иванова Т.Р.',    role: 'Оператор поддержки',  avatar: 'ИТ', ordersHandled: 391, refundsCreated: 28, refundsApproved: 0, refundsRejected: 0, avgHandleTime: 5.1, slaBreaches: 4,  rating: 4.6, gmvHandled: 820000 },
  { id: 'm3', name: 'Смирнов Д.К.',    role: 'Старший оператор',    avatar: 'СД', ordersHandled: 312, refundsCreated: 41, refundsApproved: 38, refundsRejected: 3, avgHandleTime: 6.3, slaBreaches: 1, rating: 4.9, gmvHandled: 1240000 },
  { id: 'm4', name: 'Петренко В.С.',   role: 'Финансовый менеджер', avatar: 'ПВ', ordersHandled: 0,   refundsCreated: 0,  refundsApproved: 156, refundsRejected: 28, avgHandleTime: 3.8, slaBreaches: 0, rating: 4.9, gmvHandled: 3400000 },
  { id: 'm5', name: 'Луценко М.В.',    role: 'Финансовый менеджер', avatar: 'ЛМ', ordersHandled: 0,   refundsCreated: 0,  refundsApproved: 124, refundsRejected: 19, avgHandleTime: 4.1, slaBreaches: 0, rating: 4.7, gmvHandled: 2800000 },
  { id: 'm6', name: 'Сергеева Н.О.',   role: 'Менеджер продвижений',avatar: 'СН', ordersHandled: 0,   refundsCreated: 0,  refundsApproved: 0, refundsRejected: 0, avgHandleTime: 8.2, slaBreaches: 1, rating: 4.8, gmvHandled: 0 },
];

const REFUND_REPORT = [
  { manager: 'Петренко В.С.',   role: 'Финансовый менеджер', approved: 156, rejected: 28, pending: 4,  avgTime: '3ч 48м', total: fmt(2_340_000), deducted: fmt(1_180_000) },
  { manager: 'Луценко М.В.',    role: 'Финансовый менеджер', approved: 124, rejected: 19, pending: 3,  avgTime: '4ч 06м', total: fmt(1_890_000), deducted: fmt(950_000)  },
  { manager: 'Смирнов Д.К.',    role: 'Старший оператор',    approved: 38,  rejected: 3,  pending: 0,  avgTime: '6ч 18м', total: fmt(340_000),  deducted: fmt(190_000)  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(2)}М`;
  if (n >= 1_000)     return `₽${(n / 1_000).toFixed(0)}К`;
  return `₽${n.toLocaleString('ru-RU')}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1 border border-gray-700">
      <p className="text-gray-400 font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold ml-auto">{typeof p.value === 'number' && p.value > 1000 ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, icon: Icon, color, bg, onClick }: {
  label: string; value: string; sub?: string; trend?: number;
  icon: React.ElementType; color: string; bg: string;
  onClick?: () => void;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`bg-white border border-gray-200 rounded-2xl p-5 text-left w-full transition-all ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-blue-200 active:scale-[0.98]' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? 'text-green-600' : 'text-red-600'}`}>
            {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {up ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-black mt-3 ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrdersReport() {
  const [period, setPeriod] = useState<Period>('7d');
  const [activeSection, setActiveSection] = useState<'overview' | 'managers' | 'refunds' | 'partners'>('overview');

  const totals = useMemo(() => ({
    orders:    CHART_DATA_7D.reduce((s, d) => s + d.orders, 0),
    delivered: CHART_DATA_7D.reduce((s, d) => s + d.delivered, 0),
    cancelled: CHART_DATA_7D.reduce((s, d) => s + d.cancelled, 0),
    refunds:   CHART_DATA_7D.reduce((s, d) => s + d.refunds, 0),
    gmv:       CHART_DATA_7D.reduce((s, d) => s + d.gmv, 0),
  }), []);

  const deliveryRate = Math.round(totals.delivered / totals.orders * 100);
  const cancelRate   = +(totals.cancelled / totals.orders * 100).toFixed(1);
  const refundRate   = +(totals.refunds / totals.orders * 100).toFixed(1);

  const sections = [
    { id: 'overview'  as const, label: 'Обзор заказов', icon: BarChart2 },
    { id: 'managers'  as const, label: 'Отчёт по менеджерам', icon: Users },
    { id: 'refunds'   as const, label: 'Возвраты и одобрения', icon: RotateCcw },
    { id: 'partners'  as const, label: 'Топ партнёры', icon: Store },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Отчёт менеджера заказов</h1>
          <p className="text-sm text-gray-500 mt-0.5">Полный операционный отчёт · Заказы, доставки, возвраты, менеджеры</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { id: 'today' as const, label: 'Сегодня' },
              { id: '7d'    as const, label: '7 дней' },
              { id: '30d'   as const, label: '30 дней' },
            ]).map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium transition-colors">
            <Download className="w-3.5 h-3.5" />XLS
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium transition-colors">
            <FileText className="w-3.5 h-3.5" />PDF
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Всего заказов"       value={totals.orders.toString()}    trend={+8.4}  icon={Package}      color="text-blue-700"   bg="bg-blue-50"   sub="7 дней"                   onClick={() => setActiveSection('overview')} />
        <KpiCard label="Доставлено"          value={totals.delivered.toString()} trend={+9.1}  icon={CheckCircle2} color="text-green-700"  bg="bg-green-50"  sub={`${deliveryRate}% успешных`} onClick={() => setActiveSection('overview')} />
        <KpiCard label="Отменено"            value={totals.cancelled.toString()} trend={-1.2}  icon={XCircle}      color="text-red-700"    bg="bg-red-50"    sub={`${cancelRate}% заказов`}   onClick={() => setActiveSection('overview')} />
        <KpiCard label="Возвраты"            value={totals.refunds.toString()}   trend={-3.4}  icon={RotateCcw}    color="text-amber-700"  bg="bg-amber-50"  sub={`${refundRate}% заказов`}   onClick={() => setActiveSection('refunds')} />
        <KpiCard label="GMV (7 дней)"        value={fmt(totals.gmv)}             trend={+11.2} icon={DollarSign}   color="text-purple-700" bg="bg-purple-50" sub="Оборот платформы"           onClick={() => setActiveSection('partners')} />
        <KpiCard label="Ср. время доставки"  value="38 мин"                      trend={-4.1}  icon={Clock}        color="text-teal-700"   bg="bg-teal-50"   sub="Цель: ≤40 мин"             onClick={() => setActiveSection('managers')} />
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {sections.map(s => {
          const SIcon = s.icon;
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors ${activeSection === s.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <SIcon className="w-4 h-4" />{s.label}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSection === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Orders chart */}
            <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">Динамика заказов</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Заказы / Доставлено / Отменено / Возвраты · 7 дней</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {[{c:'#3B82F6',l:'Заказы'},{c:'#10B981',l:'Доставлено'},{c:'#EF4444',l:'Отменено'},{c:'#8B5CF6',l:'Возвраты'}].map((x,i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{background:x.c}} />
                      <span className="text-gray-500">{x.l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ChartWrapper height={240}>
                {(w, h) => (
                  <BarChart key={`orders-bar-${w}`} width={w} height={h} data={CHART_DATA_7D} margin={{top:4,right:8,left:0,bottom:0}}>
                    <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis key="xa" dataKey="date" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false} />
                    <YAxis key="ya" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false} width={32} />
                    <Tooltip key="tt" content={<CustomTooltip />} />
                    <Bar key="bar-orders"    dataKey="orders"    fill="#93C5FD" radius={[3,3,0,0]} name="Заказы"     maxBarSize={14} isAnimationActive={false} />
                    <Bar key="bar-delivered" dataKey="delivered" fill="#34D399" radius={[3,3,0,0]} name="Доставлено" maxBarSize={14} isAnimationActive={false} />
                    <Bar key="bar-cancelled" dataKey="cancelled" fill="#FCA5A5" radius={[3,3,0,0]} name="Отменено"   maxBarSize={14} isAnimationActive={false} />
                    <Bar key="bar-refunds"   dataKey="refunds"   fill="#C4B5FD" radius={[3,3,0,0]} name="Возвраты"   maxBarSize={14} isAnimationActive={false} />
                  </BarChart>
                )}
              </ChartWrapper>
            </div>

            {/* Status distribution */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 mb-4">Статусы заказов</h2>
              <ChartWrapper height={160}>
                {(w, h) => (
                  <PieChart key={`orders-pie-${w}`} width={w} height={h}>
                    <Pie key="pie-status" data={STATUS_PIE} dataKey="value" cx={w/2} cy={h/2} innerRadius={46} outerRadius={72} paddingAngle={2} isAnimationActive={false}>
                      {STATUS_PIE.map((e) => <Cell key={`cell-${e.name}`} fill={e.color} />)}
                    </Pie>
                    <Tooltip key="tt-pie" formatter={(v: any) => `${v} заказов`} contentStyle={{borderRadius:10,fontSize:11}} />
                  </PieChart>
                )}
              </ChartWrapper>
              <div className="space-y-2 mt-3">
                {STATUS_PIE.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:s.color}} />
                    <span className="text-xs text-gray-600 flex-1">{s.name}</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${Math.round(s.value/totals.orders*100)}%`,background:s.color}} />
                    </div>
                    <span className="text-xs font-bold text-gray-800 w-8 text-right">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Delivery types */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="font-bold text-gray-900 mb-4">Способы доставки</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DELIVERY_TYPES.map((d, i) => (
                <div key={i} className="p-4 border border-gray-100 rounded-2xl flex items-center gap-4">
                  <div className="text-3xl">{d.icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{d.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${d.pct}%`,background:d.color}} />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{d.pct}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black" style={{color:d.color}}>{d.count}</p>
                    <p className="text-[10px] text-gray-400">заказов</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Health metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'SLA выполнено',      value: `${deliveryRate}%`, target: '95%', ok: deliveryRate >= 95, desc: 'Доставлено в срок' },
              { label: 'Отмена клиентами',   value: `${cancelRate}%`,  target: '<5%', ok: cancelRate < 5,    desc: 'Отменено клиентами' },
              { label: 'Refund Rate',         value: `${refundRate}%`,  target: '<4%', ok: refundRate < 4,    desc: 'Возвраты к заказам' },
              { label: 'Ср. оценка курьера',  value: '4.72',            target: '>4.5', ok: true,            desc: 'Средний рейтинг' },
            ].map((m, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${m.ok ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-600">{m.label}</p>
                  {m.ok ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-orange-600" />}
                </div>
                <p className={`text-2xl font-black ${m.ok ? 'text-green-700' : 'text-orange-700'}`}>{m.value}</p>
                <p className="text-[10px] text-gray-400 mt-1">{m.desc}</p>
                <p className={`text-[10px] font-semibold mt-0.5 ${m.ok ? 'text-green-600' : 'text-orange-600'}`}>Цель: {m.target}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MANAGERS REPORT ── */}
      {activeSection === 'managers' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-900">Отчёт по менеджерам</h2>
              <p className="text-xs text-gray-400 mt-0.5">Производительность, обработанные заявки, возвраты · 7 дней</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Менеджер</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Заказы</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Возвраты (создано)</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Одобрил</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Отклонил</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Ср. время</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">SLA нарушений</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">GMV</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Рейтинг</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MANAGERS.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {m.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{m.name}</p>
                            <p className="text-[10px] text-gray-400">{m.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <p className="font-bold text-gray-900">{m.ordersHandled > 0 ? m.ordersHandled : '—'}</p>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <p className={`font-semibold ${m.refundsCreated > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                          {m.refundsCreated > 0 ? m.refundsCreated : '—'}
                        </p>
                      </td>
                      <td className="px-3 py-4 text-right">
                        {m.refundsApproved > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" />{m.refundsApproved}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-4 text-right">
                        {m.refundsRejected > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                            <XCircle className="w-3 h-3" />{m.refundsRejected}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-4 text-right">
                        <p className="text-xs text-gray-700">{m.avgHandleTime} мин</p>
                      </td>
                      <td className="px-3 py-4 text-right">
                        {m.slaBreaches > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold">
                            <AlertTriangle className="w-3 h-3" />{m.slaBreaches}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" />0
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-right">
                        <p className="font-bold text-purple-700">{m.gmvHandled > 0 ? fmt(m.gmvHandled) : '—'}</p>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold text-gray-800">{m.rating}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── REFUNDS ── */}
      {activeSection === 'refunds' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Всего заявок',          v: '199',         color: 'text-gray-800',   bg: 'bg-white border-gray-200' },
              { label: 'Одобрено возвратов',     v: '318',         color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
              { label: 'Отклонено',              v: '50',          color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
              { label: 'Итого возвращено',        v: fmt(4_570_000), color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
            ].map((k, i) => (
              <div key={i} className={`border rounded-2xl p-4 ${k.bg}`}>
                <p className="text-[10px] text-gray-500">{k.label}</p>
                <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.v}</p>
              </div>
            ))}
          </div>

          {/* Who approved table */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-900">Кто одобрял и отклонял возвраты</h2>
              <p className="text-xs text-gray-400 mt-0.5">Полный журнал финансовых решений по возвратам · 7 дней</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Менеджер / Роль</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Одобрено</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Отклонено</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">В ожидании</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Ср. время решения</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Сумма одобрений</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Удержано с партнёров</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {REFUND_REPORT.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-gray-900">{r.manager}</p>
                        <p className="text-[10px] text-gray-400">{r.role}</p>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" />{r.approved}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                          <XCircle className="w-3 h-3" />{r.rejected}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-bold">
                          <Clock className="w-3 h-3" />{r.pending}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <p className="text-xs text-gray-700">{r.avgTime}</p>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <p className="font-bold text-green-700">{r.total}</p>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <p className="font-bold text-orange-700">{r.deducted}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PARTNERS ── */}
      {activeSection === 'partners' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900">Топ партнёры по заказам и обороту</h2>
            <p className="text-xs text-gray-400 mt-0.5">7 дней · Сортировка по количеству заказов</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">#  Партнёр</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Заказов</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">GMV</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Возвратов</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Refund Rate</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Рейтинг</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {TOP_PARTNERS.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-400 w-5">#{i+1}</span>
                        <span className="text-xl">{p.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{p.name}</p>
                          <span className="text-[10px] text-gray-400 capitalize">{p.type === 'merchant' ? 'Мерчант' : 'ПВЗ'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <p className="font-black text-blue-700">{p.orders}</p>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <p className="font-bold text-purple-700">{fmt(p.gmv)}</p>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <p className="font-semibold text-amber-700">{p.refunds}</p>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${(p.refunds/p.orders*100) > 3 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                        {(p.refunds/p.orders*100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold text-gray-800">{p.rating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}