import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
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
import { FormActions, FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/en';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import {
  DataTable,
  RowActions,
  type DataTableColumn,
} from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Field, Input, Switch } from '../components/ui/Field';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { hintClass, text } from '../components/ui/styles';

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
      confirmLabel: t('shippingZones.deactivate'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(zone._id);
    } catch (err) {
      toast.error(errorMessage(err, t('shippingZones.deleteFailed')));
    }
  }

  const columns: DataTableColumn<AdminShippingZone>[] = [
    {
      key: 'name',
      header: t('shippingZones.columns.name'),
      cell: (zone) => (
        <span
          className='font-medium text-foreground'
          dir='auto'
        >
          {zone.name}
        </span>
      ),
    },
    {
      key: 'countries',
      header: t('shippingZones.columns.countries'),
      cell: (zone) =>
        zone.countries.length ? (
          <div
            className='flex max-w-[16rem] flex-wrap gap-1'
            dir='ltr'
          >
            {zone.countries.map((c) => (
              <Badge
                key={c}
                plain
                className='font-mono'
              >
                {c}
              </Badge>
            ))}
          </div>
        ) : (
          <span className='text-muted-foreground'>
            {t('shippingZones.allCountries')}
          </span>
        ),
    },
    {
      key: 'methods',
      header: t('shippingZones.columns.methods'),
      cell: (zone) =>
        zone.methods.length === 0 ? (
          <span className='text-muted-foreground'>—</span>
        ) : (
          <ul className='space-y-0.5 text-body-sm'>
            {zone.methods.map((m) => (
              <li
                key={m.handle}
                className={
                  m.isActive === false
                    ? 'text-muted-foreground line-through'
                    : undefined
                }
              >
                <span dir='auto'>{m.name}</span>{' '}
                <span className='tabular-nums text-muted-foreground'>
                  {formatCurrency(Number(m.priceUsd))}
                </span>
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: 'sortOrder',
      header: t('shippingZones.columns.order'),
      numeric: true,
      cell: (zone) => formatNumber(zone.sortOrder ?? 0),
    },
    {
      key: 'isActive',
      header: t('common.status'),
      cell: (zone) => (
        <StatusBadge status={zone.isActive ? 'active' : 'inactive'}>
          {zone.isActive ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (zone) =>
        canWrite && (
          <RowActions>
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('common.editItem', { name: zone.name })}
              onClick={() => openEdit(zone)}
            />
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('common.deactivateItem', { name: zone.name })}
              onClick={() => void handleDelete(zone)}
              disabled={deleteMut.isPending}
            />
          </RowActions>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('shippingZones.title')}
        description={t('shippingZones.subtitle')}
        actions={
          canWrite && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('shippingZones.add')}
            </Button>
          )
        }
      />

      {zonesQ.isError ? (
        <Alert tone='error'>
          {errorMessage(zonesQ.error, t('shippingZones.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('shippingZones.title')}
          data={filtered}
          columns={columns}
          getKey={(zone) => zone._id}
          loading={zonesQ.isLoading}
          fetching={zonesQ.isFetching}
          emptyIcon={<Truck aria-hidden />}
          emptyTitle={t('shippingZones.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: t('shippingZones.searchPlaceholder'),
                label: t('shippingZones.searchLabel'),
              }}
              canClear={Boolean(search)}
              onClear={() => setSearch('')}
            />
          }
        />
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={
            editing
              ? t('shippingZones.form.editTitle')
              : t('shippingZones.form.createTitle')
          }
          busy={saving}
          size='editor'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-5'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('shippingZones.form.name')}
                required
              >
                <Input
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder={t('shippingZones.form.namePlaceholder')}
                  dir='auto'
                />
              </Field>
              <Field label={t('shippingZones.form.countries')}>
                <Input
                  value={form.countries}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, countries: e.target.value }))
                  }
                  placeholder='AE, SA, KW'
                  dir='ltr'
                  className='font-mono uppercase'
                />
              </Field>
              <Field label={t('shippingZones.form.region')}>
                <Input
                  maxLength={200}
                  value={form.regionPattern}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, regionPattern: e.target.value }))
                  }
                  placeholder='^(dubai|sharjah)$'
                  dir='ltr'
                  className='font-mono'
                />
              </Field>
              <Field label={t('shippingZones.form.postal')}>
                <Input
                  maxLength={200}
                  value={form.postalCodePattern}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      postalCodePattern: e.target.value,
                    }))
                  }
                  placeholder='^9\d{4}$'
                  dir='ltr'
                  className='font-mono'
                />
              </Field>
              <Field label={t('shippingZones.form.order')}>
                <Input
                  type='number'
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <div className='flex items-end pb-1'>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(isActive) =>
                    setForm((f) => ({ ...f, isActive }))
                  }
                  label={t('common.active')}
                />
              </div>
            </div>

            <section
              aria-labelledby='zone-methods'
              className='space-y-3 border-t border-border pt-5'
            >
              <div className='space-y-1'>
                <h3
                  id='zone-methods'
                  className={text.cardTitle}
                >
                  {t('shippingZones.form.methods')}
                </h3>
                <p className={hintClass}>{t('shippingZones.form.methodsHint')}</p>
              </div>
              <div className='space-y-3'>
                {form.methods.map((m, index) => (
                  <div
                    key={index}
                    className='rounded-badge border border-border bg-muted/40 p-4'
                  >
                    <div className='mb-3 flex items-center justify-between gap-2'>
                      <Switch
                        checked={m.isActive}
                        onCheckedChange={(isActive) =>
                          updateMethod(index, { isActive })
                        }
                        label={
                          <span className='font-medium'>
                            {m.name || `#${index + 1}`}
                          </span>
                        }
                      />
                      <IconButton
                        icon={<Trash2 aria-hidden />}
                        label={t('shippingZones.form.removeMethod', {
                          name: m.name || index + 1,
                        })}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            methods: f.methods.filter((_, i) => i !== index),
                          }))
                        }
                      />
                    </div>
                    <div className='grid gap-3 sm:grid-cols-3'>
                      <Field label={t('shippingZones.form.methodName')}>
                        <Input
                          value={m.name}
                          dir='auto'
                          maxLength={100}
                          onChange={(e) =>
                            updateMethod(index, { name: e.target.value })
                          }
                        />
                      </Field>
                      <Field label={t('shippingZones.form.handle')}>
                        <Input
                          value={m.handle}
                          dir='ltr'
                          maxLength={50}
                          onChange={(e) =>
                            updateMethod(index, { handle: e.target.value })
                          }
                          className='font-mono'
                        />
                      </Field>
                      <Field label={t('shippingZones.form.price')}>
                        <Input
                          type='number'
                          min={0}
                          step='0.01'
                          value={m.priceUsd}
                          onChange={(e) =>
                            updateMethod(index, { priceUsd: e.target.value })
                          }
                        />
                      </Field>
                      <Field label={t('shippingZones.form.minDays')}>
                        <Input
                          type='number'
                          min={0}
                          step={1}
                          value={m.estimatedDaysMin}
                          onChange={(e) =>
                            updateMethod(index, {
                              estimatedDaysMin: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label={t('shippingZones.form.maxDays')}>
                        <Input
                          type='number'
                          min={0}
                          step={1}
                          value={m.estimatedDaysMax}
                          onChange={(e) =>
                            updateMethod(index, {
                              estimatedDaysMax: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label={t('shippingZones.form.description')}>
                        <Input
                          value={m.description}
                          dir='auto'
                          maxLength={500}
                          onChange={(e) =>
                            updateMethod(index, { description: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size='sm'
                className='border-dashed shadow-none'
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    methods: [...f.methods, { ...emptyMethod }],
                  }))
                }
                icon={<Plus aria-hidden />}
              >
                {t('shippingZones.form.addMethod')}
              </Button>
            </section>

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
