import { pageRange } from '../../services/pagination';

describe('pageRange', () => {
  it('uses the default limit starting at 0', () => {
    expect(pageRange({}, 20)).toEqual([0, 19]);
  });

  it('honours limit and offset, returning inclusive bounds', () => {
    expect(pageRange({ limit: 10, offset: 30 }, 20)).toEqual([30, 39]);
  });

  it('falls back to the default limit for a non-positive limit', () => {
    expect(pageRange({ limit: 0 }, 20)).toEqual([0, 19]);
    expect(pageRange({ limit: -5 }, 20)).toEqual([0, 19]);
  });

  it('clamps a negative offset to 0', () => {
    expect(pageRange({ limit: 5, offset: -10 }, 20)).toEqual([0, 4]);
  });

  it('floors fractional values', () => {
    expect(pageRange({ limit: 5.9, offset: 2.9 }, 20)).toEqual([2, 6]);
  });
});
