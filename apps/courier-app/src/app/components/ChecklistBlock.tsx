import { Check, ListChecks } from 'lucide-react';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import type { ChecklistItem, ChecklistStage } from '../store/types';

interface Props {
  items: ChecklistItem[];
  stage: ChecklistStage;
  onToggle: (itemId: string) => void;
}

export function ChecklistBlock({ items, stage, onToggle }: Props) {
  const t = useT();
  const stageItems = items.filter(i => i.stage === stage);
  if (stageItems.length === 0) return null;

  const doneCount = stageItems.filter(i => i.checked).length;
  const total = stageItems.length;
  const allDone = doneCount === total;
  const progressPct = Math.round((doneCount / total) * 100);

  return (
    <div className="rounded-2xl border border-gray-100 p-3 mb-2 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold inline-flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5" />
          {t('check.title')}
        </div>
        <div className={`text-[11px] font-extrabold ${allDone ? 'text-emerald-600' : 'text-gray-500'}`}>
          {doneCount}/{total}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-300 rounded-full ${allDone ? 'bg-emerald-500' : 'bg-amber-400'}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {!allDone && (
        <p className="text-[11px] text-gray-500 mb-2">{t('check.required_hint')}</p>
      )}

      <ul className="space-y-1.5">
        {stageItems.map(item => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left transition-colors active:bg-gray-100 ${
                item.checked ? 'bg-emerald-50' : 'bg-gray-50'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  item.checked ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-white'
                }`}
              >
                {item.checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </span>
              <span
                className={`flex-1 text-[13px] font-semibold leading-tight ${
                  item.checked ? 'text-emerald-900 line-through opacity-70' : 'text-gray-900'
                }`}
              >
                {t(item.labelKey as TKey)}
              </span>
              {item.required && !item.checked && (
                <span className="text-[10px] uppercase font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                  {t('common.required')}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
