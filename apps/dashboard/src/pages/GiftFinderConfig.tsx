import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';

const emptyOption: GiftOption = { id: '', label: '' };

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
  const optionName = (section: 'occasions' | 'recipients' | 'budgets', index: number) =>
    t(
      section === 'occasions'
        ? 'giftFinder.form.occasion'
        : section === 'recipients'
          ? 'giftFinder.form.recipient'
          : 'giftFinder.form.budget',
      { n: index + 1 },
    );
  const fieldLabel = (
    section: 'occasions' | 'recipients' | 'budgets',
    index: number,
    field: 'id' | 'label' | 'query' | 'minPrice' | 'maxPrice',
  ) => t('giftFinder.form.fieldLabel', { option: optionName(section, index), field: t(`giftFinder.form.${field}`) });
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
    section: 'occasions' | 'recipients' | 'budgets',
    index: number,
    field: keyof GiftOption,
    value: string | number,
  ) {
    const newSection = [...form[section]];
    newSection[index] = { ...newSection[index], [field]: value };
    setForm((f) => ({ ...f, [section]: newSection }));
  }

  function addOption(section: 'occasions' | 'recipients' | 'budgets') {
    setForm((f) => ({ ...f, [section]: [...f[section], { ...emptyOption }] }));
  }

  function removeOption(
    section: 'occasions' | 'recipients' | 'budgets',
    index: number,
  ) {
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

    const payload: GiftFinderConfigPayload = {
      occasions: form.occasions.map((o) => ({
        ...o,
        id: o.id.trim(),
        label: o.label.trim(),
        q: o.q?.trim(),
        category: o.category?.trim(),
        minPrice: o.minPrice !== undefined ? Number(o.minPrice) : undefined,
        maxPrice: o.maxPrice !== undefined ? Number(o.maxPrice) : undefined,
      })),
      recipients: form.recipients.map((r) => ({
        ...r,
        id: r.id.trim(),
        label: r.label.trim(),
        q: r.q?.trim(),
        category: r.category?.trim(),
        minPrice: r.minPrice !== undefined ? Number(r.minPrice) : undefined,
        maxPrice: r.maxPrice !== undefined ? Number(r.maxPrice) : undefined,
      })),
      budgets: form.budgets.map((b) => ({
        ...b,
        id: b.id.trim(),
        label: b.label.trim(),
        q: b.q?.trim(),
        category: b.category?.trim(),
        minPrice: b.minPrice !== undefined ? Number(b.minPrice) : undefined,
        maxPrice: b.maxPrice !== undefined ? Number(b.maxPrice) : undefined,
      })),
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
    const ok = await confirm({ message: t('giftFinder.confirmDelete'), danger: true, confirmLabel: t('common.delete') });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(config._id);
    } catch (err) {
      toast.error(errorMessage(err, t('giftFinder.deleteFailed')));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            {t('giftFinder.title')}
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            {t('giftFinder.subtitle')}
          </p>
        </div>
        {can('content:write') && (
          <button
            type='button'
            onClick={openCreate}
            className='inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
          >
            <Plus className='me-2 h-5 w-5' aria-hidden />
            {t('giftFinder.add')}
          </button>
        )}
      </div>

      {configsQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          {t('giftFinder.loading')}
        </p>
      )}

      {configsQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(configsQ.error, t('giftFinder.loadFailed'))}
        </div>
      )}

      {!configsQ.isLoading && !configsQ.isError && (
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[800px]'>
              <thead className='bg-gray-50 dark:bg-gray-700'>
                <tr>
                  {[
                    t('giftFinder.columns.occasions'),
                    t('giftFinder.columns.recipients'),
                    t('giftFinder.columns.budgets'),
                    t('common.status'),
                    t('common.actions'),
                  ].map((h) => (
                    <th
                      key={h}
                      className='px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300'
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {configsQ.data?.data?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className='px-4 py-10 text-center text-sm text-gray-500'
                    >
                      {t('giftFinder.empty')}
                    </td>
                  </tr>
                ) : (
                  configsQ.data?.data?.map((config) => (
                    <tr
                      key={config._id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700/60'
                    >
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {t('giftFinder.optionCount', { count: formatNumber(config.occasions.length) })}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {t('giftFinder.optionCount', { count: formatNumber(config.recipients.length) })}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                        {t('giftFinder.optionCount', { count: formatNumber(config.budgets.length) })}
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            config.active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {config.active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex gap-1'>
                          {can('content:write') && (
                            <button
                              type='button'
                              onClick={() => openEdit(config)}
                              className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600'
                              aria-label={t('giftFinder.editConfig')}
                            >
                              <Pencil className='h-4 w-4 text-gray-500' aria-hidden />
                            </button>
                          )}
                          {can('content:delete') && (
                            <button
                              type='button'
                              onClick={() => void handleDelete(config)}
                              disabled={deleteMut.isPending}
                              className='rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40'
                              aria-label={t('giftFinder.deleteConfig')}
                            >
                              <Trash2 className='h-4 w-4 text-red-500' aria-hidden />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={editing
            ? t('giftFinder.form.editTitle')
            : t('giftFinder.form.createTitle')}
          busy={saving}
          maxWidthClass='max-w-3xl'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <div>
              <span className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                {t('giftFinder.form.occasions')}
              </span>
              {form.occasions.map((option, index) => (
                <div
                  key={index}
                  className='mb-2 flex gap-2'
                >
                  <input
                    required
                    value={option.id}
                    onChange={(e) =>
                      updateOption('occasions', index, 'id', e.target.value)
                    }
                    placeholder={t('giftFinder.form.id')}
                    aria-label={fieldLabel('occasions', index, 'id')}
                    dir='ltr'
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  <input
                    required
                    value={option.label}
                    onChange={(e) =>
                      updateOption(
                        'occasions',
                        index,
                        'label',
                        e.target.value,
                      )
                    }
                    placeholder={t('giftFinder.form.label')}
                    aria-label={fieldLabel('occasions', index, 'label')}
                    dir='auto'
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  <input
                    value={option.q || ''}
                    onChange={(e) =>
                      updateOption('occasions', index, 'q', e.target.value)
                    }
                    placeholder={t('giftFinder.form.query')}
                    aria-label={fieldLabel('occasions', index, 'query')}
                    dir='auto'
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  {form.occasions.length > 1 && (
                    <button
                      type='button'
                      onClick={() => removeOption('occasions', index)}
                      aria-label={t('giftFinder.form.removeOption', { option: optionName('occasions', index) })}
                      className='rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400'
                    >
                      {t('giftFinder.form.remove')}
                    </button>
                  )}
                </div>
              ))}
              <button
                type='button'
                onClick={() => addOption('occasions')}
                className='mt-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
              >
                {t('giftFinder.form.addOccasion')}
              </button>
            </div>

            <div>
              <span className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                {t('giftFinder.form.recipients')}
              </span>
              {form.recipients.map((option, index) => (
                <div
                  key={index}
                  className='mb-2 flex gap-2'
                >
                  <input
                    required
                    value={option.id}
                    onChange={(e) =>
                      updateOption('recipients', index, 'id', e.target.value)
                    }
                    placeholder={t('giftFinder.form.id')}
                    aria-label={fieldLabel('recipients', index, 'id')}
                    dir='ltr'
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  <input
                    required
                    value={option.label}
                    onChange={(e) =>
                      updateOption(
                        'recipients',
                        index,
                        'label',
                        e.target.value,
                      )
                    }
                    placeholder={t('giftFinder.form.label')}
                    aria-label={fieldLabel('recipients', index, 'label')}
                    dir='auto'
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  <input
                    value={option.q || ''}
                    onChange={(e) =>
                      updateOption('recipients', index, 'q', e.target.value)
                    }
                    placeholder={t('giftFinder.form.query')}
                    aria-label={fieldLabel('recipients', index, 'query')}
                    dir='auto'
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  {form.recipients.length > 1 && (
                    <button
                      type='button'
                      onClick={() => removeOption('recipients', index)}
                      aria-label={t('giftFinder.form.removeOption', { option: optionName('recipients', index) })}
                      className='rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400'
                    >
                      {t('giftFinder.form.remove')}
                    </button>
                  )}
                </div>
              ))}
              <button
                type='button'
                onClick={() => addOption('recipients')}
                className='mt-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
              >
                {t('giftFinder.form.addRecipient')}
              </button>
            </div>

            <div>
              <span className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                {t('giftFinder.form.budgets')}
              </span>
              {form.budgets.map((option, index) => (
                <div
                  key={index}
                  className='mb-2 flex gap-2'
                >
                  <input
                    required
                    value={option.id}
                    onChange={(e) =>
                      updateOption('budgets', index, 'id', e.target.value)
                    }
                    placeholder={t('giftFinder.form.id')}
                    aria-label={fieldLabel('budgets', index, 'id')}
                    dir='ltr'
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  <input
                    required
                    value={option.label}
                    onChange={(e) =>
                      updateOption('budgets', index, 'label', e.target.value)
                    }
                    placeholder={t('giftFinder.form.label')}
                    aria-label={fieldLabel('budgets', index, 'label')}
                    dir='auto'
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  <input
                    type='number'
                    value={option.minPrice || ''}
                    onChange={(e) =>
                      updateOption(
                        'budgets',
                        index,
                        'minPrice',
                        e.target.value,
                      )
                    }
                    placeholder={t('giftFinder.form.minPrice')}
                    aria-label={fieldLabel('budgets', index, 'minPrice')}
                    className='w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  <input
                    type='number'
                    value={option.maxPrice || ''}
                    onChange={(e) =>
                      updateOption(
                        'budgets',
                        index,
                        'maxPrice',
                        e.target.value,
                      )
                    }
                    placeholder={t('giftFinder.form.maxPrice')}
                    aria-label={fieldLabel('budgets', index, 'maxPrice')}
                    className='w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  />
                  {form.budgets.length > 1 && (
                    <button
                      type='button'
                      onClick={() => removeOption('budgets', index)}
                      aria-label={t('giftFinder.form.removeOption', { option: optionName('budgets', index) })}
                      className='rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400'
                    >
                      {t('giftFinder.form.remove')}
                    </button>
                  )}
                </div>
              ))}
              <button
                type='button'
                onClick={() => addOption('budgets')}
                className='mt-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
              >
                {t('giftFinder.form.addBudget')}
              </button>
            </div>

            <label className='flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
              <input
                type='checkbox'
                checked={!!form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              {t('giftFinder.form.activeOnly')}
            </label>

            <div className='flex justify-end gap-2 pt-2'>
              <button
                type='button'
                disabled={saving}
                onClick={() => setOpen(false)}
                className='rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              >
                {t('common.cancel')}
              </button>
              <button
                type='submit'
                disabled={saving}
                className='rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60'
              >
                {saving ? t('common.saving') : editing ? t('common.save') : t('common.create')}
              </button>
            </div>
          </form>
        </FormDialog>
      )}
    </motion.div>
  );
}
