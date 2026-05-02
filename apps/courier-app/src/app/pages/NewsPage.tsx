import { useNavigate } from 'react-router';
import {
  AlertCircle, ArrowLeft, Calendar, Gift, Newspaper, TrendingUp,
} from 'lucide-react';
import { useT } from '../i18n';
import type { TKey } from '../i18n';

type NewsTag = 'update' | 'promo' | 'announcement' | 'alert';

interface NewsItem {
  id: string;
  tag: NewsTag;
  titleKey: TKey | string;
  descriptionKey: TKey | string;
  date: string;
  important: boolean;
}

const NEWS: NewsItem[] = [
  {
    id: 'n1', tag: 'update', date: '2026-04-30', important: false,
    titleKey: 'app.title' as TKey,
    descriptionKey: 'common.coming_soon' as TKey,
  },
];

const TAG_META: Record<NewsTag, { tk: TKey; icon: React.ComponentType<{ className?: string }>; bg: string; fg: string }> = {
  update:       { tk: 'news.tag.update',       icon: TrendingUp, bg: 'bg-sky-100',     fg: 'text-sky-700' },
  promo:        { tk: 'news.tag.promo',        icon: Gift,        bg: 'bg-pink-100',    fg: 'text-pink-700' },
  announcement: { tk: 'news.tag.announcement', icon: Calendar,    bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  alert:        { tk: 'news.tag.alert',        icon: AlertCircle, bg: 'bg-amber-100',   fg: 'text-amber-700' },
};

export function NewsPage() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-extrabold">{t('news.title')}</h1>
          <p className="text-xs text-gray-500">{t('news.subtitle')}</p>
        </div>
      </header>

      <div className="px-4 pt-3 pb-8">
        {NEWS.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-500 border border-gray-100">
            <Newspaper className="w-7 h-7 mx-auto mb-2 text-gray-400" />
            {t('news.empty')}
          </div>
        ) : (
          <ul className="space-y-2">
            {NEWS.map(n => {
              const meta = TAG_META[n.tag];
              const Icon = meta.icon;
              return (
                <li key={n.id} className={`bg-white rounded-2xl border ${n.important ? 'border-amber-300' : 'border-gray-100'} p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.bg} ${meta.fg}`}>
                      <Icon className="w-3 h-3" />
                      {t(meta.tk)}
                    </span>
                    <span className="ml-auto text-[11px] text-gray-400">{n.date}</span>
                  </div>
                  <div className="text-[15px] font-extrabold text-gray-900">{t(n.titleKey as TKey)}</div>
                  <div className="text-[13px] text-gray-600 mt-0.5">{t(n.descriptionKey as TKey)}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
