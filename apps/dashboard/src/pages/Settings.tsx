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
import { useT } from '../i18n/I18nProvider';

const PROFILE_KEY = ['auth', 'profile'] as const;

export default function Settings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const { can } = usePermissions();
  const toast = useToast();
  const { t, tv, locale, formatNumber } = useT();
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
  const [invoiceLegalName, setInvoiceLegalName] = useState('');
  const [invoiceAddress, setInvoiceAddress] = useState('');
  const [invoiceTaxId, setInvoiceTaxId] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');

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
    setInvoiceLegalName(data.invoice?.legalName || '');
    setInvoiceAddress(data.invoice?.address || '');
    setInvoiceTaxId(data.invoice?.taxId || '');
    setInvoicePrefix(data.invoice?.prefix || 'TV');
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
        invoice: {
          legalName: invoiceLegalName.trim(),
          address: invoiceAddress.trim(),
          taxId: invoiceTaxId.trim(),
          prefix: invoicePrefix.trim().toUpperCase() || 'TV',
        },
      });
      toast.success(t('settings.store.updated'));
    } catch (err) {
      toast.error(errorMessage(err, t('settings.store.failed')));
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    if (emailChanged && !profilePassword) {
      setProfileErr(t('settings.account.needPassword'));
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
      setProfileMsg(t('settings.account.updated'));
    } catch (err) {
      setProfileErr(errorMessage(err, t('settings.account.failed')));
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);

    if (!currentPassword) {
      setPasswordErr(t('settings.password.needCurrent'));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordErr(t('settings.password.tooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr(t('settings.password.mismatch'));
      return;
    }

    setPasswordSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      // The API revokes every session (this one included), so sign in again
      // now instead of being logged out silently at the next token refresh.
      clearAuthSession();
      qc.clear();
      toast.success(t('settings.password.updated'));
      navigate('/login');
    } catch (err) {
      setPasswordErr(errorMessage(err, t('settings.password.failed')));
      setPasswordSaving(false);
    }
  }

  async function handleLogout() {
    await authApi.logout(getRefreshToken());
    clearAuthSession();
    qc.clear();
    navigate('/login');
  }

  const apiBase = viteEnv.VITE_API_URL || t('settings.session.apiProxy');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
        {t('settings.title')}
      </h1>
      <p className="mb-8 text-sm text-gray-600 dark:text-gray-400">
        {t('settings.subtitle')}
      </p>

      {profileQ.isLoading && (
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t('settings.loadingProfile')}
        </div>
      )}

      {profileQ.isError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(profileQ.error, t('settings.profileLoadFailed'))}
        </div>
      )}

      <div className="space-y-6">
        {/* Account */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <User className="me-2 h-5 w-5 text-blue-500" aria-hidden />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('settings.account.title')}
            </h2>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label htmlFor="settings-username" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.account.username')}
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
                {t('settings.account.email')}
              </label>
              <input
                id="settings-email"
                type="email"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            {emailChanged && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.account.currentPassword')}
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
              <Save className="me-2 h-4 w-4" aria-hidden />
              {profileSaving ? t('common.saving') : t('settings.account.save')}
            </button>
          </form>
        </section>

        {/* Appearance */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <Palette className="me-2 h-5 w-5 text-blue-500" aria-hidden />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('settings.appearance.title')}
            </h2>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('settings.appearance.darkMode')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.appearance.darkModeHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={theme === 'dark'}
              aria-label={t('settings.appearance.darkMode')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  theme === 'dark' ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0.5 rtl:-translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Store settings (shipping/tax) — settings:write (admin only) */}
        {canEditStoreSettings && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center">
              <Store className="me-2 h-5 w-5 text-blue-500" aria-hidden />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('settings.store.title')}
              </h2>
            </div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('settings.store.subtitle')}
            </p>

            {storeSettingsQ.isLoading && (
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t('settings.store.loading')}
              </div>
            )}

            {storeSettingsQ.isError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {errorMessage(storeSettingsQ.error, t('settings.store.loadFailed'))}
              </div>
            )}

            <form onSubmit={saveStoreSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="settings-store-name" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.store.name')}
                  </label>
                  <input
                    id="settings-store-name"
                    value={storeName}
                    dir="auto"
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="settings-contact-email" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.store.contactEmail')}
                  </label>
                  <input
                    id="settings-contact-email"
                    type="email"
                    dir="ltr"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="settings-standard-shipping" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.store.standardShipping')}
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
                    {t('settings.store.expressShipping')}
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
                    {t('settings.store.freeThreshold')}
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
                    {t('settings.store.taxRate')}
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

              <fieldset className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-white">
                  {t('settings.store.invoices')}
                </legend>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.store.invoicesHint')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="settings-invoice-legal-name" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.store.legalName')}
                    </label>
                    <input
                      id="settings-invoice-legal-name"
                      dir="auto"
                      maxLength={200}
                      value={invoiceLegalName}
                      onChange={(e) => setInvoiceLegalName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-invoice-tax-id" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.store.taxId')}
                    </label>
                    <input
                      id="settings-invoice-tax-id"
                      maxLength={60}
                      value={invoiceTaxId}
                      dir="ltr"
                      onChange={(e) => setInvoiceTaxId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="settings-invoice-address" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.store.address')}
                    </label>
                    <textarea
                      id="settings-invoice-address"
                      dir="auto"
                      rows={3}
                      maxLength={500}
                      value={invoiceAddress}
                      onChange={(e) => setInvoiceAddress(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-invoice-prefix" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.store.prefix')}
                    </label>
                    <input
                      id="settings-invoice-prefix"
                      maxLength={10}
                      pattern="[A-Za-z0-9]{1,10}"
                      value={invoicePrefix}
                      dir="ltr"
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                      aria-describedby="settings-invoice-prefix-help"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 uppercase text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                    <p id="settings-invoice-prefix-help" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('settings.store.prefixHint', {
                        example: `${(invoicePrefix || 'TV').toUpperCase()}-${new Date().getFullYear()}-000123`,
                      })}
                    </p>
                  </div>
                </div>
              </fieldset>
              <button
                type="submit"
                disabled={updateStoreSettingsMut.isPending || storeSettingsQ.isLoading}
                className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
              >
                <Save className="me-2 h-4 w-4" aria-hidden />
                {updateStoreSettingsMut.isPending ? t('common.saving') : t('settings.store.save')}
              </button>
            </form>
          </section>
        )}

        {/* Password */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <Shield className="me-2 h-5 w-5 text-blue-500" aria-hidden />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('settings.password.title')}
            </h2>
          </div>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {t('settings.password.hint')}
          </p>
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label htmlFor="settings-current-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.password.current')}
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
                {t('settings.password.new')}
              </label>
              <input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('settings.password.newPlaceholder')}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="settings-confirm-new-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.password.confirm')}
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
              {passwordSaving ? t('settings.password.updating') : t('settings.password.update')}
            </button>
          </form>
        </section>

        {/* Session / env */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            {t('settings.session.title')}
          </h2>
          <dl className="mb-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{t('settings.session.roleCookie')}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {getAuthRole() ? tv('role', getAuthRole()) : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{t('settings.session.roles')}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {(user?.roles || []).map((r) => tv('role', r)).join(locale === 'ar' ? '، ' : ', ') || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{t('settings.session.apiBase')}</dt>
              <dd className="font-mono text-xs text-gray-900 dark:text-white" dir="ltr">
                {apiBase}
              </dd>
            </div>
            {permissions.length > 0 && (
              <div>
                <dt className="mb-1 text-gray-500">{t('settings.session.permissions')}</dt>
                <dd className="flex flex-wrap gap-1" dir="ltr">
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
                      {t('settings.session.more', { count: formatNumber(permissions.length - 12) })}
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
            <LogOut className="me-2 h-4 w-4 rtl:-scale-x-100" aria-hidden />
            {t('settings.session.logout')}
          </button>
        </section>
      </div>
    </motion.div>
  );
}
