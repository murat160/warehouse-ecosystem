/**
 * CreateEmployeeDrawer — full HR-grade form for new employee creation.
 *
 * Fields:
 *   first/last name, email, phone, avatar, position, role, department,
 *   country, city, language, status, start date, comment, 2FA-required,
 *   initial documents (multiple).
 *
 * On save:
 *   - new ManagedUser pushed to the in-memory list
 *   - personal cabinet inferred from role permissions
 *   - audit-store gets `user.create` entry
 */
import { useState } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'sonner';
import {
  X, Upload, User as UserIcon, Mail, Phone, Briefcase, Building2,
  Globe, Languages, Calendar, ShieldCheck, FileText, Check, Trash2,
} from 'lucide-react';
import {
  ROLE_LABELS, ROLE_COLORS, COLOR_BADGE,
  type ManagedUser, type UserDocument, DOC_KIND_LABELS_HR,
} from '../../data/rbac-data';
import { PREDEFINED_ROLES } from '../../data/rbac';
import { audit } from '../../data/audit-store';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  onClose: () => void;
  onCreate: (u: ManagedUser) => void;
}

const DEPARTMENTS = [
  'Технический', 'Финансы', 'Поддержка', 'Логистика', 'HR',
  'Юридический', 'Операционный', 'Маркетинг', 'Безопасность', 'Без отдела',
];

const LANGUAGES: { code: ManagedUser['language']; label: string }[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'tk', label: 'Türkmen'  },
  { code: 'tr', label: 'Türkçe'   },
];

const COUNTRIES = ['Туркменистан', 'Польша', 'Россия', 'Казахстан', 'Турция', 'Германия', 'Китай'];
const CITIES = ['Ашхабад', 'Туркменабат', 'Дашогуз', 'Москва', 'Алматы', 'Стамбул', 'Берлин', 'Варшава', 'Yiwu'];

const STATUS_OPTIONS: ManagedUser['status'][] = ['active', 'invited', 'suspended', 'inactive'];
const STATUS_LABELS: Record<ManagedUser['status'], string> = {
  active:    'Активен',
  invited:   'Приглашён',
  suspended: 'Заблокирован',
  inactive:  'Неактивен',
};

function readDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ''));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

const today = new Date().toLocaleDateString('ru-RU');

