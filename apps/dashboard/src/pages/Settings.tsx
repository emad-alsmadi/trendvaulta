import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  Palette,
  Save,
  Store,
  User,
} from 'lucide-react';
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
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button, Spinner } from '../components/ui/Button';
import { Card, KeyValue } from '../components/ui/Card';
import {
  Field,
  FieldError,
  Input,
  Switch,
  Textarea,
} from '../components/ui/Field';
import { Badge } from '../components/ui/StatusBadge';
import { text } from '../components/ui/styles';

const PROFILE_KEY = ['auth', 'profile'] as const;

/** Settings group: what it is on the start side, its form on the end side. */
function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className='flex flex-col gap-4 border-b border-border pb-8 last:border-0 last:pb-0 lg:grid-cols-[18rem_1fr] lg:gap-8'>
      <div className='flex items-center gap-4'>
        <span
          aria-hidden
          className='flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-card text-foreground shadow-card [&_svg]:size-4'
        >
          {icon}
        </span>
        <div className='space-y-1'>
          <h2 className={text.section}>{title}</h2>
          {description && (
            <p className={text.secondary}>{description}</p>
          )}
        </div>
      </div>
      <Card>{children}</Card>
    </section>
  );
}

function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p
      role='status'
      className='flex items-center gap-1.5 text-sm font-medium text-foreground'
    >
      <CheckCircle2
        className='size-4'
        aria-hidden
      />
      {children}
    </p>
  );
}

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
    <>
      <PageHeader
        title={t('settings.title')}
        description={t('settings.subtitle')}
      />

      {profileQ.isLoading && (
        <div className='mb-6'>
          <Spinner label={t('settings.loadingProfile')} />
        </div>
      )}

      {profileQ.isError && (
        <Alert
          tone='error'
          className='mb-6'
        >
          {errorMessage(profileQ.error, t('settings.profileLoadFailed'))}
        </Alert>
      )}

      <div className='space-y-8'>
        {/* Account */}
        <SettingsSection
          icon={<User />}
          title={t('settings.account.title')}
          description={user?.email}
        >
          <form
            onSubmit={saveProfile}
            className='space-y-4'
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field
                label={t('settings.account.username')}
                required
              >
                <Input
                  id='settings-username'
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
              <Field
                label={t('settings.account.email')}
                required
              >
                <Input
                  id='settings-email'
                  type='email'
                  dir='ltr'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>
            {emailChanged && (
              <Field label={t('settings.account.currentPassword')}>
                <Input
                  type='password'
                  autoComplete='current-password'
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                />
              </Field>
            )}
            {profileMsg && <SuccessNote>{profileMsg}</SuccessNote>}
            {profileErr && <FieldError>{profileErr}</FieldError>}
            <div className='flex justify-end border-t border-border pt-4'>
              <Button
                type='submit'
                variant='primary'
                loading={profileSaving}
                disabled={profileQ.isLoading}
                icon={<Save aria-hidden />}
              >
                {t('settings.account.save')}
              </Button>
            </div>
          </form>
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          icon={<Palette />}
          title={t('settings.appearance.title')}
        >
          <div className='flex items-center justify-between gap-4'>
            <div>
              <p className={text.cardTitle}>
                {t('settings.appearance.darkMode')}
              </p>
              <p className={text.secondary}>
                {t('settings.appearance.darkModeHint')}
              </p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              aria-label={t('settings.appearance.darkMode')}
            />
          </div>
        </SettingsSection>

        {/* Store settings (shipping/tax) — settings:write (admin only) */}
        {canEditStoreSettings && (
          <SettingsSection
            icon={<Store />}
            title={t('settings.store.title')}
            description={t('settings.store.subtitle')}
          >
            {storeSettingsQ.isLoading && (
              <div className='mb-4'>
                <Spinner label={t('settings.store.loading')} />
              </div>
            )}

            {storeSettingsQ.isError && (
              <Alert
                tone='error'
                className='mb-4'
              >
                {errorMessage(
                  storeSettingsQ.error,
                  t('settings.store.loadFailed'),
                )}
              </Alert>
            )}

            <form
              onSubmit={saveStoreSettings}
              className='space-y-6'
            >
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label={t('settings.store.name')}>
                  <Input
                    id='settings-store-name'
                    value={storeName}
                    dir='auto'
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </Field>
                <Field label={t('settings.store.contactEmail')}>
                  <Input
                    id='settings-contact-email'
                    type='email'
                    dir='ltr'
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </Field>
                <Field label={t('settings.store.standardShipping')}>
                  <Input
                    id='settings-standard-shipping'
                    type='number'
                    min={0}
                    step='0.01'
                    value={standardRateUsd}
                    onChange={(e) => setStandardRateUsd(e.target.value)}
                  />
                </Field>
                <Field label={t('settings.store.expressShipping')}>
                  <Input
                    id='settings-express-shipping'
                    type='number'
                    min={0}
                    step='0.01'
                    value={expressRateUsd}
                    onChange={(e) => setExpressRateUsd(e.target.value)}
                  />
                </Field>
                <Field label={t('settings.store.freeThreshold')}>
                  <Input
                    id='settings-free-shipping-threshold-0-disabled'
                    type='number'
                    min={0}
                    step='0.01'
                    value={freeShippingThresholdUsd}
                    onChange={(e) =>
                      setFreeShippingThresholdUsd(e.target.value)
                    }
                  />
                </Field>
                <Field label={t('settings.store.taxRate')}>
                  <Input
                    id='settings-tax-rate'
                    type='number'
                    min={0}
                    max={100}
                    step='0.01'
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(e.target.value)}
                  />
                </Field>
              </div>

              <div className='space-y-4 border-t border-border pt-5'>
                <div>
                  <h3 className={text.cardTitle}>
                    {t('settings.store.invoices')}
                  </h3>
                  <p className={text.secondary}>
                    {t('settings.store.invoicesHint')}
                  </p>
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <Field label={t('settings.store.legalName')}>
                    <Input
                      id='settings-invoice-legal-name'
                      dir='auto'
                      maxLength={200}
                      value={invoiceLegalName}
                      onChange={(e) => setInvoiceLegalName(e.target.value)}
                    />
                  </Field>
                  <Field label={t('settings.store.taxId')}>
                    <Input
                      id='settings-invoice-tax-id'
                      maxLength={60}
                      value={invoiceTaxId}
                      dir='ltr'
                      onChange={(e) => setInvoiceTaxId(e.target.value)}
                    />
                  </Field>
                  <Field
                    label={t('settings.store.address')}
                    className='sm:col-span-2'
                  >
                    <Textarea
                      id='settings-invoice-address'
                      dir='auto'
                      rows={3}
                      maxLength={500}
                      value={invoiceAddress}
                      onChange={(e) => setInvoiceAddress(e.target.value)}
                    />
                  </Field>
                  <Field
                    label={t('settings.store.prefix')}
                    hint={t('settings.store.prefixHint', {
                      example: `${(invoicePrefix || 'TV').toUpperCase()}-${new Date().getFullYear()}-000123`,
                    })}
                  >
                    <Input
                      id='settings-invoice-prefix'
                      maxLength={10}
                      pattern='[A-Za-z0-9]{1,10}'
                      value={invoicePrefix}
                      dir='ltr'
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                      className='font-mono uppercase'
                    />
                  </Field>
                </div>
              </div>
              <div className='flex justify-end border-t border-border pt-4'>
                <Button
                  type='submit'
                  variant='primary'
                  loading={updateStoreSettingsMut.isPending}
                  disabled={storeSettingsQ.isLoading}
                  icon={<Save aria-hidden />}
                >
                  {t('settings.store.save')}
                </Button>
              </div>
            </form>
          </SettingsSection>
        )}

        {/* Password */}
        <SettingsSection
          icon={<KeyRound />}
          title={t('settings.password.title')}
          description={t('settings.password.hint')}
        >
          <form
            onSubmit={savePassword}
            className='space-y-4'
          >
            <Field label={t('settings.password.current')}>
              <Input
                id='settings-current-password'
                type='password'
                autoComplete='current-password'
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label={t('settings.password.new')}>
                <Input
                  id='settings-new-password'
                  type='password'
                  autoComplete='new-password'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('settings.password.newPlaceholder')}
                />
              </Field>
              <Field label={t('settings.password.confirm')}>
                <Input
                  id='settings-confirm-new-password'
                  type='password'
                  autoComplete='new-password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
            </div>
            {passwordMsg && <SuccessNote>{passwordMsg}</SuccessNote>}
            {passwordErr && <FieldError>{passwordErr}</FieldError>}
            <div className='flex justify-end border-t border-border pt-4'>
              <Button
                type='submit'
                variant='primary'
                loading={passwordSaving}
                disabled={!user}
              >
                {t('settings.password.update')}
              </Button>
            </div>
          </form>
        </SettingsSection>

        {/* Session / env */}
        <SettingsSection
          icon={<LogOut className='rtl:-scale-x-100' />}
          title={t('settings.session.title')}
        >
          <dl className='divide-y divide-border'>
            <KeyValue label={t('settings.session.roleCookie')}>
              {getAuthRole() ? tv('role', getAuthRole()) : '—'}
            </KeyValue>
            <KeyValue label={t('settings.session.roles')}>
              {(user?.roles || [])
                .map((r) => tv('role', r))
                .join(locale === 'ar' ? '، ' : ', ') || '—'}
            </KeyValue>
            <KeyValue label={t('settings.session.apiBase')}>
              <span
                className='font-mono text-xs'
                dir='ltr'
              >
                {apiBase}
              </span>
            </KeyValue>
            {permissions.length > 0 && (
              <div className='space-y-2 py-2.5'>
                <dt className={text.secondary}>
                  {t('settings.session.permissions')}
                </dt>
                <dd
                  className='flex flex-wrap gap-1'
                  dir='ltr'
                >
                  {permissions.slice(0, 12).map((p) => (
                    <Badge
                      key={p}
                      plain
                      className='h-5 font-mono text-[0.6875rem]'
                    >
                      {p}
                    </Badge>
                  ))}
                  {permissions.length > 12 && (
                    <span className='text-xs text-muted-foreground'>
                      {t('settings.session.more', {
                        count: formatNumber(permissions.length - 12),
                      })}
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
          <div className='mt-4 flex justify-end border-t border-border pt-4'>
            <Button
              variant='destructive'
              onClick={() => void handleLogout()}
              icon={
                <LogOut
                  className='rtl:-scale-x-100'
                  aria-hidden
                />
              }
            >
              {t('settings.session.logout')}
            </Button>
          </div>
        </SettingsSection>
      </div>
    </>
  );
}
