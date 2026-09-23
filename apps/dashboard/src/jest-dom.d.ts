// setupTests.ts loads these matchers at runtime. Tests here import `expect`
// from '@jest/globals' rather than using the global, so the augmentation has to
// come from jest-dom's jest-globals entry — the plain one only extends the
// global `expect` and leaves toBeInTheDocument untyped.
/// <reference types="@testing-library/jest-dom/jest-globals" />
