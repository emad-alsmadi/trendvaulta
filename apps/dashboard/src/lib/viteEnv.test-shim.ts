// Jest substitute for viteEnv.ts (see that file's comment) — same shape,
// no `import.meta` syntax, so ts-jest's CJS transform can parse it.
export const viteEnv = {
  VITE_API_URL: undefined as string | undefined,
  VITE_SENTRY_DSN: undefined as string | undefined,
  MODE: 'test',
};
