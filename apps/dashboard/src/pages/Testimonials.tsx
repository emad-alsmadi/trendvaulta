import { useMemo, useState } from 'react';
import { MessageSquare, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useAdminTestimonials,
  useCreateTestimonialMutation,
  useDeleteTestimonialMutation,
  useUpdateTestimonialMutation,
} from '../hooks/useAdminTestimonials';
import {
  errorMessage,
  type AdminTestimonial,
  type TestimonialPayload,
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
  TableCount,
  type DataTableColumn,
} from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Field, Input, Switch, Textarea } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Rating } from '../components/ui/Rating';
import { hintClass, labelClass } from '../components/ui/styles';

const emptyForm: TestimonialPayload = {
  id: '',
  name: '',
  role: '',
  quote: '',
  translations: { ar: { role: '', quote: '' } },
  rating: 5,
  active: true,
  sortOrder: 0,
};

export default function Testimonials() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatNumber } = useT();
  const testimonialsQ = useAdminTestimonials({ limit: 100 });
  const createMut = useCreateTestimonialMutation();
  const updateMut = useUpdateTestimonialMutation();
  const deleteMut = useDeleteTestimonialMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTestimonial | null>(null);
  const [form, setForm] = useState<TestimonialPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = testimonialsQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.role || '').toLowerCase().includes(q),
    );
  }, [testimonialsQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(testimonial: AdminTestimonial) {
    setEditing(testimonial);
    setForm({
      id: testimonial.id,
      name: testimonial.name,
      role: testimonial.role || '',
      quote: testimonial.quote,
      translations: {
        ar: {
          role: testimonial.translations?.ar?.role || '',
          quote: testimonial.translations?.ar?.quote || '',
        },
      },
      rating: testimonial.rating,
      active: testimonial.active,
      sortOrder: testimonial.sortOrder,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim() || !form.quote.trim()) {
      toast.error(t('testimonials.required'));
      return;
    }

    const payload: TestimonialPayload = {
      ...form,
      id: form.id.trim(),
      name: form.name.trim(),
      role: (form.role || '').trim(),
      quote: form.quote.trim(),
      translations: {
        ar: {
          role: form.translations?.ar?.role?.trim() || '',
          quote: form.translations?.ar?.quote?.trim() || '',
        },
      },
      rating: Number(form.rating) || 5,
      active: !!form.active,
      sortOrder: Number(form.sortOrder || 0),
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
      toast.error(errorMessage(err, t('testimonials.saveFailed')));
    }
  }

  async function handleDelete(testimonial: AdminTestimonial) {
    const ok = await confirm({
      message: t('testimonials.confirmDelete', { name: testimonial.name }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(testimonial._id);
    } catch (err) {
      toast.error(errorMessage(err, t('testimonials.deleteFailed')));
    }
  }

  const columns: DataTableColumn<AdminTestimonial>[] = [
    {
      key: 'name',
      header: t('testimonials.columns.name'),
      cell: (item) => (
        <div className='min-w-0'>
          <p
            className='font-medium text-foreground'
            dir='auto'
          >
            {item.name}
          </p>
          <p
            className='font-mono text-xs text-muted-foreground'
            dir='ltr'
          >
            {item.id}
          </p>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('testimonials.columns.role'),
      className: 'text-muted-foreground',
      cell: (item) => <span dir='auto'>{item.role || '—'}</span>,
    },
    {
      key: 'rating',
      header: t('testimonials.columns.rating'),
      cell: (item) => (
        <Rating
          value={item.rating}
          label={t('testimonials.ratedOf', { n: item.rating })}
        />
      ),
    },
    {
      key: 'sortOrder',
      header: t('testimonials.columns.order'),
      numeric: true,
      cell: (item) => formatNumber(item.sortOrder),
    },
    {
      key: 'active',
      header: t('common.status'),
      cell: (item) => (
        <StatusBadge status={item.active ? 'active' : 'inactive'}>
          {item.active ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (item) => (
        <RowActions>
          {can('content:write') && (
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('common.editItem', { name: item.name })}
              onClick={() => openEdit(item)}
            />
          )}
          {can('content:delete') && (
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('common.deleteItem', { name: item.name })}
              onClick={() => void handleDelete(item)}
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
        title={t('testimonials.title')}
        description={t('testimonials.subtitle')}
        actions={
          can('content:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('testimonials.add')}
            </Button>
          )
        }
      />

      {testimonialsQ.isError ? (
        <Alert tone='error'>
          {errorMessage(testimonialsQ.error, t('testimonials.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('testimonials.title')}
          data={filtered}
          columns={columns}
          getKey={(item) => item._id}
          loading={testimonialsQ.isLoading}
          fetching={testimonialsQ.isFetching}
          emptyIcon={<MessageSquare aria-hidden />}
          emptyTitle={t('testimonials.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: t('testimonials.searchPlaceholder'),
                label: t('testimonials.searchLabel'),
              }}
              canClear={Boolean(search)}
              onClear={() => setSearch('')}
            />
          }
          footer={
            testimonialsQ.data?.meta && (
              <TableCount>
                {t('testimonials.showing', {
                  shown: formatNumber(filtered.length),
                  total: formatNumber(testimonialsQ.data.meta.total),
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
            editing
              ? t('testimonials.form.editTitle')
              : t('testimonials.form.createTitle')
          }
          busy={saving}
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('testimonials.form.id')}
                required
              >
                <Input
                  required
                  value={form.id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, id: e.target.value }))
                  }
                  placeholder='sara'
                  dir='ltr'
                  className='font-mono'
                />
              </Field>
              <Field
                label={t('testimonials.form.name')}
                required
              >
                <Input
                  required
                  value={form.name}
                  dir='auto'
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label={t('testimonials.form.role')}>
              <Input
                value={form.role || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
                placeholder={t('testimonials.form.rolePlaceholder')}
                dir='auto'
              />
            </Field>
            <Field
              label={t('testimonials.form.quote')}
              required
            >
              <Textarea
                required
                value={form.quote}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, quote: e.target.value }))
                }
                rows={3}
              />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label={t('testimonials.form.rating')}>
                <Input
                  type='number'
                  min={1}
                  max={5}
                  value={form.rating}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rating: Number(e.target.value) }))
                  }
                />
              </Field>
              <Field label={t('testimonials.form.sortOrder')}>
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
                <legend className={labelClass}>{t('testimonials.form.arabicLegend')}</legend>
                <p className={hintClass}>{t('testimonials.form.arabicHint')}</p>
              </div>
              <Field label={t('testimonials.form.roleAr')}>
                <Input
                  value={form.translations?.ar?.role || ''}
                  dir='rtl'
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      translations: {
                        ar: { ...f.translations?.ar, role: e.target.value },
                      },
                    }))
                  }
                />
              </Field>
              <Field label={t('testimonials.form.quoteAr')}>
                <Textarea
                  value={form.translations?.ar?.quote || ''}
                  dir='rtl'
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      translations: {
                        ar: { ...f.translations?.ar, quote: e.target.value },
                      },
                    }))
                  }
                  rows={3}
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
