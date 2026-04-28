import { useState } from 'react';
import { ScanLine } from 'lucide-react';

export interface ScanInputProps {
  label?: string;
  placeholder?: string;
  onScan: (code: string) => void;
  autoFocus?: boolean;
  buttonText?: string;
}

export function ScanInput({ label = 'Штрихкод', placeholder = 'Введите или просканируйте', onScan, autoFocus, buttonText = 'Сканировать' }: ScanInputProps) {
  const [v, setV] = useState('');
  const submit = () => { const c = v.trim(); if (!c) return; onScan(c); setV(''); };
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ScanLine className="w-4 h-4 text-[#7C3AED]" />
        <span className="text-[12px] text-[#1F2430]" style={{ fontWeight: 700 }}>{label}</span>
      </div>
      <div className="flex gap-2">
        <input
          autoFocus={autoFocus}
          value={v}
          onChange={e => setV(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#7C3AED] focus:outline-none text-[14px] font-mono"
          style={{ fontWeight: 500 }}
        />
        <button onClick={submit} className="h-10 px-4 rounded-xl bg-[#7C3AED] text-white active-press" style={{ fontWeight: 800 }}>
          {buttonText}
        </button>
      </div>
    </div>
  );
}
