// ============================================================
//  Customer App — Stage 1+2 scaffold.
//  Working: real login → API /auth/login → /kpi/dashboard.
//  Stage 4 will add full CRUD pages (users, warehouses, etc.).
// ============================================================

import { useEffect, useState } from 'react';
import { createApiClient } from '@wms/shared-types/api-client';

const api = createApiClient();

export function App() {
  const [employeeId, setEmployeeId] = useState('W-002');
  const [pin, setPin] = useState('0000');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<any>(null);

  useEffect(() => {
    if (api.getToken()) {
      api.me().then(({ user }) => setUser(user)).catch(() => api.logout());
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get('/api/kpi/dashboard').then(setKpi).catch(console.error);
  }, [user]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.login({ employeeId, pin });
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleLogout() {
    api.logout();
    setUser(null);
    setKpi(null);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 space-y-4">
          <h1 className="text-2xl font-bold">WMS Customer App</h1>
          <p className="text-sm text-slate-500">Войдите в систему для управления складом.</p>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Employee ID (например W-002)"
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button className="w-full bg-slate-900 text-white rounded-lg py-2 font-semibold">Войти</button>
          <p className="text-xs text-slate-400 pt-2">
            Тест: W-002 / 0000 (manager), W-001 / 0000 (supervisor), W-204 / 1234 (picker)
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">WMS Customer App</h1>
          <p className="text-sm text-slate-500">{user.fullName} · {user.employeeId}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-slate-600 hover:underline">Выйти</button>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {kpi && [
          { label: 'Заказов', value: kpi.orders },
          { label: 'Открытых задач', value: kpi.openTasks },
          { label: 'Проблем', value: kpi.problems },
          { label: 'Активных сотрудников', value: kpi.activeWorkers },
          { label: 'Готово к отправке', value: kpi.ordersReadyForDispatch },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-xs text-slate-500 uppercase">{card.label}</div>
            <div className="text-3xl font-bold mt-1">{card.value}</div>
          </div>
        ))}
      </section>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-semibold mb-2">Stage 1+2 готов</h2>
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          <li>Backend API + Prisma + JWT работает</li>
          <li>Реальный login → токен в localStorage → /api/kpi/dashboard</li>
          <li>Stage 4: добавим CRUD для users/warehouses/zones/locations/products</li>
          <li>Stage 5+: live warehouse map, audit log viewer, KPI dashboards</li>
        </ul>
      </div>
    </div>
  );
}
