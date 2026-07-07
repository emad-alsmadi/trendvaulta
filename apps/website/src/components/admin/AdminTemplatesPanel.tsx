'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  useAdminCreators,
  useAdminTemplates,
  useCreateTemplateMutation,
  useDeleteTemplateMutation,
  useUpdateTemplateMutation,
} from '@/hooks/admin/adminQuery';
import type { Template, TemplatePayload } from '@/types';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import {
  AdminError,
  AdminField,
  AdminInput,
  AdminLoading,
  AdminModal,
  AdminPanel,
  AdminRowActions,
  AdminSelect,
  AdminTable,
  AdminTextarea,
} from './admin-ui';

const emptyForm: TemplatePayload = {
  title: '',
  author: '',
  description: '',
  price: 0,
  cover: '',
};

function authorId(template: Template): string {
  if (typeof template.author === 'string') return template.author;
  return template.author?._id || '';
}

function authorName(template: Template): string {
  if (typeof template.author === 'object' && template.author?.name) {
    return template.author.name;
  }
  return '—';
}

export function AdminTemplatesPanel() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const templatesQ = useAdminTemplates();
  const creatorsQ = useAdminCreators();
  const createMut = useCreateTemplateMutation();
  const updateMut = useUpdateTemplateMutation();
  const deleteMut = useDeleteTemplateMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<TemplatePayload>(emptyForm);

  const creators = creatorsQ.data?.data || [];
  const templates = templatesQ.data?.data || [];

  const modalTitle = editing ? 'Edit template' : 'Create template';
  const saving = createMut.isPending || updateMut.isPending;

  const defaultAuthor = useMemo(
    () => creators[0]?._id || '',
    [creators],
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, author: defaultAuthor });
    setOpen(true);
  }

  function openEdit(template: Template) {
    setEditing(template);
    setForm({
      title: template.title,
      author: authorId(template),
      description: template.description,
      price: template.price,
      cover: template.cover,
    });
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setEditing(null);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.author || !form.cover.trim()) {
      toast('Title, creator, and cover URL are required.', {
        title: 'Validation',
        variant: 'error',
      });
      return;
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload: form });
        toast('Template updated.', { title: 'Saved', variant: 'success' });
      } else {
        await createMut.mutateAsync(form);
        toast('Template created.', { title: 'Created', variant: 'success' });
      }
      closeModal();
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not save template'), {
        title: 'Error',
        variant: 'error',
      });
    }
  }

  function handleDelete(template: Template) {
    void confirm({
      variant: 'danger',
      title: 'Delete this template?',
      description: `"${template.title}" will be removed permanently.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteMut.mutateAsync(template._id);
          toast('Template deleted.', { title: 'Deleted', variant: 'success' });
        } catch (err) {
          logErrorForDev(err);
          toast(getUserFacingErrorMessage(err, 'Could not delete template'), {
            title: 'Error',
            variant: 'error',
          });
        }
      },
    });
  }

  if (templatesQ.isLoading) return <AdminLoading />;
  if (templatesQ.error) {
    return (
      <AdminError
        message={getUserFacingErrorMessage(
          templatesQ.error,
          'Failed to load templates',
        )}
      />
    );
  }

  return (
    <>
      <AdminPanel
        title='Templates'
        description='Create, update, and remove marketplace templates.'
        action={
          <Button
            type='button'
            size='sm'
            onClick={openCreate}
            disabled={creators.length === 0}
          >
            <Plus className='mr-1 h-4 w-4' />
            New template
          </Button>
        }
      >
        {creators.length === 0 ? (
          <p className='mb-4 text-sm font-semibold text-amber-800'>
            Add at least one creator before creating templates.
          </p>
        ) : null}

        <AdminTable
          headers={['Title', 'Creator', 'Price', 'Actions']}
          empty={templates.length === 0}
        >
          {templates.map((t) => (
            <tr
              key={t._id}
              className='bg-white/30'
            >
              <td className='px-4 py-3 font-extrabold text-indigo-950'>
                {t.title}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {authorName(t)}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                ${t.price.toFixed(2)}
              </td>
              <td className='px-4 py-3'>
                <AdminRowActions
                  onEdit={() => openEdit(t)}
                  onDelete={() => handleDelete(t)}
                />
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <AdminModal
        open={open}
        title={modalTitle}
        onClose={closeModal}
        footer={
          <>
            <Button
              type='button'
              variant='outline'
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => void handleSubmit()}
              disabled={saving}
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <AdminField label='Title'>
          <AdminInput
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder='Template title'
          />
        </AdminField>
        <AdminField label='Creator'>
          <AdminSelect
            value={form.author}
            onChange={(e) =>
              setForm((f) => ({ ...f, author: e.target.value }))
            }
          >
            <option value=''>Select creator</option>
            {creators.map((c) => (
              <option
                key={c._id}
                value={c._id}
              >
                {c.name}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminField label='Description'>
          <AdminTextarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder='Short description'
          />
        </AdminField>
        <AdminField label='Price (USD)'>
          <AdminInput
            type='number'
            min={0}
            step='0.01'
            value={form.price}
            onChange={(e) =>
              setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))
            }
          />
        </AdminField>
        <AdminField label='Cover image URL'>
          <AdminInput
            value={form.cover}
            onChange={(e) => setForm((f) => ({ ...f, cover: e.target.value }))}
            placeholder='https://…'
          />
        </AdminField>
      </AdminModal>
    </>
  );
}
