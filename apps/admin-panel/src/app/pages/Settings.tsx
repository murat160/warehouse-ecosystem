import { useState } from 'react';
import {
  Globe, Shield, Bell, Clock, Puzzle, Palette,
  Save, RotateCcw, Eye, EyeOff, Copy, Plus, Trash2,
  Check, AlertTriangle, Info, Lock, Key, Server,
  Mail, MessageSquare, Smartphone, Webhook, Database,
  RefreshCw, Download, Upload, ChevronRight, ExternalLink,
  Zap, AlertCircle, Timer, TrendingUp, Settings2,
  ToggleLeft, ToggleRight, Activity,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'general' | 'security' | 'notifications' | 'sla' | 'integrations';

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
  disabled?: boolean;
}

// ─── Components ───────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, desc, disabled }: SwitchProps) {
  return (
    <div className={`flex items-start justify-between gap-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all shrink-0 ${
          checked
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        {checked ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        {checked ? 'Включено' : 'Выключено'}
      </button>
    </div>
  );
}

function Section({ title, icon: Icon, children, action }: {
  title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {desc && <p className="text-xs text-gray-400 mb-2 leading-relaxed">{desc}</p>}
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
const selectCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors";

// ─── Tab: General ─────────────────────────────────────────────────────────────

function GeneralTab() {
  const [form, setForm] = useState({
    platformName: 'PVZ Platform',
    platformUrl: 'https://platform.pvz.example.com',
    supportEmail: 'support@pvz.example.com',
    adminEmail: 'admin@platform.com',
    timezone: 'Europe/Moscow',
    language: 'ru',
    currency: 'RUB',
    dateFormat: 'DD.MM.YYYY',
    maintenanceMode: false,
    betaFeatures: false,
  });

  function save() {
    toast.success('Общие настройки сохранены', { description: 'Изменения вступят в силу немедленно' });
  }

  return (
    <div className="space-y-6">
      <Section title="Идентичность платформы" icon={Globe}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Название платформы">
            <input className={inputCls} value={form.platformName}
              onChange={e => setForm({ ...form, platformName: e.target.value })} />
          </Field>
          <Field label="URL платформы">
            <input className={inputCls} type="url" value={form.platformUrl}
              onChange={e => setForm({ ...form, platformUrl: e.target.value })} />
          </Field>
          <Field label="Email службы поддержки"
            desc="Используется в автоматических письмах клиентам">
            <input className={inputCls} type="email" value={form.supportEmail}
              onChange={e => setForm({ ...form, supportEmail: e.target.value })} />
          </Field>
          <Field label="Email администратора"
            desc="Получает системные оповещения и отчёты">
            <input className={inputCls} type="email" value={form.adminEmail}
              onChange={e => setForm({ ...form, adminEmail: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section title="Регион и форматирование" icon={Settings2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Часовой пояс">
            <select className={selectCls} value={form.timezone}
              onChange={e => setForm({ ...form, timezone: e.target.value })}>
              <option value="Europe/Moscow">Москва (GMT+3)</option>
              <option value="Europe/Kaliningrad">Калининград (GMT+2)</option>
              <option value="Asia/Yekaterinburg">Екатеринбург (GMT+5)</option>
              <option value="Asia/Novosibirsk">Новосибирск (GMT+7)</option>
              <option value="Asia/Vladivostok">Владивосток (GMT+10)</option>
            </select>
          </Field>
          <Field label="Язык интерфейса">
            <select className={selectCls} value={form.language}
              onChange={e => setForm({ ...form, language: e.target.value })}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="kk">Қазақша</option>
            </select>
          </Field>
          <Field label="Валюта">
            <select className={selectCls} value={form.currency}
              onChange={e => setForm({ ...form, currency: e.target.value })}>
              <option value="RUB">₽ Рубль (RUB)</option>
              <option value="KZT">₸ Тенге (KZT)</option>
              <option value="BYN">Br Белорусский рубль (BYN)</option>
            </select>
          </Field>
          <Field label="Формат даты">
            <select className={selectCls} value={form.dateFormat}
              onChange={e => setForm({ ...form, dateFormat: e.target.value })}>
              <option value="DD.MM.YYYY">DD.MM.YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Режим работы" icon={Activity}>
        <div className="divide-y divide-gray-100">
          <Toggle
            checked={form.maintenanceMode}
            onChange={v => setForm({ ...form, maintenanceMode: v })}
            label="Режим обслуживания"
            desc="Платформа будет недоступна для всех кроме суперадминистраторов. Клиенты увидят страницу технических работ."
          />
          <Toggle
            checked={form.betaFeatures}
            onChange={v => setForm({ ...form, betaFeatures: v })}
            label="Бета-функции"
            desc="Включить экспериментальные возможности, находящиеся в тестировании. Может содержать нестабильный функционал."
          />
        </div>
      </Section>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => toast.info('Данные сброшены к значениям по умолчанию')}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />Сбросить
        </button>
        <button
          onClick={save}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-100"
        >
          <Save className="w-4 h-4" />Сохранить изменения
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

function SecurityTab() {
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({
    twoFactorRequired: true,
    sessionTimeout: '480',
    auditRetention: '365',
    passwordMinLength: '12',
    passwordComplexity: true,
    loginAttempts: '5',
    ipWhitelist: false,
    ssoEnabled: false,
    apiKeyRotation: '90',
  });

  const apiKey = 'sk_live_pvz_' + 'x'.repeat(32);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900 text-sm">Критические настройки безопасности</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Изменения в этом разделе влияют на безопасность всей платформы. Каждое действие фиксируется в журнале аудита.
          </p>
        </div>
      </div>

      <Section title="Аутентификация" icon={Lock}>
        <div className="space-y-4">
          <div className="divide-y divide-gray-100">
            <Toggle
              checked={form.twoFactorRequired}
              onChange={v => setForm({ ...form, twoFactorRequired: v })}
              label="Обязательная двухфакторная аутентификация"
              desc="Все пользователи обязаны настроить 2FA для входа. Применяется при следующем входе."
            />
            <Toggle
              checked={form.ssoEnabled}
              onChange={v => setForm({ ...form, ssoEnabled: v })}
              label="Single Sign-On (SSO)"
              desc="Вход через корпоративный IdP: Azure AD, Okta, Google Workspace. Требует настройки SAML 2.0."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <Field label="Таймаут сессии (мин)"
              desc="Автоматический выход при бездействии">
              <select className={selectCls} value={form.sessionTimeout}
                onChange={e => setForm({ ...form, sessionTimeout: e.target.value })}>
                <option value="60">60 мин (1 час)</option>
                <option value="240">240 мин (4 часа)</option>
                <option value="480">480 мин (8 часов)</option>
                <option value="1440">1440 мин (1 день)</option>
                <option value="0">Никогда</option>
              </select>
            </Field>
            <Field label="Лимит попыток входа"
              desc="После чего аккаунт временно блокируется">
              <select className={selectCls} value={form.loginAttempts}
                onChange={e => setForm({ ...form, loginAttempts: e.target.value })}>
                <option value="3">3 попытки</option>
                <option value="5">5 попыток</option>
                <option value="10">10 попыток</option>
              </select>
            </Field>
            <Field label="Хранение аудит-лога (дни)"
              desc="Время хранения истории событий">
              <select className={selectCls} value={form.auditRetention}
                onChange={e => setForm({ ...form, auditRetention: e.target.value })}>
                <option value="90">90 дней</option>
                <option value="180">180 дней</option>
                <option value="365">1 год</option>
                <option value="730">2 года</option>
              </select>
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Политика паролей" icon={Key}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Минимальная длина пароля">
              <select className={selectCls} value={form.passwordMinLength}
                onChange={e => setForm({ ...form, passwordMinLength: e.target.value })}>
                <option value="8">8 символов</option>
                <option value="10">10 символов</option>
                <option value="12">12 символов</option>
                <option value="16">16 символов</option>
              </select>
            </Field>
            <Field label="Ротация API-ключей (дни)">
              <select className={selectCls} value={form.apiKeyRotation}
                onChange={e => setForm({ ...form, apiKeyRotation: e.target.value })}>
                <option value="30">30 дней</option>
                <option value="60">60 дне��</option>
                <option value="90">90 дней</option>
                <option value="180">180 дней</option>
                <option value="0">Без ротации</option>
              </select>
            </Field>
          </div>
          <div className="divide-y divide-gray-100">
            <Toggle
              checked={form.passwordComplexity}
              onChange={v => setForm({ ...form, passwordComplexity: v })}
              label="Требовать сложный пароль"
              desc="Пароль должен содержать: заглавные буквы, цифры, специальные символы (!@#$%...)."
            />
            <Toggle
              checked={form.ipWhitelist}
              onChange={v => setForm({ ...form, ipWhitelist: v })}
              label="Белый список IP-адресов"
              desc="Разрешить вход только с определённых IP. Все остальные запросы будут блокированы."
            />
          </div>

          {form.ipWhitelist && (
            <div className="pt-2">
              <Field label="Разрешённые IP-адреса" desc="По одному адресу или CIDR-диапазону на строку">
                <textarea
                  rows={4}
                  placeholder={'192.168.1.0/24\n10.0.0.0/8\n185.234.56.78'}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </Field>
            </div>
          )}
        </div>
      </Section>

      <Section title="Мастер API-ключ" icon={Server}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm">
            <span className="flex-1 text-gray-500 truncate">
              {showKey ? apiKey : '•'.repeat(48)}
            </span>
            <button onClick={() => setShowKey(v => !v)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('Ключ скопирован'); }}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.warning('Подтвердите ротацию ключа — все текущие интеграции потребуют обновления')}
              className="flex items-center gap-2 px-4 py-2 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />Ротация ключа
            </button>
            <button
              onClick={() => toast.info('Новый сервисный ключ создан')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />Новый ключ
            </button>
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={() => toast.success('Настройки безопасности сохранены', { description: 'Действие записано в журнал аудита' })}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-100"
        >
          <Save className="w-4 h-4" />Сохранить
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

function NotificationsTab() {
  const [channels, setChannels] = useState({
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: false,
    telegramEnabled: false,
    slackEnabled: false,
  });

  const [rules, setRules] = useState({
    slaBreachNotify: true,
    pvzOfflineNotify: true,
    newEscalationNotify: true,
    largeRefundNotify: true,
    dailyDigest: true,
    courierStuckNotify: true,
    lowInventoryNotify: false,
    newMerchantNotify: true,
  });

  const [emails, setEmails] = useState(['admin@platform.com', 'ops@platform.com']);
  const [newEmail, setNewEmail] = useState('');

  function addEmail() {
    if (newEmail.trim() && newEmail.includes('@')) {
      setEmails([...emails, newEmail.trim()]);
      setNewEmail('');
      toast.success('Email-адрес добавлен');
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Каналы уведомлений" icon={Bell}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { key: 'emailEnabled', icon: Mail, label: 'Email', desc: 'Оповещения на почту', color: 'blue' },
            { key: 'smsEnabled', icon: Smartphone, label: 'SMS', desc: 'Текстовые сообщения', color: 'green' },
            { key: 'pushEnabled', icon: Bell, label: 'Push-уведомления', desc: 'Браузерные push', color: 'purple' },
            { key: 'telegramEnabled', icon: MessageSquare, label: 'Telegram', desc: 'Бот-уведомления', color: 'blue' },
            { key: 'slackEnabled', icon: Zap, label: 'Slack', desc: 'Уведомления в каналах', color: 'orange' },
          ].map(({ key, icon: Icon, label, desc, color }) => {
            const isOn = channels[key as keyof typeof channels];
            return (
              <button
                key={key}
                onClick={() => setChannels({ ...channels, [key]: !isOn })}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  isOn ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isOn ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-5 h-5 ${isOn ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isOn ? 'text-blue-900' : 'text-gray-700'}`}>{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isOn ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {isOn && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Адресаты email-рассылки" icon={Mail}>
        <div className="space-y-3">
          {emails.map((email, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="flex-1 text-sm text-gray-700 font-mono">{email}</span>
              <button
                onClick={() => { setEmails(emails.filter((_, j) => j !== i)); toast.info('Email удалён'); }}
                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              placeholder="новый@email.com"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              onClick={addEmail}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />Добавить
            </button>
          </div>
        </div>
      </Section>

      <Section title="Правила оповещений" icon={AlertCircle}>
        <div className="divide-y divide-gray-100">
          <Toggle checked={rules.slaBreachNotify} onChange={v => setRules({ ...rules, slaBreachNotify: v })}
            label="SLA-нарушения"
            desc="Немедленное оповещение при просрочке SLA по любому каналу обслуживания." />
          <Toggle checked={rules.pvzOfflineNotify} onChange={v => setRules({ ...rules, pvzOfflineNotify: v })}
            label="ПВЗ оффлайн"
            desc="Уведомление, если ПВЗ не выходит на связь более 30 минут в рабочее время." />
          <Toggle checked={rules.newEscalationNotify} onChange={v => setRules({ ...rules, newEscalationNotify: v })}
            label="Новые эскалации"
            desc="Push при поступлении нового чата с приоритетом High/Critical в очередь." />
          <Toggle checked={rules.largeRefundNotify} onChange={v => setRules({ ...rules, largeRefundNotify: v })}
            label="Крупные возвраты (> ₽5 000)"
            desc="Требуют ручного подтверждения финансового менеджера." />
          <Toggle checked={rules.courierStuckNotify} onChange={v => setRules({ ...rules, courierStuckNotify: v })}
            label="Курьер стоит на месте > 20 мин"
            desc="Контроль застрявших курьеров на маршруте." />
          <Toggle checked={rules.lowInventoryNotify} onChange={v => setRules({ ...rules, lowInventoryNotify: v })}
            label="Низкие остатки на складе"
            desc="Уведомление когда позиция опускается ниже порогового значения." />
          <Toggle checked={rules.dailyDigest} onChange={v => setRules({ ...rules, dailyDigest: v })}
            label="Ежедневный дайджест в 08:00"
            desc="Сводный отчёт по KPI прошедшего дня на email руководителей." />
          <Toggle checked={rules.newMerchantNotify} onChange={v => setRules({ ...rules, newMerchantNotify: v })}
            label="Новые заявки от партнёров"
            desc="Уведомление при регистрации нового мерчанта или заявке на изменение условий." />
        </div>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={() => toast.success('Настройки уведомлений сохранены')}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-100"
        >
          <Save className="w-4 h-4" />Сохранить
        </button>
      </div>
    </div>
  );
}

// ─── Tab: SLA ─────────────────────────────────────────────────────────────────

function SLATab() {
  const [slaMatrix, setSlaMatrix] = useState([
    { channel: 'Клиенты (support)',    low: 240, normal: 120, high: 30,  critical: 10 },
    { channel: 'Курьеры',              low: 120, normal: 60,  high: 15,  critical: 5  },
    { channel: 'Партнёры (merchants)', low: 480, normal: 240, high: 60,  critical: 15 },
    { channel: 'Внутренний',           low: 480, normal: 240, high: 120, critical: 30 },
    { channel: 'Эскалации',            low: 60,  normal: 30,  high: 10,  critical: 5  },
  ]);

  const [escalation, setEscalation] = useState({
    autoEscalate: true,
    escalateAfterBreaches: '2',
    escalateTo: 'lead',
    closeAfterInactivity: '48',
    reopenOnReply: true,
  });

  const priorities = ['low', 'normal', 'high', 'critical'] as const;
  const priorityLabels: Record<typeof priorities[number], string> = {
    low: 'Низкий', normal: 'Обычный', high: 'Высокий', critical: 'Критичный',
  };
  const priorityColors: Record<typeof priorities[number], string> = {
    low: 'text-gray-600', normal: 'text-blue-600', high: 'text-orange-600', critical: 'text-red-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-900 text-sm">SLA — время первого ответа (минуты)</p>
          <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
            Максимальное время ожидания клиента до первого ответа оператора. При нарушении — автоматическая эскалация и уведомление.
          </p>
        </div>
      </div>

      <Section title="Матрица SLA по каналам" icon={Timer}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 pr-4 font-semibold text-gray-700 w-48">Канал</th>
                {priorities.map(p => (
                  <th key={p} className={`text-center py-2.5 px-3 font-semibold ${priorityColors[p]}`}>
                    {priorityLabels[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {slaMatrix.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-800 text-sm">{row.channel}</p>
                  </td>
                  {priorities.map(p => (
                    <td key={p} className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={row[p]}
                          onChange={e => {
                            const updated = [...slaMatrix];
                            updated[i] = { ...updated[i], [p]: +e.target.value };
                            setSlaMatrix(updated);
                          }}
                          className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min={1}
                        />
                        <span className="text-xs text-gray-400">мин</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Правила автоматической эскалации" icon={TrendingUp}>
        <div className="space-y-5">
          <div className="divide-y divide-gray-100">
            <Toggle
              checked={escalation.autoEscalate}
              onChange={v => setEscalation({ ...escalation, autoEscalate: v })}
              label="Автоматическая эскалация при нарушении SLA"
              desc="Система сама переводит чат на следующий уровень поддержки при просрочке."
            />
            <Toggle
              checked={escalation.reopenOnReply}
              onChange={v => setEscalation({ ...escalation, reopenOnReply: v })}
              label="Переоткрывать при ответе клиента"
              desc="Если закрытый тикет получает новое сообщение — он автоматически переходит в статус «В работе»."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Эскалировать после N нарушений SLA">
              <select className={selectCls} value={escalation.escalateAfterBreaches}
                onChange={e => setEscalation({ ...escalation, escalateAfterBreaches: e.target.value })}>
                <option value="1">1 нарушение</option>
                <option value="2">2 нарушения</option>
                <option value="3">3 нарушения</option>
              </select>
            </Field>
            <Field label="Эскалировать на уровень">
              <select className={selectCls} value={escalation.escalateTo}
                onChange={e => setEscalation({ ...escalation, escalateTo: e.target.value })}>
                <option value="l2">L2 Поддержка</option>
                <option value="lead">Руководитель поддержки</option>
                <option value="admin">Администратор</option>
              </select>
            </Field>
            <Field label="Закрыть после бездействия (ч)"
              desc="Если клиент не ответил">
              <select className={selectCls} value={escalation.closeAfterInactivity}
                onChange={e => setEscalation({ ...escalation, closeAfterInactivity: e.target.value })}>
                <option value="24">24 часа</option>
                <option value="48">48 часов</option>
                <option value="72">72 часа</option>
                <option value="168">7 дней</option>
              </select>
            </Field>
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={() => toast.success('SLA-правила обновлены', { description: 'Применяются ко всем новым обращениям' })}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-100"
        >
          <Save className="w-4 h-4" />Сохранить SLA
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Integrations ────────────────────────────────────────────────────────

function IntegrationsTab() {
  const [webhooks, setWebhooks] = useState([
    { id: 'wh1', name: 'ERP-система', url: 'https://erp.company.com/webhooks/pvz', events: ['order.created', 'order.delivered'], active: true },
    { id: 'wh2', name: 'Telegram-бот оповещений', url: 'https://api.telegram.org/bot.../sendMessage', events: ['sla.breach', 'pvz.offline'], active: true },
    { id: 'wh3', name: 'Аналитическая платформа', url: 'https://analytics.internal.co/ingest', events: ['order.completed', 'refund.issued'], active: false },
  ]);

  const integrations = [
    { name: '1С: Предприятие', desc: 'Синхронизация финансовых данных и товаров', icon: Database, status: 'connected', color: 'green' },
    { name: 'Яндекс.Карты API', desc: 'Геолокация ПВЗ, построение маршрутов', icon: Globe, status: 'connected', color: 'green' },
    { name: 'СМС-провайдер (МТС)', desc: 'SMS-уведомления клиентам', icon: Smartphone, status: 'connected', color: 'green' },
    { name: 'Stripe / ЮKassa', desc: 'Платёжный шлюз для приёма оплаты', icon: Zap, status: 'partial', color: 'orange' },
    { name: 'Elasticsearch', desc: 'Полнотекстовый поиск по данным платформы', icon: Server, status: 'disconnected', color: 'gray' },
    { name: 'S3 / Object Storage', desc: 'Хранение файлов, фото, документов', icon: Database, status: 'connected', color: 'green' },
  ];

  const statusCfg = {
    connected: { label: 'Подключено', dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    partial: { label: 'Частично', dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
    disconnected: { label: 'Отключено', dot: 'bg-gray-400', text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
  };

  return (
    <div className="space-y-6">
      <Section title="Системные интеграции" icon={Puzzle}>
        <div className="space-y-3">
          {integrations.map((intg, i) => {
            const Icon = intg.icon;
            const st = statusCfg[intg.status as keyof typeof statusCfg];
            return (
              <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{intg.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{intg.desc}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${st.bg} border ${st.border}`}>
                  <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
                </div>
                <button onClick={() => { import('sonner').then(m => m.toast.info(`Настройки интеграции «${i.name}»`)); }}
                  className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors" title="Настройки">
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Webhooks"
        icon={Webhook}
        action={
          <button
            onClick={() => toast.info('Диалог создания Webhook')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />Новый Webhook
          </button>
        }
      >
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className={`p-4 rounded-xl border-2 transition-colors ${wh.active ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${wh.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{wh.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wh.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {wh.active ? 'Активен' : 'Отключён'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-500 mt-1 truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {wh.events.map(ev => (
                      <span key={ev} className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-lg font-mono text-gray-600">{ev}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setWebhooks(webhooks.map(w => w.id === wh.id ? { ...w, active: !w.active } : w))}
                    className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    title={wh.active ? 'Отключить' : 'Включить'}
                  >
                    {wh.active ? <ToggleRight className="w-4 h-4 text-blue-600" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(wh.url); toast.success('URL скопирован'); }}
                    className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setWebhooks(webhooks.filter(w => w.id !== wh.id))}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Экспорт / Импорт данных" icon={Download}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Экспорт всех заказов', desc: 'CSV, все поля, за выбранный период', icon: Download },
            { label: 'Экспорт финансового отчёта', desc: 'Excel с разбивкой по ПВЗ и каналам', icon: Download },
            { label: 'Экспорт базы пользователей', desc: 'Без паролей — только профили и роли', icon: Download },
            { label: 'Резервная копия настроек', desc: 'JSON-конфигурация всей платформы', icon: Upload },
          ].map(({ label, desc, icon: Icon }) => (
            <button
              key={label}
              onClick={() => toast.success(`${label} — файл подготавливается`)}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="w-9 h-9 bg-gray-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                <Icon className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-900 transition-colors">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'general',       label: 'Общие',         icon: Globe,         desc: 'Платформа, регион, форматы' },
  { key: 'security',      label: 'Безопасность',  icon: Shield,        desc: 'Аутентификация, пароли, ключи' },
  { key: 'notifications', label: 'Уведомления',   icon: Bell,          desc: 'Каналы и правила оповещений' },
  { key: 'sla',           label: 'SLA и правила', icon: Timer,         desc: 'Время ответа и эскалации' },
  { key: 'integrations',  label: 'Интеграции',    icon: Puzzle,        desc: 'Webhooks, API, экспорт данных' },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const currentTab = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Настройки системы</h1>
          <p className="text-gray-500 mt-0.5">Конфигурация платформы, безопасность и интеграции</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Последнее сохранение: сегодня, 11:42</span>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2.5 px-5 py-4 text-sm font-medium transition-colors shrink-0 border-b-2 ${
                  isActive
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current tab descriptor */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
          <currentTab.icon className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs text-gray-500">{currentTab.desc}</span>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'general'       && <GeneralTab />}
      {activeTab === 'security'      && <SecurityTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'sla'           && <SLATab />}
      {activeTab === 'integrations'  && <IntegrationsTab />}
    </div>
  );
}
