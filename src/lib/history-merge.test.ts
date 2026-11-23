import { describe, it, expect } from 'vitest';
import { mergePage } from './history-merge';

const id = (x: { id: string }) => x.id;

describe('mergePage', () => {
  it('stops at the first known id', () => {
    expect(mergePage(new Set(['c']), [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], id)).toEqual({
      fresh: [{ id: 'a' }, { id: 'b' }],
      reachedKnown: true,
    });
  });
  it('returns everything when nothing is known', () => {
    expect(mergePage(new Set(), [{ id: 'a' }], id)).toEqual({ fresh: [{ id: 'a' }], reachedKnown: false });
  });
  it('returns nothing when the first item is known', () => {
    expect(mergePage(new Set(['a']), [{ id: 'a' }], id)).toEqual({ fresh: [], reachedKnown: true });
  });
});
