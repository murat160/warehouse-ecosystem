import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const w = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className={`bg-white w-full ${w} rounded-t-3xl md:rounded-2xl max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-2 md:hidden">
          <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 sticky top-0 bg-white z-10">
          <h3 className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center active-press">
            <X className="w-5 h-5 text-[#1F2430]" />
          </button>
        </div>
        <div className="px-5 pb-3">{children}</div>
        {footer && <div className="px-5 pt-3 pb-5 border-t border-[#F3F4F6] sticky bottom-0 bg-white">{footer}</div>}
      </div>
    </div>
  );
}
