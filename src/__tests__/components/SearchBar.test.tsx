/**
 * Component tests for SearchBar
 *
 * Covers:
 * - renders the TextInput
 * - displays the controlled value
 * - calls onChangeText when user types
 * - renders default placeholder when none is supplied
 * - renders custom placeholder when supplied
 */
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SearchBar from '../../components/SearchBar';

describe('SearchBar', () => {
  it('renders a TextInput', () => {
    const { UNSAFE_getByType } = render(
      <SearchBar value="" onChangeText={jest.fn()} />
    );
    const { TextInput } = require('react-native');
    expect(UNSAFE_getByType(TextInput)).toBeTruthy();
  });

  it('displays the controlled value', () => {
    render(<SearchBar value="blazer" onChangeText={jest.fn()} />);
    const { TextInput } = require('react-native');
    const { UNSAFE_getByType } = render(
      <SearchBar value="blazer" onChangeText={jest.fn()} />
    );
    expect(UNSAFE_getByType(TextInput).props.value).toBe('blazer');
  });

  it('calls onChangeText with the new text when user types', () => {
    const onChangeText = jest.fn();
    const { UNSAFE_getByType } = render(
      <SearchBar value="" onChangeText={onChangeText} />
    );
    const { TextInput } = require('react-native');
    fireEvent.changeText(UNSAFE_getByType(TextInput), 'silk dress');
    expect(onChangeText).toHaveBeenCalledWith('silk dress');
  });

  it('calls onChangeText exactly once per change event', () => {
    const onChangeText = jest.fn();
    const { UNSAFE_getByType } = render(
      <SearchBar value="" onChangeText={onChangeText} />
    );
    const { TextInput } = require('react-native');
    fireEvent.changeText(UNSAFE_getByType(TextInput), 'test');
    expect(onChangeText).toHaveBeenCalledTimes(1);
  });

  it('uses default placeholder when none is supplied', () => {
    const { UNSAFE_getByType } = render(
      <SearchBar value="" onChangeText={jest.fn()} />
    );
    const { TextInput } = require('react-native');
    expect(UNSAFE_getByType(TextInput).props.placeholder).toBe('Search…');
  });

  it('uses a custom placeholder when provided', () => {
    const { UNSAFE_getByType } = render(
      <SearchBar value="" onChangeText={jest.fn()} placeholder="Search size, style…" />
    );
    const { TextInput } = require('react-native');
    expect(UNSAFE_getByType(TextInput).props.placeholder).toBe('Search size, style…');
  });

  it('has autoCapitalize="none"', () => {
    const { UNSAFE_getByType } = render(
      <SearchBar value="" onChangeText={jest.fn()} />
    );
    const { TextInput } = require('react-native');
    expect(UNSAFE_getByType(TextInput).props.autoCapitalize).toBe('none');
  });

  it('updates displayed value when controlled value prop changes', () => {
    const { TextInput } = require('react-native');

    function Wrapper() {
      const [val, setVal] = useState('');
      return <SearchBar value={val} onChangeText={setVal} />;
    }

    const { UNSAFE_getByType } = render(<Wrapper />);
    const input = UNSAFE_getByType(TextInput);

    expect(input.props.value).toBe('');
    fireEvent.changeText(input, 'cowboy boots');
    expect(input.props.value).toBe('cowboy boots');
  });
});
