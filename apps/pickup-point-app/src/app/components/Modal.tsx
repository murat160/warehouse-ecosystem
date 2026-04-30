import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open, onClose, title, children, footer, wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={`bg-white w-full ${wide ? 'md:max-w-3xl' : 'md:max-w-md'} max-h-[90vh] flex flex-col rounded-t-3xl md:rounded-2xl shadow-xl`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
          <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center active-press" aria-label="Закрыть">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[#F3F4F6] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({
  open, onClose, title, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white w-full md:w-[480px] h-full flex flex-col shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
          <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center active-press" aria-label="Закрыть">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[#F3F4F6] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
