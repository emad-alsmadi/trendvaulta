'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  useAdminUsers,
  useDeleteUserMutation,
  useUpdateUserMutation,
} from '@/hooks/admin/adminQuery';
import type { AdminUser, AppRole, UserUpdatePayload } from '@/types';
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
} from './admin-ui';

const ROLES: AppRole[] = ['user', 'moderator', 'admin'];

type UserForm = {
  email: string;
  username: string;
  roles: AppRole[];
  password: string;
};

export function AdminUsersPanel() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const usersQ = useAdminUsers();
  const updateMut = useUpdateUserMutation();
  const deleteMut = useDeleteUserMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>({
    email: '',
    username: '',
    roles: ['user'],
    password: '',
  });

  const users = usersQ.data || [];
  const saving = updateMut.isPending;

  function openEdit(user: AdminUser) {
    setEditing(user);
    setForm({
      email: user.email,
      username: user.username,
      roles: (user.roles || ['user']) as AppRole[],
      password: '',
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
    if (!editing) return;

    const payload: UserUpdatePayload = {
      email: form.email.trim(),
      username: form.username.trim(),
      roles: form.roles,
    };
    if (form.password.trim()) {
      payload.password = form.password;
    }

    try {
      await updateMut.mutateAsync({ id: editing._id, payload });
      toast('User updated.', { title: 'Saved', variant: 'success' });
      closeModal();
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not update user'), {
        title: 'Error',
        variant: 'error',
      });
    }
  }

  function handleDelete(user: AdminUser) {
    void confirm({
      variant: 'danger',
      title: 'Delete this user?',
      description: `${user.email} will be removed permanently.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteMut.mutateAsync(user._id);
          toast('User deleted.', { title: 'Deleted', variant: 'success' });
        } catch (err) {
          logErrorForDev(err);
          toast(getUserFacingErrorMessage(err, 'Could not delete user'), {
            title: 'Error',
            variant: 'error',
          });
        }
      },
    });
  }

  if (usersQ.isLoading) return <AdminLoading />;
  if (usersQ.error) {
    return (
      <AdminError
        message={getUserFacingErrorMessage(usersQ.error, 'Failed to load users')}
      />
    );
  }

  return (
    <>
      <AdminPanel
        title='Users'
        description='Update roles and account details. New accounts are created via public sign-up.'
      >
        <AdminTable
          headers={['Username', 'Email', 'Roles', 'Actions']}
          empty={users.length === 0}
        >
          {users.map((u) => (
            <tr
              key={u._id}
              className='bg-white/30'
            >
              <td className='px-4 py-3 font-extrabold text-indigo-950'>
                {u.username}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {u.email}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {(u.roles || []).join(', ') || 'user'}
              </td>
              <td className='px-4 py-3'>
                <AdminRowActions
                  onEdit={() => openEdit(u)}
                  onDelete={() => handleDelete(u)}
                />
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <AdminModal
        open={open}
        title='Edit user'
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
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      >
        <AdminField label='Username'>
          <AdminInput
            value={form.username}
            onChange={(e) =>
              setForm((f) => ({ ...f, username: e.target.value }))
            }
          />
        </AdminField>
        <AdminField label='Email'>
          <AdminInput
            type='email'
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
        <AdminField label='New password (optional)'>
          <AdminInput
            type='password'
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            placeholder='Leave blank to keep current password'
            autoComplete='new-password'
          />
        </AdminField>
      </AdminModal>
    </>
  );
}
