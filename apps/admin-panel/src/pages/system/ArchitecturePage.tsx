import { useState, useEffect, useCallback } from 'react';
import {
  Server, Database, Zap, Shield, Clock, Activity,
  ArrowRight, ArrowDown, RefreshCw, ChevronDown,
  Globe, Smartphone, Monitor, Package, Users,
  FileText, DollarSign, MessageSquare, Bell, Lock,
  BarChart3, CheckCircle2, XCircle, AlertCircle,
  Cpu, Network, HardDrive, Eye, Send,
} from 'lucide-react';
import { gateway, getGatewaySnapshot } from '../../api/gateway';
import { cache } from '../../api/cache';
import { getEventLog, emit, on, type PlatformEventType } from '../../api/eventBus';
import { AuditService, NotificationService } from '../../api/services';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceHealth {
  name: string;
  key: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  requestsPerMin: number;
  errorRate: number;
  icon: React.ElementType;
  color: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtIso(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function randomBetween(a: number, b: number) {
  return Math.round(a + Math.random() * (b - a));
}

// ── Mock live service metrics ─────────────────────────────────────────────────

function generateMetrics(): ServiceHealth[] {
  return [
    { name: 'User Service',         key: 'user',         status: 'healthy', latencyMs: randomBetween(18, 45),  requestsPerMin: randomBetween(120, 280), errorRate: Math.random() * 0.5,  icon: Users,       color: 'bg-blue-500'  },
    { name: 'Order Service',        key: 'order',        status: 'healthy', latencyMs: randomBetween(25, 60),  requestsPerMin: randomBetween(200, 450), errorRate: Math.random() * 0.3,  icon: Package,     color: 'bg-violet-500'},
    { name: 'Courier Service',      key: 'courier',      status: 'healthy', latencyMs: randomBetween(15, 40),  requestsPerMin: randomBetween(300, 600), errorRate: Math.random() * 0.2,  icon: Activity,    color: 'bg-green-500' },
    { name: 'Document Service',     key: 'document',     status: 'healthy', latencyMs: randomBetween(40, 100), requestsPerMin: randomBetween(50, 150),  errorRate: Math.random() * 0.8,  icon: FileText,    color: 'bg-amber-500' },
    { name: 'Finance Service',      key: 'finance',      status: 'healthy', latencyMs: randomBetween(30, 80),  requestsPerMin: randomBetween(80, 200),  errorRate: Math.random() * 0.4,  icon: DollarSign,  color: 'bg-emerald-500'},
    { name: 'Chat Service',         key: 'chat',         status: 'healthy', latencyMs: randomBetween(10, 30),  requestsPerMin: randomBetween(400, 800), errorRate: Math.random() * 0.2,  icon: MessageSquare,color:'bg-cyan-500'  },
    { name: 'Notification Service', key: 'notification', status: 'healthy', latencyMs: randomBetween(8, 25),   requestsPerMin: randomBetween(500, 900), errorRate: Math.random() * 0.1,  icon: Bell,        color: 'bg-orange-500'},
    { name: 'Audit Service',        key: 'audit',        status: 'healthy', latencyMs: randomBetween(5, 20),   requestsPerMin: randomBetween(800,1200), errorRate: 0,                    icon: Shield,      color: 'bg-red-500'   },
  ];
}

// ── Client apps config ────────────────────────────────────────────────────────

const CLIENT_APPS = [
  { id: 'admin_panel',  label: 'Admin Panel',  icon: Monitor,    color: 'bg-blue-600'    },
  { id: 'courier_app',  label: 'Courier App',  icon: Smartphone, color: 'bg-green-600'   },
  { id: 'seller_app',   label: 'Seller App',   icon: Package,    color: 'bg-violet-600'  },
  { id: 'pvz_app',      label: 'PVZ App',      icon: Globe,      color: 'bg-amber-600'   },
  { id: 'client_app',   label: 'Client App',   icon: Users,      color: 'bg-pink-600'    },
];

// ── Event badges ──────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  ORDER_CREATED:   'bg-violet-100 text-violet-700',
  ORDER_ACCEPTED:  'bg-blue-100 text-blue-700',
  ORDER_DELIVERED: 'bg-green-100 text-green-700',
  DOCUMENT_UPLOADED:'bg-yellow-100 text-yellow-700',
  DOCUMENT_APPROVED:'bg-green-100 text-green-700',
  DOCUMENT_REJECTED:'bg-red-100 text-red-700',
  COURIER_ONLINE:  'bg-emerald-100 text-emerald-700',
  COURIER_OFFLINE: 'bg-gray-100 text-gray-600',
  AUDIT_WRITTEN:   'bg-gray-100 text-gray-600',
  NOTIFICATION_SENT:'bg-orange-100 text-orange-700',
  USER_ACTIVATED:  'bg-teal-100 text-teal-700',
  USER_BLOCKED:    'bg-red-100 text-red-700',
  PAYMENT_CREATED: 'bg-emerald-100 text-emerald-700',
  TICKET_CREATED:  'bg-cyan-100 text-cyan-700',
  TICKET_ESCALATED:'bg-red-100 text-red-700',
};

const DEMO_EVENTS: { type: PlatformEventType; label: string; color: string }[] = [
  { type: 'ORDER_CREATED',   label: '+ Создать заказ',    color: 'bg-violet-600' },
  { type: 'COURIER_ONLINE',  label: '● Курьер онлайн',    color: 'bg-green-600'  },
  { type: 'DOCUMENT_APPROVED',label: '✓ Одобрить документ',color:'bg-emerald-600'},
  { type: 'DOCUMENT_REJECTED',label: '✗ Отклонить документ',color:'bg-red-600'  },
  { type: 'TICKET_CREATED',  label: '⚠ Новый тикет',     color: 'bg-cyan-600'   },
  { type: 'COURIER_OFFLINE', label: '○ Курьер офлайн',    color: 'bg-gray-500'   },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ArchitecturePage() {
  const [services, setServices] = useState<ServiceHealth[]>(() => generateMetrics());
  const [eventLog, setEventLog] = useState(() => getEventLog(30));
  const [snapshot, setSnapshot] = useState(() => getGatewaySnapshot());
  const [auditStats, setAuditStats] = useState(() => AuditService.getStats());
  const [activeTab, setActiveTab] = useState<'diagram' | 'events' | 'cache' | 'audit' | 'demo'>('diagram');
  const [demoResponse, setDemoResponse] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [cacheKeys, setCacheKeys] = useState<string[]>([]);

  // ── Refresh every 3s ──
  useEffect(() => {
    const interval = setInterval(() => {
      setServices(generateMetrics());
      setEventLog(getEventLog(30));
      setSnapshot(getGatewaySnapshot());
      setAuditStats(AuditService.getStats());
      setCacheKeys(cache.getKeys());
      setPulse(v => !v);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Subscribe to events ──
  useEffect(() => {
    const unsub = on('*', () => {
      setEventLog(getEventLog(30));
    });
    return unsub;
  }, []);

  // ── Demo: fire event ──
  const fireEvent = useCallback(async (type: PlatformEventType) => {
    setDemoLoading(true);
    setDemoResponse(null);

    const demoPayload: Record<string, unknown> = {
      ORDER_CREATED:    { orderId: `ORD-${Date.now().toString(36).toUpperCase()}`, clientId: 'client-001', totalAmount: 1450 },
      COURIER_ONLINE:   { courierId: `CRR-${Date.now().toString(36)}`, lat: 55.7512, lng: 37.6184 },
      DOCUMENT_APPROVED:{ docId: `doc-${Date.now().toString(36)}`, reviewerId: 'admin-001', reviewerLabel: 'Администратор' },
      DOCUMENT_REJECTED:{ docId: `doc-${Date.now().toString(36)}`, reason: 'Нечитаемый документ', reviewerId: 'admin-001' },
      TICKET_CREATED:   { ticketId: `TKT-${Date.now().toString(36)}`, subject: 'Тест-тикет', userId: 'user-001' },
      COURIER_OFFLINE:  { courierId: `CRR-${Date.now().toString(36)}` },
    };

    // Small delay to show loading
    await new Promise(r => setTimeout(r, 300));
    emit(type, demoPayload[type] ?? {}, { source: 'admin_panel', userId: 'admin-001' });
    setEventLog(getEventLog(30));

    const sideEffects: Record<string, string[]> = {
      DOCUMENT_APPROVED: ['✅ UserService.activateUser()', '📧 NotificationService.send(in_app)', '📝 AuditService.write(APPROVE)'],
      DOCUMENT_REJECTED: ['❌ DocumentService → REQUEST_REUPLOAD', '📧 NotificationService.send(in_app)', '📝 AuditService.write(REJECT)'],
      ORDER_CREATED:     ['📦 OrderService.createOrder()', '🔔 NotificationService.send(push)', '📝 AuditService.write(CREATE)'],
      COURIER_ONLINE:    ['♻️ cache.invalidateByTag(couriers:online)', '📝 AuditService.write(ONLINE)'],
      TICKET_CREATED:    ['📧 NotificationService.send(email → support)', '📝 AuditService.write(CREATE_TICKET)'],
      COURIER_OFFLINE:   ['♻️ cache.del(courier:online:*)', '📝 AuditService.write(OFFLINE)'],
    };

    const effects = sideEffects[type] ?? ['📝 AuditService.write()'];
    const trace = `✓ ${type}\n  → Источник: admin_panel\n  → Автозапуск:\n    ${effects.join('\n    ')}`;
    setDemoResponse(trace);
    setDemoLoading(false);
  }, []);

  // ── Gateway demo request ──
  const demoGateway = useCallback(async () => {
    setDemoLoading(true);
    setDemoResponse(null);
    const res = await gateway.request({
      service: 'courier',
      action: 'getActiveCouriers',
      client: 'admin_panel',
      userId: 'admin-001',
      userRole: 'Admin',
    });
    setDemoResponse(JSON.stringify(res, null, 2));
    setDemoLoading(false);
  }, []);

  const stats = snapshot.stats;
  const cacheStats = snapshot.cache;

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Platform Architecture</h1>
                <p className="text-xs text-gray-400">Event-Driven Microservices · API Gateway · RBAC · Cache</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${pulse ? 'bg-green-400' : 'bg-green-500'} transition-colors`} />
            <span className="text-xs text-green-400 font-medium">Live Monitoring</span>
            <span className="text-xs text-gray-500">· {new Date().toLocaleTimeString('ru-RU')}</span>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Запросов (total)', val: stats.totalRequests, icon: <Activity className="w-4 h-4" />, color: 'text-blue-400' },
            { label: 'Cache hit rate', val: `${cacheStats.hitRate}%`, icon: <HardDrive className="w-4 h-4" />, color: 'text-green-400' },
            { label: 'Rate limited', val: stats.rateLimited, icon: <AlertCircle className="w-4 h-4" />, color: 'text-amber-400' },
            { label: 'Аудит записей', val: auditStats.total, icon: <Shield className="w-4 h-4" />, color: 'text-purple-400' },
          ].map(({ label, val, icon, color }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className={`flex items-center gap-2 ${color} mb-2`}>{icon}<span className="text-[10px] font-medium">{label}</span></div>
              <p className="text-2xl font-bold text-white">{val}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit flex-wrap">
          {[
            { id: 'diagram', label: 'Архитектура' },
            { id: 'events', label: `Event Bus (${eventLog.length})` },
            { id: 'cache', label: 'Cache Layer' },
            { id: 'audit', label: 'Audit Log' },
            { id: 'demo', label: '⚡ Live Demo' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DIAGRAM TAB ── */}
        {activeTab === 'diagram' && (
          <div className="space-y-4">
            {/* Client Apps */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Client Applications</p>
              <div className="grid grid-cols-5 gap-3">
                {CLIENT_APPS.map(app => (
                  <div key={app.id} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                    <div className={`w-10 h-10 ${app.color} rounded-xl flex items-center justify-center`}>
                      <app.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-300 text-center leading-tight">{app.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-6 bg-gradient-to-b from-gray-600 to-blue-500" />
                  <ArrowDown className="w-4 h-4 text-blue-400" />
                  <span className="text-[9px] text-gray-500">HTTPS / WebSocket</span>
                </div>
              </div>
            </div>

            {/* Gateway */}
            <div className="bg-blue-600/20 border-2 border-blue-500/50 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-blue-300">API Gateway</p>
                  <p className="text-[10px] text-blue-400">Authentication · RBAC · Rate Limiting · Request Routing · Response Logging</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] bg-blue-500/30 text-blue-300 px-2 py-1 rounded-lg font-mono">{stats.totalRequests} req</span>
                  <span className="text-[10px] bg-red-500/30 text-red-300 px-2 py-1 rounded-lg font-mono">{stats.unauthorized} 403</span>
                  <span className="text-[10px] bg-amber-500/30 text-amber-300 px-2 py-1 rounded-lg font-mono">{stats.rateLimited} 429</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {['Auth JWT / API Key', 'RBAC Permissions', 'Rate Limit: 100 req/min', 'Request Tracing', 'Load Balancing', 'Circuit Breaker'].map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-blue-300">
                    <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />{f}
                  </div>
                ))}
              </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {services.map(svc => (
                <div key={svc.key} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors group">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 ${svc.color} rounded-lg flex items-center justify-center`}>
                      <svc.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{svc.name}</p>
                      <div className={`flex items-center gap-1 ${svc.status === 'healthy' ? 'text-green-400' : svc.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${svc.status === 'healthy' ? 'bg-green-400' : svc.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <span className="text-[9px] font-medium">{svc.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">Latency</span>
                      <span className={`font-mono font-semibold ${svc.latencyMs < 50 ? 'text-green-400' : svc.latencyMs < 100 ? 'text-amber-400' : 'text-red-400'}`}>{svc.latencyMs}ms</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">req/min</span>
                      <span className="text-gray-300 font-mono">{svc.requestsPerMin}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">errors</span>
                      <span className={`font-mono ${svc.errorRate < 1 ? 'text-green-400' : 'text-red-400'}`}>{svc.errorRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${svc.color}`} style={{ width: `${Math.min(100, svc.requestsPerMin / 12)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-1">
                <ArrowDown className="w-4 h-4 text-gray-500" />
                <span className="text-[9px] text-gray-600">PostgreSQL + Redis + S3</span>
              </div>
            </div>

            {/* Database */}
            <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Database Layer</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'PostgreSQL', desc: 'Users, Orders, Documents, Finance', icon: Database, color: 'text-blue-400' },
                  { label: 'Redis', desc: 'Cache, Sessions, Pub/Sub, Rate Limiting', icon: Zap, color: 'text-red-400' },
                  { label: 'Object Storage', desc: 'Documents, Photos, Proofs (S3-compatible)', icon: HardDrive, color: 'text-amber-400' },
                ].map(({ label, desc, icon: Icon, color }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                    <Icon className={`w-5 h-5 ${color} shrink-0 mt-0.5`} />
                    <div>
                      <p className="text-xs font-semibold text-white">{label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lazy Loading explanation */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-3">Lazy Loading Strategy</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { step: '1', label: 'Skeleton', desc: 'Рендер мгновенно с placeholder', color: 'bg-amber-500/20 border-amber-500/40' },
                  { step: '2', label: 'Critical Data', desc: 'Основная информация (name, status)', color: 'bg-amber-500/20 border-amber-500/40' },
                  { step: '3', label: 'On Demand', desc: 'Документы, заказы, финансы — по вкладке', color: 'bg-amber-500/20 border-amber-500/40' },
                  { step: '4', label: 'Cache', desc: 'Повторные запросы из кэша (30–120s TTL)', color: 'bg-amber-500/20 border-amber-500/40' },
                ].map(({ step, label, desc, color }) => (
                  <div key={step} className={`border ${color} rounded-xl p-3`}>
                    <div className="w-6 h-6 rounded-full bg-amber-500/40 flex items-center justify-center text-amber-300 text-xs font-bold mb-2">{step}</div>
                    <p className="text-xs font-semibold text-amber-300">{label}</p>
                    <p className="text-[10px] text-amber-400/70 mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── EVENTS TAB ── */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Event Bus — Live Stream</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Все события платформы · pub/sub · {eventLog.length} записей</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400">Live</span>
                </div>
              </div>
              {eventLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                  <Zap className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Нет событий. Перейдите на вкладку «Live Demo» и запустите событие.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {eventLog.map(evt => (
                    <div key={evt.id} className="flex items-start gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                      <div className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono shrink-0 mt-0.5 ${EVENT_COLORS[evt.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {evt.type}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-gray-400">src: <span className="text-gray-300">{evt.source}</span></span>
                          <span className="text-[10px] text-gray-600">trace: <span className="font-mono text-gray-500">{evt.correlationId?.slice(0, 12)}</span></span>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-0.5 font-mono truncate">{JSON.stringify(evt.payload).slice(0, 80)}</p>
                      </div>
                      <span className="text-[9px] text-gray-600 shrink-0">{fmtIso(evt.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Event types reference */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-300 mb-4">Все типы событий платформы</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(EVENT_COLORS).map(([type, color]) => (
                  <div key={type} className={`px-2 py-1 rounded text-[9px] font-bold font-mono ${color}`}>{type}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CACHE TAB ── */}
        {activeTab === 'cache' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Cache Hits', val: cacheStats.hits, color: 'text-green-400' },
                { label: 'Cache Misses', val: cacheStats.misses, color: 'text-red-400' },
                { label: 'Hit Rate', val: `${cacheStats.hitRate}%`, color: 'text-blue-400' },
                { label: 'Keys in Cache', val: cacheStats.size, color: 'text-amber-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className={`text-xs font-medium ${color} mb-2`}>{label}</p>
                  <p className="text-2xl font-bold text-white">{val}</p>
                </div>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <p className="text-sm font-semibold text-white">Активные ключи кэша</p>
                <p className="text-[10px] text-gray-500">TTL: activeCouriers=15s · orders:open=20s · user:*=120s</p>
              </div>
              {cacheKeys.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-600">
                  <HardDrive className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">Кэш пуст. Перейдите в Live Demo → «Запрос через Gateway».</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {cacheKeys.map(k => (
                    <div key={k} className="flex items-center gap-3 px-5 py-2.5">
                      <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-mono text-xs text-amber-300">{k}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-300 mb-3">Cache Strategy</p>
              <div className="space-y-2 text-[11px]">
                {[
                  { key: 'couriers:active', ttl: '15s', desc: 'Список онлайн-курьеров — обновляется при COURIER_ONLINE/OFFLINE' },
                  { key: 'orders:open', ttl: '20s', desc: 'Открытые заказы — инвалидируется при ORDER_CREATED/ACCEPTED' },
                  { key: 'user:*', ttl: '120s', desc: 'Данные пользователей — инвалидируется при USER_ACTIVATED/BLOCKED' },
                  { key: 'courier:online:*', ttl: '15s', desc: 'Онлайн-статус конкретного курьера' },
                  { key: 'docs:*', ttl: '60s', desc: 'Документы сущности — инвалидируется при UPLOAD/APPROVE/REJECT' },
                ].map(({ key, ttl, desc }) => (
                  <div key={key} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                    <span className="font-mono text-amber-300 shrink-0">{key}</span>
                    <span className="text-blue-300 shrink-0">TTL:{ttl}</span>
                    <span className="text-gray-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AUDIT TAB ── */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(auditStats.byService).map(([svc, count]) => (
                <div key={svc} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 font-mono">{svc}</p>
                  <p className="text-xl font-bold text-white">{count}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <p className="text-sm font-semibold text-white">Аудит-лог ({auditStats.total} записей)</p>
                <p className="text-[10px] text-gray-500">Все действия всех сервисов · неизменяемый лог</p>
              </div>
              {AuditService.getAll(50).length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-600">
                  <Shield className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">Нет записей. Выполните действие в любом разделе платформы.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {AuditService.getAll(50).map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 px-5 py-3 hover:bg-white/5">
                      <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Shield className="w-3 h-3 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-white font-mono">{entry.action}</span>
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">{entry.service}</span>
                          {entry.userLabel && <span className="text-[9px] text-gray-500">{entry.userLabel}</span>}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{entry.details}</p>
                        <p className="text-[9px] text-gray-700 mt-0.5">{new Date(entry.timestamp).toLocaleString('ru-RU')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DEMO TAB ── */}
        {activeTab === 'demo' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-1">⚡ Live Event Demo</p>
              <p className="text-[11px] text-gray-500 mb-4">Нажмите кнопку — событие отправится в Event Bus → автоматически запустятся нужные сервисы</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEMO_EVENTS.map(({ type, label, color }) => (
                  <button key={type} onClick={() => fireEvent(type)}
                    disabled={demoLoading}
                    className={`${color} text-white px-4 py-3 rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all text-left`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white mb-1">🔀 Gateway Request Demo</p>
              <p className="text-[11px] text-gray-500 mb-4">Запрос через API Gateway: RBAC → Cache → CourierService.getActiveCouriers()</p>
              <button onClick={demoGateway} disabled={demoLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                <Send className="w-3.5 h-3.5" />
                {demoLoading ? 'Выполняется...' : 'Выполнить запрос'}
              </button>
            </div>

            {demoLoading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-sm text-gray-400">Маршрутизация через Gateway...</span>
              </div>
            )}

            {demoResponse && !demoLoading && (
              <div className="bg-white/5 border border-green-500/30 rounded-2xl p-5">
                <p className="text-xs font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />Ответ сервиса
                </p>
                <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap overflow-auto max-h-64 bg-black/30 p-4 rounded-xl">{demoResponse}</pre>
              </div>
            )}

            {/* Flow diagram */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-300 mb-4">Схема работы: DOCUMENT_APPROVED</p>
              <div className="flex flex-col gap-2">
                {[
                  { from: 'Admin Panel', to: 'API Gateway', desc: 'POST /api/document/approve', color: 'text-blue-400' },
                  { from: 'API Gateway', to: 'Document Service', desc: 'Auth ✓ · RBAC ✓ · Route', color: 'text-green-400' },
                  { from: 'Document Service', to: 'Event Bus', desc: 'emit(DOCUMENT_APPROVED)', color: 'text-amber-400' },
                  { from: 'Event Bus', to: 'User Service', desc: '→ activateUser() [авто]', color: 'text-violet-400' },
                  { from: 'Event Bus', to: 'Notification Service', desc: '→ send(in_app) [авто]', color: 'text-orange-400' },
                  { from: 'Event Bus', to: 'Audit Service', desc: '→ write(APPROVE) [авто]', color: 'text-red-400' },
                ].map(({ from, to, desc, color }) => (
                  <div key={from + to} className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-gray-400 w-32 text-right shrink-0">{from}</span>
                    <ArrowRight className={`w-3 h-3 ${color} shrink-0`} />
                    <span className="text-[10px] font-semibold text-gray-300 w-28 shrink-0">{to}</span>
                    <span className="text-[10px] text-gray-600">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
