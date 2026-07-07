export type ConfirmVariant =
  | 'danger'
  | 'warning'
  | 'neutral'
  | 'info'
  | 'payment';

export type ConfirmOptions = {
  variant?: ConfirmVariant;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * When false, Escape and outside clicks do not dismiss the dialog.
   * Defaults: false for `danger` and `payment`, true otherwise.
   */
  closeOnBackdrop?: boolean;
  onConfirm: () => void | Promise<void>;
};
