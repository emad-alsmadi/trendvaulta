import { useMemo, useState } from 'react';
import { Percent, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useAdminOffers,
  useCreateOfferMutation,
  useDeleteOfferMutation,
  useUpdateOfferMutation,
} from '../hooks/useAdminOffers';
import { errorMessage, type AdminOffer, type OfferPayload } from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import {
  DataTable,
  RowActions,
  TableCount,
  type DataTableColumn,
} from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Field, Input, Switch } from '../components/ui/Field';
import { FormActions, FormDialog } from '../components/ui/FormDialog';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { hintClass, labelClass } from '../components/ui/styles';

const emptyForm: OfferPayload = {
  title: '',
  href: '',
  subtitle: '',
  badge: '',
  imageUrl: '',
  translations: { ar: { title: '', subtitle: '', badge: '' } },
  endsAt: '',
  active: true,
  sortOrder: 0,
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function Offers() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatDate, formatNumber } = useT();
  const offersQ = useAdminOffers({ limit: 100 });
  const createMut = useCreateOfferMutation();
  const updateMut = useUpdateOfferMutation();
  const deleteMut = useDeleteOfferMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [form, setForm] = useState<OfferPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = offersQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        (o.subtitle || '').toLowerCase().includes(q) ||
        (o.badge || '').toLowerCase().includes(q) ||
        o.href.toLowerCase().includes(q),
    );
  }, [offersQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(offer: AdminOffer) {
    setEditing(offer);
    setForm({
      title: offer.title,
      href: offer.href,
      subtitle: offer.subtitle || '',
      badge: offer.badge || '',
      imageUrl: offer.imageUrl || '',
      translations: {
        ar: {
          title: offer.translations?.ar?.title || '',
          subtitle: offer.translations?.ar?.subtitle || '',
          badge: offer.translations?.ar?.badge || '',
        },
      },
      endsAt: toDateInput(offer.endsAt),
      active: offer.active,
      sortOrder: offer.sortOrder ?? 0,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.href.trim()) {
      toast.error(t('offers.required'));
      return;
    }

    const payload: OfferPayload = {
      ...form,
      title: form.title.trim(),
      href: form.href.trim(),
      subtitle: (form.subtitle || '').trim(),
      badge: (form.badge || '').trim(),
      imageUrl: (form.imageUrl || '').trim(),
      translations: {
        ar: {
          title: form.translations?.ar?.title?.trim() || '',
          subtitle: form.translations?.ar?.subtitle?.trim() || '',
          badge: form.translations?.ar?.badge?.trim() || '',
        },
      },
      endsAt: form.endsAt ? form.endsAt : null,
      sortOrder: Number(form.sortOrder || 0),
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
      toast.error(errorMessage(err, t('offers.saveFailed')));
    }
  }

  async function handleDelete(offer: AdminOffer) {
    const ok = await confirm({
      message: t('offers.confirmDelete', { title: offer.title }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(offer._id);
    } catch (err) {
      toast.error(errorMessage(err, t('offers.deleteFailed')));
    }
  }

  const columns: DataTableColumn<AdminOffer>[] = [
    {
      key: 'title',
      header: t('offers.columns.title'),
      cell: (offer) => (
        <div className='min-w-0'>
          <p
            className='font-medium text-foreground'
            dir='auto'
          >
            {offer.title}
          </p>
          {offer.subtitle && (
            <p
              className='max-w-[20rem] truncate text-xs text-muted-foreground'
              dir='auto'
            >
              {offer.subtitle}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'badge',
      header: t('offers.columns.badge'),
      cell: (offer) =>
        offer.badge ? (
          <Badge plain>
            <span dir='auto'>{offer.badge}</span>
          </Badge>
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    },
    {
      key: 'href',
      header: t('offers.columns.href'),
      className: 'max-w-[14rem]',
      cell: (offer) => (
        <span
          className='block truncate font-mono text-xs text-muted-foreground'
          dir='ltr'
        >
          {offer.href}
        </span>
      ),
    },
    {
      key: 'endsAt',
      header: t('offers.columns.ends'),
      className: 'whitespace-nowrap',
      cell: (offer) =>
        toDateInput(offer.endsAt)
          ? formatDate(`${toDateInput(offer.endsAt)}T00:00:00`)
          : '—',
    },
    {
      key: 'sortOrder',
      header: t('offers.columns.order'),
      numeric: true,
      cell: (offer) => formatNumber(offer.sortOrder ?? 0),
    },
    {
      key: 'active',
      header: t('common.status'),
      cell: (offer) => (
        <StatusBadge status={offer.active ? 'active' : 'inactive'}>
          {offer.active ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (offer) => (
        <RowActions>
          {can('offers:write') && (
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('common.editItem', { name: offer.title })}
              onClick={() => openEdit(offer)}
            />
          )}
          {can('offers:delete') && (
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('common.deleteItem', { name: offer.title })}
              onClick={() => void handleDelete(offer)}
              disabled={deleteMut.isPending}
            />
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('offers.title')}
        description={t('offers.subtitle')}
        actions={
          can('offers:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('offers.add')}
            </Button>
          )
        }
      />

      {offersQ.isError ? (
        <Alert tone='error'>
          {errorMessage(offersQ.error, t('offers.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('offers.title')}
          data={filtered}
          columns={columns}
          getKey={(offer) => offer._id}
          loading={offersQ.isLoading}
          fetching={offersQ.isFetching}
          emptyIcon={<Percent aria-hidden />}
          emptyTitle={t('offers.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: t('offers.searchPlaceholder'),
                label: t('offers.searchLabel'),
              }}
              canClear={Boolean(search)}
              onClear={() => setSearch('')}
            />
          }
          footer={
            offersQ.data?.meta && (
              <TableCount>
                {t('offers.showing', {
                  shown: formatNumber(filtered.length),
                  total: formatNumber(offersQ.data.meta.total),
                })}
              </TableCount>
            )
          }
        />
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={
            editing ? t('offers.form.editTitle') : t('offers.form.createTitle')
          }
          busy={saving}
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <Field
              label={t('offers.form.title')}
              required
            >
              <Input
                required
                value={form.title}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </Field>
            <Field label={t('offers.form.subtitle')}>
              <Input
                value={form.subtitle || ''}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, subtitle: e.target.value }))
                }
              />
            </Field>
            <Field
              label={t('offers.form.href')}
              required
            >
              <Input
                required
                value={form.href}
                onChange={(e) =>
                  setForm((f) => ({ ...f, href: e.target.value }))
                }
                placeholder='/products?deal=…'
                dir='ltr'
                className='font-mono'
              />
            </Field>
            <Field label={t('offers.form.imageUrl')}>
              <Input
                value={form.imageUrl || ''}
                dir='ltr'
                placeholder='https://'
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
              />
            </Field>
            <div className='grid gap-4 sm:grid-cols-3'>
              <Field label={t('offers.form.badge')}>
                <Input
                  value={form.badge || ''}
                  dir='auto'
                  onChange={(e) =>
                    setForm((f) => ({ ...f, badge: e.target.value }))
                  }
                />
              </Field>
              <Field label={t('offers.form.endsAt')}>
                <Input
                  type='date'
                  value={form.endsAt || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endsAt: e.target.value }))
                  }
                />
              </Field>
              <Field label={t('offers.form.sortOrder')}>
                <Input
                  type='number'
                  value={form.sortOrder ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                />
              </Field>
            </div>

            <fieldset className='space-y-3 border-t border-border pt-4'>
              <div className='space-y-1'>
                <legend className={labelClass}>{t('offers.form.arabicLegend')}</legend>
                <p className={hintClass}>{t('offers.form.arabicHint')}</p>
              </div>
              <Field label={t('offers.form.titleAr')}>
                <Input
                  value={form.translations?.ar?.title || ''}
                  dir='rtl'
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      translations: {
                        ar: { ...f.translations?.ar, title: e.target.value },
                      },
                    }))
                  }
                />
              </Field>
              <Field label={t('offers.form.subtitleAr')}>
                <Input
                  value={form.translations?.ar?.subtitle || ''}
                  dir='rtl'
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      translations: {
                        ar: { ...f.translations?.ar, subtitle: e.target.value },
                      },
                    }))
                  }
                />
              </Field>
              <Field label={t('offers.form.badgeAr')}>
                <Input
                  value={form.translations?.ar?.badge || ''}
                  dir='rtl'
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      translations: {
                        ar: { ...f.translations?.ar, badge: e.target.value },
                      },
                    }))
                  }
                />
              </Field>
            </fieldset>
            <Switch
              checked={!!form.active}
              onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
              label={t('common.active')}
            />
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
