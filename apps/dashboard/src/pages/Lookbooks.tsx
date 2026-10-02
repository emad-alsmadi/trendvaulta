import { useMemo, useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useAdminLookbooks,
  useCreateLookbookMutation,
  useDeleteLookbookMutation,
  useUpdateLookbookMutation,
} from '../hooks/useAdminLookbooks';
import {
  errorMessage,
  type AdminLookbook,
  type LookbookPayload,
  type LookbookTone,
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
import { Field, Input, Select, Switch, Textarea } from '../components/ui/Field';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { Thumbnail } from '../components/ui/Table';

const TONES: LookbookTone[] = ['rose', 'stone', 'teal'];

const emptyForm: LookbookPayload = {
  id: '',
  eyebrow: '',
  title: '',
  body: '',
  ctaLabel: '',
  ctaHref: '',
  imageUrl: '',
  tone: 'stone',
  active: true,
  sortOrder: 0,
};

export default function Lookbooks() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tv, formatNumber } = useT();
  const lookbooksQ = useAdminLookbooks({ limit: 100 });
  const createMut = useCreateLookbookMutation();
  const updateMut = useUpdateLookbookMutation();
  const deleteMut = useDeleteLookbookMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLookbook | null>(null);
  const [form, setForm] = useState<LookbookPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = lookbooksQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (l) =>
        l.id.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        (l.eyebrow || '').toLowerCase().includes(q),
    );
  }, [lookbooksQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(lookbook: AdminLookbook) {
    setEditing(lookbook);
    setForm({
      id: lookbook.id,
      eyebrow: lookbook.eyebrow || '',
      title: lookbook.title,
      body: lookbook.body,
      ctaLabel: lookbook.ctaLabel || '',
      ctaHref: lookbook.ctaHref,
      imageUrl: lookbook.imageUrl,
      tone: lookbook.tone,
      active: lookbook.active,
      sortOrder: lookbook.sortOrder,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.id.trim() ||
      !form.title.trim() ||
      !form.body.trim() ||
      !form.ctaHref.trim() ||
      !form.imageUrl.trim()
    ) {
      toast.error(t('lookbooks.required'));
      return;
    }

    const payload: LookbookPayload = {
      ...form,
      id: form.id.trim(),
      eyebrow: (form.eyebrow || '').trim(),
      title: form.title.trim(),
      body: form.body.trim(),
      ctaLabel: (form.ctaLabel || '').trim(),
      ctaHref: form.ctaHref.trim(),
      imageUrl: form.imageUrl.trim(),
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
      toast.error(errorMessage(err, t('lookbooks.saveFailed')));
    }
  }

  async function handleDelete(lookbook: AdminLookbook) {
    const ok = await confirm({
      message: t('lookbooks.confirmDeactivate', { title: lookbook.title }),
      danger: true,
      confirmLabel: t('lookbooks.deactivate'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(lookbook._id);
    } catch (err) {
      toast.error(errorMessage(err, t('lookbooks.deleteFailed')));
    }
  }

  const columns: DataTableColumn<AdminLookbook>[] = [
    {
      key: 'title',
      header: t('lookbooks.columns.title'),
      cell: (lookbook) => (
        <div className='flex items-center gap-3'>
          <Thumbnail src={lookbook.imageUrl} />
          <div className='min-w-0'>
            {lookbook.eyebrow && (
              <p
                className='text-caption uppercase text-muted-foreground'
                dir='auto'
              >
                {lookbook.eyebrow}
              </p>
            )}
            <p
              className='font-medium text-foreground'
              dir='auto'
            >
              {lookbook.title}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'id',
      header: t('lookbooks.columns.id'),
      cell: (lookbook) => (
        <span
          className='font-mono text-xs text-muted-foreground'
          dir='ltr'
        >
          {lookbook.id}
        </span>
      ),
    },
    {
      key: 'tone',
      header: t('lookbooks.columns.tone'),
      cell: (lookbook) => <Badge plain>{tv('tone', lookbook.tone)}</Badge>,
    },
    {
      key: 'sortOrder',
      header: t('lookbooks.columns.order'),
      numeric: true,
      cell: (lookbook) => formatNumber(lookbook.sortOrder),
    },
    {
      key: 'active',
      header: t('common.status'),
      cell: (lookbook) => (
        <StatusBadge status={lookbook.active ? 'active' : 'inactive'}>
          {lookbook.active ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (lookbook) => (
        <RowActions>
          {can('content:write') && (
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('common.editItem', { name: lookbook.title })}
              onClick={() => openEdit(lookbook)}
            />
          )}
          {can('content:delete') && (
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('common.deleteItem', { name: lookbook.title })}
              onClick={() => void handleDelete(lookbook)}
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
        title={t('lookbooks.title')}
        description={t('lookbooks.subtitle')}
        actions={
          can('content:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('lookbooks.add')}
            </Button>
          )
        }
      />

      {lookbooksQ.isError ? (
        <Alert tone='error'>
          {errorMessage(lookbooksQ.error, t('lookbooks.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('lookbooks.title')}
          data={filtered}
          columns={columns}
          getKey={(lookbook) => lookbook._id}
          loading={lookbooksQ.isLoading}
          fetching={lookbooksQ.isFetching}
          emptyIcon={<BookOpen aria-hidden />}
          emptyTitle={t('lookbooks.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: t('lookbooks.searchPlaceholder'),
                label: t('lookbooks.searchLabel'),
              }}
              canClear={Boolean(search)}
              onClear={() => setSearch('')}
            />
          }
          footer={
            lookbooksQ.data?.meta && (
              <TableCount>
                {t('lookbooks.showing', {
                  shown: formatNumber(filtered.length),
                  total: formatNumber(lookbooksQ.data.meta.total),
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
              ? t('lookbooks.form.editTitle')
              : t('lookbooks.form.createTitle')
          }
          busy={saving}
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('lookbooks.form.id')}
                required
              >
                <Input
                  required
                  value={form.id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, id: e.target.value }))
                  }
                  placeholder='look-morning'
                  dir='ltr'
                  className='font-mono'
                />
              </Field>
              <Field label={t('lookbooks.form.eyebrow')}>
                <Input
                  value={form.eyebrow || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, eyebrow: e.target.value }))
                  }
                  placeholder={t('lookbooks.form.eyebrowPlaceholder')}
                  dir='auto'
                />
              </Field>
            </div>
            <Field
              label={t('lookbooks.form.title')}
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
            <Field
              label={t('lookbooks.form.body')}
              required
            >
              <Textarea
                required
                value={form.body}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                rows={3}
              />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label={t('lookbooks.form.ctaLabel')}>
                <Input
                  value={form.ctaLabel || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaLabel: e.target.value }))
                  }
                  placeholder={t('lookbooks.form.ctaLabelPlaceholder')}
                  dir='auto'
                />
              </Field>
              <Field
                label={t('lookbooks.form.ctaHref')}
                required
              >
                <Input
                  required
                  value={form.ctaHref}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaHref: e.target.value }))
                  }
                  placeholder='/products?category=beauty'
                  dir='ltr'
                />
              </Field>
            </div>
            <Field
              label={t('lookbooks.form.imageUrl')}
              required
            >
              <Input
                required
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
                placeholder='/images/1.webp'
                dir='ltr'
              />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label={t('lookbooks.form.tone')}>
                <Select
                  value={form.tone}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tone: e.target.value as LookbookTone,
                    }))
                  }
                >
                  {TONES.map((tone) => (
                    <option
                      key={tone}
                      value={tone}
                    >
                      {tv('tone', tone)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('lookbooks.form.sortOrder')}>
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
