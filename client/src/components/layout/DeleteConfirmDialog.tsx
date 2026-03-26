interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ open, title, message, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onCancel}>
      <div
        className="card max-w-sm w-full animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium mb-2">{title}</h3>
        <p className="text-xs text-deck-text-dim mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
          <button onClick={onConfirm} className="btn-danger text-sm">Delete</button>
        </div>
      </div>
    </div>
  );
}
