/**
 * AccessDenied — generic "you can't see this page" screen.
 * Used both standalone and via <RequirePerm> wrapper around routes.
 */
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { audit } from '../../data/audit-store';
import { useEffect } from 'react';

interface Props {
  /** Permission that was required, e.g. 'finance.payouts.view' */
  perm:    string;
  /** Optional path the user tried to open. */
  path?:   string;
}

export function AccessDenied({ perm, path }: Props) {
  const { user } = useAuth();

  useEffect(() => {
    audit('access.denied', perm,
      `Попытка открыть ${path ?? '—'} без права ${perm}`,
      user?.name ?? '—', user?.role ?? '—');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center">
        <Lock className="w-8 h-8 text-rose-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Доступ ограничен</h1>
      <p className="text-sm text-gray-600 mt-2">У вашей роли нет права открыть этот раздел.</p>

      <div className="mt-5 inline-flex flex-col gap-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-left">
        <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Требуется permission</p>
        <p className="text-sm font-mono font-bold text-gray-900">{perm}</p>
        {path && <p className="text-[11px] text-gray-500 mt-1 font-mono">{path}</p>}
      </div>

      {user && (
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500">
          <Shield className="w-3.5 h-3.5" />
          Текущая роль: <span className="font-semibold text-gray-700">{user.role}</span>
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-2">
        <Link to="/cabinet"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />Вернуться в мой кабинет
        </Link>
        <Link to="/"
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm">
          На главную
        </Link>
      </div>

      <p className="text-[11px] text-gray-400 mt-6">
        Если вам должен быть доступ — обратитесь к Super Admin.
        Действие записано в audit log.
      </p>
    </div>
  );
}

interface RequirePermProps {
  perm:    string;
  path?:   string;
  children: any;
}

/** Wrapper: renders children only when user has `perm`, else AccessDenied. */
export function RequirePerm({ perm, path, children }: RequirePermProps) {
  const { hasPermission } = useAuth();
  if (!hasPermission(perm)) return <AccessDenied perm={perm} path={path} />;
  return children;
}