export function CreateEmployeeDrawer({ onClose, onCreate }: Props) {
  const { user: actor } = useAuth();
  const [tab, setTab] = useState<'profile' | 'access' | 'docs'>('profile');

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [position, setPosition]   = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [city, setCity]       = useState(CITIES[0]);
  const [language, setLanguage] = useState<ManagedUser['language']>('ru');
  const [status, setStatus]   = useState<ManagedUser['status']>('invited');
  const [startDate, setStartDate] = useState(today);
  const [comment, setComment] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(true);

  // Access
  const [role, setRole] = useState('SupportAgent');

  // Documents
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [pendingKind, setPendingKind] = useState<UserDocument['kind']>('passport');

  async function handleAvatar(file: File) {
    const url = await readDataUrl(file);
    setAvatarUrl(url);
  }

  async function handleDocUpload(file: File) {
    const url = await readDataUrl(file);
    setDocuments(prev => [...prev, {
      docId: `doc-${Date.now()}`,
      kind:  pendingKind,
      filename: file.name,
      url,
      uploadedAt: new Date().toLocaleString('ru-RU'),
      uploadedBy: actor?.name ?? 'op',
      status: 'pending',
    }]);
    toast.success(`Документ добавлен: ${file.name}`);
  }

  function removeDoc(id: string) {
    setDocuments(prev => prev.filter(d => d.docId !== id));
  }

  function submit() {
    if (!firstName.trim()) { toast.error('Введите имя'); setTab('profile'); return; }
    if (!lastName.trim())  { toast.error('Введите фамилию'); setTab('profile'); return; }
    if (!email.trim() || !email.includes('@')) { toast.error('Введите корректный email'); setTab('profile'); return; }

    const fullName = `${lastName.trim()} ${firstName.trim()}`.trim();
    const id = `u-${Date.now()}`;

    const newUser: ManagedUser = {
      id, name: fullName, email: email.trim(),
      role,
      scopeType: 'ALL', scopeValue: '',
      status,
      twoFactorEnabled: false,
      lastLogin: '—',
      createdAt: today,
      cabinetModules: null,
      // Extended ───────────────────────────────────────────────
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      phone:     phone.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
      position:  position.trim() || undefined,
      department, country, city, language,
      startDate,
      comment:   comment.trim() || undefined,
      twoFactorRequired,
      extraAllow: [],
      extraDeny:  [],
      documents,
    };

    onCreate(newUser);
    audit('user.create', email.trim(),
      `Создан сотрудник «${fullName}» · роль ${role}, отдел ${department}`,
      actor?.name ?? '—', actor?.role ?? '—');

    if (status === 'invited') {
      audit('user.edit', email.trim(),
        `Отправлено приглашение на ${email.trim()}`, actor?.name ?? '—', actor?.role ?? '—');
    }

    toast.success(`Сотрудник создан: ${fullName}`, {
      description: status === 'invited' ? `Приглашение отправлено на ${email.trim()}` : `Статус: ${STATUS_LABELS[status]}`,
    });
    onClose();
  }

  const node = (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-end bg-gray-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-3xl flex flex-col h-full" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">Создание сотрудника</p>
            <p className="font-bold text-gray-900 truncate">{firstName || lastName ? `${lastName} ${firstName}` : 'Новый сотрудник'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{ROLE_LABELS[role] ?? role} · {department}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Закрыть"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50/70 shrink-0">
          <div className="flex">
            {([
              { id: 'profile' as const, label: 'Профиль' },
              { id: 'access'  as const, label: 'Роль и доступ' },
              { id: 'docs'    as const, label: `Документы (${documents.length})` },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  tab === t.id ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* PROFILE */}
          {tab === 'profile' && (
            <>
              {/* Avatar */}
              <section className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 overflow-hidden">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-8 h-8" />}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer w-fit">
                    <Upload className="w-3.5 h-3.5" />Загрузить фото
                    <input type="file" accept="image/*" hidden
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatar(f); e.target.value = ''; }} />
                  </label>
                  {avatarUrl && (
                    <button onClick={() => setAvatarUrl('')} className="text-xs text-rose-600 hover:underline w-fit">Удалить</button>
                  )}
                  <p className="text-[10px] text-gray-500">PNG / JPG / WebP, до 5 МБ</p>
                </div>
              </section>

              {/* Name + email + phone */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Имя *" icon={UserIcon}>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus
                    placeholder="Анна" className={inputCls} />
                </Field>
                <Field label="Фамилия *" icon={UserIcon}>
                  <input value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Иванова" className={inputCls} />
                </Field>
                <Field label="Email *" icon={Mail}>
                  <input value={email} onChange={e => setEmail(e.target.value)}
                    type="email" placeholder="ivanova@platform.com" className={inputCls} />
                </Field>
                <Field label="Телефон" icon={Phone}>
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+993 12 444-001" className={inputCls + ' font-mono'} />
                </Field>
              </section>

              {/* Position + department */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Должность" icon={Briefcase}>
                  <input value={position} onChange={e => setPosition(e.target.value)}
                    placeholder="Старший бухгалтер" className={inputCls} />
                </Field>
                <Field label="Отдел" icon={Building2}>
                  <select value={department} onChange={e => setDepartment(e.target.value)}
                    className={inputCls + ' bg-white'}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </section>

              {/* Country + city + language */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Страна" icon={Globe}>
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    className={inputCls + ' bg-white'}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Город">
                  <input value={city} onChange={e => setCity(e.target.value)}
                    list="city-suggestions" className={inputCls} />
                  <datalist id="city-suggestions">
                    {CITIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </Field>
                <Field label="Язык интерфейса" icon={Languages}>
                  <select value={language} onChange={e => setLanguage(e.target.value as ManagedUser['language'])}
                    className={inputCls + ' bg-white'}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </Field>
              </section>

              {/* Start date + status */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Дата начала работы" icon={Calendar}>
                  <input value={startDate} onChange={e => setStartDate(e.target.value)}
                    placeholder="дд.мм.гггг" className={inputCls} />
                </Field>
                <Field label="Статус" icon={ShieldCheck}>
                  <div className="grid grid-cols-2 gap-1">
                    {STATUS_OPTIONS.map(s => (
                      <button key={s} onClick={() => setStatus(s)}
                        className={`py-1.5 text-xs font-semibold rounded-lg border ${status === s ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </Field>
              </section>

              {/* 2FA + comment */}
              <section className="space-y-3">
                <button onClick={() => setTwoFactorRequired(v => !v)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${twoFactorRequired ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${twoFactorRequired ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <ShieldCheck className={`w-5 h-5 ${twoFactorRequired ? 'text-green-700' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">Требовать 2FA</p>
                    <p className="text-[11px] text-gray-500">Сотрудник должен настроить 2FA при первом входе</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full ${twoFactorRequired ? 'bg-green-500' : 'bg-gray-300'} relative transition`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${twoFactorRequired ? 'left-4' : 'left-0.5'}`} />
                  </div>
                </button>

                <Field label="Комментарий Super Admin">
                  <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                    placeholder="Внутренние заметки (видны только SuperAdmin / HR)..."
                    className={inputCls + ' resize-none'} />
                </Field>
              </section>
            </>
          )}

          {/* ACCESS */}
          {tab === 'access' && (
            <section className="space-y-3">
              <p className="text-xs font-bold text-gray-700">Выберите роль</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PREDEFINED_ROLES.filter(r => r.appScope === 'admin').map(r => {
                  const isSelected = role === r.name;
                  const color = ROLE_COLORS[r.name] ?? r.color ?? 'blue';
                  return (
                    <button key={r.id} onClick={() => setRole(r.name)}
                      className={`text-left p-3 rounded-xl border transition ${isSelected ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${COLOR_BADGE[color] ?? COLOR_BADGE.blue}`}>
                          {ROLE_LABELS[r.name] ?? r.label}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-700 ml-auto" />}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">{r.description}</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">{r.permissions.includes('*') ? '∞ прав' : `${r.permissions.length} прав`}</p>
                    </button>
                  );
                })}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                Эти роли — управленческие (Admin Panel). Внешние роли (Courier / Seller / Customer / PVZ-оператор / складчик) создаются в отдельных приложениях.
              </div>
            </section>
          )}

          {/* DOCUMENTS */}
          {tab === 'docs' && (
            <section className="space-y-3">
              <div className="flex items-end gap-2">
                <Field label="Тип документа">
                  <select value={pendingKind} onChange={e => setPendingKind(e.target.value as UserDocument['kind'])}
                    className={inputCls + ' bg-white'}>
                    {Object.entries(DOC_KIND_LABELS_HR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <label className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />Загрузить
                  <input type="file" hidden
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); e.target.value = ''; }} />
                </label>
              </div>

              {documents.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-10 text-center text-xs text-gray-500">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                  Документы не загружены
                </div>
              ) : (
                <div className="space-y-1">
                  {documents.map(d => (
                    <div key={d.docId} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs">
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{d.filename}</p>
                        <p className="text-[10px] text-gray-500">{DOC_KIND_LABELS_HR[d.kind]} · {d.uploadedAt}</p>
                      </div>
                      <span className="px-1.5 py-0 bg-yellow-100 text-yellow-800 rounded text-[9px] font-bold">{d.status}</span>
                      <button onClick={() => removeDoc(d.docId)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-3 shrink-0 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm">
            Отмена
          </button>
          <button onClick={submit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
            Создать сотрудника
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}

// ─── Tiny field wrapper ──────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({ label, icon: Icon, children }: { label: string; icon?: any; children: any }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
        {Icon ? <Icon className="w-3 h-3" /> : null}{label}
      </span>
      {children}
    </label>
  );
}
