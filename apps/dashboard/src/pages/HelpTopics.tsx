import { useMemo, useState } from 'react';
import { HelpCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useAdminHelpTopics,
  useCreateHelpTopicMutation,
  useDeleteHelpTopicMutation,
  useUpdateHelpTopicMutation,
} from '../hooks/useAdminHelpTopics';
import {
  errorMessage,
  type AdminHelpTopic,
  type HelpTopicPayload,
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
import { Field, Input, Switch } from '../components/ui/Field';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { hintClass, labelClass } from '../components/ui/styles';

const emptyForm: HelpTopicPayload = {
  id: '',
  title: '',
  href: '',
  description: '',
  icon: '',
  translations: { ar: { title: '', description: '' } },
  active: true,
  sortOrder: 0,
};

export default function HelpTopics() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatNumber } = useT();
  const helpTopicsQ = useAdminHelpTopics({ limit: 100 });
  const createMut = useCreateHelpTopicMutation();
  const updateMut = useUpdateHelpTopicMutation();
  const deleteMut = useDeleteHelpTopicMutation();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHelpTopic | null>(null);
  const [form, setForm] = useState<HelpTopicPayload>(emptyForm);

  const saving = createMut.isPending || updateMut.isPending;

  const filtered = useMemo(() => {
    const list = helpTopicsQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (topic) =>
        topic.title.toLowerCase().includes(q) ||
        (topic.description || '').toLowerCase().includes(q) ||
        topic.id.toLowerCase().includes(q) ||
        topic.href.toLowerCase().includes(q),
    );
  }, [helpTopicsQ.data, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(topic: AdminHelpTopic) {
    setEditing(topic);
    setForm({
      id: topic.id,
      title: topic.title,
      href: topic.href,
      description: topic.description || '',
      icon: topic.icon || '',
      translations: {
        ar: {
          title: topic.translations?.ar?.title || '',
          description: topic.translations?.ar?.description || '',
        },
      },
      active: topic.active,
      sortOrder: topic.sortOrder ?? 0,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id.trim() || !form.title.trim() || !form.href.trim()) {
      toast.error(t('helpTopics.required'));
      return;
    }

    const payload: HelpTopicPayload = {
      ...form,
      id: form.id.trim(),
      title: form.title.trim(),
      href: form.href.trim(),
      description: (form.description || '').trim(),
      icon: (form.icon || '').trim(),
      translations: {
        ar: {
          title: form.translations?.ar?.title?.trim() || '',
          description: form.translations?.ar?.description?.trim() || '',
        },
      },
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
      toast.error(errorMessage(err, t('helpTopics.saveFailed')));
    }
  }

  async function handleDelete(topic: AdminHelpTopic) {
    const ok = await confirm({
      message: t('helpTopics.confirmDelete', { title: topic.title }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(topic._id);
    } catch (err) {
      toast.error(errorMessage(err, t('helpTopics.deleteFailed')));
    }
  }

  const columns: DataTableColumn<AdminHelpTopic>[] = [
    {
      key: 'title',
      header: t('helpTopics.columns.title'),
      cell: (topic) => (
        <div className='min-w-0'>
          <p
            className='font-medium text-foreground'
            dir='auto'
          >
            {topic.title}
          </p>
          {topic.description && (
            <p
              className='max-w-[22rem] truncate text-xs text-muted-foreground'
              dir='auto'
            >
              {topic.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'id',
      header: t('helpTopics.columns.id'),
      cell: (topic) => (
        <span
          className='font-mono text-xs text-muted-foreground'
          dir='ltr'
        >
          {topic.id}
        </span>
      ),
    },
    {
      key: 'href',
      header: t('helpTopics.columns.href'),
      className: 'max-w-[14rem]',
      cell: (topic) => (
        <span
          className='block truncate font-mono text-xs text-muted-foreground'
          dir='ltr'
        >
          {topic.href}
        </span>
      ),
    },
    {
      key: 'icon',
      header: t('helpTopics.columns.icon'),
      cell: (topic) =>
        topic.icon ? (
          <Badge plain>
            <span dir='ltr'>{topic.icon}</span>
          </Badge>
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    },
    {
      key: 'sortOrder',
      header: t('helpTopics.columns.order'),
      numeric: true,
      cell: (topic) => formatNumber(topic.sortOrder ?? 0),
    },
    {
      key: 'active',
      header: t('common.status'),
      cell: (topic) => (
        <StatusBadge status={topic.active ? 'active' : 'inactive'}>
          {topic.active ? t('common.active') : t('common.inactive')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (topic) => (
        <RowActions>
          {can('content:write') && (
            <IconButton
              icon={<Pencil aria-hidden />}
              label={t('common.editItem', { name: topic.title })}
              onClick={() => openEdit(topic)}
            />
          )}
          {can('content:delete') && (
            <IconButton
              icon={<Trash2 aria-hidden />}
              label={t('common.deleteItem', { name: topic.title })}
              onClick={() => void handleDelete(topic)}
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
        title={t('helpTopics.title')}
        description={t('helpTopics.subtitle')}
        actions={
          can('content:write') && (
            <Button
              variant='primary'
              onClick={openCreate}
              icon={<Plus aria-hidden />}
            >
              {t('helpTopics.add')}
            </Button>
          )
        }
      />

      {helpTopicsQ.isError ? (
        <Alert tone='error'>
          {errorMessage(helpTopicsQ.error, t('helpTopics.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('helpTopics.title')}
          data={filtered}
          columns={columns}
          getKey={(topic) => topic._id}
          loading={helpTopicsQ.isLoading}
          fetching={helpTopicsQ.isFetching}
          emptyIcon={<HelpCircle aria-hidden />}
          emptyTitle={t('helpTopics.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: t('helpTopics.searchPlaceholder'),
                label: t('helpTopics.searchLabel'),
              }}
              canClear={Boolean(search)}
              onClear={() => setSearch('')}
            />
          }
          footer={
            helpTopicsQ.data?.meta && (
              <TableCount>
                {t('helpTopics.showing', {
                  shown: formatNumber(filtered.length),
                  total: formatNumber(helpTopicsQ.data.meta.total),
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
              ? t('helpTopics.form.editTitle')
              : t('helpTopics.form.createTitle')
          }
          busy={saving}
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('helpTopics.form.id')}
                required
              >
                <Input
                  required
                  value={form.id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, id: e.target.value }))
                  }
                  placeholder='shipping'
                  dir='ltr'
                  className='font-mono'
                />
              </Field>
              <Field
                label={t('helpTopics.form.title')}
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
            <Field label={t('common.description')}>
              <Input
                value={form.description || ''}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </Field>
            <Field
              label={t('helpTopics.form.href')}
              required
            >
              <Input
                required
                value={form.href}
                onChange={(e) =>
                  setForm((f) => ({ ...f, href: e.target.value }))
                }
                placeholder='/shipping'
                dir='ltr'
                className='font-mono'
              />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label={t('helpTopics.form.icon')}>
                <Input
                  value={form.icon || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, icon: e.target.value }))
                  }
                  placeholder='truck'
                  dir='ltr'
                />
              </Field>
              <Field label={t('helpTopics.form.sortOrder')}>
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
                <legend className={labelClass}>{t('helpTopics.form.arabicLegend')}</legend>
                <p className={hintClass}>{t('helpTopics.form.arabicHint')}</p>
              </div>
              <Field label={t('helpTopics.form.titleAr')}>
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
              <Field label={t('helpTopics.form.descriptionAr')}>
                <Input
                  value={form.translations?.ar?.description || ''}
                  dir='rtl'
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      translations: {
                        ar: { ...f.translations?.ar, description: e.target.value },
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
