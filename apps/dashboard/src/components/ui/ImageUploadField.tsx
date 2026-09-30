import { useRef, useState } from 'react';
import { Loader2, Upload, ImageOff } from 'lucide-react';
import { uploadsApi, errorMessage } from '../../lib/api';
import { useToast } from './Toast';
import { useT } from '../../i18n/I18nProvider';
import { buttonVariants, inputClass, labelClass } from './styles';

type ImageUploadFieldProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
};

/**
 * Thumbnail + file upload for a product/brand image field, with a plain URL
 * text input kept as a manual-entry fallback so nothing regresses if upload
 * is unavailable.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  required,
}: ImageUploadFieldProps) {
  const toast = useToast();
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadsApi.uploadImage(file);
      setImageError(false);
      onChange(url);
      toast.success(t('imageUpload.uploaded'));
    } catch (err) {
      toast.error(errorMessage(err, t('imageUpload.failed')));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="block space-y-1.5 text-sm">
      <span className={labelClass}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-muted">
          {value && !imageError ? (
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <ImageOff className="size-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            // The visible caption is a <span>, so name the field explicitly.
            aria-label={t('imageUpload.urlLabel', { label })}
            required={required}
            value={value}
            onChange={(e) => {
              setImageError(false);
              onChange(e.target.value);
            }}
            placeholder={t('imageUpload.placeholder')}
            dir="ltr"
            className={inputClass}
          />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              {uploading ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Upload aria-hidden />
              )}
              {uploading ? t('imageUpload.uploading') : t('imageUpload.upload')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
