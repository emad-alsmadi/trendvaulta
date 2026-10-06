import { useState } from 'react';
import {
  BarChart3,
  Eye,
  EyeOff,
  Languages,
  Lock,
  Mail,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, errorMessage } from '../lib/api';
import { pickPrimaryRole, setAuthSession } from '../lib/auth';
import { isStaffRole } from '../lib/permissions';
import { useT } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/en';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Checkbox, FieldError } from '../components/ui/Field';
import { focusRing, inputClass, labelClass } from '../components/ui/styles';
import { cn } from '../lib/cn';

/** Thrown by our own guards; the message is a translation key. */
class LoginGuardError extends Error {
  constructor(readonly key: MessageKey) {
    super(key);
  }
}

const HIGHLIGHTS = [
  { icon: Package, text: 'login.highlightOrders' },
  { icon: BarChart3, text: 'login.highlightAnalytics' },
  { icon: ShieldCheck, text: 'login.highlightAccess' },
] as const;

/** Taller controls on the sign-in card: easier to hit, calmer to read. */
const loginInput = cn(inputClass, 'h-control-lg ps-10');

/** Why the API client signed the visitor out (`/login?reason=…`), if it did. */
function sessionEndedNotice(reason: string | null): MessageKey | null {
  if (reason === 'revoked') return 'login.sessionRevoked';
  if (reason === 'expired') return 'login.sessionExpired';
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale, setLocale } = useT();
  const locationState = (location.state ?? {}) as {
    from?: string;
    reason?: string;
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [remember, setRemember] = useState(true);
  // The API client's forced logout reloads the page, so its reason arrives
  // in the query string instead of router state (lib/api.ts).
  const [notice, setNotice] = useState<MessageKey | null>(() =>
    sessionEndedNotice(new URLSearchParams(location.search).get('reason')),
  );
  // A key for our own messages, or already-resolved API text.
  const [error, setError] = useState<{ key: MessageKey } | { text: string } | null>(
    locationState.reason === 'forbidden' ? { key: 'login.errorNoAccess' } : null,
  );
  const errorText = error ? ('key' in error ? t(error.key) : error.text) : null;
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const data = await authApi.login({ email: email.trim(), password });
      if (!data.token) throw new LoginGuardError('login.errorNoToken');
      const role = pickPrimaryRole(data.roles);
      if (!isStaffRole(role)) throw new LoginGuardError('login.errorNoAccess');
      setAuthSession({
        token: data.token,
        role,
        refreshToken: data.refreshToken,
        remember,
      });
      navigate(locationState.from || '/orders', { replace: true });
    } catch (err) {
      // Our own guard messages are user-facing; errorMessage() would replace
      // any plain Error with the fallback ("Invalid email or password").
      setError(
        err instanceof LoginGuardError
          ? { key: err.key }
          : { text: errorMessage(err, t('login.errorInvalid')) },
      );
    } finally {
      setLoading(false);
    }
  };

  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  return (
    <div className='grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'>
      {/* Brand panel — desktop only, in the sidebar's dark ink. */}
      <aside className='relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between'>
        {/* Fine grid texture instead of colour. */}
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(hsl(var(--sidebar-foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--sidebar-foreground))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top_left,black_20%,transparent_70%)]'
        />
        <div className='relative flex items-center gap-2.5'>
          <span className='flex size-9 items-center justify-center rounded-control bg-sidebar-foreground text-xs font-bold text-sidebar'>
            TV
          </span>
          <span className='text-lg font-semibold tracking-tight'>
            TrendVaulta
          </span>
          <span className='ms-1 rounded-full border border-sidebar-border px-2 py-0.5 text-caption uppercase text-sidebar-muted'>
            {t('login.brandBadge')}
          </span>
        </div>

        <div className='relative max-w-md'>
          <h2 className='text-4xl font-semibold leading-tight tracking-tight'>
            {t('login.headline')}
          </h2>
          <ul className='mt-10 space-y-4'>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className='flex items-center gap-4 text-sidebar-muted'
              >
                <span className='inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-sidebar-border bg-sidebar-accent text-sidebar-foreground'>
                  <Icon
                    className='size-5'
                    aria-hidden
                  />
                </span>
                {t(text)}
              </li>
            ))}
          </ul>
        </div>

        <p className='relative text-xs text-sidebar-muted/70'>
          © {new Date().getFullYear()} TrendVaulta
        </p>
      </aside>

      {/* Form */}
      <main className='relative flex items-center justify-center px-6 py-12 sm:px-10'>
        <button
          type='button'
          onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
          aria-label={t('common.switchLanguageLabel')}
          lang={locale === 'en' ? 'ar' : 'en'}
          className={cn(
            'absolute end-4 top-4 inline-flex h-control items-center gap-2 rounded-control px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            focusRing,
          )}
        >
          <Languages
            className='size-4'
            aria-hidden
          />
          {t('common.switchLanguage')}
        </button>

        <div className='page-transition w-full max-w-sm'>
          <div className='mb-8 flex items-center gap-2.5 lg:hidden'>
            <span className='flex size-9 items-center justify-center rounded-control bg-primary text-xs font-bold text-primary-foreground'>
              TV
            </span>
            <span className='text-lg font-semibold tracking-tight text-foreground'>
              TrendVaulta Admin
            </span>
          </div>

          <h1 className='text-page-title text-foreground'>
            {t('login.title')}
          </h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            {t('login.subtitle')}
          </p>

          <form
            onSubmit={handleLogin}
            className='mt-8 space-y-5'
          >
            {notice && <Alert tone='warning'>{t(notice)}</Alert>}
            {errorText && <Alert tone='error'>{errorText}</Alert>}

            <div className='space-y-1.5'>
              <label
                htmlFor='admin-email'
                className={labelClass}
              >
                {t('login.email')}
              </label>
              <div className='relative'>
                <Mail
                  className='pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
                  aria-hidden
                />
                <input
                  id='admin-email'
                  type='email'
                  required
                  autoFocus
                  autoComplete='username'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='admin@example.com'
                  dir='ltr'
                  disabled={loading}
                  aria-invalid={Boolean(error) || undefined}
                  className={cn(loginInput, 'pe-3')}
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='admin-password'
                className={labelClass}
              >
                {t('login.password')}
              </label>
              <div className='relative'>
                <Lock
                  className='pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
                  aria-hidden
                />
                <input
                  id='admin-password'
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete='current-password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={trackCapsLock}
                  onKeyDown={trackCapsLock}
                  onBlur={() => setCapsLock(false)}
                  placeholder='••••••••'
                  disabled={loading}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={capsLock ? 'caps-lock-hint' : undefined}
                  className={cn(loginInput, 'pe-11')}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword((v) => !v)}
                  // Keep focus (and the caret) in the field while toggling.
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label={
                    showPassword
                      ? t('login.hidePassword')
                      : t('login.showPassword')
                  }
                  aria-pressed={showPassword}
                  aria-controls='admin-password'
                  className='absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-control text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
                >
                  {showPassword ? (
                    <EyeOff
                      className='size-4'
                      aria-hidden
                    />
                  ) : (
                    <Eye
                      className='size-4'
                      aria-hidden
                    />
                  )}
                </button>
              </div>
              {capsLock && (
                <FieldError id='caps-lock-hint'>{t('login.capsLock')}</FieldError>
              )}
            </div>

            <Checkbox
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              label={t('login.remember')}
            />

            <Button
              type='submit'
              variant='primary'
              size='lg'
              loading={loading}
              className='w-full'
            >
              {t('login.submit')}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
