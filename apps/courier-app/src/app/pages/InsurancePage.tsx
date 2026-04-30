import { useNavigate } from 'react-router';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { useT } from '../i18n';

export function InsurancePage() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[18px] font-extrabold">{t('courier.documents')}</h1>
      </header>

      <div className="px-4 pt-4 space-y-3 pb-8">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-emerald-900">Insurance · Active</p>
            <p className="text-sm text-emerald-800/80 mt-0.5">— · {t('common.loading')}</p>
          </div>
        </div>

        <ul className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <li className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
            <FileText className="w-5 h-5 text-gray-700" />
            <span className="flex-1 text-[15px] font-semibold text-gray-900">Driver licence</span>
            <span className="text-xs text-emerald-600 font-bold">OK</span>
          </li>
          <li className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
            <FileText className="w-5 h-5 text-gray-700" />
            <span className="flex-1 text-[15px] font-semibold text-gray-900">ID</span>
            <span className="text-xs text-emerald-600 font-bold">OK</span>
          </li>
          <li className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
            <FileText className="w-5 h-5 text-gray-700" />
            <span className="flex-1 text-[15px] font-semibold text-gray-900">Health</span>
            <span className="text-xs text-emerald-600 font-bold">OK</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
