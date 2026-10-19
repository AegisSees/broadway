import { describe, expect, it } from 'vitest';
import { AUTHOR } from './credit';

describe('credit', () => {
  it('names the author in the normal build', () => { expect(AUTHOR).toBe('Alp Kiziltas'); });
});
