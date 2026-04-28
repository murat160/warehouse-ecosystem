import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../components/PageHeader';

export function ScannerPage() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ code: string; at: string }[]>([]);

  const submit = () => {
    const code = input.trim();
    if (!code) return;
    setHistory(h => [{ code, at: new Date().toLocaleTimeString('ru') }, ...h].slice(0, 20));
    toast(`Считано: ${code}`);
    setInput('');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Сканер" subtitle="Ручной ввод штрихкода" />

      <div className="px-5 -mt-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ScanLine className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 700 }}>Штрихкод</span>
          </div>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            autoFocus
            placeholder="Введите или просканируйте"
            className="w-full px-3 py-3 rounded-xl border-2 border-[#E5E7EB] focus:border-[#7C3AED] focus:outline-none text-[15px] mb-3 font-mono"
            style={{ fontWeight: 500 }}
          />
          <button
            onClick={submit}
            className="w-full h-11 rounded-xl bg-[#7C3AED] text-white active-press"
            style={{ fontWeight: 800 }}
          >
            Принять
          </button>
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mt-3">
            <h3 className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>История</h3>
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-[12px]">
                  <span className="text-[#1F2430] font-mono" style={{ fontWeight: 700 }}>{h.code}</span>
                  <span className="text-[#9CA3AF]" style={{ fontWeight: 500 }}>{h.at}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
