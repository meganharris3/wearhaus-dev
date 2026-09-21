import { getVisibleItems } from '../../utils/visibilityFilter';
import type { Item, Friend, Haus } from '../../types';

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'i1',
  owner_id: 'owner',
  name: 'Denim Jacket',
  category: 'jacket',
  size_label: 'M',
  price_per_day: 1200,
  status: 'available',
  location_label: 'NYU',
  ...overrides,
});

const friend = (id: string): Friend => ({
  id, name: id, handle: `@${id}`, initials: 'F', avatarColor: '#fff', itemsShared: 0,
});
const haus = (id: string): Haus => ({ id, name: id, member_count: 1, piece_count: 0 });

const viewer = (opts: { friends?: string[]; hauses?: string[] } = {}) => ({
  id: 'viewer',
  friends: (opts.friends ?? []).map(friend),
  hauses: (opts.hauses ?? []).map(haus),
});

const ids = (items: Item[]) => items.map((i) => i.id);

describe('getVisibleItems', () => {
  describe('own items', () => {
    it.each(['public', 'friends', 'hauses', 'private'] as const)('always shows my own %s items', (visibility) => {
      const mine = makeItem({ owner_id: 'viewer', visibility });
      expect(getVisibleItems([mine], viewer())).toEqual([mine]);
    });

    it("treats the legacy 'me' owner id as mine", () => {
      const mine = makeItem({ owner_id: 'me', visibility: 'private' });
      expect(getVisibleItems([mine], viewer())).toEqual([mine]);
    });
  });

  describe('public', () => {
    it('shows public items to anyone', () => {
      expect(getVisibleItems([makeItem({ visibility: 'public' })], viewer())).toHaveLength(1);
    });

    it('treats a missing visibility as public', () => {
      expect(getVisibleItems([makeItem({ visibility: undefined })], viewer())).toHaveLength(1);
    });
  });

  describe('friends', () => {
    it("shows a friends-only item when the owner is in my friends list", () => {
      const item = makeItem({ visibility: 'friends', owner_id: 'pal' });
      expect(getVisibleItems([item], viewer({ friends: ['pal'] }))).toHaveLength(1);
    });

    it('hides it when the owner is not a friend', () => {
      const item = makeItem({ visibility: 'friends', owner_id: 'stranger' });
      expect(getVisibleItems([item], viewer({ friends: ['pal'] }))).toHaveLength(0);
    });

    it('still works when the joined owner object is missing (uses owner_id)', () => {
      const item = makeItem({ visibility: 'friends', owner_id: 'pal', owner: undefined });
      expect(getVisibleItems([item], viewer({ friends: ['pal'] }))).toHaveLength(1);
    });
  });

  describe('hauses', () => {
    it('shows an item shared to a haus I belong to', () => {
      const item = makeItem({ visibility: 'hauses', haus_visibility: { h1: true } });
      expect(getVisibleItems([item], viewer({ hauses: ['h1'] }))).toHaveLength(1);
    });

    it('shows it when shared to several hauses and I belong to just one of them', () => {
      const item = makeItem({ visibility: 'hauses', haus_visibility: { h1: true, h2: true, h3: true } });
      expect(getVisibleItems([item], viewer({ hauses: ['h2'] }))).toHaveLength(1);
    });

    it('hides it when shared only to hauses I am not in', () => {
      const item = makeItem({ visibility: 'hauses', haus_visibility: { h2: true } });
      expect(getVisibleItems([item], viewer({ hauses: ['h1'] }))).toHaveLength(0);
    });

    it('hides it when sharing to my haus is switched off', () => {
      const item = makeItem({ visibility: 'hauses', haus_visibility: { h1: false } });
      expect(getVisibleItems([item], viewer({ hauses: ['h1'] }))).toHaveLength(0);
    });

    it('hides it when it is not shared to any haus', () => {
      expect(getVisibleItems([makeItem({ visibility: 'hauses', haus_visibility: {} })], viewer({ hauses: ['h1'] }))).toHaveLength(0);
      expect(getVisibleItems([makeItem({ visibility: 'hauses', haus_visibility: undefined })], viewer({ hauses: ['h1'] }))).toHaveLength(0);
    });

    it('hides it when I belong to no hauses', () => {
      const item = makeItem({ visibility: 'hauses', haus_visibility: { h1: true } });
      expect(getVisibleItems([item], viewer())).toHaveLength(0);
    });

    it("does not confuse the owner's user id with a haus id", () => {
      // Regression: the old check compared the owner's id against my haus ids.
      const item = makeItem({ visibility: 'hauses', owner_id: 'h1', owner: { id: 'h1', display_name: 'Owner' }, haus_visibility: {} });
      expect(getVisibleItems([item], viewer({ hauses: ['h1'] }))).toHaveLength(0);
    });

    it('is not opened up just because the owner is a friend', () => {
      const item = makeItem({ visibility: 'hauses', owner_id: 'pal', haus_visibility: { h9: true } });
      expect(getVisibleItems([item], viewer({ friends: ['pal'], hauses: ['h1'] }))).toHaveLength(0);
    });
  });

  describe('private and unknown', () => {
    it("hides other people's private items", () => {
      expect(getVisibleItems([makeItem({ visibility: 'private' })], viewer())).toHaveLength(0);
    });

    it('does not let a friend or haus share leak a private item', () => {
      const item = makeItem({ visibility: 'private', owner_id: 'pal', haus_visibility: { h1: true } });
      expect(getVisibleItems([item], viewer({ friends: ['pal'], hauses: ['h1'] }))).toHaveLength(0);
    });

    it('hides items with an unrecognised visibility value', () => {
      const item = makeItem({ visibility: 'everyone' as unknown as Item['visibility'] });
      expect(getVisibleItems([item], viewer())).toHaveLength(0);
    });
  });

  it('keeps the original order and does not mutate the input', () => {
    const items = [
      makeItem({ id: 'a', visibility: 'public' }),
      makeItem({ id: 'b', visibility: 'private' }),
      makeItem({ id: 'c', visibility: 'hauses', haus_visibility: { h1: true } }),
      makeItem({ id: 'd', visibility: 'public' }),
    ];
    const snapshot = [...items];

    const result = getVisibleItems(items, viewer({ hauses: ['h1'] }));

    expect(ids(result)).toEqual(['a', 'c', 'd']);
    expect(items).toEqual(snapshot);
  });
});
