import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Ban, CircleCheck, Receipt } from 'lucide-react';
// @ts-ignore
import { DataTable } from 'primereact/datatable';
// @ts-ignore
import { Column } from 'primereact/column';
// @ts-ignore
import { InputText } from 'primereact/inputtext';
// @ts-ignore
import { Dropdown } from 'primereact/dropdown';
// @ts-ignore
import { Dialog } from 'primereact/dialog';
// @ts-ignore
import { Button } from 'primereact/button';
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
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

// @ts-ignore - PrimeReact types are bundled
const ColumnWrapper = Column as any;
// @ts-ignore - PrimeReact types are bundled
const DropdownWrapper = Dropdown as any;
// @ts-ignore - PrimeReact types are bundled
const DataTableWrapper = DataTable as any;
// @ts-ignore - PrimeReact types are bundled
const InputTextWrapper = InputText as any;
// @ts-ignore - PrimeReact types are bundled
const DialogWrapper = Dialog as any;

const ROLES: AppRole[] = ['user', 'moderator', 'admin'];

const ROLE_OPTIONS = [
  { label: 'User', value: 'user' },
  { label: 'Moderator', value: 'moderator' },
  { label: 'Admin', value: 'admin' },
];

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
      <PageHeader
        title={t('users.title')}
        description={t('users.subtitle')}
      />

      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <InputTextWrapper
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          placeholder={t('users.searchPlaceholder')}
          className='w-full sm:w-64'
        />
        <DropdownWrapper
          value={roleFilter}
          options={ROLE_OPTIONS}
          onChange={(e: any) => {
            setRoleFilter(e.value || '');
            resetPage();
          }}
          placeholder={t('users.filterRole')}
          className='w-full sm:w-48'
          showClear
        />
        <Button
          label={t('users.searchLabel')}
          onClick={() => {
            setAppliedQ(search.trim());
            resetPage();
          }}
          className='w-full sm:w-auto'
        />
        {(appliedQ || roleFilter) && (
          <Button
            label='Clear'
            onClick={() => {
              setSearch('');
              setAppliedQ('');
              setRoleFilter('');
              resetPage();
            }}
            severity='secondary'
            className='w-full sm:w-auto'
          />
        )}
      </div>

      {usersQ.isLoading && (
        <p className='py-10 text-center text-sm text-muted-foreground'>
          {t('users.loading')}
        </p>
      )}

      {usersQ.isError && (
        <div className='rounded-card border border-destructive bg-destructive/10 px-4 py-6 text-sm text-foreground'>
          {errorMessage(usersQ.error, t('users.loadFailed'))}
        </div>
      )}

      {!usersQ.isLoading && !usersQ.isError && (
        <div className='rounded-xl border border-gray-200 bg-card shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <DataTableWrapper
            value={users}
            paginator
            rows={25}
            totalRecords={meta?.total}
            lazy
            onPage={table.setPage}
            first={(meta?.page ? meta.page - 1 : 0) * 25}
            loading={usersQ.isFetching}
            emptyMessage={t('users.empty')}
            sortField={table.sort}
            sortOrder={table.order === 'asc' ? 1 : -1}
            onSort={table.toggleSort}
            className='p-datatable-sm'
          >
            <ColumnWrapper
              field='username'
              header={t('users.columns.username')}
              sortable
              body={(user: any) => (
                <div className='flex flex-col'>
                  <span
                    className='font-medium text-foreground'
                    dir='auto'
                  >
                    {user.username}
                  </span>
                  {user.disabled && (
                    <StatusBadge status='disabled'>
                      {t('users.disabledBadge')}
                    </StatusBadge>
                  )}
                  {user.adminNotes && (
                    <p
                      className='mt-0.5 max-w-xs truncate text-xs text-muted-foreground'
                      title={user.adminNotes}
                    >
                      {user.adminNotes}
                    </p>
                  )}
                </div>
              )}
            />
            <ColumnWrapper
              field='email'
              header={t('users.columns.email')}
              sortable
              body={(user: any) => (
                <div className='flex flex-col'>
                  <span className='text-sm text-foreground'>{user.email}</span>
                  {user.emailVerifiedAt === null && (
                    <StatusBadge status='unconfirmed'>
                      {t('users.unconfirmed')}
                    </StatusBadge>
                  )}
                </div>
              )}
            />
            <ColumnWrapper
              field='roles'
              header={t('users.columns.roles')}
              body={(user: any) => (
                <div className='flex flex-wrap gap-1'>
                  {(user.roles?.length
                    ? user.roles
                    : [primaryRole(user.roles)]
                  ).map((role: string) => (
                    <StatusBadge
                      status={role}
                      key={role}
                    >
                      {tv('role', role)}
                    </StatusBadge>
                  ))}
                </div>
              )}
            />
            <ColumnWrapper
              field='createdAt'
              header={t('users.columns.joined')}
              sortable
              body={(user: any) =>
                user.createdAt ? formatDate(user.createdAt) : '—'
              }
            />
            <ColumnWrapper
              header={t('users.columns.actions')}
              body={(user: any) => (
                <div className='flex items-center gap-1'>
                  {can('orders:read') && (
                    <Link
                      to={`/orders?user=${user._id}`}
                      className='rounded p-1.5 hover:bg-accent transition-colors duration-200'
                      aria-label={t('users.ordersOf', { name: user.username })}
                      title={t('users.orderHistory')}
                    >
                      <Receipt
                        className='icon-sm text-muted-foreground hover:text-brand-cyan transition-colors duration-200'
                        aria-hidden
                      />
                    </Link>
                  )}
                  {can('users:write') && (
                    <button
                      type='button'
                      onClick={() => void handleToggleDisabled(user)}
                      disabled={updateMut.isPending}
                      className='rounded p-1.5 hover:bg-accent transition-colors duration-200'
                      aria-label={
                        user.disabled
                          ? t('users.enableUser', { name: user.username })
                          : t('users.disableUser', { name: user.username })
                      }
                      title={
                        user.disabled
                          ? t('users.enableAccount')
                          : t('users.disableAccount')
                      }
                    >
                      {user.disabled ? (
                        <CircleCheck
                          className='icon-sm text-metric-green'
                          aria-hidden
                        />
                      ) : (
                        <Ban
                          className='icon-sm text-metric-orange'
                          aria-hidden
                        />
                      )}
                    </button>
                  )}
                  {can('users:write') && (
                    <button
                      type='button'
                      onClick={() => openEdit(user)}
                      className='rounded p-1.5 hover:bg-accent transition-colors duration-200'
                      aria-label={t('users.editUser', { name: user.username })}
                    >
                      <Pencil
                        className='icon-sm text-muted-foreground hover:text-brand-indigo transition-colors duration-200'
                        aria-hidden
                      />
                    </button>
                  )}
                  {can('users:delete') && (
                    <button
                      type='button'
                      onClick={() => void handleDelete(user)}
                      disabled={deleteMut.isPending}
                      className='rounded p-1.5 hover:bg-destructive/10 transition-colors duration-200'
                      aria-label={t('users.deleteUser', {
                        name: user.username,
                      })}
                    >
                      <Trash2
                        className='icon-sm text-muted-foreground hover:text-destructive transition-colors duration-200'
                        aria-hidden
                      />
                    </button>
                  )}
                </div>
              )}
            />
          </DataTableWrapper>
        </div>
      )}

      <DialogWrapper
        visible={open}
        onHide={() => setOpen(false)}
        header={t('users.form.title')}
        modal
        className='w-full max-w-lg'
      >
        <form
          onSubmit={handleSubmit}
          className='space-y-4'
        >
          <div>
            <label className='mb-1 block text-sm font-medium text-foreground'>
              {t('users.form.username')}
            </label>
            <InputTextWrapper
              required
              value={form.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              className='w-full'
            />
          </div>
          <div>
            <label className='mb-1 block text-sm font-medium text-foreground'>
              {t('users.form.email')}
            </label>
            <InputTextWrapper
              type='email'
              dir='ltr'
              required
              value={form.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className='w-full'
            />
          </div>
          <div>
            <label className='mb-2 block text-sm font-medium text-foreground'>
              {t('users.form.roles')}
            </label>
            <div className='flex flex-wrap gap-2'>
              {ROLES.map((role) => {
                const selected = form.roles.includes(role);
                const roleColors: Record<string, string> = {
                  admin: 'border-brand-purple bg-brand-purple text-white',
                  moderator: 'border-brand-indigo bg-brand-indigo text-white',
                  user: 'border-brand-cyan bg-brand-cyan text-white',
                };
                return (
                  <Button
                    key={role}
                    type='button'
                    onClick={() => toggleRole(role)}
                    severity={selected ? undefined : 'secondary'}
                    className={`rounded-full ${
                      selected
                        ? roleColors[role] ||
                          'bg-primary text-primary-foreground'
                        : 'border-border text-foreground'
                    }`}
                  >
                    {tv('role', role)}
                  </Button>
                );
              })}
            </div>
          </div>
          <div>
            <label className='mb-1 block text-sm font-medium text-foreground'>
              {t('users.form.password')}
            </label>
            <InputTextWrapper
              type='password'
              autoComplete='new-password'
              minLength={8}
              value={form.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder={t('users.form.passwordPlaceholder')}
              className='w-full'
            />
          </div>
          <div>
            <label className='mb-1 block text-sm font-medium text-foreground'>
              {t('users.form.notes')}
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              value={form.adminNotes}
              dir='auto'
              onChange={(e) =>
                setForm((f) => ({ ...f, adminNotes: e.target.value }))
              }
              placeholder={t('users.form.notesPlaceholder')}
              className='w-full rounded-control border border-input bg-background px-3 py-2 text-foreground'
            />
          </div>
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              type='button'
              disabled={saving}
              onClick={() => setOpen(false)}
              severity='secondary'
              label={t('common.cancel')}
            />
            <Button
              type='submit'
              disabled={saving}
              label={saving ? t('users.form.saving') : t('users.form.save')}
              className='bg-brand-purple hover:bg-brand-purple-light'
            />
          </div>
        </form>
      </DialogWrapper>
    </motion.div>
  );
}
