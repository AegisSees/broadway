import { describe, expect, it } from 'vitest';
import { paperAngle } from './paperTilt';

describe('paperAngle', () => {
  it('matches the art at its own size', () => { expect(paperAngle(520, 454)).toBeCloseTo(-4.55, 1); });
  it('gets steeper on a tall, narrow note', () => { expect(paperAngle(330, 470)).toBeLessThan(paperAngle(520, 454)); });
});
