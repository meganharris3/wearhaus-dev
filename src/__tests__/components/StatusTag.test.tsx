/**
 * Component tests for StatusTag
 *
 * Verifies that each status value renders the correct label text.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import StatusTag from '../../components/StatusTag';

describe('StatusTag', () => {
  it('renders "AVAIL." for status "available"', () => {
    render(<StatusTag status="available" />);
    expect(screen.getByText('AVAIL.')).toBeTruthy();
  });

  it('renders "LENT" for status "lent"', () => {
    render(<StatusTag status="lent" />);
    expect(screen.getByText('LENT')).toBeTruthy();
  });

  it('renders "WASH" for status "wash"', () => {
    render(<StatusTag status="wash" />);
    expect(screen.getByText('WASH')).toBeTruthy();
  });

  it('renders only one Text child for each status', () => {
    const { getAllByText } = render(<StatusTag status="available" />);
    // The label should appear exactly once
    expect(getAllByText('AVAIL.')).toHaveLength(1);
  });
});
