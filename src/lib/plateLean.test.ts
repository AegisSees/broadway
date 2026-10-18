import { describe, expect, it } from 'vitest';
import { pickLean } from './plateLean';

describe('pickLean', () => {
  it('is level half the time and leans either way otherwise', () => {
    expect(pickLean(0)).toBe('level');
    expect(pickLean(0.49)).toBe('level');
    expect(pickLean(0.6)).toBe('up');
    expect(pickLean(0.9)).toBe('down');
  });
});
