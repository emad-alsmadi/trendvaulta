import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Save, Shield, Palette, User, LogOut, Loader2, Store } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { authApi, errorMessage } from '../lib/api';
import { clearAuthSession, getAuthRole, getRefreshToken } from '../lib/auth';
import { viteEnv } from '../lib/viteEnv';
import { usePermissions } from '../hooks/usePermissions';
import {
  useAdminSettings,
  useUpdateStoreSettingsMutation,
} from '../hooks/useAdminSettings';
import { useToast } from '../components/ui/Toast';

const PROFILE_KEY = ['auth', 'profile'] as const;

export default function Settings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const { can } = usePermissions();
  const toast = useToast();
  const canEditStoreSettings = can('settings:write');

  const profileQ = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => authApi.getProfile(),
    staleTime: 30_000,
  });

  const user = profileQ.data?.user;
  const permissions = profileQ.data?.permissions || [];

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  // Current password — the API requires it only when the email changes.
  const [profilePassword, setProfilePassword] = useState('');
  const emailChanged =
    Boolean(user) &&
    email.trim().toLowerCase() !== (user?.email || '').toLowerCase();
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username || '');
    setEmail(user.email || '');
  }, [user]);

  // Store settings (shipping/tax) — admin only
  const storeSettingsQ = useAdminSettings();
  const updateStoreSettingsMut = useUpdateStoreSettingsMutation();
  const [storeName, setStoreName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [standardRateUsd, setStandardRateUsd] = useState('');
  const [expressRateUsd, setExpressRateUsd] = useState('');
  const [freeShippingThresholdUsd, setFreeShippingThresholdUsd] = useState('');
  const [taxRatePercent, setTaxRatePercent] = useState('');

  useEffect(() => {
    const data = storeSettingsQ.data?.data;
    if (!data) return;
    setStoreName(data.storeName || '');
    setContactEmail(data.contactEmail || '');
    setStandardRateUsd(String(data.shipping?.standardRateUsd ?? 5));
    setExpressRateUsd(String(data.shipping?.expressRateUsd ?? 15));
    setFreeShippingThresholdUsd(
      String(data.shipping?.freeShippingThresholdUsd ?? 0),
    );
    setTaxRatePercent(String(data.taxRatePercent ?? 0));
  }, [storeSettingsQ.data]);

  async function saveStoreSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateStoreSettingsMut.mutateAsync({
        storeName: storeName.trim(),
        contactEmail: contactEmail.trim(),
        shipping: {
          standardRateUsd: Number(standardRateUsd),
          expressRateUsd: Number(expressRateUsd),
          freeShippingThresholdUsd: Number(freeShippingThresholdUsd),
        },
        taxRatePercent: Number(taxRatePercent),
      });
      toast.success('Store settings updated.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update store settings'));
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    if (emailChanged && !profilePassword) {
      setProfileErr('Enter your current password to change your email.');
      return;
    }
    setProfileSaving(true);
    try {
      await authApi.updateProfile({
        username: username.trim(),
        email: email.trim(),
        ...(emailChanged ? { currentPassword: profilePassword } : {}),
      });
      await qc.invalidateQueries({ queryKey: PROFILE_KEY });
      setProfilePassword('');
      setProfileMsg('Profile updated.');
    } catch (err) {
      setProfileErr(errorMessage(err, 'Could not update profile'));
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);

    if (!currentPassword) {
      setPasswordErr('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordErr('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      // The API revokes every session (this one included), so sign in again
      // now instead of being logged out silently at the next token refresh.
      clearAuthSession();
      qc.clear();
      toast.success('Password updated. Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      setPasswordErr(errorMessage(err, 'Could not update password'));
      setPasswordSaving(false);
    }
  }

  async function handleLogout() {
    await authApi.logout(getRefreshToken());
    clearAuthSession();
    qc.clear();
    navigate('/login');
  }

  const apiBase = viteEnv.VITE_API_URL || '/api (Vite proxy)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
        Settings
      </h1>
      <p className="mb-8 text-sm text-gray-600 dark:text-gray-400">
        Account, appearance, and session — wired to the live API where
        available.
      </p>

      {profileQ.isLoading && (
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading profile…
        </div>
      )}

      {profileQ.isError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(profileQ.error, 'Failed to load profile')}
        </div>
      )}

      <div className="space-y-6">
        {/* Account */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <User className="mr-2 h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Account
            </h2>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label htmlFor="settings-username" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                id="settings-username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="settings-email" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id="settings-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            {emailChanged && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current password (required to change your email)
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
            )}
            {profileMsg && (
              <p className="text-sm text-green-700 dark:text-green-400">
                {profileMsg}
              </p>
            )}
            {profileErr && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {profileErr}
              </p>
            )}
            <button
              type="submit"
              disabled={profileSaving || profileQ.isLoading}
              className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
            >
              <Save className="mr-2 h-4 w-4" />
              {profileSaving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </section>

        {/* Appearance */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <Palette className="mr-2 h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Appearance
            </h2>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Dark mode
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Stored locally in this browser
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={theme === 'dark'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Store settings (shipping/tax) — settings:write (admin only) */}
        {canEditStoreSettings && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center">
              <Store className="mr-2 h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Store settings
              </h2>
            </div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Shipping rates and tax rate applied at checkout, storefront-wide.
            </p>

            {storeSettingsQ.isLoading && (
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading store settings…
              </div>
            )}

            {storeSettingsQ.isError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {errorMessage(storeSettingsQ.error, 'Failed to load store settings')}
              </div>
            )}

            <form onSubmit={saveStoreSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="settings-store-name" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Store name
                  </label>
                  <input
                    id="settings-store-name"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="settings-contact-email" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contact email
                  </label>
                  <input
                    id="settings-contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="settings-standard-shipping" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Standard shipping ($)
                  </label>
                  <input
                    id="settings-standard-shipping"
                    type="number"
                    min={0}
                    step="0.01"
                    value={standardRateUsd}
                    onChange={(e) => setStandardRateUsd(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="settings-express-shipping" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Express shipping ($)
                  </label>
                  <input
                    id="settings-express-shipping"
                    type="number"
                    min={0}
                    step="0.01"
                    value={expressRateUsd}
                    onChange={(e) => setExpressRateUsd(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="settings-free-shipping-threshold-0-disabled" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Free shipping threshold ($, 0 = disabled)
                  </label>
                  <input
                    id="settings-free-shipping-threshold-0-disabled"
                    type="number"
                    min={0}
                    step="0.01"
                    value={freeShippingThresholdUsd}
                    onChange={(e) => setFreeShippingThresholdUsd(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="settings-tax-rate" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tax rate (%)
                  </label>
                  <input
                    id="settings-tax-rate"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updateStoreSettingsMut.isPending || storeSettingsQ.isLoading}
                className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateStoreSettingsMut.isPending ? 'Saving…' : 'Save store settings'}
              </button>
            </form>
          </section>
        )}

        {/* Password */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <Shield className="mr-2 h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Password
            </h2>
          </div>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Changing your password signs you out of every device, including
            this one.
          </p>
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label htmlFor="settings-current-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Current password
              </label>
              <input
                id="settings-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="settings-new-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                New password
              </label>
              <input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="settings-confirm-new-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm new password
              </label>
              <input
                id="settings-confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            {passwordMsg && (
              <p className="text-sm text-green-700 dark:text-green-400">
                {passwordMsg}
              </p>
            )}
            {passwordErr && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {passwordErr}
              </p>
            )}
            <button
              type="submit"
              disabled={passwordSaving || !user}
              className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
            >
              {passwordSaving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>

        {/* Session / env */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Session
          </h2>
          <dl className="mb-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Role cookie</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {getAuthRole() || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Roles</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {(user?.roles || []).join(', ') || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">API base</dt>
              <dd className="font-mono text-xs text-gray-900 dark:text-white">
                {apiBase}
              </dd>
            </div>
            {permissions.length > 0 && (
              <div>
                <dt className="mb-1 text-gray-500">Permissions</dt>
                <dd className="flex flex-wrap gap-1">
                  {permissions.slice(0, 12).map((p) => (
                    <span
                      key={p}
                      className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                    >
                      {p}
                    </span>
                  ))}
                  {permissions.length > 12 && (
                    <span className="text-xs text-gray-500">
                      +{permissions.length - 12} more
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </button>
        </section>
      </div>
    </motion.div>
  );
}
