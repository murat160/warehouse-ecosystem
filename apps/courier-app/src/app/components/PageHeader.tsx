import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export function PageHeader({ title, subtitle, icon, onBack, rightAction }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[390px] mx-auto">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-[#1F2430]">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          {icon && (
            <div className="w-10 h-10 rounded-full bg-[#00D27A]/10 flex items-center justify-center">
              {icon}
            </div>
          )}
          {rightAction}
        </div>
      </div>
    </div>
  );
}