/**
 * Tests for WearCalendar's range selection — specifically that a single-day rental is
 * possible. Before, tapping the start day again just kept it as the start, so the earliest
 * possible end was the next day and the shortest bookable rental was 2 days.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import WearCalendar from '../../components/WearCalendar';

const now = new Date();
const futureMonth = new Date(now.getFullYear() + 1, 0, 1); // January next year — no past days
const day = (d: number) => new Date(futureMonth.getFullYear(), 0, d);

function renderCalendar(overrides: Partial<React.ComponentProps<typeof WearCalendar>> = {}) {
  const props: React.ComponentProps<typeof WearCalendar> = {
    mode: 'borrower',
    bookedRanges: [],
    blockedRanges: [],
    selectedStart: null,
    selectedEnd: null,
    onSelectStart: jest.fn(),
    onSelectEnd: jest.fn(),
    month: futureMonth,
    onMonthChange: jest.fn(),
    ...overrides,
  };
  render(<WearCalendar {...props} />);
  return props;
}

it('tapping a day with nothing selected sets it as the start', () => {
  const props = renderCalendar();
  fireEvent.press(screen.getByText('15'));
  expect(props.onSelectStart).toHaveBeenCalledWith(day(15));
  expect(props.onSelectEnd).not.toHaveBeenCalled();
});

it('tapping the start day again makes it a single-day rental (start = end)', () => {
  const props = renderCalendar({ selectedStart: day(15) });
  fireEvent.press(screen.getByText('15'));
  expect(props.onSelectEnd).toHaveBeenCalledWith(day(15));
});

it('tapping a later day still sets a multi-day end', () => {
  const props = renderCalendar({ selectedStart: day(15) });
  fireEvent.press(screen.getByText('18'));
  expect(props.onSelectEnd).toHaveBeenCalledWith(day(18));
});

it('tapping an earlier day restarts the selection from there', () => {
  const props = renderCalendar({ selectedStart: day(15) });
  fireEvent.press(screen.getByText('10'));
  expect(props.onSelectStart).toHaveBeenCalledWith(day(10));
  expect(props.onSelectEnd).not.toHaveBeenCalled();
});
