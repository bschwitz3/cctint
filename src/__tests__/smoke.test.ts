import { describe, expect, test } from 'vitest';
import { main } from '../cli';

describe('cli smoke', () => {
  test('help flag returns 0', () => {
    expect(main(['bun', 'cctint', '--help'])).toBe(0);
  });

  test('unknown command returns 1', () => {
    expect(main(['bun', 'cctint', 'nope'])).toBe(1);
  });
});
