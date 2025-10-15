import '@testing-library/jest-dom';
import { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare global {
  namespace Vi {
    // Extending Vitest matchers with Testing Library matchers
    type Assertion = TestingLibraryMatchers<unknown, void>;
    type AsymmetricMatchersContaining = TestingLibraryMatchers<unknown, void>;
  }
}
