'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  useAdminCreators,
  useCreateCreatorMutation,
  useDeleteCreatorMutation,
  useUpdateCreatorMutation,
} from '@/hooks/admin/adminQuery';
import type { AppRole, Creator, CreatorPayload } from '@/types';
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
  AdminTable,
  AdminTextarea,
} from './admin-ui';

const ROLES: AppRole[] = ['user', 'moderator', 'admin'];

const emptyForm: CreatorPayload = {
  name: '',
  country: '',
  bio: '',
  roles: ['user'],
};

export function AdminCreatorsPanel() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const creatorsQ = useAdminCreators();
  const createMut = useCreateCreatorMutation();
  const updateMut = useUpdateCreatorMutation();
  const deleteMut = useDeleteCreatorMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Creator | null>(null);
  const [form, setForm] = useState<CreatorPayload>(emptyForm);

  const creators = creatorsQ.data?.data || [];
  const saving = createMut.isPending || updateMut.isPending;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(creator: Creator) {
    setEditing(creator);
    setForm({
      name: creator.name,
      country: creator.country,
      bio: creator.bio,
      roles: (creator.roles || ['user']) as AppRole[],
    });
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setEditing(null);
  }

  function toggleRole(role: AppRole) {
    setForm((f) => {
      const has = f.roles.includes(role);
      const roles = has
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role];
      return { ...f, roles: roles.length ? roles : ['user'] };
    });
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast('Creator name is required.', {
        title: 'Validation',
        variant: 'error',
      });
      return;
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload: form });
        toast('Creator updated.', { title: 'Saved', variant: 'success' });
      } else {
        await createMut.mutateAsync(form);
        toast('Creator created.', { title: 'Created', variant: 'success' });
      }
      closeModal();
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not save creator'), {
        title: 'Error',
        variant: 'error',
      });
    }
  }

  function handleDelete(creator: Creator) {
    void confirm({
      variant: 'danger',
      title: 'Delete this creator?',
      description: `"${creator.name}" will be removed. Templates linked to them may break.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteMut.mutateAsync(creator._id);
          toast('Creator deleted.', { title: 'Deleted', variant: 'success' });
        } catch (err) {
          logErrorForDev(err);
          toast(getUserFacingErrorMessage(err, 'Could not delete creator'), {
            title: 'Error',
            variant: 'error',
          });
        }
      },
    });
  }

  if (creatorsQ.isLoading) return <AdminLoading />;
  if (creatorsQ.error) {
    return (
      <AdminError
        message={getUserFacingErrorMessage(
          creatorsQ.error,
          'Failed to load creators',
        )}
      />
    );
  }

  return (
    <>
      <AdminPanel
        title='Creators'
        description='Manage creator profiles shown in the marketplace.'
        action={
          <Button
            type='button'
            size='sm'
            onClick={openCreate}
          >
            <Plus className='mr-1 h-4 w-4' />
            New creator
          </Button>
        }
      >
        <AdminTable
          headers={['Name', 'Country', 'Roles', 'Actions']}
          empty={creators.length === 0}
        >
          {creators.map((c) => (
            <tr
              key={c._id}
              className='bg-white/30'
            >
              <td className='px-4 py-3 font-extrabold text-indigo-950'>
                {c.name}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {c.country || '—'}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {(c.roles || []).join(', ') || 'user'}
              </td>
              <td className='px-4 py-3'>
                <AdminRowActions
                  onEdit={() => openEdit(c)}
                  onDelete={() => handleDelete(c)}
                />
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <AdminModal
        open={open}
        title={editing ? 'Edit creator' : 'Create creator'}
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
        <AdminField label='Name'>
          <AdminInput
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </AdminField>
        <AdminField label='Country'>
          <AdminInput
            value={form.country}
            onChange={(e) =>
              setForm((f) => ({ ...f, country: e.target.value }))
            }
          />
        </AdminField>
        <AdminField label='Bio'>
          <AdminTextarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
        </AdminField>
        <AdminField label='Roles'>
          <div className='flex flex-wrap gap-3'>
            {ROLES.map((role) => (
              <label
                key={role}
                className='inline-flex items-center gap-2 text-sm font-semibold text-indigo-950/80'
              >
                <input
                  type='checkbox'
                  checked={form.roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  className='h-4 w-4'
                />
                {role}
              </label>
            ))}
          </div>
        </AdminField>
      </AdminModal>
    </>
  );
}
