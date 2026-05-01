import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Shield, Lock, Key, Globe, AlertTriangle, CheckCircle2,
  X, Plus, Trash2, Pencil as Edit2, Eye, EyeOff, Copy, Download,
  RefreshCw, Monitor, Smartphone, Tablet, Laptop,
  LogOut, LogIn, MapPin, Clock, User, Users, Search,
  ShieldAlert, ShieldCheck,
  Fingerprint, Link2, Settings, Bell, Ban,
  Code, Save,
  Activity, Database,
  FileText,
  AlertCircle, CheckCircle, XCircle,
} from 'lucide-react';
import { exportToCsv } from '../../utils/downloads';
import { useI18n, type DictKey } from '../../i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

type SecurityTab =
  | 'policies'
  | 'sessions'
  | 'logins'
  | 'ip'
  | 'tokens'
  | 'sso'
  | 'alerts'
  | 'superadmin';

interface Session {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  startedAt: string;
  lastActivity: string;
  isCurrent: boolean;
  trusted: boolean;
}

interface LoginEvent {
  id: string;
  user: string;
  email: string;
  role: string;
  ip: string;
  location: string;
  device: string;
  status: 'success' | 'failed' | 'suspicious' | 'blocked';
  reason?: string;
  timestamp: string;
  twoFaUsed: boolean;
}

interface IpRule {
  id: string;
  type: 'allow' | 'deny';
  ip: string;
  label: string;
  addedAt: string;
  addedBy: string;
  active: boolean;
}

interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  scope: string[];
  createdAt: string;
  lastUsed: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'revoked';
}

interface SsoProvider {
  id: string;
  name: string;
  type: 'oauth2' | 'saml' | 'oidc';
  clientId: string;
  active: boolean;
  icon: string;
  userCount: number;
}

interface SecurityAlert {
  id: string;
  type: 'brute_force' | 'geo_anomaly' | 'new_device' | 'suspicious_ip' | 'mass_login' | 'superadmin';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  timestamp: string;
  resolved: boolean;
  ip?: string;
  user?: string;
}

