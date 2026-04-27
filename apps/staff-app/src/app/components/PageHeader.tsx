import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export function PageHeader({ title, subtitle, onBack, rightSlot }: PageHeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <div className="bg-white sticky top-0 z-30 border-b border-[#F0F0F0]">
      <div className="safe-top" />
      <div className="flex items-center px-4 py-3 gap-3">
        <button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F3F4F6] active-press"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5 text-[#1F2430]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[18px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
              {subtitle}
            </p>
          )}
        </div>
        {rightSlot}
      </div>
    </div>
  );
}
