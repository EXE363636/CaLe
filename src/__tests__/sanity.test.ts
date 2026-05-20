import { describe, it, expect } from 'vitest';

describe('test runner sanity check', () => {
  it('asserts that 1 + 1 === 2', () => {
    expect(1 + 1).toBe(2);
  });
});
