import { useState } from 'react';
import { Gift, Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  useAdminGiftFinderConfigs,
  useCreateGiftFinderConfigMutation,
  useDeleteGiftFinderConfigMutation,
  useUpdateGiftFinderConfigMutation,
} from '../hooks/useAdminGiftFinderConfig';
import {
  errorMessage,
  type AdminGiftFinderConfig,
  type GiftFinderConfigPayload,
  type GiftOption,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { FormActions, FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import {
  DataTable,
  RowActions,
  type DataTableColumn,
} from '../components/ui/DataTable';
import { Input, Switch } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/StatusBadge';
import { text } from '../components/ui/styles';

type Section = 'occasions' | 'recipients' | 'budgets';

const emptyOption: GiftOption = { id: '', label: '', translations: { ar: { label: '' } } };

const emptyForm: GiftFinderConfigPayload = {
  occasions: [{ ...emptyOption }, { ...emptyOption }],
  recipients: [{ ...emptyOption }, { ...emptyOption }],
  budgets: [{ ...emptyOption }, { ...emptyOption }],
  active: true,
};

export default function GiftFinderConfig() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatNumber } = useT();
  // Row names like "Occasion 2", for field labels and remove buttons.
  const optionName = (section: Section, index: number) =>
    t(
      section === 'occasions'
        ? 'giftFinder.form.occasion'
        : section === 'recipients'
          ? 'giftFinder.form.recipient'
          : 'giftFinder.form.budget',
      { n: index + 1 },
    );
  const fieldLabel = (
    section: Section,
    index: number,
    field: 'id' | 'label' | 'labelAr' | 'query' | 'minPrice' | 'maxPrice',
  ) =>
    t('giftFinder.form.fieldLabel', {
      option: optionName(section, index),
      field: t(`giftFinder.form.${field}`),
    });
  const configsQ = useAdminGiftFinderConfigs();
  const createMut = useCreateGiftFinderConfigMutation();
  const updateMut = useUpdateGiftFinderConfigMutation();
  const deleteMut = useDeleteGiftFinderConfigMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminGiftFinderConfig | null>(null);
  const [form, setForm] = useState<GiftFinderConfigPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(config: AdminGiftFinderConfig) {
    setEditing(config);
    setForm({
      occasions: config.occasions,
      recipients: config.recipients,
      budgets: config.budgets,
      active: config.active,
    });
    setOpen(true);
  }

  function updateOption(
    section: Section,
    index: number,
    field: keyof GiftOption,
    value: string | number,
  ) {
    const newSection = [...form[section]];
    newSection[index] = { ...newSection[index], [field]: value };
    setForm((f) => ({ ...f, [section]: newSection }));
  }

  /** Arabic label for one option — same per-item pattern as HeroSlidesEditor's updateArabic. */
  function updateArabicLabel(section: Section, index: number, label: string) {
    const option = form[section][index];
    const newSection = [...form[section]];
    newSection[index] = {
      ...option,
      translations: { ...option.translations, ar: { ...option.translations?.ar, label } },
    };
    setForm((f) => ({ ...f, [section]: newSection }));
  }

  function addOption(section: Section) {
    setForm((f) => ({ ...f, [section]: [...f[section], { ...emptyOption }] }));
  }

  function removeOption(section: Section, index: number) {
    if (form[section].length <= 1) return;
    const newSection = form[section].filter((_, i) => i !== index);
    setForm((f) => ({ ...f, [section]: newSection }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const hasEmptyOccasion = form.occasions.some(
      (o) => !o.id.trim() || !o.label.trim(),
    );
    const hasEmptyRecipient = form.recipients.some(
      (r) => !r.id.trim() || !r.label.trim(),
    );
    const hasEmptyBudget = form.budgets.some(
      (b) => !b.id.trim() || !b.label.trim(),
    );

    if (hasEmptyOccasion || hasEmptyRecipient || hasEmptyBudget) {
      toast.error(t('giftFinder.emptyOption'));
      return;
    }

    const clean = (o: GiftOption): GiftOption => ({
      ...o,
      id: o.id.trim(),
      label: o.label.trim(),
      translations: { ar: { label: o.translations?.ar?.label?.trim() || '' } },
      q: o.q?.trim(),
      category: o.category?.trim(),
      minPrice: o.minPrice !== undefined ? Number(o.minPrice) : undefined,
      maxPrice: o.maxPrice !== undefined ? Number(o.maxPrice) : undefined,
    });

    const payload: GiftFinderConfigPayload = {
      occasions: form.occasions.map(clean),
      recipients: form.recipients.map(clean),
      budgets: form.budgets.map(clean),
      active: !!form.active,
    };

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err, t('giftFinder.saveFailed')));
    }
  }

  async function handleDelete(config: AdminGiftFinderConfig) {
    const ok = await confirm({
      message: t('giftFinder.confirmDelete'),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(config._id);
    } catch (err) {
      toast.error(errorMessage(err, t('giftFinder.deleteFailed')));
    }
  }

  const optionPreview = (options: GiftOption[]) => (
    <div className='min-w-0'>
      <p className='font-medium tabular-nums text-foreground'>
        {t('giftFinder.optionCount', { count: formatNumber(options.length) })}
      </p>
      <p
        className='max-w-[14rem] truncate text-xs text-muted-foreground'
        dir='auto'
      >
        {options.map((o) => o.label).join(' · ')}
      </p>
    </div>
  );

  const columns: DataTableColumn<AdminGiftFinderConfig>[] = [
    {
      key: 'occasions',
      header: t('giftFinder.columns.occasions'),
      cell: (config) => optionPreview(config.occasions),
    },
    {
      key: 'recipients',
      header: t('giftFinder.columns.recipients'),
      cell: (config) => optionPreview(config.recipients),
    },
    {
      key: 'budgets',
      header: t('giftFinder.columns.budgets'),
      cell: (config) => optionPreview(config.budgets),
    },
    {
      key: 'active',
      header: t('common.status'),
      cell: (config) => (
        <StatusBadge status={config.active ? 'active' : 'inactive'}>
          {config.active ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (config) => (
        <RowActions>
          {can('content:write') && (
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('giftFinder.editConfig')}
              onClick={() => openEdit(config)}
            />
          )}
          {can('content:delete') && (
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('giftFinder.deleteConfig')}
              onClick={() => void handleDelete(config)}
              disabled={deleteMut.isPending}
            />
          )}
        </RowActions>
      ),
    },
  ];

  /** One editable list of options (occasions, recipients or budgets). */
  const renderSection = (
    section: Section,
    title: string,
    addLabel: string,
  ) => (
    <section
      aria-labelledby={`gf-${section}`}
      className='space-y-2 border-t border-border pt-5 first:border-0 first:pt-0'
    >
      <h3
        id={`gf-${section}`}
        className={text.cardTitle}
      >
        {title}
      </h3>
      <ol className='space-y-2'>
        {form[section].map((option, index) => (
          <li
            key={index}
            className='flex flex-wrap items-center gap-2 sm:flex-nowrap'
          >
            <Input
              required
              value={option.id}
              onChange={(e) =>
                updateOption(section, index, 'id', e.target.value)
              }
              placeholder={t('giftFinder.form.id')}
              aria-label={fieldLabel(section, index, 'id')}
              dir='ltr'
              className='font-mono sm:w-36'
            />
            <Input
              required
              value={option.label}
              onChange={(e) =>
                updateOption(section, index, 'label', e.target.value)
              }
              placeholder={t('giftFinder.form.label')}
              aria-label={fieldLabel(section, index, 'label')}
              dir='auto'
              className='min-w-0 flex-1'
            />
            <Input
              value={option.translations?.ar?.label || ''}
              onChange={(e) => updateArabicLabel(section, index, e.target.value)}
              placeholder={t('giftFinder.form.labelAr')}
              aria-label={fieldLabel(section, index, 'labelAr')}
              dir='rtl'
              className='min-w-0 flex-1'
            />
            {section === 'budgets' ? (
              <>
                <Input
                  type='number'
                  value={option.minPrice || ''}
                  onChange={(e) =>
                    updateOption(section, index, 'minPrice', e.target.value)
                  }
                  placeholder={t('giftFinder.form.minPrice')}
                  aria-label={fieldLabel(section, index, 'minPrice')}
                  className='w-28'
                />
                <Input
                  type='number'
                  value={option.maxPrice || ''}
                  onChange={(e) =>
                    updateOption(section, index, 'maxPrice', e.target.value)
                  }
                  placeholder={t('giftFinder.form.maxPrice')}
                  aria-label={fieldLabel(section, index, 'maxPrice')}
                  className='w-28'
                />
              </>
            ) : (
              <Input
                value={option.q || ''}
                onChange={(e) =>
                  updateOption(section, index, 'q', e.target.value)
                }
                placeholder={t('giftFinder.form.query')}
                aria-label={fieldLabel(section, index, 'query')}
                dir='auto'
                className='min-w-0 flex-1'
              />
            )}
            <IconButton
              icon={<X aria-hidden />}
              label={t('giftFinder.form.removeOption', {
                option: optionName(section, index),
              })}
              size='md'
              onClick={() => removeOption(section, index)}
              disabled={form[section].length <= 1}
            />
          </li>
        ))}
      </ol>
      <Button
        size='sm'
        className='border-dashed shadow-none'
        onClick={() => addOption(section)}
        icon={<Plus aria-hidden />}
      >
        {addLabel.replace(/^\+\s*/, '')}
      </Button>
    </section>
  );

  return (
    <>
      <PageHeader
        title={t('giftFinder.title')}
        description={t('giftFinder.subtitle')}
        actions={
          can('content:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('giftFinder.add')}
            </Button>
          )
        }
      />

      {configsQ.isError ? (
        <Alert tone='error'>
          {errorMessage(configsQ.error, t('giftFinder.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('giftFinder.title')}
          data={configsQ.data?.data || []}
          columns={columns}
          getKey={(config) => config._id}
          loading={configsQ.isLoading}
          fetching={configsQ.isFetching}
          emptyIcon={<Gift aria-hidden />}
          emptyTitle={t('giftFinder.empty')}
        />
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={
            editing
              ? t('giftFinder.form.editTitle')
              : t('giftFinder.form.createTitle')
          }
          busy={saving}
          size='editor'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-5'
          >
            {renderSection(
              'occasions',
              t('giftFinder.form.occasions'),
              t('giftFinder.form.addOccasion'),
            )}
            {renderSection(
              'recipients',
              t('giftFinder.form.recipients'),
              t('giftFinder.form.addRecipient'),
            )}
            {renderSection(
              'budgets',
              t('giftFinder.form.budgets'),
              t('giftFinder.form.addBudget'),
            )}
            <div className='border-t border-border pt-5'>
              <Switch
                checked={!!form.active}
                onCheckedChange={(active) =>
                  setForm((f) => ({ ...f, active }))
                }
                label={t('giftFinder.form.activeOnly')}
              />
            </div>
            <FormActions
              onCancel={() => setOpen(false)}
              saving={saving}
              submitLabel={editing ? t('common.save') : t('common.create')}
            />
          </form>
        </FormDialog>
      )}
    </>
  );
}
