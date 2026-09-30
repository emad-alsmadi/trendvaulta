import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Ban, CircleCheck, Receipt } from 'lucide-react';
import {
  useAdminUsers,
  useDeleteUserMutation,
  useUpdateUserMutation,
} from '../hooks/useAdminUsers';
import {
  errorMessage,
  type AdminUser,
  type AppRole,
  type UserUpdatePayload,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTableQuery } from '../hooks/useTableQuery';
import { SortableHeader } from '../components/ui/SortableHeader';
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';
import { SearchInput, Select } from '../components/ui/Field';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Table, TableCard, THead, Th, Tr, Td } from '../components/ui/Table';
import { cn } from '../lib/cn';

const ROLES: AppRole[] = ['user', 'moderator', 'admin'];

type UserForm = {
  email: string;
  username: string;
  roles: AppRole[];
  password: string;
  adminNotes: string;
};

function primaryRole(roles?: AppRole[]) {
  if (!roles?.length) return 'user';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('moderator')) return 'moderator';
  return roles[0];
}

export default function Users() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tv, formatDate } = useT();
  const table = useTableQuery({ limit: 25, sort: 'createdAt', order: 'desc' });
  const { resetPage } = table;
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | ''>('');

  const usersQ = useAdminUsers({
    ...table.params,
    q: appliedQ || undefined,
    role: roleFilter || undefined,
  });
  const updateMut = useUpdateUserMutation();
  const deleteMut = useDeleteUserMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>({
    email: '',
    username: '',
    roles: ['user'],
    password: '',
    adminNotes: '',
  });

  const users = usersQ.data?.data || [];
  const meta = usersQ.data?.meta;
  const saving = updateMut.isPending;

  function openEdit(user: AdminUser) {
    setEditing(user);
    setForm({
      email: user.email,
      username: user.username,
      roles: (user.roles?.length ? user.roles : ['user']) as AppRole[],
      password: '',
      adminNotes: user.adminNotes || '',
    });
    setOpen(true);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!form.email.trim() || !form.username.trim()) {
      toast.error(t('users.required'));
      return;
    }

    const payload: UserUpdatePayload = {
      email: form.email.trim(),
      username: form.username.trim(),
      roles: form.roles,
      adminNotes: form.adminNotes.trim(),
    };
    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    try {
      await updateMut.mutateAsync({ id: editing._id, payload });
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err, t('users.updateFailed')));
    }
  }

  // Disabling rather than deleting keeps the customer's orders and reviews
  // intact; the API also revokes their sessions and refuses new sign-ins.
  async function handleToggleDisabled(user: AdminUser) {
    const disabling = !user.disabled;
    const ok = await confirm({
      message: disabling
        ? t('users.confirmDisable', { email: user.email })
        : t('users.confirmEnable', { email: user.email }),
      danger: disabling,
      confirmLabel: disabling ? t('users.disable') : t('users.enable'),
    });
    if (!ok) return;
    try {
      await updateMut.mutateAsync({
        id: user._id,
        payload: { disabled: disabling },
      });
      toast.success(disabling ? t('users.disabled') : t('users.enabled'));
    } catch (err) {
      toast.error(errorMessage(err, t('users.accountFailed')));
    }
  }

  async function handleDelete(user: AdminUser) {
    const ok = await confirm({
      message: t('users.confirmDelete', { email: user.email }),
      danger: true,
      confirmLabel: t('users.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(user._id);
    } catch (err) {
      toast.error(errorMessage(err, t('users.deleteFailed')));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className='mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            {t('users.title')}
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            {t('users.subtitle')}
          </p>
        </div>
      </div>

      <div className='mb-6 flex flex-col gap-3 sm:flex-row'>
        <form
          className='relative flex-1'
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedQ(search.trim());
            resetPage();
          }}
        >
          <Search
            className='absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400'
            aria-hidden
          />
          <input
            type='search'
            aria-label={t('users.searchLabel')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('users.searchPlaceholder')}
            className='w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          />
        </form>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as AppRole | '');
            resetPage();
          }}
          aria-label={t('users.filterRole')}
          className='rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        >
          <option value=''>{t('users.allRoles')}</option>
          {ROLES.map((role) => (
            <option
              key={role}
              value={role}
            >
              {tv('role', role)}
            </option>
          ))}
        </select>
      </div>

      {usersQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          {t('users.loading')}
        </p>
      )}

      {usersQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(usersQ.error, t('users.loadFailed'))}
        </div>
      )}

      {!usersQ.isLoading && !usersQ.isError && (
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[720px]'>
              <thead className='bg-gray-50 text-xs uppercase tracking-wider dark:bg-gray-700'>
                <tr className='[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-medium [&>th]:text-gray-500 dark:[&>th]:text-gray-300'>
                  <SortableHeader
                    field='username'
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    {t('users.columns.username')}
                  </SortableHeader>
                  <SortableHeader
                    field='email'
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    {t('users.columns.email')}
                  </SortableHeader>
                  <th scope='col'>{t('users.columns.roles')}</th>
                  <SortableHeader
                    field='createdAt'
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    {t('users.columns.joined')}
                  </SortableHeader>
                  <th scope='col'>{t('users.columns.actions')}</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className='px-4 py-10 text-center text-sm text-gray-500'
                    >
                      {t('users.empty')}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user._id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700/60'
                    >
                      <td className='px-4 py-3 text-sm font-medium text-gray-900 dark:text-white'>
                        <span
                          className='inline-flex items-center gap-2'
                          dir='auto'
                        >
                          {user.username}
                          {user.disabled && (
                            <span className='rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/50 dark:text-red-200'>
                              {t('users.disabledBadge')}
                            </span>
                          )}
                        </span>
                        {user.adminNotes && (
                          <p
                            className='mt-0.5 max-w-xs truncate text-xs font-normal text-gray-500 dark:text-gray-400'
                            title={user.adminNotes}
                          >
                            {user.adminNotes}
                          </p>
                        )}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 dark:text-gray-300'>
                        {user.email}
                        {/* null = link not opened yet; no field = older, confirmed account */}
                        {user.emailVerifiedAt === null && (
                          <span
                            className='ms-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                            title={t('users.unconfirmedHint')}
                          >
                            {t('users.unconfirmed')}
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex flex-wrap gap-1'>
                          {(user.roles?.length
                            ? user.roles
                            : [primaryRole(user.roles)]
                          ).map((role) => (
                            <span
                              key={role}
                              className='rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            >
                              {tv('role', role)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-500 dark:text-gray-400'>
                        {user.createdAt ? formatDate(user.createdAt) : '—'}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-1'>
                          {can('orders:read') && (
                            <Link
                              to={`/orders?user=${user._id}`}
                              className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600'
                              aria-label={t('users.ordersOf', {
                                name: user.username,
                              })}
                              title={t('users.orderHistory')}
                            >
                              <Receipt
                                className='h-4 w-4 text-gray-500'
                                aria-hidden
                              />
                            </Link>
                          )}
                          {can('users:write') && (
                            <button
                              type='button'
                              onClick={() => void handleToggleDisabled(user)}
                              disabled={updateMut.isPending}
                              className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600'
                              aria-label={
                                user.disabled
                                  ? t('users.enableUser', {
                                      name: user.username,
                                    })
                                  : t('users.disableUser', {
                                      name: user.username,
                                    })
                              }
                              title={
                                user.disabled
                                  ? t('users.enableAccount')
                                  : t('users.disableAccount')
                              }
                            >
                              {user.disabled ? (
                                <CircleCheck
                                  className='h-4 w-4 text-green-600'
                                  aria-hidden
                                />
                              ) : (
                                <Ban
                                  className='h-4 w-4 text-amber-600'
                                  aria-hidden
                                />
                              )}
                            </button>
                          )}
                          {can('users:write') && (
                            <button
                              type='button'
                              onClick={() => openEdit(user)}
                              className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600'
                              aria-label={t('users.editUser', {
                                name: user.username,
                              })}
                            >
                              <Pencil
                                className='h-4 w-4 text-gray-500'
                                aria-hidden
                              />
                            </button>
                          )}
                          {can('users:delete') && (
                            <button
                              type='button'
                              onClick={() => void handleDelete(user)}
                              disabled={deleteMut.isPending}
                              className='rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40'
                              aria-label={t('users.deleteUser', {
                                name: user.username,
                              })}
                            >
                              <Trash2
                                className='h-4 w-4 text-red-500'
                                aria-hidden
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className='px-4 pb-4'>
            <TablePagination
              meta={meta}
              busy={usersQ.isFetching}
              onPage={table.setPage}
              onLimit={table.setLimit}
            />
          </div>
        </div>
      )}

      {open && editing && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={t('users.form.title')}
          busy={saving}
          maxWidthClass='max-w-lg'
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-3'
          >
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('users.form.username')}
              </span>
              <input
                required
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('users.form.email')}
              </span>
              <input
                type='email'
                dir='ltr'
                required
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <fieldset>
              <legend className='mb-2 text-sm font-medium text-gray-700 dark:text-gray-300'>
                {t('users.form.roles')}
              </legend>
              <div className='flex flex-wrap gap-2'>
                {ROLES.map((role) => {
                  const selected = form.roles.includes(role);
                  return (
                    <button
                      key={role}
                      type='button'
                      onClick={() => toggleRole(role)}
                      aria-pressed={selected}
                      className={`rounded-full border px-3 py-1 text-sm font-medium ${
                        selected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {tv('role', role)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('users.form.password')}
              </span>
              <input
                type='password'
                autoComplete='new-password'
                minLength={8}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder={t('users.form.passwordPlaceholder')}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('users.form.notes')}
              </span>
              <textarea
                rows={3}
                maxLength={2000}
                value={form.adminNotes}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, adminNotes: e.target.value }))
                }
                placeholder={t('users.form.notesPlaceholder')}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <div className='flex justify-end gap-2 pt-2'>
              <button
                type='button'
                disabled={saving}
                onClick={() => setOpen(false)}
                className='rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              >
                {t('common.cancel')}
              </button>
              <button
                type='submit'
                disabled={saving}
                className='rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60'
              >
                {saving ? t('users.form.saving') : t('users.form.save')}
              </button>
            </div>
          </form>
        </FormDialog>
      )}
    </motion.div>
  );
}
