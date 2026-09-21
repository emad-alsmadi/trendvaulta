// Import the concrete CJS file rather than the package's `presets`
// directory specifier — Node's ESM resolver (Node 20.19+/22.12+/24+) no
// longer allows a bare directory import, which breaks
// `from 'ts-jest/presets'` even though it worked under older Node/CJS
// resolution. The file only has a default export (no named `defaults`
// export), so take the default and destructure from it instead.
import tsJestPresets from 'ts-jest/presets/index.js'
const { defaults: tsjPresets } = tsJestPresets

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
