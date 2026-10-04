import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Ban,
  Check,
  CircleCheck,
  Pencil,
  Receipt,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react';
import {
  useAdminUsers,
  useDeleteUserMutation,
  useUpdateUserMutation,
} from '../hooks/useAdminUsers';
import {
  authApi,
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
import { cn } from '../lib/cn';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { IconButton } from '../components/ui/IconButton';
import { Tip } from '../components/ui/Tooltip';
import {
  DataTable,
  RowActions,
  type DataTableColumn,
} from '../components/ui/DataTable';
import { FilterBar, FilterBarItem } from '../components/ui/FilterBar';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { FormActions, FormDialog } from '../components/ui/FormDialog';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { buttonVariants, focusRing, labelClass } from '../components/ui/styles';

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

  // The API already rejects an admin disabling/deleting their own account —
  // hiding the buttons on that row avoids a confusing 400 from a click that
  // was never going to work.
  const currentUserQ = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authApi.getProfile(),
    staleTime: 30_000,
  });
  const currentUserId = currentUserQ.data?.user?._id;

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
  const isEditingSelf =
    Boolean(currentUserId) && editing?._id === currentUserId;

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

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'username',
      header: t('users.columns.username'),
      sortable: true,
      cell: (user) => (
        <div className='flex items-center gap-3'>
          <span
            aria-hidden
            className='flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold uppercase text-muted-foreground'
          >
            {user.username.charAt(0)}
          </span>
          <div className='min-w-0'>
            <p className='flex flex-wrap items-center gap-1.5'>
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
            </p>
            {user.adminNotes && (
              <p
                className='max-w-[16rem] truncate text-xs text-muted-foreground'
                title={user.adminNotes}
                dir='auto'
              >
                {user.adminNotes}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('users.columns.email'),
      sortable: true,
      cell: (user) => (
        <div className='flex flex-wrap items-center gap-1.5'>
          <span dir='ltr'>{user.email}</span>
          {user.emailVerifiedAt === null && (
            <StatusBadge
              status='unconfirmed'
              title={t('users.unconfirmedHint')}
            >
              {t('users.unconfirmed')}
            </StatusBadge>
          )}
        </div>
      ),
    },
    {
      key: 'roles',
      header: t('users.columns.roles'),
      cell: (user) => (
        <div className='flex flex-wrap gap-1'>
          {(user.roles?.length ? user.roles : [primaryRole(user.roles)]).map(
            (role: string) => (
              <Badge
                key={role}
                tone={role === 'admin' ? 'solid' : role === 'moderator' ? 'outline' : 'neutral'}
                plain
              >
                {tv('role', role)}
              </Badge>
            ),
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: t('users.columns.joined'),
      sortable: true,
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (user) => (user.createdAt ? formatDate(user.createdAt) : '—'),
    },
    {
      key: 'actions',
      header: t('users.columns.actions'),
      actions: true,
      cell: (user) => {
        const isSelf = Boolean(currentUserId) && user._id === currentUserId;
        return (
          <RowActions>
            {can('orders:read') && (
              <Tip label={t('users.orderHistory')}>
                <Link
                  to={`/orders?user=${user._id}`}
                  aria-label={t('users.ordersOf', { name: user.username })}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                    'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Receipt aria-hidden />
                </Link>
              </Tip>
            )}
            {can('users:write') && !isSelf && (
              <IconButton
                icon={
                  user.disabled ? <CircleCheck aria-hidden /> : <Ban aria-hidden />
                }
                label={
                  user.disabled
                    ? t('users.enableUser', { name: user.username })
                    : t('users.disableUser', { name: user.username })
                }
                onClick={() => void handleToggleDisabled(user)}
                disabled={updateMut.isPending}
              />
            )}
            {can('users:write') && (
              <IconButton
                icon={<Pencil aria-hidden />}
                label={t('users.editUser', { name: user.username })}
                onClick={() => openEdit(user)}
              />
            )}
            {can('users:delete') && !isSelf && (
              <IconButton
                icon={<Trash2 aria-hidden />}
                label={t('users.deleteUser', { name: user.username })}
                onClick={() => void handleDelete(user)}
                disabled={deleteMut.isPending}
              />
            )}
          </RowActions>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={t('users.title')}
        description={t('users.subtitle')}
      />

      {usersQ.isError ? (
        <Alert tone='error'>
          {errorMessage(usersQ.error, t('users.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('users.title')}
          data={users}
          columns={columns}
          getKey={(user) => user._id}
          loading={usersQ.isLoading}
          fetching={usersQ.isFetching}
          sort={table.sort}
          order={table.order}
          onSort={table.toggleSort}
          meta={meta}
          onPage={table.setPage}
          onLimit={table.setLimit}
          rowClassName={(user) => (user.disabled ? 'opacity-70' : undefined)}
          emptyIcon={<UsersIcon aria-hidden />}
          emptyTitle={t('users.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                onSubmit: () => {
                  setAppliedQ(search.trim());
                  resetPage();
                },
                placeholder: t('users.searchPlaceholder'),
                label: t('users.searchLabel'),
                submitLabel: t('common.search'),
              }}
              canClear={Boolean(appliedQ || roleFilter)}
              onClear={() => {
                setSearch('');
                setAppliedQ('');
                setRoleFilter('');
                resetPage();
              }}
            >
              <FilterBarItem>
                <Select
                  aria-label={t('users.filterRole')}
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as AppRole | '');
                    resetPage();
                  }}
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
                </Select>
              </FilterBarItem>
            </FilterBar>
          }
        />
      )}

      {open && (
        <FormDialog
          onClose={() => setOpen(false)}
          title={t('users.form.title')}
          description={editing?.email}
          busy={saving}
        >
          <form
            onSubmit={handleSubmit}
            className='space-y-4'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('users.form.username')}
                required
              >
                <Input
                  required
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </Field>
              <Field
                label={t('users.form.email')}
                required
              >
                <Input
                  type='email'
                  dir='ltr'
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div
              role='group'
              aria-labelledby='user-roles-label'
              className='space-y-1.5'
            >
              <p
                id='user-roles-label'
                className={labelClass}
              >
                {t('users.form.roles')}
              </p>
              <div className='flex flex-wrap gap-2'>
                {ROLES.map((role) => {
                  const selected = form.roles.includes(role);
                  // The API rejects an admin removing their own admin role
                  // (nobody left to undo it), so that one toggle is locked
                  // when editing yourself — adding a role to yourself is
                  // still fine and stays enabled.
                  const lockedForSelf =
                    isEditingSelf && role === 'admin' && selected;
                  return (
                    <button
                      key={role}
                      type='button'
                      aria-pressed={selected}
                      disabled={lockedForSelf}
                      title={lockedForSelf ? t('users.form.cannotRemoveOwnAdmin') : undefined}
                      onClick={() => toggleRole(role)}
                      className={cn(
                        'inline-flex h-control items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors duration-fast',
                        focusRing,
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border-strong bg-background text-foreground hover:bg-accent',
                        lockedForSelf && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      {selected && (
                        <Check
                          className='size-3.5'
                          aria-hidden
                        />
                      )}
                      {tv('role', role)}
                    </button>
                  );
                })}
              </div>
            </div>
            {!isEditingSelf && (
              <Field label={t('users.form.password')}>
                <Input
                  type='password'
                  autoComplete='new-password'
                  minLength={8}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder={t('users.form.passwordPlaceholder')}
                />
              </Field>
            )}
            <Field label={t('users.form.notes')}>
              <Textarea
                rows={3}
                maxLength={2000}
                value={form.adminNotes}
                dir='auto'
                onChange={(e) =>
                  setForm((f) => ({ ...f, adminNotes: e.target.value }))
                }
                placeholder={t('users.form.notesPlaceholder')}
              />
            </Field>
            <FormActions
              onCancel={() => setOpen(false)}
              saving={saving}
              submitLabel={t('users.form.save')}
            />
          </form>
        </FormDialog>
      )}
    </>
  );
}
