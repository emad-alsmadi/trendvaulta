import { useMemo, useState } from 'react';
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useAdminContent,
  useCreateContentMutation,
  useDeleteContentMutation,
  useUpdateContentMutation,
} from '../hooks/useAdminContent';
import {
  errorMessage,
  type AdminContent,
  type ContentPayload,
  type ContentType,
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
import { hintClass, labelClass } from '../components/ui/styles';

const CONTENT_TYPES: ContentType[] = [
  'SHIPPING',
  'RETURNS',
  'PRIVACY',
  'TERMS',
  'STOREFRONT_TRUST',
];

const emptyForm: ContentPayload = {
  type: 'SHIPPING',
  title: '',
  body: '',
  translations: { ar: { title: '', body: '' } },
  active: true,
};

export default function Content() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tv, formatNumber } = useT();
  const contentQ = useAdminContent({ limit: 100 });
  const createMut = useCreateContentMutation();
  const updateMut = useUpdateContentMutation();
  const deleteMut = useDeleteContentMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminContent | null>(null);
  const [form, setForm] = useState<ContentPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = contentQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.type.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.body.toLowerCase().includes(q),
    );
  }, [contentQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(content: AdminContent) {
    setEditing(content);
    setForm({
      type: content.type,
      title: content.title,
      body: content.body,
      translations: {
        ar: {
          title: content.translations?.ar?.title || '',
          body: content.translations?.ar?.body || '',
        },
      },
      active: content.active,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type || !form.title.trim() || !form.body.trim()) {
      toast.error(t('content.required'));
      return;
    }

    const payload: ContentPayload = {
      type: form.type,
      title: form.title.trim(),
      body: form.body.trim(),
      translations: {
        ar: {
          title: form.translations?.ar?.title?.trim() || '',
          body: form.translations?.ar?.body?.trim() || '',
        },
      },
      active: !!form.active,
    };

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      toast.success(
        payload.active
          ? t('content.published', { type: tv('contentType', payload.type) })
          : t('content.draft', { type: tv('contentType', payload.type) }),
      );
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err, t('content.saveFailed')));
    }
  }

  async function handleDelete(content: AdminContent) {
    const ok = await confirm({
      message: t('content.confirmDelete', {
        title: content.title,
        type: tv('contentType', content.type),
      }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(content._id);
    } catch (err) {
      toast.error(errorMessage(err, t('content.deleteFailed')));
    }
  }

  const columns: DataTableColumn<AdminContent>[] = [
    {
      key: 'type',
      header: t('content.columns.type'),
      cell: (content) => (
        <Badge plain>{tv('contentType', content.type)}</Badge>
      ),
    },
    {
      key: 'title',
      header: t('content.columns.title'),
      cell: (content) => (
        <span
          className='font-medium text-foreground'
          dir='auto'
        >
          {content.title}
        </span>
      ),
    },
    {
      key: 'body',
      header: t('content.columns.preview'),
      className: 'max-w-[22rem]',
      cell: (content) => (
        <span
          className='block truncate text-muted-foreground'
          dir='auto'
        >
          {content.body}
        </span>
      ),
    },
    {
      key: 'active',
      header: t('common.status'),
      cell: (content) => (
        <StatusBadge status={content.active ? 'published' : 'draft'}>
          {content.active ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (content) => (
        <RowActions>
          {can('content:write') && (
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('common.editItem', { name: content.title })}
              onClick={() => openEdit(content)}
            />
          )}
          {can('content:delete') && (
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('common.deleteItem', { name: content.title })}
              onClick={() => void handleDelete(content)}
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
        title={t('content.title')}
        description={t('content.subtitle')}
        actions={
          can('content:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('content.add')}
            </Button>
          )
        }
      />

      {contentQ.isError ? (
        <Alert tone='error'>
          {errorMessage(contentQ.error, t('content.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('content.title')}
          data={filtered}
          columns={columns}
          getKey={(content) => content._id}
          loading={contentQ.isLoading}
          fetching={contentQ.isFetching}
          emptyIcon={<FileText aria-hidden />}
          emptyTitle={t('content.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: t('content.searchPlaceholder'),
                label: t('content.searchLabel'),
              }}
              canClear={Boolean(search)}
              onClear={() => setSearch('')}
            />
          }
          footer={
            contentQ.data?.meta && (
              <TableCount>
                {t('content.showing', {
                  shown: formatNumber(filtered.length),
                  total: formatNumber(contentQ.data.meta.total),
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
            editing ? t('content.form.editTitle') : t('content.form.createTitle')
          }
          busy={saving}
          size='editor'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <div className='grid gap-4 sm:grid-cols-[14rem_1fr]'>
              <Field
                label={t('content.form.type')}
                required
              >
                <Select
                  required
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as ContentType,
                    }))
                  }
                >
                  {CONTENT_TYPES.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {tv('contentType', type)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={t('content.form.title')}
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
            </div>
            <Field
              label={t('content.form.body')}
              required
            >
              <Textarea
                required
                value={form.body}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                rows={12}
                className='leading-relaxed'
              />
            </Field>

            <fieldset className='space-y-3 border-t border-border pt-4'>
              <div className='space-y-1'>
                <legend className={labelClass}>{t('content.form.arabicLegend')}</legend>
                <p className={hintClass}>{t('content.form.arabicHint')}</p>
              </div>
              <Field label={t('content.form.titleAr')}>
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
              <Field label={t('content.form.bodyAr')}>
                <Textarea
                  value={form.translations?.ar?.body || ''}
                  dir='rtl'
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      translations: {
                        ar: { ...f.translations?.ar, body: e.target.value },
                      },
                    }))
                  }
                  rows={12}
                  className='leading-relaxed'
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
