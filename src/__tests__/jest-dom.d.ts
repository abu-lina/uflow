/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// @testing-library/jest-dom's bundled vitest.d.ts augments the pre-v5
// `Assertion<T>` interface. Vitest 5's Assertion takes (return, value) type
// parameters, so the upstream augmentation silently does not apply and
// jest-dom matchers fail to type-check. Mirror it against the new signature.
import 'vitest';
import { type TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Assertion<
    R extends void | Promise<void> = void,
    T = unknown,
  > extends TestingLibraryMatchers<any, R> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, any> {}
}
