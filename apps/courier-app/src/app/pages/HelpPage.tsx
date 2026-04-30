import { useNavigate } from 'react-router';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useT } from '../i18n';

export function HelpPage() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[18px] font-extrabold">{t('settings.about')}</h1>
      </header>

      <div className="px-4 pt-4 space-y-3 pb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="text-sm text-gray-700 leading-relaxed">
            Express Courier · v0.2.0
          </div>
        </div>
        <button
          onClick={() => navigate('/chat/support')}
          className="w-full h-12 rounded-2xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          {t('chat.support')}
        </button>
      </div>
    </div>
  );
}
