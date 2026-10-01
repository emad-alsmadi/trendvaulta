import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Upload, X } from 'lucide-react';
import { uploadsApi, errorMessage } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { labelClass } from '../ui/styles';

/** Matches the upload route's accepted types (apps/api/routes/uploads.js). */
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const overlayButton =
  'inline-flex size-6 items-center justify-center rounded text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30 disabled:hover:bg-transparent';

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
  const { t } = useT();
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
        toast.error(
          errorMessage(err, t('gallery.uploadFailed', { name: file.name })),
        );
      } finally {
        setUploading((n) => n - 1);
      }
    }
    const done = files.length - failed;
    if (done > 0)
      toast.success(
        done === 1
          ? t('gallery.addedOne')
          : t('gallery.addedMany', { count: done }),
      );
  }

  function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= value.length) return;
    const images = [...value];
    [images[index], images[target]] = [images[target], images[index]];
    onChange(images);
  }

  return (
    <div className='space-y-1.5'>
      <span className={labelClass}>{t('gallery.label')}</span>

      {value.length > 0 && (
        <ul className='grid grid-cols-3 gap-2 sm:grid-cols-5'>
          {value.map((src, i) => (
            <li
              key={src}
              className='group relative aspect-square overflow-hidden rounded-control border border-border bg-muted'
            >
              <img
                src={src}
                alt=''
                className='size-full object-cover'
              />
              <div className='absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100'>
                <button
                  type='button'
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={t('gallery.moveEarlier', { n: i + 1 })}
                  className={overlayButton}
                >
                  <ArrowLeft
                    className='size-3.5 rtl:-scale-x-100'
                    aria-hidden
                  />
                </button>
                <button
                  type='button'
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={t('gallery.remove', { n: i + 1 })}
                  className={overlayButton}
                >
                  <X
                    className='size-3.5'
                    aria-hidden
                  />
                </button>
                <button
                  type='button'
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={t('gallery.moveLater', { n: i + 1 })}
                  className={overlayButton}
                >
                  <ArrowRight
                    className='size-3.5 rtl:-scale-x-100'
                    aria-hidden
                  />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className='flex flex-wrap items-center gap-2'>
        <Input
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
          aria-label={t('gallery.urlPlaceholder')}
          placeholder={t('gallery.urlPlaceholder')}
          dir='ltr'
          className='min-w-0 flex-1'
        />
        <Button
          disabled={!url.trim()}
          onClick={() => {
            add(url);
            setUrl('');
          }}
          icon={<Plus aria-hidden />}
        >
          {t('gallery.add')}
        </Button>
        <input
          ref={fileInputRef}
          type='file'
          accept={ACCEPT}
          multiple
          className='hidden'
          onChange={handleFiles}
        />
        <Button
          loading={uploading > 0}
          onClick={() => fileInputRef.current?.click()}
          icon={<Upload aria-hidden />}
        >
          {uploading > 0
            ? t('gallery.uploading', { count: uploading })
            : t('gallery.upload')}
        </Button>
      </div>
    </div>
  );
}
