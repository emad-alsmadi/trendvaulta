import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, errorMessage } from '../lib/api';
import { pickPrimaryRole, setAuthSession } from '../lib/auth';
import { isStaffRole } from '../lib/permissions';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? {}) as {
    from?: string;
    reason?: string;
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(
    locationState.reason === 'forbidden'
      ? 'This account does not have dashboard access (staff role required).'
      : null,
  );
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login({ email: email.trim(), password });
      if (!data.token) {
        throw new Error('Login succeeded but no token was returned');
      }
      const role = pickPrimaryRole(data.roles);
      if (!isStaffRole(role)) {
        throw new Error(
          'This account does not have dashboard access (staff role required).',
        );
      }
      setAuthSession({
        token: data.token,
        role,
        refreshToken: data.refreshToken,
        remember,
      });
      navigate(locationState.from || '/orders', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-800"
      >
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            TrendVaulta Admin
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in with an account that has orders permissions
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="admin-email"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email Address
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Remember me
            </span>
          </label>

          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-500 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
