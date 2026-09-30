import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { HeroSlide } from '../../lib/api';
import { useT } from '../../i18n/I18nProvider';

const cell =
  'w-full min-w-0 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white';

type TextField = 'eyebrow' | 'title' | 'subtitle' | 'ctaLabel';

/** `label` is a message key. */
const TEXT_FIELDS = [
  { field: 'eyebrow', label: 'heroSlides.eyebrow', maxLength: 100 },
  { field: 'title', label: 'heroSlides.title', maxLength: 200 },
  { field: 'subtitle', label: 'heroSlides.subtitle', maxLength: 300 },
  { field: 'ctaLabel', label: 'heroSlides.ctaLabel', maxLength: 60 },
] as const satisfies ReadonlyArray<{ field: TextField; label: string; maxLength: number }>;

const TONES: NonNullable<HeroSlide['tone']>[] = ['rose', 'stone', 'teal', 'indigo'];

/**
 * Homepage hero slides: image, link and tone, plus the text in English and
 * Arabic. The storefront shows the Arabic text on the Arabic site and falls
 * back to English for any Arabic field left empty.
 */
export function HeroSlidesEditor({
  value,
  onChange,
}: {
  value: HeroSlide[];
  onChange: (slides: HeroSlide[]) => void;
}) {
  const { t, tv } = useT();
  function update(index: number, patch: Partial<HeroSlide>) {
    onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function updateArabic(index: number, field: TextField, text: string) {
    const slide = value[index];
    update(index, {
      translations: {
        ...slide.translations,
        ar: { ...slide.translations?.ar, ...({ [field]: text } as Partial<Record<TextField, string>>) },
      },
    });
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...value];
    const [slide] = next.splice(index, 1);
    next.splice(index + dir, 0, slide);
    onChange(next);
  }

  return (
    <fieldset className='text-sm'>
      <legend className='mb-1 font-medium text-gray-700 dark:text-gray-300'>
        {t('heroSlides.legend')}
      </legend>
      <p className='mb-2 text-xs text-gray-500 dark:text-gray-400'>
        {t('heroSlides.hint')}
      </p>

      <div className='mb-2 space-y-3'>
        {value.map((slide, i) => (
          <div
            key={slide.id}
            className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'
          >
            <div className='mb-2 flex items-center justify-between gap-2'>
              <span className='text-xs font-semibold text-gray-600 dark:text-gray-300'>
                {t('heroSlides.slide', { n: i + 1 })}
              </span>
              <div className='flex items-center gap-1'>
                <label className='me-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300'>
                  <input
                    type='checkbox'
                    checked={slide.active !== false}
                    onChange={(e) => update(i, { active: e.target.checked })}
                  />
                  {t('common.active')}
                </label>
                <button
                  type='button'
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={t('heroSlides.moveUp', { n: i + 1 })}
                  className='rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700'
                >
                  <ArrowUp className='h-4 w-4' aria-hidden />
                </button>
                <button
                  type='button'
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={t('heroSlides.moveDown', { n: i + 1 })}
                  className='rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700'
                >
                  <ArrowDown className='h-4 w-4' aria-hidden />
                </button>
                <button
                  type='button'
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={t('heroSlides.remove', { n: i + 1 })}
                  className='rounded p-1 hover:bg-red-50 dark:hover:bg-red-950/40'
                >
                  <Trash2 className='h-4 w-4 text-red-500' aria-hidden />
                </button>
              </div>
            </div>

            <div className='mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_7rem]'>
              <input
                aria-label={t('heroSlides.fieldLabel', { n: i + 1, field: t('heroSlides.imageUrl') })}
                placeholder={t('heroSlides.imageUrl')}
                dir='ltr'
                value={slide.imageUrl ?? ''}
                onChange={(e) => update(i, { imageUrl: e.target.value })}
                className={cell}
              />
              <input
                aria-label={t('heroSlides.fieldLabel', { n: i + 1, field: t('heroSlides.link') })}
                placeholder={t('heroSlides.linkPlaceholder')}
                dir='ltr'
                value={slide.ctaHref ?? slide.href ?? ''}
                onChange={(e) => update(i, { ctaHref: e.target.value })}
                className={cell}
              />
              <select
                aria-label={t('heroSlides.fieldLabel', { n: i + 1, field: t('heroSlides.tone') })}
                value={slide.tone ?? 'stone'}
                onChange={(e) =>
                  update(i, { tone: e.target.value as HeroSlide['tone'] })
                }
                className={cell}
              >
                {TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tv('tone', tone)}
                  </option>
                ))}
              </select>
            </div>

            <div className='grid gap-x-3 gap-y-2 sm:grid-cols-2'>
              <p className='text-xs font-semibold text-gray-500' lang='en' dir='ltr'>English</p>
              <p className='hidden text-xs font-semibold text-gray-500 sm:block' lang='ar' dir='rtl'>
                العربية
              </p>
              {TEXT_FIELDS.map(({ field, label, maxLength }) => (
                <div key={field} className='contents'>
                  <input
                    aria-label={t('heroSlides.fieldLabelLang', { n: i + 1, field: t(label), lang: t('heroSlides.english') })}
                    placeholder={field === 'title' ? t('heroSlides.required', { field: t(label) }) : t(label)}
                    lang='en'
                    dir='ltr'
                    maxLength={maxLength}
                    value={slide[field] ?? ''}
                    onChange={(e) => update(i, { [field]: e.target.value } as Partial<HeroSlide>)}
                    className={cell}
                  />
                  <input
                    aria-label={t('heroSlides.fieldLabelLang', { n: i + 1, field: t(label), lang: t('heroSlides.arabic') })}
                    placeholder={`${t(label)} (${t('heroSlides.arabic')})`}
                    maxLength={maxLength}
                    lang='ar'
                    dir='rtl'
                    value={slide.translations?.ar?.[field] ?? ''}
                    onChange={(e) => updateArabic(i, field, e.target.value)}
                    className={cell}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type='button'
        onClick={() =>
          onChange([
            ...value,
            { id: `slide-${Date.now().toString(36)}`, title: '', tone: 'stone', active: true },
          ])
        }
        className='inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'
      >
        <Plus className='h-3.5 w-3.5' aria-hidden />
        {t('heroSlides.add')}
      </button>
    </fieldset>
  );
}
