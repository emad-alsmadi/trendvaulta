

export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // import.meta is ESM-only syntax Jest's CJS runtime can't parse at all —
    // substitute the Jest-safe shim for the one module that touches it.
    '^\\./viteEnv$': '<rootDir>/src/lib/viteEnv.test-shim.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@trendvaulta/(.*)$': '<rootDir>/../../packages/$1/src',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/lib/viteEnv.test-shim.ts',
  ],
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/*.{spec,test}.{ts,tsx}'],
  transformIgnorePatterns: ['node_modules/(?!(@trendvaulta)/)'],
}
