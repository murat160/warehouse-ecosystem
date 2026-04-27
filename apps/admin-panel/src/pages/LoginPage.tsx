import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth';

export function LoginPage() {
  const { login } = useSession();
  const nav = useNavigate();
  const [employeeId, setEmployeeId] = useState('W-002');
  const [pin, setPin] = useState('0000');
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(employeeId, pin);
      toast.success('Welcome');
      nav('/');
    } catch (err: any) {
      toast.error(err?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <form onSubmit={handle} className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">WMS Admin Panel</h1>
          <p className="text-sm text-slate-500">Sign in with your employee credentials.</p>
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 mb-1">Employee ID</span>
          <input
            value={employeeId} onChange={e => setEmployeeId(e.target.value)} autoFocus
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="W-002"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 mb-1">PIN</span>
          <input
            type="password" value={pin} onChange={e => setPin(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </label>
        <button
          disabled={busy}
          className="w-full bg-slate-900 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-[11px] text-slate-400 pt-2">
          Demo: W-002/0000 (manager), W-001/0000 (supervisor), W-204/1234 (picker)
        </p>
      </form>
    </div>
  );
}
