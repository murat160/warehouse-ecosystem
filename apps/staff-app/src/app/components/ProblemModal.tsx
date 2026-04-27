import { useState } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';
import { ERROR_LABELS, type TaskError } from '../data/mockData';

interface ProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: TaskError['code'], message: string, photo?: boolean) => void;
  /** Какие коды показывать (зависит от типа задачи) */
  availableCodes?: TaskError['code'][];
}

const DEFAULT_CODES: TaskError['code'][] = [
  'no_item', 'damaged', 'wrong_size', 'wrong_color',
  'unreadable_barcode', 'shelf_blocked', 'need_supervisor',
];

export function ProblemModal({ isOpen, onClose, onSubmit, availableCodes = DEFAULT_CODES }: ProblemModalProps) {
  const [code, setCode] = useState<TaskError['code'] | null>(null);
  const [comment, setComment] = useState('');
  const [photoTaken, setPhotoTaken] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!code) return;
    onSubmit(code, comment, photoTaken);
    setCode(null);
    setComment('');
    setPhotoTaken(false);
  };

  const handleTakePhoto = () => {
    setPhotoTaken(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end animate-fade-in" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pb-3">
          <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[20px] text-[#1F2430]" style={{ fontWeight: 900 }}>
              Сообщить о проблеме
            </h3>
            <p className="text-[13px] text-[#6B7280] mt-0.5" style={{ fontWeight: 500 }}>
              Выберите тип проблемы
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F3F4F6]"
          >
            <X className="w-5 h-5 text-[#1F2430]" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {availableCodes.map((c) => (
            <button
              key={c}
              onClick={() => setCode(c)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left active-press transition-colors"
              style={{
                backgroundColor: code === c ? '#FEE2E2' : '#F9FAFB',
                border: `2px solid ${code === c ? '#EF4444' : 'transparent'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle
                  className="w-4 h-4"
                  style={{ color: code === c ? '#EF4444' : '#9CA3AF' }}
                />
                <span
                  className="text-[14px]"
                  style={{ fontWeight: 600, color: code === c ? '#991B1B' : '#1F2430' }}
                >
                  {ERROR_LABELS[c]}
                </span>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2"
                style={{
                  borderColor: code === c ? '#EF4444' : '#D1D5DB',
                  backgroundColor: code === c ? '#EF4444' : 'transparent',
                }}
              />
            </button>
          ))}
        </div>

        {code && (
          <>
            <label className="text-[13px] text-[#6B7280] mb-2 block px-1" style={{ fontWeight: 600 }}>
              Дополнительный комментарий (опционально)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Опишите проблему..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2EA7E0] focus:outline-none text-[14px] resize-none mb-3"
              style={{ fontWeight: 500 }}
            />

            <button
              onClick={handleTakePhoto}
              className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed active-press"
              style={{
                borderColor: photoTaken ? '#00D27A' : '#D1D5DB',
                backgroundColor: photoTaken ? '#D1FAE5' : 'transparent',
                color: photoTaken ? '#065F46' : '#6B7280',
                fontWeight: 600,
              }}
            >
              <Camera className="w-5 h-5" />
              <span className="text-[14px]">
                {photoTaken ? '✓ Фото прикреплено' : 'Прикрепить фото'}
              </span>
            </button>

            <button
              onClick={handleSubmit}
              className="w-full h-14 rounded-full bg-[#EF4444] text-white active-press shadow-md"
              style={{ fontWeight: 700 }}
            >
              Отправить сообщение
            </button>
          </>
        )}
      </div>
    </div>
  );
}
