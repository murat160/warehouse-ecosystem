import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Package, MapPin, Bike, Star,
  Clock, AlertTriangle, CheckCircle2, RefreshCw, Download,
  BarChart2, Activity, Users, Zap, ArrowUpRight, ArrowDownRight,
  ChevronDown, Filter, Calendar, ShoppingBag, Store,
  Percent, CreditCard, RotateCcw, Layers, Target,
} from 'lucide-react';
import { ChartWrapper } from '../components/ui/ChartWrapper';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeRange = '1d' | '7d' | '30d' | '90d';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DAILY_30 = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2026-02-07');
  d.setDate(d.getDate() - (29 - i));
  const base = 2200 + Math.sin(i * 0.4) * 400 + Math.random() * 200;
  const orders = Math.round(base);
  const delivered = Math.round(orders * (0.91 + Math.random() * 0.06));
  const onTime = +(91 + Math.random() * 5).toFixed(1);
  const gmv = Math.round(orders * (580 + Math.random() * 120));
  const returns = Math.round(orders * (0.02 + Math.random() * 0.02));
  return {
    date: `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`,
    orders, delivered, onTime, gmv, returns,
    cancelled: orders - delivered - returns,
  };
});

const DAILY_7 = DAILY_30.slice(-7);
const DAILY_1 = [
  { date: '00:00', orders: 45, delivered: 40, onTime: 94, gmv: 28000, returns: 2, cancelled: 3 },
  { date: '02:00', orders: 18, delivered: 17, onTime: 96, gmv: 11000, returns: 0, cancelled: 1 },
  { date: '04:00', orders: 9,  delivered: 9,  onTime: 98, gmv: 5800,  returns: 0, cancelled: 0 },
  { date: '06:00', orders: 34, delivered: 31, onTime: 93, gmv: 20000, returns: 1, cancelled: 2 },
  { date: '08:00', orders: 145,delivered: 132,onTime: 92, gmv: 88000, returns: 4, cancelled: 9 },
  { date: '10:00', orders: 312,delivered: 286,onTime: 93, gmv: 189000,returns: 8, cancelled: 18 },
  { date: '12:00', orders: 489,delivered: 447,onTime: 94, gmv: 295000,returns: 12,cancelled: 30 },
  { date: '14:00', orders: 534,delivered: 492,onTime: 93, gmv: 322000,returns: 14,cancelled: 28 },
  { date: '16:00', orders: 478,delivered: 441,onTime: 92, gmv: 291000,returns: 11,cancelled: 26 },
  { date: '18:00', orders: 612,delivered: 568,onTime: 94, gmv: 370000,returns: 15,cancelled: 29 },
  { date: '20:00', orders: 543,delivered: 501,onTime: 95, gmv: 330000,returns: 13,cancelled: 29 },
  { date: '22:00', orders: 267,delivered: 248,onTime: 94, gmv: 163000,returns: 6, cancelled: 13 },
];

const DELIVERY_TYPES = [
  { name: 'Курьер',    value: 52, color: '#3B82F6' },
  { name: 'ПВЗ',       value: 33, color: '#10B981' },
  { name: 'Самовывоз', value: 15, color: '#F59E0B' },
];

const REGIONS = [
  { region: 'Москва',          orders: 14234, share: 48.2, onTime: 94.1, gmv: 8345000, couriers: 124, pvz: 43, trend: +8.3 },
  { region: 'Санкт-Петербург', orders: 7856,  share: 26.6, onTime: 93.4, gmv: 4612000, couriers: 72,  pvz: 28, trend: +11.2 },
  { region: 'Екатеринбург',    orders: 3456,  share: 11.7, onTime: 95.2, gmv: 2034000, couriers: 31,  pvz: 12, trend: +5.7 },
  { region: 'Казань',          orders: 2301,  share: 7.8,  onTime: 92.6, gmv: 1356000, couriers: 21,  pvz: 8,  trend: -1.4 },
  { region: 'Новосибирск',     orders: 1657,  share: 5.6,  onTime: 91.8, gmv: 978000,  couriers: 15,  pvz: 6,  trend: +18.9 },
];

