import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Pencil, Trash2, X } from 'lucide-react';
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

const ROLES: AppRole[] = ['user', 'moderator', 'admin'];

type UserForm = {
  email: string;
  username: string;
  roles: AppRole[];
  password: string;
};

function primaryRole(roles?: AppRole[]) {
  if (!roles?.length) return 'user';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('moderator')) return 'moderator';
  return roles[0];
}

export default function Users() {
  const usersQ = useAdminUsers();
  const updateMut = useUpdateUserMutation();
  const deleteMut = useDeleteUserMutation();

  const [search, setSearch] = useState('');
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

  const filtered = useMemo(() => {
    const list = usersQ.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.roles || []).some((r) => r.toLowerCase().includes(q)),
    );
  }, [usersQ.data, search]);

  function openEdit(user: AdminUser) {
    setEditing(user);
    setForm({
      email: user.email,
      username: user.username,
      roles: (user.roles?.length ? user.roles : ['user']) as AppRole[],
      password: '',
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
      window.alert('Email and username are required.');
      return;
    }

    const payload: UserUpdatePayload = {
      email: form.email.trim(),
      username: form.username.trim(),
      roles: form.roles,
    };
    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    try {
      await updateMut.mutateAsync({ id: editing._id, payload });
      setOpen(false);
      setEditing(null);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not update user'));
    }
  }

  async function handleDelete(user: AdminUser) {
    const ok = window.confirm(
      `Delete user "${user.email}" permanently? This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(user._id);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not delete user'));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Users
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Live accounts from the API. New users register via the storefront —
            admins can edit roles here.
          </p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, username, or role…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {usersQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">Loading users…</p>
      )}

      {usersQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(usersQ.error, 'Failed to load users')}
        </div>
      )}

      {!usersQ.isLoading && !usersQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Username', 'Email', 'Roles', 'Joined', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No users match this search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr
                      key={user._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {user.username}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles?.length
                            ? user.roles
                            : [primaryRole(user.roles)]
                          ).map((role) => (
                            <span
                              key={role}
                              className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600"
                            aria-label={`Edit ${user.username}`}
                          >
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(user)}
                            disabled={deleteMut.isPending}
                            className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                            aria-label={`Delete ${user.username}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Showing {filtered.length} of {users.length} users
          </p>
        </div>
      )}

      {open && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit user
              </h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Username
                </span>
                <input
                  required
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Roles
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => {
                    const selected = form.roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        aria-pressed={selected}
                        className={`rounded-full border px-3 py-1 text-sm font-medium ${
                          selected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  New password (optional)
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