interface SuperAdminAction {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  timestamp: string;
  ip: string;
  riskLevel: 'critical' | 'high' | 'medium';
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SESSIONS: Session[] = [
  { id: 's1', userId: '1', userName: 'Администратор Системы', userRole: 'Admin', device: 'MacBook Pro', deviceType: 'desktop', browser: 'Chrome 123', os: 'macOS 14', ip: '192.168.1.100', location: 'Москва, RU', startedAt: '14.03.2026 09:00', lastActivity: '14.03.2026 14:30', isCurrent: true, trusted: true },
  { id: 's2', userId: '2', userName: 'Иванов Иван', userRole: 'RegionalManager', device: 'iPhone 15', deviceType: 'mobile', browser: 'Safari 17', os: 'iOS 17', ip: '10.0.0.45', location: 'Санкт-Петербург, RU', startedAt: '14.03.2026 10:15', lastActivity: '14.03.2026 13:55', isCurrent: false, trusted: true },
  { id: 's3', userId: '4', userName: 'Сидоров Петр', userRole: 'Finance', device: 'Windows PC', deviceType: 'desktop', browser: 'Edge 122', os: 'Windows 11', ip: '172.16.0.8', location: 'Москва, RU', startedAt: '14.03.2026 08:45', lastActivity: '14.03.2026 12:00', isCurrent: false, trusted: true },
  { id: 's4', userId: '5', userName: 'Козлова Елена', userRole: 'Support', device: 'iPad Air', deviceType: 'tablet', browser: 'Chrome 123', os: 'iPadOS 17', ip: '192.168.2.20', location: 'Москва, RU', startedAt: '14.03.2026 11:30', lastActivity: '14.03.2026 14:25', isCurrent: false, trusted: false },
  { id: 's5', userId: '10', userName: 'Волкова Ирина', userRole: 'RegionalManager', device: 'Samsung Galaxy', deviceType: 'mobile', browser: 'Chrome 123', os: 'Android 14', ip: '5.44.23.120', location: 'Казань, RU', startedAt: '14.03.2026 12:00', lastActivity: '14.03.2026 14:10', isCurrent: false, trusted: false },
];

const LOGIN_EVENTS: LoginEvent[] = [
  { id: 'l1', user: 'Администратор', email: 'admin@platform.com', role: 'Admin', ip: '192.168.1.100', location: 'Москва, RU', device: 'Chrome / macOS', status: 'success', timestamp: '14.03.2026 09:00:12', twoFaUsed: true },
  { id: 'l2', user: 'Иванов Иван',   email: 'ivanov@platform.com', role: 'RegionalManager', ip: '10.0.0.45', location: 'СПб, RU', device: 'Safari / iOS', status: 'success', timestamp: '14.03.2026 10:14:55', twoFaUsed: false },
  { id: 'l3', user: 'Неизвестный',   email: 'admin@platform.com', role: '—', ip: '91.234.55.12', location: 'Амстердам, NL', device: 'Firefox / Linux', status: 'suspicious', reason: 'Вход из нетипичной локации (NL)', timestamp: '14.03.2026 08:33:22', twoFaUsed: false },
  { id: 'l4', user: 'Лебедева Ольга', email: 'lebedeva@support.pvz.ru', role: 'Support', ip: '192.168.1.55', location: 'Москва, RU', device: 'Chrome / Windows', status: 'failed', reason: 'Неверный пароль (3/5)', timestamp: '14.03.2026 07:55:01', twoFaUsed: false },
  { id: 'l5', user: 'Бот/атака',     email: 'admin@platform.com', role: '—', ip: '45.14.50.100', location: 'Берлин, DE', device: 'curl/7.85', status: 'blocked', reason: 'Brute-force — заблокирован после 10 попыток', timestamp: '14.03.2026 06:01:44', twoFaUsed: false },
  { id: 'l6', user: 'Сидоров Петр', email: 'sidorov@platform.com', role: 'Finance', ip: '172.16.0.8', location: 'Москва, RU', device: 'Edge / Windows', status: 'success', timestamp: '14.03.2026 08:44:30', twoFaUsed: true },
  { id: 'l7', user: 'Неизвестный',   email: 'finance@platform.com', role: '—', ip: '37.45.122.9', location: 'Киев, UA', device: 'Chrome / Windows', status: 'blocked', reason: 'IP в deny-списке', timestamp: '13.03.2026 23:12:05', twoFaUsed: false },
];

const IP_RULES: IpRule[] = [
  { id: 'ip1', type: 'allow', ip: '192.168.0.0/24', label: 'Офис Москва', addedAt: '01.01.2026', addedBy: 'SuperAdmin', active: true },
  { id: 'ip2', type: 'allow', ip: '10.0.0.0/8',     label: 'VPN-сеть',    addedAt: '15.01.2026', addedBy: 'Admin',      active: true },
  { id: 'ip3', type: 'allow', ip: '172.16.0.0/12',  label: 'Внутренняя сеть', addedAt: '15.01.2026', addedBy: 'Admin', active: true },
  { id: 'ip4', type: 'deny',  ip: '45.14.50.0/24',  label: 'Brute-force источник', addedAt: '14.03.2026', addedBy: 'Система', active: true },
  { id: 'ip5', type: 'deny',  ip: '37.45.122.9',    label: 'Suspicious login UA', addedAt: '13.03.2026', addedBy: 'Admin', active: true },
  { id: 'ip6', type: 'deny',  ip: '91.234.55.0/24', label: 'TOR-выходной узел NL', addedAt: '10.03.2026', addedBy: 'Система', active: false },
];

const API_TOKENS: ApiToken[] = [
  { id: 'tk1', name: 'Mobile App (Production)', prefix: 'pvz_prod_...3f8a', scope: ['orders:read', 'orders:write', 'couriers:read'], createdAt: '01.01.2026', lastUsed: '14.03.2026 14:28', status: 'active' },
  { id: 'tk2', name: 'Analytics Dashboard',     prefix: 'pvz_ana_...9c2b',  scope: ['analytics:read', 'orders:read'],            createdAt: '15.01.2026', lastUsed: '14.03.2026 12:00', status: 'active' },
  { id: 'tk3', name: 'Webhook Service',          prefix: 'pvz_wh_...7d1e',   scope: ['webhooks:send'],                             createdAt: '01.02.2026', lastUsed: '14.03.2026 09:15', expiresAt: '01.06.2026', status: 'active' },
  { id: 'tk4', name: 'Legacy Integration (OLD)', prefix: 'pvz_leg_...2b0f',  scope: ['*'],                                         createdAt: '01.11.2025', lastUsed: '10.01.2026', expiresAt: '10.01.2026', status: 'expired' },
];

const SSO_PROVIDERS: SsoProvider[] = [
  { id: 'g1', name: 'Google Workspace', type: 'oidc', clientId: '442813...apps.googleusercontent.com', active: true, icon: '🔷', userCount: 12 },
  { id: 'g2', name: 'Microsoft Azure AD', type: 'saml', clientId: 'tenant/4f2a3b...', active: false, icon: '🔵', userCount: 0 },
  { id: 'g3', name: 'Okta', type: 'oauth2', clientId: 'okta.example.com/oauth2', active: false, icon: '🔴', userCount: 0 },
];

const SECURITY_ALERTS: SecurityAlert[] = [
  { id: 'sa1', type: 'brute_force', severity: 'critical', title: 'Brute-force атака', detail: '47 неудачных попыток входа за 3 мин с IP 45.14.50.100', timestamp: '14.03.2026 06:01', resolved: false, ip: '45.14.50.100', user: 'admin@platform.com' },
  { id: 'sa2', type: 'geo_anomaly', severity: 'high', title: 'Geo-аномалия входа', detail: 'Пользователь admin@platform.com вошёл из Амстердама (обычно — Москва)', timestamp: '14.03.2026 08:33', resolved: false, ip: '91.234.55.12', user: 'admin@platform.com' },
  { id: 'sa3', type: 'new_device', severity: 'medium', title: 'Новое устройство', detail: 'Козлова Елена — вход с нового iPad Air (не в списке доверенных)', timestamp: '14.03.2026 11:30', resolved: false, user: 'kozlova@platform.com' },
  { id: 'sa4', type: 'suspicious_ip', severity: 'high', title: 'Подозрительный IP', detail: 'Попытка входа с IP 37.45.122.9 (Киев). IP в deny-листе', timestamp: '13.03.2026 23:12', resolved: true, ip: '37.45.122.9' },
  { id: 'sa5', type: 'mass_login', severity: 'medium', title: 'Массовые сессии', detail: 'Пользователь Иванов Иван — 3 активные сессии одновременно', timestamp: '13.03.2026 18:00', resolved: true, user: 'ivanov@platform.com' },
  { id: 'sa6', type: 'superadmin', severity: 'critical', title: 'SuperAdmin — удаление роли', detail: 'SuperAdmin удалил роль «ComplianceAdmin» в нерабочее время', timestamp: '12.03.2026 02:14', resolved: false, user: 'superadmin@platform.com' },
];

const SUPERADMIN_ACTIONS: SuperAdminAction[] = [
  { id: 'sa1', actor: 'superadmin@platform.com', action: 'ROLE_DELETED', target: 'ComplianceAdmin', detail: 'Удалена роль ComplianceAdmin и переназначены все 3 пользователя', timestamp: '12.03.2026 02:14', ip: '192.168.1.1', riskLevel: 'critical' },
  { id: 'sa2', actor: 'superadmin@platform.com', action: 'USER_SUSPENDED', target: 'Лебедева О.', detail: 'Пользователь lebedeva@support.pvz.ru заблокирован принудительно', timestamp: '05.03.2026 18:30', ip: '192.168.1.1', riskLevel: 'high' },
  { id: 'sa3', actor: 'superadmin@platform.com', action: 'PERM_GRANTED', target: 'Сидоров П.', detail: 'Выданы права payouts.approve + finance.manage (вне очереди)', timestamp: '28.02.2026 10:00', ip: '10.0.0.1', riskLevel: 'high' },
  { id: 'sa4', actor: 'superadmin@platform.com', action: 'APIKEY_REVOKED', target: 'Legacy Integration', detail: 'Отозван API-токен pvz_leg_...2b0f (широкие права *)', timestamp: '10.01.2026 14:55', ip: '10.0.0.1', riskLevel: 'medium' },
  { id: 'sa5', actor: 'superadmin@platform.com', action: 'FORCED_LOGOUT_ALL', target: 'Все сессии', detail: 'Принудительный logout всех сессий после инцидента', timestamp: '06.01.2026 09:00', ip: '192.168.1.1', riskLevel: 'critical' },
];

// ─── Config helpers ───────────────────────────────────────────────────────────

const SEVERITY_CFG = {
  critical: { badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500',    label: 'Критично' },
  high:     { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', label: 'Высокий' },
  medium:   { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', label: 'Средний' },
  low:      { badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400',   label: 'Низкий' },
};

const LOGIN_STATUS_CFG = {
  success:    { badge: 'bg-green-100 text-green-700', icon: CheckCircle,  label: 'Успешно' },
  failed:     { badge: 'bg-red-100 text-red-700',     icon: XCircle,      label: 'Ошибка' },
  suspicious: { badge: 'bg-orange-100 text-orange-700', icon: AlertCircle, label: 'Подозрит.' },
  blocked:    { badge: 'bg-gray-100 text-gray-700',   icon: Ban,          label: 'Заблокирован' },
};

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function SectionCard({ title, desc, icon: Icon, children, className = '' }: {
  title: string; desc?: string; icon?: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl overflow-hidden ${className}`}>
      {(title || desc) && (
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          {Icon && <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-blue-600" /></div>}
          <div>
            <p className="text-sm font-bold text-gray-900">{title}</p>
            {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function PolicyRow({ label, desc, value, onChange, type = 'toggle', options, min, max }: {
  label: string; desc?: string;
  value: any; onChange: (v: any) => void;
  type?: 'toggle' | 'number' | 'select';
  options?: { value: string; label: string }[];
  min?: number; max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      {type === 'toggle' && <Toggle on={value} onToggle={() => onChange(!value)} />}
      {type === 'number' && (
        <input
          type="number" value={value} min={min} max={max}
          onChange={e => onChange(Number(e.target.value))}
          className="w-20 text-center px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      {type === 'select' && (
        <select value={value} onChange={e => onChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </div>
  );
}

// ─── Tab: Policies ────────────────────────────────────────────────────────────

function PoliciesTab() {
  const [pwd, setPwd] = useState({
    minLength: 12, requireUppercase: true, requireNumbers: true, requireSpecial: true,
    noCommonPasswords: true, expireDays: 90, historyCount: 10, resetOnFirstLogin: true,
  });
  const [twofa, setTwofa] = useState({
    required: true, methods: ['totp', 'sms'], gracePeriodDays: 3, backupCodes: true, trustedDeviceDays: 30,
  });
  const [session, setSession] = useState({
    maxDurationHours: 8, idleTimeoutMinutes: 30, concurrentSessions: 3, requireReauthForSensitive: true,
    forceLogoutOnRoleChange: true,
  });
  const [api, setApi] = useState({
    tokenExpiryDays: 90, maxTokensPerUser: 5, requireIpWhitelist: false, rateLimit: 1000,
  });
  const [bruteForce, setBruteForce] = useState({
    maxAttempts: 5, attemptWindow: 15, lockMinutes: 60,
  });
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    toast.success('Политики безопасности сохранены');
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Password */}
        <SectionCard title="Политика паролей" desc="Требования к паролям пользователей" icon={Lock}>
          <div>
            <PolicyRow label="Минимальная длина" desc="Символов в пароле" value={pwd.minLength} onChange={v => setPwd(p=>({...p,minLength:v}))} type="number" min={8} max={64}/>
            <PolicyRow label="Заглавные буквы" desc="Минимум 1 заглавная буква" value={pwd.requireUppercase} onChange={v => setPwd(p=>({...p,requireUppercase:v}))} />
            <PolicyRow label="Цифры" desc="Минимум одна цифра" value={pwd.requireNumbers} onChange={v => setPwd(p=>({...p,requireNumbers:v}))} />
            <PolicyRow label="Спецсимволы (!@#$)" value={pwd.requireSpecial} onChange={v => setPwd(p=>({...p,requireSpecial:v}))} />
            <PolicyRow label="Запрет популярных паролей" desc="Проверка по базе HaveIBeenPwned" value={pwd.noCommonPasswords} onChange={v => setPwd(p=>({...p,noCommonPasswords:v}))} />
            <PolicyRow label="Срок действия (дней)" desc="0 = без ограничений" value={pwd.expireDays} onChange={v => setPwd(p=>({...p,expireDays:v}))} type="number" min={0} max={365}/>
            <PolicyRow label="История паролей" desc="Нельзя повторять последние N паролей" value={pwd.historyCount} onChange={v => setPwd(p=>({...p,historyCount:v}))} type="number" min={0} max={24}/>
            <PolicyRow label="Сброс при первом входе" value={pwd.resetOnFirstLogin} onChange={v => setPwd(p=>({...p,resetOnFirstLogin:v}))} />
          </div>
        </SectionCard>

        {/* 2FA */}
        <SectionCard title="Политика 2FA" desc="Двухфакторная аутентификация" icon={Fingerprint}>
          <PolicyRow label="Обязательная 2FA" desc="Все пользователи обязаны включить 2FA" value={twofa.required} onChange={v => setTwofa(p=>({...p,required:v}))} />
          <PolicyRow label="Резервные коды" desc="Генерация backup-кодов при настройке" value={twofa.backupCodes} onChange={v => setTwofa(p=>({...p,backupCodes:v}))} />
          <PolicyRow label="Льготный период (дней)" desc="Время на настройку 2FA после регистрации" value={twofa.gracePeriodDays} onChange={v => setTwofa(p=>({...p,gracePeriodDays:v}))} type="number" min={0} max={30}/>
          <PolicyRow label="Доверенное устройство (дней)" desc="Не запрашивать 2FA на устройстве N дней" value={twofa.trustedDeviceDays} onChange={v => setTwofa(p=>({...p,trustedDeviceDays:v}))} type="number" min={0} max={90}/>
          <div className="pt-3 mt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Разрешённые методы</p>
            <div className="flex flex-wrap gap-2">
              {[['totp','TOTP (Authenticator)'],['sms','SMS'],['email','Email OTP'],['hardware','Hardware Key']].map(([v,l]) => (
                <button key={v} onClick={() => setTwofa(p => ({
                    ...p, methods: p.methods.includes(v) ? p.methods.filter(x=>x!==v) : [...p.methods, v]
                  }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${twofa.methods.includes(v) ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Sessions */}
        <SectionCard title="Политика сессий" desc="Управление пользо��ательскими сессиями" icon={Monitor}>
          <PolicyRow label="Макс. длительность сессии (ч)" value={session.maxDurationHours} onChange={v => setSession(p=>({...p,maxDurationHours:v}))} type="number" min={1} max={168}/>
          <PolicyRow label="Таймаут неактивности (мин)" value={session.idleTimeoutMinutes} onChange={v => setSession(p=>({...p,idleTimeoutMinutes:v}))} type="number" min={5} max={480}/>
          <PolicyRow label="Макс. одновременных сессий" value={session.concurrentSessions} onChange={v => setSession(p=>({...p,concurrentSessions:v}))} type="number" min={1} max={10}/>
          <PolicyRow label="Повторная аутентификация" desc="Требовать 2FA для финансовых операций" value={session.requireReauthForSensitive} onChange={v => setSession(p=>({...p,requireReauthForSensitive:v}))} />
          <PolicyRow label="Logout при смене роли" desc="Завершить все сессии при изменении роли" value={session.forceLogoutOnRoleChange} onChange={v => setSession(p=>({...p,forceLogoutOnRoleChange:v}))} />
        </SectionCard>

        {/* API */}
        <SectionCard title="Политика доступа к API" desc="Токены и ограничения API" icon={Code}>
          <PolicyRow label="Срок жизни токена (дней)" value={api.tokenExpiryDays} onChange={v => setApi(p=>({...p,tokenExpiryDays:v}))} type="number" min={1} max={365}/>
          <PolicyRow label="Макс. токенов на пользователя" value={api.maxTokensPerUser} onChange={v => setApi(p=>({...p,maxTokensPerUser:v}))} type="number" min={1} max={20}/>
          <PolicyRow label="Rate limit (запросов/мин)" value={api.rateLimit} onChange={v => setApi(p=>({...p,rateLimit:v}))} type="number" min={10} max={10000}/>
          <PolicyRow label="Обязательный IP-вайтлист" desc="Токены работают только с разрешённых IP" value={api.requireIpWhitelist} onChange={v => setApi(p=>({...p,requireIpWhitelist:v}))} />
        </SectionCard>
      </div>

      {/* Brute Force */}
      <SectionCard title="Защита от Brute-Force" desc="Ограничение попыток входа" icon={ShieldAlert}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { key: 'maxAttempts', label: 'Макс. попыток входа', desc: 'До автоблокировки аккаунта', min: 1, max: 50 },
            { key: 'attemptWindow', label: 'Окно попыток (мин)', desc: 'Интервал подсчёта ошибок', min: 1, max: 60 },
            { key: 'lockMinutes', label: 'Блокировка на (мин)', desc: 'Длительность блокировки IP', min: 1, max: 1440 },
          ].map(item => (
            <div
              key={item.key}
              className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all"
            >
              <input
                type="number"
                min={item.min}
                max={item.max}
                value={(bruteForce as any)[item.key]}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isFinite(v)) return;
                  const clamped = Math.max(item.min, Math.min(item.max, v));
                  setBruteForce(prev => ({ ...prev, [item.key]: clamped }));
                }}
                className="text-2xl font-black text-blue-600 w-20 text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
              />
              <p className="text-xs font-semibold text-gray-700 mt-1">{item.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['CAPTCHA после 3 попыток', 'Email алерт при блокировке', 'Auto-ban IP после 3 блокировок', 'Уведомление SuperAdmin'].map(f => (
            <span key={f} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-medium">
              <CheckCircle2 className="w-3 h-3" />{f}
            </span>
          ))}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={save}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {saved ? <><CheckCircle2 className="w-4 h-4" />Сохранено</> : <><Save className="w-4 h-4" />Сохранить политики</>}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Sessions ────────────────────────────────────────────────────────────

function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>(SESSIONS);
  const [search, setSearch] = useState('');

  const DeviceIcon = (type: string) => {
    if (type === 'mobile') return Smartphone;
    if (type === 'tablet') return Tablet;
    return Laptop;
  };

  const filtered = sessions.filter(s =>
    !search || s.userName.toLowerCase().includes(search.toLowerCase()) ||
    s.ip.includes(search) || s.location.toLowerCase().includes(search.toLowerCase())
  );

  function terminate(id: string) {
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success('Сессия завершена');
  }
  function terminateAll() {
    setSessions(prev => prev.filter(s => s.isCurrent));
    toast.success('Все чужие сессии завершены');
  }
  function trust(id: string) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, trusted: true } : s));
    toast.success('Устройство добавлено в доверенные');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="Поиск по имени, IP, локации..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={terminateAll}
          className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors">
          <LogOut className="w-4 h-4" />Завершить все чужие ({sessions.filter(s=>!s.isCurrent).length})
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(s => {
          const DIcon = DeviceIcon(s.deviceType);
          return (
            <div key={s.id} className={`bg-white border rounded-2xl p-4 transition-all ${s.isCurrent ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.isCurrent ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <DIcon className={`w-5 h-5 ${s.isCurrent ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900">{s.userName}</p>
                    <span className="text-xs text-gray-400">{s.userRole}</span>
                    {s.isCurrent && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">Текущая</span>}
                    {!s.trusted && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full">Новое устройство</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Monitor className="w-3 h-3" />{s.device} · {s.browser}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Globe className="w-3 h-3" />{s.ip} · {s.location}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />Активна: {s.lastActivity}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!s.trusted && (
                    <button onClick={() => trust(s.id)}
                      className="px-2.5 py-1.5 border border-green-200 text-green-600 hover:bg-green-50 rounded-lg text-xs font-semibold transition-colors">
                      Доверять
                    </button>
                  )}
                  {!s.isCurrent && (
                    <button onClick={() => terminate(s.id)}
                      className="p-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Завершить">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400"><Monitor className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Нет активных сессий</p></div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Login Log ───────────────────────────────────────────────────────────

function LoginsTab() {
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'suspicious' | 'blocked'>('all');
  const [search, setSearch] = useState('');

  const filtered = LOGIN_EVENTS.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.user.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.ip.includes(q) || e.location.toLowerCase().includes(q);
    return matchSearch && (filter === 'all' || e.status === filter);
  });

  const counts = {
    all: LOGIN_EVENTS.length,
    success: LOGIN_EVENTS.filter(e => e.status === 'success').length,
    failed: LOGIN_EVENTS.filter(e => e.status === 'failed').length,
    suspicious: LOGIN_EVENTS.filter(e => e.status === 'suspicious').length,
    blocked: LOGIN_EVENTS.filter(e => e.status === 'blocked').length,
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {(['all','success','failed','suspicious','blocked'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${filter === f ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}>
            {f === 'all' ? 'Все' : f === 'success' ? 'Успешные' : f === 'failed' ? 'Ошибки' : f === 'suspicious' ? 'Подозрит.' : 'Заблок.'}
            <span className="ml-1 opacity-60">{counts[f]}</span>
          </button>
        ))}
        <button
          onClick={() => {
            if (filtered.length === 0) { toast.info('Нет событий для экспорта'); return; }
            exportToCsv(filtered as any[], [
              { key: 'user',       label: 'Пользователь' },
              { key: 'email',      label: 'Email' },
              { key: 'ip',         label: 'IP' },
              { key: 'location',   label: 'Локация' },
              { key: 'device',     label: 'Устройство' },
              { key: 'status',     label: 'Статус' },
              { key: 'twoFaUsed',  label: '2FA' },
              { key: 'reason',     label: 'Причина' },
              { key: 'timestamp',  label: 'Время' },
            ], 'login-journal');
            toast.success(`Скачан CSV: ${filtered.length} событий`);
          }}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <Download className="w-3.5 h-3.5" />Экспорт
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Пользователь','IP / Локация','Устройство','Статус','Время','2FA'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider first:rounded-tl-2xl last:rounded-tr-2xl">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(e => {
              const cfg = LOGIN_STATUS_CFG[e.status];
              const StatusIcon = cfg.icon;
              return (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{e.user}</p>
                    <p className="text-xs text-gray-400">{e.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-gray-700">{e.ip}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{e.device}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                      <StatusIcon className="w-3 h-3" />{cfg.label}
                    </span>
                    {e.reason && <p className="text-[10px] text-gray-400 mt-0.5 max-w-[140px] truncate">{e.reason}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{e.timestamp}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${e.twoFaUsed ? 'text-green-600' : 'text-gray-400'}`}>
                      {e.twoFaUsed ? '✓ Да' : '— Нет'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">Нет событий</div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: IP Access ───────────────────────────────────────────────────────────

function IpTab() {
  const [rules, setRules] = useState<IpRule[]>(IP_RULES);
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({ type: 'allow' as 'allow'|'deny', ip: '', label: '' });

  function addRule() {
    if (!newRule.ip.trim()) { toast.error('Введите IP или CIDR'); return; }
    const rule: IpRule = {
      id: `ip${Date.now()}`, type: newRule.type, ip: newRule.ip, label: newRule.label || newRule.ip,
      addedAt: '14.03.2026', addedBy: 'Admin', active: true,
    };
    setRules(prev => [...prev, rule]);
    setShowAdd(false);
    setNewRule({ type: 'allow', ip: '', label: '' });
    toast.success(`${newRule.type === 'allow' ? 'Allow' : 'Deny'} правило доба��лено`);
  }
  function toggle(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  }
  function remove(id: string) {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Правило удалено');
  }

  const allows = rules.filter(r => r.type === 'allow');
  const denies = rules.filter(r => r.type === 'deny');

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" />Добавить правило
        </button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-blue-900 mb-3">Новое IP-правило</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={newRule.type} onChange={e => setNewRule(r=>({...r,type:e.target.value as any}))}
              className="px-3 py-2 border border-blue-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="allow">Allow (разрешить)</option>
              <option value="deny">Deny (заблокировать)</option>
            </select>
            <input value={newRule.ip} onChange={e => setNewRule(r=>({...r,ip:e.target.value}))}
              placeholder="192.168.0.0/24 или 1.2.3.4"
              className="px-3 py-2 border border-blue-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            <input value={newRule.label} onChange={e => setNewRule(r=>({...r,label:e.target.value}))}
              placeholder="Описание (необязательно)"
              className="px-3 py-2 border border-blue-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white">Отмена</button>
            <button onClick={addRule} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Добавить</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[{ list: allows, type: 'allow', title: 'Allow List', desc: 'Разрешённые IP-адреса и сети', color: 'green' },
          { list: denies, type: 'deny',  title: 'Deny List',  desc: 'Заблокированные IP-адреса и сети', color: 'red' }].map(({ list, type, title, desc, color }) => (
          <div key={type} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className={`px-5 py-3 border-b ${color === 'green' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center gap-2">
                {color === 'green' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Ban className="w-4 h-4 text-red-600" />}
                <div>
                  <p className={`text-sm font-bold ${color === 'green' ? 'text-green-800' : 'text-red-800'}`}>{title} ({list.length})</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {list.map(rule => (
                <div key={rule.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${!rule.active ? 'opacity-50' : ''}`}>
                  <Toggle on={rule.active} onToggle={() => toggle(rule.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold text-gray-800">{rule.ip}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{rule.label} · {rule.addedAt} · {rule.addedBy}</p>
                  </div>
                  <button onClick={() => remove(rule.id)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {list.length === 0 && <p className="px-4 py-6 text-xs text-center text-gray-400">Нет правил</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Tokens & Keys ───────────────────────────────────────────────────────

function TokensTab() {
  const [tokens, setTokens] = useState<ApiToken[]>(API_TOKENS);
  const [showRevealId, setShowRevealId] = useState<string | null>(null);
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [newTokenForm, setNewTokenForm] = useState({ name: '', scope: 'orders:read', expiryDays: '90' });
  const [keyOverrides, setKeyOverrides] = useState<Record<string, string>>({});

  const STATUS_CFG = {
    active:  { badge: 'bg-green-100 text-green-700', label: 'Активен' },
    expired: { badge: 'bg-gray-100 text-gray-600',   label: 'Истёк' },
    revoked: { badge: 'bg-red-100 text-red-700',     label: 'Отозван' },
  };

  function revoke(id: string) {
    setTokens(prev => prev.map(t => t.id === id ? { ...t, status: 'revoked' } : t));
    toast.success('Токен отозван');
  }

  function createToken() {
    const name = newTokenForm.name.trim();
    if (!name) { toast.error('Введите имя токена'); return; }
    const days = parseInt(newTokenForm.expiryDays, 10);
    if (!Number.isFinite(days) || days <= 0) { toast.error('Срок жизни должен быть > 0 дней'); return; }
    const today = new Date();
    const expiry = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const dateStr = (d: Date) => d.toLocaleDateString('ru-RU');
    const prefix = `pk_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 10)}`;
    const newToken: ApiToken = {
      id: `tok-${Date.now()}`,
      name,
      prefix,
      scope: [newTokenForm.scope],
      createdAt: dateStr(today),
      lastUsed: '—',
      expiresAt: dateStr(expiry),
      status: 'active',
    };
    setTokens(prev => [newToken, ...prev]);
    setShowCreateToken(false);
    setNewTokenForm({ name: '', scope: 'orders:read', expiryDays: '90' });
    toast.success(`Токен создан: ${name}`, { description: `Префикс: ${prefix}` });
  }

  const baseSecretKeys = [
    { name: 'JWT_SECRET', value: 'hs256_prod_••••••••••••••••••••••••••••', env: 'production', updated: '01.01.2026' },
    { name: 'WEBHOOK_SIGNING_KEY', value: 'whsec_••••••••••••••••••••••••', env: 'production', updated: '15.02.2026' },
    { name: 'ENCRYPTION_KEY',  value: 'aes256_••••••••••••••••••••••••••••', env: 'production', updated: '01.01.2026' },
    { name: 'SERVICE_ACCOUNT_KEY', value: 'sa_key_••••••••••••••••••••••', env: 'all', updated: '10.03.2026' },
  ];
  const secretKeys = baseSecretKeys.map(k => keyOverrides[k.name] ? { ...k, updated: keyOverrides[k.name] } : k);

  return (
    <div className="space-y-5">
      {/* API Tokens */}
      <SectionCard title="API Токены" desc="Ключи доступа к API для интеграций" icon={Key}>
        <div className="flex justify-end mb-3">
          <button onClick={() => setShowCreateToken(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors">
            <Plus className="w-3.5 h-3.5" />Создать токен
          </button>
        </div>

        {showCreateToken && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowCreateToken(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <p className="font-bold text-gray-900">Создать API-токен</p>
                <button onClick={() => setShowCreateToken(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Имя токена *</label>
                  <input
                    value={newTokenForm.name}
                    onChange={e => setNewTokenForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Integration Webhook"
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Scope</label>
                  <select
                    value={newTokenForm.scope}
                    onChange={e => setNewTokenForm(f => ({ ...f, scope: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="orders:read">orders:read</option>
                    <option value="orders:write">orders:write</option>
                    <option value="inventory:read">inventory:read</option>
                    <option value="inventory:write">inventory:write</option>
                    <option value="webhooks:write">webhooks:write</option>
                    <option value="admin:full">admin:full</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Срок жизни (дней)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={newTokenForm.expiryDays}
                    onChange={e => setNewTokenForm(f => ({ ...f, expiryDays: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex gap-3">
                <button onClick={() => setShowCreateToken(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
                <button onClick={createToken} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">Создать</button>
              </div>
            </div>
          </div>,
          document.body
        )}
        <div className="space-y-3">
          {tokens.map(token => {
            const cfg = STATUS_CFG[token.status];
            return (
              <div key={token.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${token.status !== 'active' ? 'opacity-60 bg-gray-50 border-gray-100' : 'bg-white border-gray-200 hover:border-gray-300'} transition-all`}>
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><Key className="w-4 h-4 text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-800">{token.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{token.prefix}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {token.scope.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-mono">{s}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Создан: {token.createdAt} · Последнее использование: {token.lastUsed}{token.expiresAt ? ` · Истекает: ${token.expiresAt}` : ''}</p>
                </div>
                {token.status === 'active' && (
                  <button onClick={() => revoke(token.id)}
                    className="shrink-0 px-2.5 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors">
                    Отозвать
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Secret / Service Keys */}
      <SectionCard title="Секретные и сервисные ключи" desc="Системные ключи шифрования и аутентификации" icon={Database}>
        <div className="space-y-2">
          {secretKeys.map(key => (
            <div key={key.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-bold text-gray-800">{key.name}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{showRevealId === key.name ? key.value : key.value.replace(/[^•]/g, '•').slice(0,28)+'...'}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-gray-400">обновлён {key.updated}</span>
                <button onClick={() => setShowRevealId(showRevealId === key.name ? null : key.name)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                  {showRevealId === key.name ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(key.value).then(
                        () => toast.success(`${key.name} скопирован`),
                        () => toast.error('Не удалось скопировать')
                      );
                    } else {
                      toast.error('Clipboard API недоступен');
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors" title="Скопировать">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const today = new Date().toLocaleDateString('ru-RU');
                    setKeyOverrides(prev => ({ ...prev, [key.name]: today }));
                    toast.success(`${key.name} ротирован`, { description: `Новая дата: ${today}. Старый ключ перестанет работать через 24 часа.` });
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ротировать">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Webhook Security */}
      <SectionCard title="Webhook безопасность" desc="Подписи и верификация входящих/исходящих webhook" icon={Link2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'HMAC подпись', desc: 'SHA-256 подпись каждого payload', on: true },
            { label: 'Timestamp validation', desc: 'Отклонять запросы старше 5 минут', on: true },
            { label: 'IP-вайтлист для webhook', desc: 'Принимать только с известных IP', on: false },
            { label: 'Retry на failure', desc: 'Повтор 3 раза с backoff', on: true },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                <p className="text-[10px] text-gray-400">{item.desc}</p>
              </div>
              <Toggle on={item.on} onToggle={() => {}} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab: SSO / OAuth ─────────────────────────────────────────────────────────

function SsoTab() {
  const [providers, setProviders] = useState<SsoProvider[]>(SSO_PROVIDERS);
  const [editingProvider, setEditingProvider] = useState<SsoProvider | null>(null);
  const [editForm, setEditForm] = useState({ clientId: '', clientSecret: '' });

  function toggleProvider(id: string) {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
    const p = providers.find(x => x.id === id);
    toast.success(`${p?.name} ${p?.active ? 'отключён' : 'включён'}`);
  }

  function openEdit(p: SsoProvider) {
    setEditingProvider(p);
    setEditForm({ clientId: p.clientId, clientSecret: '' });
  }

  function saveEdit() {
    if (!editingProvider) return;
    if (!editForm.clientId.trim()) { toast.error('Client ID не может быть пустым'); return; }
    setProviders(prev => prev.map(p => p.id === editingProvider.id ? { ...p, clientId: editForm.clientId.trim() } : p));
    toast.success(`Настройки ${editingProvider.name} сохранены`);
    setEditingProvider(null);
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Провайдеры SSO / OAuth" desc="Внешние системы аутентификации" icon={Link2}>
        <div className="space-y-3">
          {providers.map(p => (
            <div key={p.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${p.active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <span className="text-2xl">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">{p.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono">{p.type.toUpperCase()}</span>
                  {p.active && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Активен</span>}
                </div>
                <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{p.clientId}</p>
                {p.active && <p className="text-xs text-green-700 mt-0.5">{p.userCount} пользователей используют этот провайдер</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(p)}
                  className="p-2 border border-gray-200 rounded-xl hover:bg-white text-gray-500 transition-colors" title="Настроить">
                  <Settings className="w-4 h-4" />
                </button>
                <Toggle on={p.active} onToggle={() => toggleProvider(p.id)} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Device Trust" desc="Управление доверенными устройствами" icon={Laptop}>
        <div className="space-y-3">
          {[
            { label: 'Device fingerprinting', desc: 'Идентификация устройств по отпечатку браузера', on: true },
            { label: 'Требовать 2FA на новых устройствах', desc: 'Всегда подтверждать новое устройство через 2FA', on: true },
            { label: 'Автодобавление в trusted', desc: 'После успешной 2FA — добавить в список доверенных', on: false },
            { label: 'Уведомление о новом устройстве', desc: 'Email/push при входе с нового устройства', on: true },
            { label: 'Максимум доверенных устройств', desc: '5 устройств на пользователя', on: true },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <Toggle on={item.on} onToggle={() => {}} />
            </div>
          ))}
        </div>
      </SectionCard>

      {editingProvider && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setEditingProvider(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">Настройка SSO: {editingProvider.name}</p>
              <button onClick={() => setEditingProvider(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Client ID</label>
                <input
                  value={editForm.clientId}
                  onChange={e => setEditForm(f => ({ ...f, clientId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Client Secret <span className="text-gray-400 font-normal">(оставь пустым, чтобы не менять)</span></label>
                <input
                  type="password"
                  value={editForm.clientSecret}
                  onChange={e => setEditForm(f => ({ ...f, clientSecret: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500">Тип: <span className="font-mono font-semibold">{editingProvider.type.toUpperCase()}</span> · {editingProvider.userCount} пользователей.</p>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setEditingProvider(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={saveEdit} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">Сохранить</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Tab: Alerts ──────────────────────────────────────────────────────────────

function AlertsTab() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(SECURITY_ALERTS);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  function resolve(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    toast.success('Инцидент помечен как решённый');
  }

  const TYPE_CFG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    brute_force:   { label: 'Brute-force',      icon: ShieldAlert,   color: 'text-red-600 bg-red-50' },
    geo_anomaly:   { label: 'Geo-аномалия',     icon: Globe,         color: 'text-orange-600 bg-orange-50' },
    new_device:    { label: 'Новое устройство', icon: Smartphone,    color: 'text-blue-600 bg-blue-50' },
    suspicious_ip: { label: 'Подозрит. IP',     icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    mass_login:    { label: 'Масс. логин',      icon: Users,         color: 'text-purple-600 bg-purple-50' },
    superadmin:    { label: 'SuperAdmin',        icon: Shield,        color: 'text-red-600 bg-red-50' },
  };

  const filtered = alerts.filter(a => filter === 'all' || (filter === 'active' ? !a.resolved : a.resolved));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {([['all','Все'],['active','Активные'],['resolved','Решённые']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${filter === v ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'}`}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{alerts.filter(a=>!a.resolved).length} активных</span>
      </div>

      <div className="space-y-3">
        {filtered.map(alert => {
          const sev = SEVERITY_CFG[alert.severity];
          const typeCfg = TYPE_CFG[alert.type] ?? { label: alert.type, icon: Bell, color: 'text-gray-600 bg-gray-50' };
          const TypeIcon = typeCfg.icon;
          return (
            <div key={alert.id} className={`bg-white border rounded-2xl p-4 transition-all ${!alert.resolved ? alert.severity === 'critical' ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeCfg.color}`}>
                  <TypeIcon className="w-4.5 h-4.5" style={{width:18,height:18}} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.badge}`}>{sev.label}</span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{typeCfg.label}</span>
                    {alert.resolved && <span className="text-[10px] text-green-600 font-bold">✓ Решён</span>}
                    <span className="ml-auto text-[10px] text-gray-400">{alert.timestamp}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-1">{alert.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{alert.detail}</p>
                  {(alert.ip || alert.user) && (
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {alert.ip && <span className="text-[10px] font-mono text-gray-500">IP: {alert.ip}</span>}
                      {alert.user && <span className="text-[10px] text-gray-500">Пользователь: {alert.user}</span>}
                    </div>
                  )}
                </div>
                {!alert.resolved && (
                  <button onClick={() => resolve(alert.id)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-xl text-xs font-semibold transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" />Решить
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheck className="w-10 h-10 text-green-300 mx-auto mb-2" />
            <p className="text-gray-400">Нет активных инцидентов</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: SuperAdmin ──────────────────────────────────────────────────────────

function SuperAdminTab() {
  const RISK_CFG = {
    critical: { badge: 'bg-red-100 text-red-700',    label: 'Критично' },
    high:     { badge: 'bg-orange-100 text-orange-700', label: 'Высокий' },
    medium:   { badge: 'bg-yellow-100 text-yellow-700', label: 'Средний' },
  };

  const ACTION_LABELS: Record<string, string> = {
    ROLE_DELETED: 'Удаление роли',
    USER_SUSPENDED: 'Блокировка пользователя',
    PERM_GRANTED: 'Выдача прав',
    APIKEY_REVOKED: 'Отзыв API-ключа',
    FORCED_LOGOUT_ALL: 'Принудительный logout всех',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-800">Журнал действий SuperAdmin</p>
          <p className="text-xs text-red-700 mt-0.5">Все действия SuperAdmin автоматически логируются. Журнал неизменяем и доступен только для чтения.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-700">Критические действия SuperAdmin</p>
          <button
            onClick={() => {
              if (SUPERADMIN_ACTIONS.length === 0) { toast.info('Нет действий для экспорта'); return; }
              const rows = SUPERADMIN_ACTIONS.map(a => ({
                ...a,
                actionLabel: ACTION_LABELS[a.action] ?? a.action,
              }));
              exportToCsv(rows as any[], [
                { key: 'timestamp',   label: 'Время' },
                { key: 'actor',       label: 'SuperAdmin' },
                { key: 'action',      label: 'Код действия' },
                { key: 'actionLabel', label: 'Действие' },
                { key: 'target',      label: 'Цель' },
                { key: 'detail',      label: 'Детали' },
                { key: 'ip',          label: 'IP' },
                { key: 'riskLevel',   label: 'Риск' },
              ], 'superadmin-actions');
              toast.success(`Экспорт скачан: ${SUPERADMIN_ACTIONS.length} действий`);
            }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <Download className="w-3.5 h-3.5" />Экспорт
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {SUPERADMIN_ACTIONS.map(action => {
            const cfg = RISK_CFG[action.riskLevel];
            return (
              <div key={action.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{ACTION_LABELS[action.action] ?? action.action}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                      <code className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{action.action}</code>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{action.detail}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1"><User className="w-3 h-3" />{action.actor}</span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{action.timestamp}</span>
                      <span className="text-[10px] font-mono text-gray-400">IP: {action.ip}</span>
                      <span className="text-[10px] text-gray-400">→ {action.target}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS_CFG: { id: SecurityTab; labelKey: DictKey; icon: React.ElementType; badge?: number }[] = [
  { id: 'policies',    labelKey: 'security.tab.policies',    icon: Shield },
  { id: 'sessions',    labelKey: 'security.tab.sessions',    icon: Monitor, badge: 5 },
  { id: 'logins',      labelKey: 'security.tab.logins',      icon: LogIn },
  { id: 'ip',          labelKey: 'security.tab.ip',          icon: Globe },
  { id: 'tokens',      labelKey: 'security.tab.tokens',      icon: Key },
  { id: 'sso',         labelKey: 'security.tab.sso',         icon: Link2 },
  { id: 'alerts',      labelKey: 'security.tab.alerts',      icon: Bell, badge: 3 },
  { id: 'superadmin',  labelKey: 'security.tab.superadmin',  icon: ShieldAlert },
];

export function SecurityCenter() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as SecurityTab | null;
  const validTabs: SecurityTab[] = ['policies','sessions','logins','ip','tokens','sso','alerts','superadmin'];
  const initialTab: SecurityTab = (paramTab && validTabs.includes(paramTab)) ? paramTab : 'policies';
  const [tab, setTab] = useState<SecurityTab>(initialTab);

  function handleTabChange(target: SecurityTab) {
    setTab(target);
    setSearchParams({ tab: target }, { replace: true });
  }

  /**
   * Sync the local tab state when the URL `?tab=` changes — covers back/forward
   * navigation and direct deep links. Without this, hitting Back after clicking
   * a sidebar deep-link wouldn't actually re-render the tab.
   */
  React.useEffect(() => {
    const fromUrl = searchParams.get('tab') as SecurityTab | null;
    if (fromUrl && validTabs.includes(fromUrl) && fromUrl !== tab) setTab(fromUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const activeAlerts = SECURITY_ALERTS.filter(a => !a.resolved).length;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{t('security.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('security.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Visible CTA: jump straight to /security/rbac with the create-role
              modal open. Wired here because RBAC management is one click away
              from Security Center but most operators never noticed it.       */}
          <button
            onClick={() => navigate('/security/rbac?action=create')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors">
            <Plus className="w-3.5 h-3.5" />{t('security.createRole')}
          </button>
          {activeAlerts > 0 && (
            <button onClick={() => handleTabChange('alerts')}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-3.5 h-3.5" />{activeAlerts} {t('security.activeIncidents')}
            </button>
          )}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />{t('security.systemProtected')}
          </div>
        </div>
      </div>

      {/* KPI strip — every card is a real button that switches the active tab. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { labelKey: 'security.kpi.activeSessions', value: '5',                                                       icon: Monitor,       color: 'text-blue-600 bg-blue-50',     tabTarget: 'sessions'  },
          { labelKey: 'security.kpi.todayIncidents', value: String(activeAlerts),                                      icon: AlertTriangle, color: 'text-red-600 bg-red-50',       tabTarget: 'alerts'    },
          { labelKey: 'security.kpi.blockedIp',      value: '3',                                                       icon: Ban,           color: 'text-orange-600 bg-orange-50', tabTarget: 'ip'        },
          { labelKey: 'security.kpi.tokens',          value: String(API_TOKENS.filter(t=>t.status==='active').length), icon: Key,           color: 'text-green-600 bg-green-50',   tabTarget: 'tokens'    },
        ] as Array<{ labelKey: DictKey; value: string; icon: React.ElementType; color: string; tabTarget: SecurityTab }>).map(kpi => {
          const Icon = kpi.icon;
          const isActive = tab === kpi.tabTarget;
          return (
            <button
              key={kpi.labelKey}
              onClick={() => handleTabChange(kpi.tabTarget)}
              aria-label={t(kpi.labelKey)}
              className={`bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 text-left cursor-pointer hover:shadow-md hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all active:scale-[0.98] ${isActive ? 'ring-2 ring-blue-200 border-blue-300 shadow-sm' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-500">{t(kpi.labelKey)}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab nav — horizontal, scrollable on narrow screens. */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto pb-px">
        {TABS_CFG.map(cfg => {
          const Icon = cfg.icon;
          const isActive = tab === cfg.id;
          return (
            <button key={cfg.id} onClick={() => handleTabChange(cfg.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors -mb-px ${
                isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />
              {t(cfg.labelKey)}
              {cfg.badge ? (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {cfg.id === 'alerts' ? activeAlerts : cfg.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'policies'   && <PoliciesTab />}
          {tab === 'sessions'   && <SessionsTab />}
          {tab === 'logins'     && <LoginsTab />}
          {tab === 'ip'         && <IpTab />}
          {tab === 'tokens'     && <TokensTab />}
          {tab === 'sso'        && <SsoTab />}
          {tab === 'alerts'     && <AlertsTab />}
          {tab === 'superadmin' && <SuperAdminTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
