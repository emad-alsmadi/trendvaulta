import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  useAdminShippingZones,
  useCreateShippingZoneMutation,
  useDeleteShippingZoneMutation,
  useUpdateShippingZoneMutation,
} from '../hooks/useAdminShippingZones';
import {
  errorMessage,
  type AdminShippingZone,
  type ShippingZonePayload,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/en';

/** Method row as edited in the form (numbers kept as strings until save). */
type MethodForm = {
  name: string;
  handle: string;
  description: string;
  priceUsd: string;
  estimatedDaysMin: string;
  estimatedDaysMax: string;
  isActive: boolean;
};

type ZoneForm = {
  name: string;
  countries: string;
  regionPattern: string;
  postalCodePattern: string;
  isActive: boolean;
  sortOrder: number;
  methods: MethodForm[];
};

const emptyMethod: MethodForm = {
  name: '',
  handle: '',
  description: '',
  priceUsd: '0',
  estimatedDaysMin: '1',
  estimatedDaysMax: '5',
  isActive: true,
};

const emptyForm: ZoneForm = {
  name: '',
  countries: '',
  regionPattern: '',
  postalCodePattern: '',
  isActive: true,
  sortOrder: 0,
  methods: [{ ...emptyMethod, name: 'Standard', handle: 'standard' }],
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white';

type ZoneError = { error: MessageKey; vars?: Record<string, string | number> };

/** Build the API payload, or return the problem as a message key + values. */
function toPayload(form: ZoneForm): ShippingZonePayload | ZoneError {
  const name = form.name.trim();
  if (!name) return { error: 'shippingZones.errors.nameRequired' };

  const countries = form.countries
    .split(/[\s,]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const badCountry = countries.find((c) => !/^[A-Z]{2}$/.test(c));
  if (badCountry) {
    return { error: 'shippingZones.errors.badCountry', vars: { code: badCountry } };
  }

  for (const [error, pattern] of [
    ['shippingZones.errors.badRegion', form.regionPattern],
    ['shippingZones.errors.badPostal', form.postalCodePattern],
  ] as const) {
    if (!pattern.trim()) continue;
    try {
      new RegExp(pattern.trim(), 'i');
    } catch {
      return { error };
    }
  }

  const handles = new Set<string>();
  const methods: ShippingZonePayload['methods'] = [];
  for (const [index, m] of form.methods.entries()) {
    const handle = m.handle.trim().toLowerCase();
    const n = index + 1;
    if (!m.name.trim() || !handle) return { error: 'shippingZones.errors.methodRequired', vars: { n } };
    if (handles.has(handle)) return { error: 'shippingZones.errors.methodDuplicate', vars: { n, handle } };
    handles.add(handle);
    const priceUsd = Number(m.priceUsd);
    if (!Number.isFinite(priceUsd) || priceUsd < 0) {
      return { error: 'shippingZones.errors.methodPrice', vars: { n } };
    }
    const min = Number(m.estimatedDaysMin);
    const max = Number(m.estimatedDaysMax);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min) {
      return { error: 'shippingZones.errors.methodDays', vars: { n } };
    }
    methods.push({
      name: m.name.trim(),
      handle,
      description: m.description.trim(),
      priceUsd,
      estimatedDaysMin: min,
      estimatedDaysMax: max,
      isActive: m.isActive,
      sortOrder: index,
    });
  }

  return {
    name,
    countries,
    regionPattern: form.regionPattern.trim(),
    postalCodePattern: form.postalCodePattern.trim(),
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder || 0),
    methods,
  };
}

export default function ShippingZones() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatCurrency, formatNumber } = useT();
  const zonesQ = useAdminShippingZones({ limit: 100 });
  const createMut = useCreateShippingZoneMutation();
  const updateMut = useUpdateShippingZoneMutation();
  const deleteMut = useDeleteShippingZoneMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminShippingZone | null>(null);
  const [form, setForm] = useState<ZoneForm>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;
  const canWrite = can('shipping:write');

  const filtered = useMemo(() => {
    const list = zonesQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.countries.some((c) => c.toLowerCase().includes(q)),
    );
  }, [zonesQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      methods: emptyForm.methods.map((m) => ({ ...m })),
    });
    setOpen(true);
  }

  function openEdit(zone: AdminShippingZone) {
    setEditing(zone);
    setForm({
      name: zone.name,
      countries: zone.countries.join(', '),
      regionPattern: zone.regionPattern || '',
      postalCodePattern: zone.postalCodePattern || '',
      isActive: zone.isActive,
      sortOrder: zone.sortOrder ?? 0,
      methods: [...zone.methods]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((m) => ({
          name: m.name,
          handle: m.handle,
          description: m.description || '',
          priceUsd: String(m.priceUsd ?? 0),
          estimatedDaysMin: String(m.estimatedDaysMin ?? 1),
          estimatedDaysMax: String(m.estimatedDaysMax ?? 5),
          isActive: m.isActive !== false,
        })),
    });
    setOpen(true);
  }

  function updateMethod(index: number, patch: Partial<MethodForm>) {
    setForm((f) => ({
      ...f,
      methods: f.methods.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = toPayload(form);
    if ('error' in payload) {
      toast.error(t(payload.error, payload.vars));
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload });
        toast.success(t('shippingZones.updated'));
      } else {
        await createMut.mutateAsync(payload);
        toast.success(t('shippingZones.created'));
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err, t('shippingZones.saveFailed')));
    }
  }

  async function handleDelete(zone: AdminShippingZone) {
    const ok = await confirm({
      message: t('shippingZones.confirmDelete', { name: zone.name }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(zone._id);
    } catch (err) {
      toast.error(errorMessage(err, t('shippingZones.deleteFailed')));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('shippingZones.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('shippingZones.subtitle')}
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            <Plus className="me-2 h-5 w-5" aria-hidden />
            {t('shippingZones.add')}
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="search"
          aria-label={t('shippingZones.searchLabel')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('shippingZones.searchPlaceholder')}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {zonesQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          {t('shippingZones.loading')}
        </p>
      )}

      {zonesQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(zonesQ.error, t('shippingZones.loadFailed'))}
        </div>
      )}

      {!zonesQ.isLoading && !zonesQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[
                    t('shippingZones.columns.name'),
                    t('shippingZones.columns.countries'),
                    t('shippingZones.columns.methods'),
                    t('shippingZones.columns.order'),
                    t('common.status'),
                    t('common.actions'),
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                      {t('shippingZones.empty')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((zone) => (
                    <tr key={zone._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white" dir="auto">
                        {zone.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {zone.countries.length ? <span dir="ltr">{zone.countries.join(', ')}</span> : t('shippingZones.allCountries')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {zone.methods.length === 0
                          ? '—'
                          : zone.methods
                              .map(
                                (m) =>
                                  `${m.name} (${formatCurrency(Number(m.priceUsd))})${m.isActive === false ? t('shippingZones.methodOff') : ''}`,
                              )
                              .join(', ')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatNumber(zone.sortOrder ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            zone.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {zone.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canWrite && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(zone)}
                              className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600"
                              aria-label={t('common.editItem', { name: zone.name })}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(zone)}
                              disabled={deleteMut.isPending}
                              className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label={t('common.deleteItem', { name: zone.name })}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" aria-hidden />
                            </button>
                          </div>
                        )}
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
          title={editing ? t('shippingZones.form.editTitle') : t('shippingZones.form.createTitle')}
          busy={saving}
          maxWidthClass="max-w-2xl"
        >

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('shippingZones.form.name')}
              </span>
              <input
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('shippingZones.form.namePlaceholder')}
                dir="auto"
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('shippingZones.form.countries')}
              </span>
              <input
                value={form.countries}
                onChange={(e) => setForm((f) => ({ ...f, countries: e.target.value }))}
                placeholder="AE, SA, KW"
                dir="ltr"
                className={`${inputClass} font-mono uppercase`}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('shippingZones.form.region')}
                </span>
                <input
                  maxLength={200}
                  value={form.regionPattern}
                  onChange={(e) => setForm((f) => ({ ...f, regionPattern: e.target.value }))}
                  placeholder="^(dubai|sharjah)$"
                  dir="ltr"
                  className={`${inputClass} font-mono`}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('shippingZones.form.postal')}
                </span>
                <input
                  maxLength={200}
                  value={form.postalCodePattern}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, postalCodePattern: e.target.value }))
                  }
                  placeholder="^9\d{4}$"
                  dir="ltr"
                  className={`${inputClass} font-mono`}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  {t('shippingZones.form.order')}
                </span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                {t('common.active')}
              </label>
            </div>

            <fieldset className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-white">
                {t('shippingZones.form.methods')}
              </legend>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                {t('shippingZones.form.methodsHint')}
              </p>
              <div className="space-y-3">
                {form.methods.map((m, index) => (
                  <div
                    key={index}
                    className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40"
                  >
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                          {t('shippingZones.form.methodName')}
                        </span>
                        <input
                          value={m.name}
                          dir="auto"
                          maxLength={100}
                          onChange={(e) => updateMethod(index, { name: e.target.value })}
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                          {t('shippingZones.form.handle')}
                        </span>
                        <input
                          value={m.handle}
                          dir="ltr"
                          maxLength={50}
                          onChange={(e) => updateMethod(index, { handle: e.target.value })}
                          className={`${inputClass} font-mono`}
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                          {t('shippingZones.form.price')}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={m.priceUsd}
                          onChange={(e) => updateMethod(index, { priceUsd: e.target.value })}
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                          {t('shippingZones.form.minDays')}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={m.estimatedDaysMin}
                          onChange={(e) =>
                            updateMethod(index, { estimatedDaysMin: e.target.value })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                          {t('shippingZones.form.maxDays')}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={m.estimatedDaysMax}
                          onChange={(e) =>
                            updateMethod(index, { estimatedDaysMax: e.target.value })
                          }
                          className={inputClass}
                        />
                      </label>
                      <div className="flex items-end justify-between gap-2 pb-2">
                        <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={m.isActive}
                            onChange={(e) =>
                              updateMethod(index, { isActive: e.target.checked })
                            }
                          />
                          {t('common.active')}
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              methods: f.methods.filter((_, i) => i !== index),
                            }))
                          }
                          className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                          aria-label={t('shippingZones.form.removeMethod', { name: m.name || index + 1 })}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <label className="mt-2 block text-xs">
                      <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                        {t('shippingZones.form.description')}
                      </span>
                      <input
                        value={m.description}
                        dir="auto"
                        maxLength={500}
                        onChange={(e) => updateMethod(index, { description: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, methods: [...f.methods, { ...emptyMethod }] }))
                }
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t('shippingZones.form.addMethod')}
              </button>
            </fieldset>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
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
