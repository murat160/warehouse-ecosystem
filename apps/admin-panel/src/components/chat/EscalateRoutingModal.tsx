import { useState } from 'react';
import { toast } from 'sonner';
import {
  X, Send, Shield, DollarSign, Headphones, Star, Truck,
  Package, FileText, Building2, Check,
  MessageSquare, User, ChevronRight, Lock,
} from 'lucide-react';
import type { Conversation, Priority } from '../../data/chat-mock';
import { addNotification, type InternalNotification } from '../../store/notificationsStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeptAgent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
}

interface Department {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  agents: DeptAgent[];
}

// ─── Departments & agents mock ─────────────────────────────────────────────────

const DEPARTMENTS: Department[] = [
  {
    id: 'finance',
    label: 'Финансовый отдел',
    desc: 'Возвраты, выплаты, расчёт комиссий, финансовые решения',
    icon: DollarSign, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200',
    badgeBg: 'bg-green-100', badgeText: 'text-green-700',
    agents: [
      { id: 'fin1', name: 'Громова Анна', role: 'Финансовый аналитик', avatar: 'ГА', online: true },
      { id: 'fin2', name: 'Коваль Пётр', role: 'Старший финансист', avatar: 'КП', online: false },
    ],
  },
  {
    id: 'admin',
    label: 'Администрация',
    desc: 'Системные решения, договора, критичные инциденты',
    icon: Shield, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200',
    badgeBg: 'bg-red-100', badgeText: 'text-red-700',
    agents: [
      { id: 'admin1', name: 'Администратор Системы', role: 'СуперАдмин', avatar: 'АС', online: true },
      { id: 'admin2', name: 'Морозов Дмитрий', role: 'Региональный директор', avatar: 'МД', online: true },
    ],
  },
  {
    id: 'support_lead',
    label: 'Руководитель поддержки',
    desc: 'Финальный уровень эскалации, сложные кейсы',
    icon: Star, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200',
    badgeBg: 'bg-purple-100', badgeText: 'text-purple-700',
    agents: [
      { id: 'lead1', name: 'Захаров Виктор', role: 'Руководитель поддержки', avatar: 'ЗВ', online: true },
    ],
  },
  {
    id: 'support_l2',
    label: 'Поддержка L2',
    desc: 'Сложные технические вопросы второй линии',
    icon: Headphones, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
    badgeBg: 'bg-blue-100', badgeText: 'text-blue-700',
    agents: [
      { id: 'l2_agent1', name: 'Попова Ирина', role: 'Агент L2', avatar: 'ПИ', online: true },
      { id: 'l2_agent2', name: 'Фёдоров Алексей', role: 'Агент L2', avatar: 'ФА', online: false },
    ],
  },
  {
    id: 'logistics',
    label: 'Логистика',
    desc: 'Маршруты, курьеры, зоны доставки, инциденты на маршруте',
    icon: Truck, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',
    badgeBg: 'bg-orange-100', badgeText: 'text-orange-700',
    agents: [
      { id: 'log1', name: 'Орлов Сергей', role: 'Диспетчер логистики', avatar: 'ОС', online: true },
      { id: 'log2', name: 'Никитина Юлия', role: 'Старший диспетчер', avatar: 'НЮ', online: true },
    ],
  },
  {
    id: 'pvz_ops',
    label: 'Отдел ПВЗ',
    desc: 'Операторы пунктов, режим работы, инциденты в ПВЗ',
    icon: Package, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200',
    badgeBg: 'bg-teal-100', badgeText: 'text-teal-700',
    agents: [
      { id: 'pvz1', name: 'Лебедева Мария', role: 'Менеджер ПВЗ', avatar: 'ЛМ', online: false },
      { id: 'pvz2', name: 'Соколов Илья', role: 'Менеджер ПВЗ', avatar: 'СИ', online: true },
    ],
  },
  {
    id: 'legal',
    label: 'Юридический отдел',
    desc: 'Претензии, правовые вопросы, нарушения договора',
    icon: FileText, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200',
    badgeBg: 'bg-gray-100', badgeText: 'text-gray-700',
    agents: [
      { id: 'legal1', name: 'Власова Ольга', role: 'Юрист', avatar: 'ВО', online: false },
      { id: 'legal2', name: 'Карпов Николай', role: 'Ст. юрист', avatar: 'КН', online: true },
    ],
  },
  {
    id: 'partnerships',
    label: 'Отдел партнёрств',
    desc: 'Управление мерчантами, договора, тарифы',
    icon: Building2, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200',
    badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700',
    agents: [
      { id: 'part1', name: 'Белова Екатерина', role: 'Менеджер партнёрств', avatar: 'БЕ', online: true },
      { id: 'part2', name: 'Зуев Антон', role: 'Ст. менеджер', avatar: 'ЗА', online: false },
    ],
  },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; dot: string; color: string }[] = [
  { value: 'low', label: 'Низкий', dot: 'bg-gray-400', color: 'text-gray-600' },
  { value: 'normal', label: 'Обычный', dot: 'bg-blue-400', color: 'text-blue-600' },
  { value: 'high', label: 'Высокий', dot: 'bg-orange-500', color: 'text-orange-600' },
  { value: 'critical', label: 'Критичный', dot: 'bg-red-500', color: 'text-red-600' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  conv: Conversation;
  fromAgent: { id: string; name: string; role: string; roleLabelFull: string };
  onConfirm: (opts: {
    deptId: string;
    deptLabel: string;
    agentId?: string;
    agentName?: string;
    comment: string;
    priority: Priority;
    systemText: string;
  }) => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EscalateRoutingModal({ conv, fromAgent, onConfirm, onClose }: Props) {
  const [step, setStep] = useState<'dept' | 'agent' | 'confirm'>('dept');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<DeptAgent | null>(null);
  const [comment, setComment] = useState('');
  const [priority, setPriority] = useState<Priority>(conv.priority);
  const [saving, setSaving] = useState(false);

  function handleSelectDept(dept: Department) {
    setSelectedDept(dept);
    setSelectedAgent(null);
    setStep('agent');
  }

  function handleSelectAgent(agent: DeptAgent | null) {
    setSelectedAgent(agent);
    setStep('confirm');
  }

  async function handleConfirm() {
    if (!selectedDept || !comment.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));

    const targetLabel = selectedAgent
      ? `${selectedDept.label} → ${selectedAgent.name}`
      : selectedDept.label;

    const systemText = `🔀 Перенаправлено → ${targetLabel}`;

    // Push notification to the store
    const notif: InternalNotification = {
      id: `notif_${Date.now()}`,
      type: 'chat_routed',
      title: `Чат перенаправлен: ${conv.subject.slice(0, 60)}`,
      body: conv.subject,
      fromId: fromAgent.id,
      fromName: fromAgent.name,
      fromRole: fromAgent.roleLabelFull,
      targetDept: selectedDept.label,
      targetAgentId: selectedAgent?.id,
      targetAgentName: selectedAgent?.name,
      conversationId: conv.id,
      convSubject: conv.subject,
      priority,
      createdAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      read: false,
      comment: comment.trim(),
      channel: conv.channel === 'support' ? 'Клиенты' : conv.channel === 'couriers' ? 'Курьеры' : conv.channel === 'merchants' ? 'Партнёры' : 'Внутренний',
    };
    addNotification(notif);

    // Show toast — reuse already-computed targetLabel
    toast.success(`Чат перенаправлен: ${targetLabel}`, {
      description: 'Уведомление отправлено в Личный кабинет получателя',
      duration: 4000,
    });

    onConfirm({
      deptId: selectedDept.id,
      deptLabel: selectedDept.label,
      agentId: selectedAgent?.id,
      agentName: selectedAgent?.name,
      comment: comment.trim(),
      priority,
      systemText,
    });
  }

  const DeptIcon = selectedDept?.icon ?? MessageSquare;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">Перенаправить чат</p>
              <p className="text-xs text-indigo-200 truncate max-w-[280px]">{conv.clientName} · {conv.subject.slice(0, 45)}{conv.subject.length > 45 ? '…' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ── Breadcrumb steps ── */}
        <div className="flex items-center gap-1 px-5 py-2.5 bg-gray-50 border-b border-gray-200 shrink-0 text-xs">
          {[
            { key: 'dept', label: '1. Отдел' },
            { key: 'agent', label: '2. Сотрудник' },
            { key: 'confirm', label: '3. Комментарий' },
          ].map((s, i) => {
            const isActive = step === s.key;
            const isPast = (step === 'agent' && s.key === 'dept') || (step === 'confirm' && s.key !== 'confirm');
            return (
              <span key={s.key} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />}
                <span
                  className={`font-medium transition-colors cursor-pointer ${
                    isActive ? 'text-indigo-700' : isPast ? 'text-gray-500 hover:text-gray-700 underline underline-offset-2' : 'text-gray-300'
                  }`}
                  onClick={() => {
                    if (isPast) {
                      if (s.key === 'dept') { setStep('dept'); }
                      if (s.key === 'agent') { setStep('agent'); }
                    }
                  }}
                >
                  {isActive && <span className="mr-1">→</span>}{s.label}
                  {isPast && selectedDept && s.key === 'dept' && `: ${selectedDept.label}`}
                  {isPast && selectedAgent && s.key === 'agent' && `: ${selectedAgent.name}`}
                  {(!isPast || !selectedAgent) && s.key === 'agent' && isPast && ': Весь отдел'}
                </span>
              </span>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* STEP 1: Department selection */}
          {step === 'dept' && (
            <div className="p-4 space-y-2">
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Выберите отдел, которому нужно передать обращение. Сотрудник отдела получит уведомление в личном кабинете.
              </p>
              {DEPARTMENTS.map(dept => {
                const Icon = dept.icon;
                return (
                  <button key={dept.id} onClick={() => handleSelectDept(dept)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all hover:shadow-sm group border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${dept.bg} border ${dept.border}`}>
                      <Icon className={`w-5 h-5 ${dept.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{dept.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">{dept.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex -space-x-1.5">
                        {dept.agents.slice(0, 2).map(a => (
                          <div key={a.id} title={a.name}
                            className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white ${a.online ? 'bg-green-500' : 'bg-gray-400'}`}>
                            {a.avatar.slice(0, 1)}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{dept.agents.length} чел.</span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: Agent selection */}
          {step === 'agent' && selectedDept && (() => {
            const Icon = selectedDept.icon;
            return (
              <div className="p-4 space-y-2">
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${selectedDept.border} ${selectedDept.bg} mb-3`}>
                  <Icon className={`w-4 h-4 ${selectedDept.color} shrink-0`} />
                  <div>
                    <p className={`text-sm font-semibold ${selectedDept.color}`}>{selectedDept.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedDept.desc}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  Выберите конкретного сотрудника или отправьте в очередь всего отдела:
                </p>
                {/* Whole department option */}
                <button onClick={() => handleSelectAgent(null)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700">Весь отдел (в очередь)</p>
                    <p className="text-xs text-gray-400 mt-0.5">Любой свободный сотрудник отдела возьмёт задачу</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 shrink-0" />
                </button>
                {/* Specific agents */}
                {selectedDept.agents.map(agent => (
                  <button key={agent.id} onClick={() => handleSelectAgent(agent)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-left transition-all group">
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${agent.online ? 'bg-green-500' : 'bg-gray-400'}`}>
                        {agent.avatar}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${agent.online ? 'bg-green-400' : 'bg-gray-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedDept.badgeBg} ${selectedDept.badgeText}`}>{agent.role}</span>
                        <span className={`text-xs ${agent.online ? 'text-green-600' : 'text-gray-400'}`}>
                          · {agent.online ? 'Онлайн' : 'Офлайн'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 shrink-0" />
                  </button>
                ))}
              </div>
            );
          })()}

          {/* STEP 3: Comment + priority */}
          {step === 'confirm' && selectedDept && (
            <div className="p-4 space-y-4">
              {/* Routing target */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${selectedDept.border} ${selectedDept.bg}`}>
                <DeptIcon className={`w-4 h-4 ${selectedDept.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${selectedDept.color}`}>{selectedDept.label}</p>
                  {selectedAgent && (
                    <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" />{selectedAgent.name} · {selectedAgent.role}
                    </p>
                  )}
                  {!selectedAgent && (
                    <p className="text-xs text-gray-500 mt-0.5">Вся очередь отдела</p>
                  )}
                </div>
                <Check className={`w-4 h-4 ${selectedDept.color} shrink-0`} />
              </div>

              {/* Chat preview */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Пересылаемый чат</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{conv.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{conv.clientName}</p>
                </div>
              </div>

              {/* Priority override */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Приоритет задачи</p>
                <div className="flex items-center gap-2">
                  {PRIORITY_OPTIONS.map(p => (
                    <button key={p.value} onClick={() => setPriority(p.value)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                        priority === p.value ? `border-current ${p.color} bg-gray-50` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Комментарий для получателя <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(обязательно — войдёт в уведомление)</span>
                </label>
                <textarea
                  value={comment} onChange={e => setComment(e.target.value)} rows={4}
                  placeholder="Объясните контекст: что уже сделано, что нужно сделать получателю, какие ограничения..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-none transition-colors"
                />
                {comment.length > 0 && comment.trim().length < 10 && (
                  <p className="text-xs text-orange-600 mt-1">Слишком короткий комментарий — добавьте больше контекста</p>
                )}
              </div>

              {/* Audit note */}
              <div className="flex items-start gap-2.5 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-indigo-900">Что произойдёт:</p>
                  <ul className="text-xs text-indigo-700 mt-0.5 space-y-0.5">
                    <li>• В чате появится системное сообщение о перенаправлении</li>
                    <li>• Получатель увидит уведомление в Личном кабинете</li>
                    <li>• Действие запишется в аудит-лог</li>
                  </ul>
                  <p className="text-xs text-indigo-500 mt-1">{fromAgent.name} · {fromAgent.roleLabelFull}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 shrink-0 bg-gray-50 rounded-b-2xl">
          {step === 'dept' && (
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white transition-colors text-gray-700">
              Отмена
            </button>
          )}
          {step !== 'dept' && (
            <button onClick={() => setStep(step === 'confirm' ? 'agent' : 'dept')}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white transition-colors text-gray-700">
              ← Назад
            </button>
          )}
          {step === 'confirm' && (
            <button
              onClick={handleConfirm}
              disabled={saving || !comment.trim() || comment.trim().length < 10}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-indigo-100">
              {saving
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Отправка...</span>
                : <span className="flex items-center gap-2"><Send className="w-4 h-4" />Перенаправить{selectedAgent ? ` → ${selectedAgent.name}` : ` → ${selectedDept?.label ?? ''}`}</span>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
