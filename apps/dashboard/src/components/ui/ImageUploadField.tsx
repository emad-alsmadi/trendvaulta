import { useRef, useState } from 'react';
import { Loader2, Upload, ImageOff } from 'lucide-react';
import { uploadsApi, errorMessage } from '../../lib/api';
import { useToast } from './Toast';

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
      toast.success('Image uploaded.');
    } catch (err) {
      toast.error(errorMessage(err, 'Image upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
          {value && !imageError ? (
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <ImageOff className="h-5 w-5 text-gray-400" aria-hidden />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            required={required}
            value={value}
            onChange={(e) => {
              setImageError(false);
              onChange(e.target.value);
            }}
            placeholder="https://... (or upload a file)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
