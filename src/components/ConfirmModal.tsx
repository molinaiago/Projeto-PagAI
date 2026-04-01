type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'danger';
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = 'primary',
}: ModalProps) {
  if (!isOpen) {
    return null;
  }

  const confirmButtonClass = confirmColor === 'danger' ? 'btn-danger' : 'btn-primary';

  return (

    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-body">
          <h2 className="text-xl font-semibold mb-4">{title}</h2>
          <div className="text-slate-600">{children}</div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="btn-soft">
              {cancelText}
            </button>
            <button onClick={onConfirm} className={confirmButtonClass}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}