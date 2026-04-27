/**
 * LoginPage — real /api/auth/login flow.
 *
 * Visual style mirrors existing pages: white card, Tailwind utilities,
 * lucide-react icons, blue primary button. Stays identical to the rest
 * of the admin panel.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User as UserIcon, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const { login, user, status } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };

  const [employeeId, setEmployeeId] = useState('W-002');
  const [pin, setPin] = useState('0000');
  const [busy, setBusy] = useState(false);

  // Already authenticated? bounce to where they came from (or /).
  useEffect(() => {
    if (status === 'authenticated' && user) {
      nav(loc.state?.from ?? '/', { replace: true });
    }
  }, [status, user, nav, loc.state]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (employeeId.trim().length < 3 || pin.length < 4) {
      toast.error('Введите ID сотрудника и PIN');
      return;
    }
    setBusy(true);
    try {
      await login(employeeId.trim(), pin);
      toast.success('Вход выполнен');
      nav(loc.state?.from ?? '/', { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? 'Не удалось войти');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-5"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 mb-3">
            <LogIn className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Введите ID сотрудника и PIN</p>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">ID сотрудника</span>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="W-002"
            />
          </div>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">PIN</span>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoComplete="current-password"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••"
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {busy ? 'Входим…' : 'Войти'}
        </button>

        <p className="text-[11px] text-gray-400 text-center pt-1">
          Тест: W-002 / 0000 (manager) · W-001 / 0000 (supervisor) · W-204 / 1234 (picker)
        </p>
      </form>
    </div>
  );
}
