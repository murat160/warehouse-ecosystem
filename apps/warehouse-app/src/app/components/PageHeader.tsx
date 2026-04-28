import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <div className="bg-[#1F2430] text-white px-5 pt-6 pb-8 rounded-b-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px]" style={{ fontWeight: 900 }}>{title}</h1>
          {subtitle && (
            <p className="text-[12px] text-white/60 mt-0.5" style={{ fontWeight: 500 }}>
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
    </div>
  );
}