const TOP_MERCHANTS = [
  { name: 'Кафе «Уют»',         orders: 1234, gmv: 723000,  rating: 4.9, onTime: 96.2, returns: 1.1 },
  { name: 'Пекарня «Хлеб»',     orders: 987,  gmv: 489000,  rating: 4.8, onTime: 94.7, returns: 0.8 },
  { name: 'TechStore MSK',       orders: 756,  gmv: 1234000, rating: 4.7, onTime: 93.1, returns: 2.3 },
  { name: 'FreshMarket',         orders: 623,  gmv: 291000,  rating: 4.6, onTime: 91.8, returns: 1.7 },
  { name: 'Суши Ролл',          orders: 589,  gmv: 345000,  rating: 4.8, onTime: 95.3, returns: 0.5 },
  { name: 'Burger House',        orders: 534,  gmv: 234000,  rating: 4.5, onTime: 90.4, returns: 2.8 },
];

const COURIER_PERF = [
  { name: 'Эффективность',  value: 87, fullMark: 100 },
  { name: 'Пунктуальность', value: 92, fullMark: 100 },
  { name: 'Оценка CSAT',    value: 78, fullMark: 100 },
  { name: 'Маршруты/день',  value: 65, fullMark: 100 },
  { name: 'Отмены',         value: 94, fullMark: 100 },
  { name: 'Скорость ответа',value: 82, fullMark: 100 },
];

const FAILURE_REASONS = [
  { reason: 'Клиент недоступен',      count: 234, pct: 31.2 },
  { reason: 'Адрес не найден',         count: 189, pct: 25.2 },
  { reason: 'Заказ отклонён клиентом', count: 134, pct: 17.9 },
  { reason: 'Курьер опоздал >30 мин',  count: 98,  pct: 13.1 },
  { reason: 'Технические проблемы',    count: 67,  pct: 8.9 },
  { reason: 'Прочее',                  count: 28,  pct: 3.7 },
];

const HOURLY_SLA = [
  { hour: '00', value: 96 }, { hour: '02', value: 97 }, { hour: '04', value: 98 },
  { hour: '06', value: 95 }, { hour: '08', value: 91 }, { hour: '10', value: 93 },
  { hour: '12', value: 94 }, { hour: '14', value: 93 }, { hour: '16', value: 92 },
  { hour: '18', value: 94 }, { hour: '20', value: 95 }, { hour: '22', value: 96 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}К`;
  return `${n}`;
}
function fmtRub(n: number): string {
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(1)}М`;
  if (n >= 1_000)     return `₽${(n / 1_000).toFixed(0)}К`;
  return `₽${n}`;
}
function slaColor(v: number): string {
  if (v >= 95) return 'bg-green-500';
  if (v >= 92) return 'bg-yellow-400';
  if (v >= 88) return 'bg-orange-500';
  return 'bg-red-500';
}
function slaText(v: number): string {
  if (v >= 95) return 'text-green-700';
  if (v >= 92) return 'text-yellow-700';
  if (v >= 88) return 'text-orange-700';
  return 'text-red-700';
}

