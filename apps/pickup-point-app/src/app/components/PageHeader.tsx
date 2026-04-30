import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  right?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({ title, subtitle, back, right, badge }: PageHeaderProps) {
  const nav = useNavigate();
  const loc = useLocation();
  const showBack = back === false ? false : back === true || typeof back === 'string' ? true : loc.pathname !== '/';

  const goBack = () => {
    if (typeof back === 'string') { nav(back); return; }
    if (window.history.length > 1) nav(-1);
    else nav('/');
  };

  return (
    <div className="bg-[#1F2430] text-white px-5 pt-4 pb-8 rounded-b-3xl">
      <div className="flex items-start gap-3">
        {showBack && (
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 active-press mt-0.5"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[22px]" style={{ fontWeight: 900 }}>{title}</h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-[12px] text-white/60 mt-0.5" style={{ fontWeight: 500 }}>
              {subtitle}
            </p>
          )}
        </div>
        {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
      </div>
    </div>
  );
}
