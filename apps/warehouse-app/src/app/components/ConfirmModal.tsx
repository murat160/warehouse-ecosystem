import { Modal } from './Modal';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open, title, message,
  confirmLabel = 'Подтвердить', cancelLabel = 'Отмена',
  danger = false, onConfirm, onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="h-11 rounded-xl bg-[#F3F4F6] text-[#1F2430] active-press"
            style={{ fontWeight: 800 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="h-11 rounded-xl text-white active-press"
            style={{
              backgroundColor: danger ? '#EF4444' : '#1F2430',
              fontWeight: 800,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-[14px] text-[#374151] py-2" style={{ fontWeight: 500 }}>
        {message}
      </p>
    </Modal>
  );
}
