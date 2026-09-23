import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Plus, Upload, X } from 'lucide-react';
import { uploadsApi, errorMessage } from '../../lib/api';
import { useToast } from '../ui/Toast';

/** Matches the upload route's accepted types (apps/api/routes/uploads.js). */
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * Extra product images, in display order.
 *
 * Several files can be picked at once; they upload one after another so a
 * single failure is reported against that file and the rest still land. A
 * pasted URL stays available as a fallback, as in ImageUploadField.
 */
export function GalleryField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (images: string[]) => void;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [url, setUrl] = useState('');

  // Uploads resolve after the user may have removed or reordered images, so
  // each one appends to the latest list rather than to a stale copy.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  function add(next: string) {
    const trimmed = next.trim();
    if (!trimmed || latest.current.includes(trimmed)) return;
    const images = [...latest.current, trimmed];
    latest.current = images;
    onChange(images);
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    setUploading(files.length);
    let failed = 0;
    for (const file of files) {
      try {
        add(await uploadsApi.uploadImage(file));
      } catch (err) {
        failed += 1;
        toast.error(errorMessage(err, `Could not upload ${file.name}`));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    const done = files.length - failed;
    if (done > 0) toast.success(done === 1 ? 'Image added.' : `${done} images added.`);
  }

  function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= value.length) return;
    const images = [...value];
    [images[index], images[target]] = [images[target], images[index]];
    onChange(images);
  }

  return (
    <div className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
        Gallery images
      </span>

      {value.length > 0 && (
        <ul className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((src, i) => (
            <li
              key={src}
              className="group relative aspect-square overflow-hidden rounded-lg border border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move image ${i + 1} earlier`}
                  className="rounded p-0.5 text-white disabled:opacity-30"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={`Remove image ${i + 1}`}
                  className="rounded p-0.5 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={`Move image ${i + 1} later`}
                  className="rounded p-0.5 text-white disabled:opacity-30"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            // Enter would otherwise submit the whole product form.
            if (e.key === 'Enter') {
              e.preventDefault();
              add(url);
              setUrl('');
            }
          }}
          placeholder="https://… image URL"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <button
          type="button"
          disabled={!url.trim()}
          onClick={() => {
            add(url);
            setUrl('');
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <button
          type="button"
          disabled={uploading > 0}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {uploading > 0 ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          {uploading > 0 ? `Uploading ${uploading}…` : 'Upload images'}
        </button>
      </div>
    </div>
  );
}
