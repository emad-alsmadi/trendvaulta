/**
 * Wraps Vite's `import.meta.env` so it lives in exactly one file.
 *
 * `import.meta` is ESM-only syntax — Jest's CJS runtime cannot execute it at
 * all (it's a parse error, not a runtime `undefined`), which is why every
 * file that touched `import.meta.env` directly failed to load under Jest.
 * Tests substitute `viteEnv.test.ts` for this module via `moduleNameMapper`
 * in jest.config.js instead of trying to shim `import.meta` itself.
 */
export const viteEnv = {
  VITE_API_URL: import.meta.env.VITE_API_URL as string | undefined,
};
