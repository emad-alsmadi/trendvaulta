import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, errorMessage } from '../lib/api';
import { pickPrimaryRole, setAuthSession } from '../lib/auth';
import { isStaffRole } from '../lib/permissions';

const NO_ACCESS = 'This account does not have dashboard access (staff role required).';
const NO_TOKEN = 'Sign-in succeeded but no session was returned. Please try again.';

const HIGHLIGHTS = [
  { icon: Package, text: 'Orders, returns and fulfilment in one queue' },
  { icon: BarChart3, text: 'Sales and catalogue analytics' },
  { icon: ShieldCheck, text: 'Role-based access for every staff member' },
] as const;

const inputClass =
  'block w-full rounded-lg border bg-white py-2.5 ps-10 text-sm text-gray-900 shadow-sm transition-[border-color,box-shadow] placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? {}) as {
    from?: string;
    reason?: string;
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(
    locationState.reason === 'forbidden' ? NO_ACCESS : null,
  );
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login({ email: email.trim(), password });
      if (!data.token) throw new Error(NO_TOKEN);
      const role = pickPrimaryRole(data.roles);
      if (!isStaffRole(role)) throw new Error(NO_ACCESS);
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
      const own = err instanceof Error && (err.message === NO_ACCESS || err.message === NO_TOKEN);
      setError(own ? (err as Error).message : errorMessage(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  const fieldBorder = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15 dark:border-red-800'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/15 dark:border-gray-700';

  return (
    <div className='grid min-h-screen bg-white dark:bg-gray-950 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'>
      {/* Brand panel — desktop only. */}
      <aside className='relative hidden overflow-hidden bg-gray-950 p-12 text-white lg:flex lg:flex-col lg:justify-between'>
        <div
          aria-hidden
          className='pointer-events-none absolute -end-32 -top-32 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-3xl'
        />
        <div
          aria-hidden
          className='pointer-events-none absolute -bottom-40 -start-24 h-[28rem] w-[28rem] rounded-full bg-indigo-600/25 blur-3xl'
        />
        <div className='relative flex items-center gap-2.5'>
          <span className='inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500'>
            <Sparkles className='h-5 w-5' aria-hidden />
          </span>
          <span className='text-lg font-bold tracking-tight'>TrendVaulta</span>
          <span className='ms-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white/60'>
            Admin
          </span>
        </div>

        <div className='relative max-w-md'>
          <h2 className='text-4xl font-bold leading-tight tracking-tight'>
            Run the store from one calm place.
          </h2>
          <ul className='mt-10 space-y-5'>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className='flex items-center gap-4 text-white/80'>
                <span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10'>
                  <Icon className='h-5 w-5' aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className='relative text-xs text-white/40'>© {new Date().getFullYear()} TrendVaulta</p>
      </aside>

      {/* Form */}
      <main className='flex items-center justify-center px-6 py-12 sm:px-10'>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className='w-full max-w-sm'
        >
          <div className='mb-8 flex items-center gap-2.5 lg:hidden'>
            <span className='inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 text-white'>
              <Sparkles className='h-5 w-5' aria-hidden />
            </span>
            <span className='text-lg font-bold tracking-tight text-gray-900 dark:text-white'>TrendVaulta Admin</span>
          </div>

          <h1 className='text-2xl font-bold tracking-tight text-gray-900 dark:text-white'>
            Sign in
          </h1>
          <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
            Use a staff account to access the dashboard.
          </p>

          <form onSubmit={handleLogin} className='mt-8 space-y-5'>
            {error && (
              <motion.div
                role='alert'
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className='flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
              >
                <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor='admin-email' className='mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Email address
              </label>
              <div className='relative'>
                <Mail className='pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' aria-hidden />
                <input
                  id='admin-email'
                  type='email'
                  required
                  autoFocus
                  autoComplete='username'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='admin@example.com'
                  disabled={loading}
                  aria-invalid={Boolean(error) || undefined}
                  className={`${inputClass} pe-3 ${fieldBorder}`}
                />
              </div>
            </div>

            <div>
              <label htmlFor='admin-password' className='mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Password
              </label>
              <div className='relative'>
                <Lock className='pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' aria-hidden />
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
                  className={`${inputClass} pe-11 ${fieldBorder}`}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword((v) => !v)}
                  // Keep focus (and the caret) in the field while toggling.
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  aria-controls='admin-password'
                  className='absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-lg text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:text-gray-200'
                >
                  {showPassword ? <EyeOff className='h-4 w-4' aria-hidden /> : <Eye className='h-4 w-4' aria-hidden />}
                </button>
              </div>
              {capsLock && (
                <p id='caps-lock-hint' className='mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-400'>
                  Caps Lock is on
                </p>
              )}
            </div>

            <label className='flex cursor-pointer select-none items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400'>
              <input
                type='checkbox'
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600'
              />
              Keep me signed in
            </label>

            <button
              type='submit'
              disabled={loading}
              aria-busy={loading || undefined}
              className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
            >
              {loading && <Loader2 className='h-4 w-4 animate-spin' aria-hidden />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
