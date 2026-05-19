import '@testing-library/jest-dom';

// Silence console.error in tests unless needed.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});
