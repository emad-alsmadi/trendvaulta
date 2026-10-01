import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { HeroSlide } from '../../lib/api';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Input, Select, Switch } from '../ui/Field';
import { hintClass, labelClass, text } from '../ui/styles';

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
    <fieldset className='space-y-3'>
      <div className='space-y-1'>
        <legend className={labelClass}>{t('heroSlides.legend')}</legend>
        <p className={hintClass}>{t('heroSlides.hint')}</p>
      </div>

      <div className='space-y-3'>
        {value.map((slide, i) => (
          <div
            key={slide.id}
            className='overflow-hidden rounded-badge border border-border'
          >
            <div className='flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2'>
              <span className={text.cardTitle}>
                {t('heroSlides.slide', { n: i + 1 })}
              </span>
              <div className='flex items-center gap-1'>
                <Switch
                  checked={slide.active !== false}
                  onCheckedChange={(active) => update(i, { active })}
                  label={t('common.active')}
                />
                <span
                  aria-hidden
                  className='mx-1 h-5 w-px bg-border'
                />
                <IconButton
                  icon={<ArrowUp aria-hidden />}
                  label={t('heroSlides.moveUp', { n: i + 1 })}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                />
                <IconButton
                  icon={<ArrowDown aria-hidden />}
                  label={t('heroSlides.moveDown', { n: i + 1 })}
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                />
                <IconButton
                  icon={<Trash2 aria-hidden />}
                  label={t('heroSlides.remove', { n: i + 1 })}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                />
              </div>
            </div>

            <div className='space-y-3 p-3'>
              <div className='grid gap-2 sm:grid-cols-[1fr_1fr_8rem]'>
                <Input
                  aria-label={t('heroSlides.fieldLabel', { n: i + 1, field: t('heroSlides.imageUrl') })}
                  placeholder={t('heroSlides.imageUrl')}
                  dir='ltr'
                  value={slide.imageUrl ?? ''}
                  onChange={(e) => update(i, { imageUrl: e.target.value })}
                />
                <Input
                  aria-label={t('heroSlides.fieldLabel', { n: i + 1, field: t('heroSlides.link') })}
                  placeholder={t('heroSlides.linkPlaceholder')}
                  dir='ltr'
                  value={slide.ctaHref ?? slide.href ?? ''}
                  onChange={(e) => update(i, { ctaHref: e.target.value })}
                />
                <Select
                  aria-label={t('heroSlides.fieldLabel', { n: i + 1, field: t('heroSlides.tone') })}
                  value={slide.tone ?? 'stone'}
                  onChange={(e) =>
                    update(i, { tone: e.target.value as HeroSlide['tone'] })
                  }
                >
                  {TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {tv('tone', tone)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className='grid gap-x-3 gap-y-2 sm:grid-cols-2'>
                <p className={text.caption} lang='en' dir='ltr'>English</p>
                <p className={`${text.caption} hidden sm:block`} lang='ar' dir='rtl'>
                  العربية
                </p>
                {TEXT_FIELDS.map(({ field, label, maxLength }) => (
                  <div key={field} className='contents'>
                    <Input
                      aria-label={t('heroSlides.fieldLabelLang', { n: i + 1, field: t(label), lang: t('heroSlides.english') })}
                      placeholder={field === 'title' ? t('heroSlides.required', { field: t(label) }) : t(label)}
                      lang='en'
                      dir='ltr'
                      maxLength={maxLength}
                      value={slide[field] ?? ''}
                      onChange={(e) => update(i, { [field]: e.target.value } as Partial<HeroSlide>)}
                    />
                    <Input
                      aria-label={t('heroSlides.fieldLabelLang', { n: i + 1, field: t(label), lang: t('heroSlides.arabic') })}
                      placeholder={`${t(label)} (${t('heroSlides.arabic')})`}
                      maxLength={maxLength}
                      lang='ar'
                      dir='rtl'
                      value={slide.translations?.ar?.[field] ?? ''}
                      onChange={(e) => updateArabic(i, field, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        size='sm'
        className='border-dashed shadow-none'
        onClick={() =>
          onChange([
            ...value,
            { id: `slide-${Date.now().toString(36)}`, title: '', tone: 'stone', active: true },
          ])
        }
        icon={<Plus aria-hidden />}
      >
        {t('heroSlides.add')}
      </Button>
    </fieldset>
  );
}