// ─── KPI Card ──────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, trendLabel, icon: Icon, color, bg, onClick }: {
  label: string; value: string; sub?: string;
  trend?: number; trendLabel?: string;
  icon: React.ElementType; color: string; bg: string;
  onClick?: () => void;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between gap-4 text-left transition-all w-full ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-blue-200 active:scale-[0.98]' : 'hover:shadow-md cursor-default'}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1.5">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${up ? 'text-green-600' : 'text-red-600'}`}>
            {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {up ? '+' : ''}{trend}%
            {trendLabel && <span className="text-gray-400 font-normal ml-1">{trendLabel}</span>}
          </div>
        )}
      </div>
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="font-bold text-gray-900">{title}</h2>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1 border border-gray-700 min-w-[140px]">
      <p className="text-gray-400 font-medium mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold ml-auto">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Analytics() {
  const [range, setRange] = useState<TimeRange>('7d');
  const [activeChart, setActiveChart] = useState<'volume' | 'gmv' | 'sla'>('volume');

  const data = range === '1d' ? DAILY_1 : range === '7d' ? DAILY_7 : DAILY_30;

  const kpis = useMemo(() => {
    const orders     = data.reduce((s, d) => s + d.orders, 0);
    const delivered  = data.reduce((s, d) => s + d.delivered, 0);
    const gmv        = data.reduce((s, d) => s + d.gmv, 0);
    const returns    = data.reduce((s, d) => s + d.returns, 0);
    const avgOnTime  = +(data.reduce((s, d) => s + d.onTime, 0) / data.length).toFixed(1);
    const returnRate = +((returns / orders) * 100).toFixed(1);
    return { orders, delivered, gmv, returns, avgOnTime, returnRate };
  }, [data]);

  const ranges: { id: TimeRange; label: string }[] = [
    { id: '1d', label: 'Сегодня' },
    { id: '7d', label: '7 дней' },
    { id: '30d', label: '30 дней' },
    { id: '90d', label: '90 дней' },
  ];

  const chartTabs = [
    { id: 'volume' as const, label: 'Заказы', color: '#3B82F6' },
    { id: 'gmv'    as const, label: 'GMV',    color: '#10B981' },
    { id: 'sla'    as const, label: 'SLA %',  color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Аналитика платформы</h1>
          <p className="text-sm text-gray-500 mt-0.5">Операционные KPI, эффективность и финансовые метрики</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            {ranges.map(r => (
              <button key={r.id} onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === r.id ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const rangeLabel = ranges.find(r => r.id === range)?.label ?? range;
              const rows = [
                { metric: 'Период',     value: rangeLabel },
                { metric: 'Заказов',    value: String(kpis.orders) },
                { metric: 'GMV',        value: String(kpis.gmv) },
                { metric: 'Доставлено', value: String(kpis.delivered) },
                { metric: 'Возвратов',  value: String(kpis.returns) },
                { metric: 'On-Time SLA %', value: String(kpis.avgOnTime) },
                { metric: 'Return Rate %', value: String(kpis.returnRate) },
              ];
              const header = 'Метрика;Значение';
              const csv = '﻿' + header + '\n' + rows.map(r => `"${r.metric}";"${r.value}"`).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `analytics-${range}-${new Date().toISOString().slice(0,10)}.csv`;
              document.body.appendChild(a); a.click(); a.remove();
              URL.revokeObjectURL(url);
              import('sonner').then(m => m.toast.success(`Отчёт скачан: analytics-${range}.csv`));
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors">
            <Download className="w-3.5 h-3.5" />Экспорт
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Заказов"        value={fmtNum(kpis.orders)}    sub="всего за период"       trend={+8.3}  trendLabel="vs пред." icon={Package}    color="text-blue-700"   bg="bg-blue-50"   onClick={() => setActiveChart('volume')} />
        <KpiCard label="GMV"            value={fmtRub(kpis.gmv)}       sub="оборот платформы"      trend={+11.2} trendLabel="vs пред." icon={CreditCard} color="text-green-700"  bg="bg-green-50"  onClick={() => setActiveChart('gmv')} />
        <KpiCard label="On-Time SLA"    value={`${kpis.avgOnTime}%`}   sub="доставок в срок"       trend={+0.8}  trendLabel="vs пред." icon={Clock}      color="text-orange-700" bg="bg-orange-50" onClick={() => setActiveChart('sla')} />
        <KpiCard label="Доставлено"     value={fmtNum(kpis.delivered)} sub={`${+((kpis.delivered/kpis.orders)*100).toFixed(1)}% от заказов`} trend={+2.1} trendLabel="vs пред." icon={CheckCircle2} color="text-teal-700" bg="bg-teal-50" onClick={() => setActiveChart('volume')} />
        <KpiCard label="Возвратов"      value={`${kpis.returnRate}%`}  sub={`${fmtNum(kpis.returns)} шт.`}  trend={-0.4}  trendLabel="vs пред." icon={RotateCcw}  color="text-red-700"    bg="bg-red-50"    onClick={() => setActiveChart('volume')} />
        <KpiCard label="CSAT"           value="4.8 ⭐"                 sub="средняя оценка"        trend={+0.2}  trendLabel="vs пред." icon={Star}       color="text-purple-700" bg="bg-purple-50" onClick={() => setActiveChart('sla')} />
      </div>

      {/* Main Chart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Динамика показателей</h2>
            <p className="text-xs text-gray-400 mt-0.5">Тренды за выбранный период</p>
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            {chartTabs.map(t => (
              <button key={t.id} onClick={() => setActiveChart(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeChart === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <ChartWrapper height={260}>
          {(w, h) => {
            const color = chartTabs.find(t => t.id === activeChart)?.color ?? '#3B82F6';
            const key   = activeChart === 'volume' ? 'orders' : activeChart === 'gmv' ? 'gmv' : 'onTime';
            const key2  = activeChart === 'volume' ? 'delivered' : undefined;
            const fmt   = activeChart === 'gmv' ? (v: number) => fmtRub(v) : (v: number) => `${v}${activeChart === 'sla' ? '%' : ''}`;
            const gradId  = `grad-main-${activeChart}`;
            const gradId2 = `grad-sec-${activeChart}`;
            return (
              <AreaChart key={activeChart} width={w} height={h} data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs key="defs">
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={gradId2} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10B981" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis key="x-axis" dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis key="y-axis" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={fmt} width={50} />
                <Tooltip key="tooltip" content={<CustomTooltip formatter={fmt} />} />
                <Area key={`area-main-${activeChart}`} type="monotone" dataKey={key} stroke={color} strokeWidth={2.5}
                  fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: color }} name={chartTabs.find(t=>t.id===activeChart)?.label ?? ''} isAnimationActive={false} />
                {key2 && (
                  <Area key={`area-sec-${activeChart}`} type="monotone" dataKey={key2} stroke="#10B981" strokeWidth={2}
                    fill={`url(#${gradId2})`} dot={false} activeDot={{ r: 3, fill: '#10B981' }} name="Доставлено" strokeDasharray="4 2" isAnimationActive={false} />
                )}
              </AreaChart>
            );
          }}
        </ChartWrapper>
      </div>

      {/* Row: Delivery Types + Region Performance */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Delivery type donut */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 xl:col-span-2">
          <SectionHeader title="Способы доставки" sub="Распределение заказов" />
          <ChartWrapper height={180}>
            {(w, h) => (
              <PieChart width={w} height={h}>
                <Pie key="pie" data={DELIVERY_TYPES} dataKey="value" cx={w/2} cy={h/2} innerRadius={52} outerRadius={78} paddingAngle={3} isAnimationActive={false}>
                  {DELIVERY_TYPES.map((e, i) => <Cell key={`dtype-cell-${e.name}`} fill={e.color} />)}
                </Pie>
                <Tooltip key="tooltip" formatter={(v: any) => `${v}%`} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
              </PieChart>
            )}
          </ChartWrapper>
          <div className="space-y-2.5 mt-1">
            {DELIVERY_TYPES.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-sm text-gray-700 flex-1">{d.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.value}%`, background: d.color }} />
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-10 text-right">{d.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional performance */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 xl:col-span-3">
          <SectionHeader title="Региональная эффективность" sub={`${REGIONS.length} ключевых регионов`} />
          <div className="space-y-2.5">
            {REGIONS.map((r, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                <div className="flex items-center gap-3 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 shrink-0" />
                  <span className="text-sm font-semibold text-gray-800 flex-1">{r.region}</span>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${r.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {r.trend >= 0 ? '+' : ''}{r.trend}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Package className="w-3 h-3" />{r.orders.toLocaleString()} заказов</span>
                  <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{fmtRub(r.gmv)}</span>
                  <span className="flex items-center gap-1 ml-auto">
                    <div className={`w-2 h-2 rounded-full ${slaColor(r.onTime)}`} />
                    <span className={`font-semibold ${slaText(r.onTime)}`}>{r.onTime}% SLA</span>
                  </span>
                </div>
                {/* Share bar */}
                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${r.share}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-400">{r.share}% платформы</span>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>{r.couriers} курьеров</span>
                    <span>·</span>
                    <span>{r.pvz} ПВЗ</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: GMV Bar + SLA Hourly */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* GMV chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <SectionHeader title="GMV за период" sub="Оборот по дням" />
          <ChartWrapper height={220}>
            {(w, h) => (
              <BarChart width={w} height={h} data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis key="x-axis" dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis key="y-axis" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => fmtRub(v)} width={54} />
                <Tooltip key="tooltip" content={<CustomTooltip formatter={(v: number) => fmtRub(v)} />} />
                <Bar key="bar-gmv" dataKey="gmv" fill="#3B82F6" radius={[4,4,0,0]} name="GMV" maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            )}
          </ChartWrapper>
        </div>

        {/* SLA by hour */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <SectionHeader title="SLA по часам дня" sub="Процент доставок вовремя" />
          <ChartWrapper height={220}>
            {(w, h) => (
              <BarChart width={w} height={h} data={HOURLY_SLA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis key="x-axis" dataKey="hour" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}:00`} />
                <YAxis key="y-axis" domain={[86, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={38} />
                <Tooltip key="tooltip" content={<CustomTooltip formatter={(v: number) => `${v}%`} />} />
                <Bar key="bar-sla" dataKey="value" radius={[4,4,0,0]} name="SLA %" maxBarSize={28}
                  fill="#10B981"
                  label={false}
                  isAnimationActive={false}
                >
                  {HOURLY_SLA.map((entry, i) => (
                    <Cell key={`sla-cell-${entry.hour}`}
                      fill={entry.value >= 95 ? '#10B981' : entry.value >= 92 ? '#F59E0B' : '#EF4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ChartWrapper>
          <div className="flex items-center gap-4 mt-3 text-xs">
            {[{c:'bg-green-500',l:'≥95% Хорошо'},{c:'bg-yellow-400',l:'92–95% Норма'},{c:'bg-red-500',l:'<92% Риск'}].map((x,i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm ${x.c}`} />
                <span className="text-gray-500">{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Top Merchants + Courier Radar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top merchants */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 xl:col-span-2">
          <SectionHeader
            title="Топ мерчанты"
            sub="По объёму заказов"
            action={
              <button
                onClick={() => { window.location.assign('/admin/merchants'); }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Все мерчанты <ArrowUpRight className="w-3 h-3" />
              </button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="text-xs font-semibold text-gray-400 pb-3 pr-4">#</th>
                  <th className="text-xs font-semibold text-gray-400 pb-3 pr-4">Партнёр</th>
                  <th className="text-xs font-semibold text-gray-400 pb-3 pr-4 text-right">Заказы</th>
                  <th className="text-xs font-semibold text-gray-400 pb-3 pr-4 text-right">GMV</th>
                  <th className="text-xs font-semibold text-gray-400 pb-3 pr-4 text-right">SLA</th>
                  <th className="text-xs font-semibold text-gray-400 pb-3 text-right">Рейтинг</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {TOP_MERCHANTS.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                          <Store className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">{m.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">{m.orders.toLocaleString()}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className="text-sm font-semibold text-green-700">{fmtRub(m.gmv)}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.onTime >= 95 ? 'bg-green-100 text-green-700' : m.onTime >= 92 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {m.onTime}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="text-sm font-bold text-orange-600">{m.rating} ⭐</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Courier radar */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <SectionHeader title="Эффективность курьеров" sub="Сводный профиль команды" />
          <ChartWrapper height={220}>
            {(w, h) => (
              <RadarChart width={w} height={h} data={COURIER_PERF} cx={w/2} cy={h/2} outerRadius={Math.min(w,h)/2 - 30}>
                <PolarGrid key="polar-grid" stroke="#F3F4F6" />
                <PolarAngleAxis key="angle-axis" dataKey="name" tick={{ fontSize: 9, fill: '#6B7280' }} />
                <PolarRadiusAxis key="radius-axis" angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#9CA3AF' }} tickCount={4} />
                <Radar key="radar" name="Курьеры" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} />
                <Tooltip key="tooltip" contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 11 }} formatter={(v: any) => `${v}/100`} />
              </RadarChart>
            )}
          </ChartWrapper>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: 'Активных курьеров', value: '263', color: 'text-blue-700' },
              { label: 'Стоп/час',          value: '12.5', color: 'text-green-700' },
              { label: 'CSAT средний',      value: '4.7 ⭐', color: 'text-orange-700' },
              { label: 'Опоздания > 15мин', value: '3.2%',  color: 'text-red-700' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 p-2.5 rounded-xl">
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Failure Reasons + SLA Risk Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Failure reasons */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <SectionHeader title="Причины неуспешной доставки" sub="Топ причин отказов и возвратов" />
          <div className="space-y-3">
            {FAILURE_REASONS.map((f, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 truncate flex-1 mr-3">{f.reason}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">{f.count} шт.</span>
                    <span className="text-xs font-bold text-gray-800 w-10 text-right">{f.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-red-500' : i === 2 ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" />Итого неуспешных доставок</span>
            <span className="font-bold text-gray-800">750 ({+((750/kpis.orders)*100).toFixed(1)}%)</span>
          </div>
        </div>

        {/* SLA Risk Panel */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <SectionHeader title="Мониторинг SLA-рисков" sub="Зоны требующие внимания" />
          <div className="space-y-3">
            {[
              { zone: 'Москва — ЦАО', issue: 'Час пик 18:00–20:00', level: 'critical', sla: 88.4, orders: 234 },
              { zone: 'Казань — ул. Баумана', issue: 'Нехватка курьеров', level: 'high', sla: 90.1, orders: 89 },
              { zone: 'СПб — Невский р-н', issue: 'Пробки: + 15 мин к времени', level: 'medium', sla: 91.8, orders: 156 },
              { zone: 'Екатеринбург — Центр', issue: 'Погодные условия', level: 'low', sla: 93.2, orders: 67 },
            ].map((r, i) => {
              const cfgs: Record<string, {badge: string; dot: string; icon: React.ElementType}> = {
                critical: { badge: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500',    icon: AlertTriangle },
                high:     { badge: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500', icon: AlertTriangle },
                medium:   { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', icon: Clock },
                low:      { badge: 'bg-blue-100 text-blue-700 border-blue-200',   dot: 'bg-blue-400',   icon: Activity },
              };
              const cfg = cfgs[r.level];
              const Icon = cfg.icon;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                  r.level === 'critical' ? 'bg-red-50 border-red-200' :
                  r.level === 'high'     ? 'bg-orange-50 border-orange-200' :
                  r.level === 'medium'   ? 'bg-yellow-50 border-yellow-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    r.level === 'critical' ? 'bg-red-100' : r.level === 'high' ? 'bg-orange-100' : r.level === 'medium' ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.badge.split(' ')[1]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{r.zone}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
                        {r.level === 'critical' ? 'КРИТИЧНО' : r.level === 'high' ? 'ВЫСОКИЙ' : r.level === 'medium' ? 'СРЕДНИЙ' : 'НИЗКИЙ'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.issue}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        <span className="font-semibold">SLA: {r.sla}%</span>
                      </span>
                      <span className="text-gray-400">{r.orders} активных доставок</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white">Итоги операционного дня</h2>
            <p className="text-xs text-gray-400 mt-0.5">Сводный отчёт · {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          {[
            { label: 'Заказов обработано', value: '2,847',  icon: Package,      color: 'text-blue-400' },
            { label: 'Успешно доставлено', value: '2,701',  icon: CheckCircle2, color: 'text-green-400' },
            { label: 'GMV платформы',      value: '₽1.67М', icon: CreditCard,   color: 'text-emerald-400' },
            { label: 'SLA выполнен',       value: '94.9%',  icon: Zap,          color: 'text-yellow-400' },
            { label: 'Активных курьеров',  value: '263',    icon: Bike,         color: 'text-orange-400' },
            { label: 'ПВЗ онлайн',        value: '89/97',   icon: MapPin,       color: 'text-purple-400' },
            { label: 'CSAT',              value: '4.8 ⭐',  icon: Star,         color: 'text-pink-400' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <Icon className={`w-4 h-4 ${s.color} mb-2`} />
                <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}