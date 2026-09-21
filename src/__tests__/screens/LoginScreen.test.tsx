/**
 * Tests for LoginScreen
 *
 * Covers:
 * - renders WEAR HAUS wordmark
 * - renders Email and Password text inputs
 * - renders SIGN IN button
 * - renders "SIGN UP" navigation link
 * - shows validation error when fields are empty on submit
 * - calls signIn with trimmed credentials
 * - shows error message returned by signIn
 * - renders ActivityIndicator while loading (signIn pending)
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// ---------------------------------------------------------------------------
// AuthContext mock — provides signIn via useAuth
// ---------------------------------------------------------------------------
const mockSignIn = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    signIn:   mockSignIn,
    signUp:   jest.fn(),
    signOut:  jest.fn(),
    session:  null,
    user:     null,
    profile:  null,
    loading:  false,
  }),
}));

import LoginScreen from '../../screens/auth/LoginScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

function renderScreen() {
  return render(<LoginScreen />);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
describe('LoginScreen render', () => {
  it('renders the WEAR wordmark segment', () => {
    renderScreen();
    expect(screen.getByText('WEAR')).toBeTruthy();
  });

  it('renders the HAUS wordmark segment', () => {
    renderScreen();
    expect(screen.getByText(' HAUS')).toBeTruthy();
  });

  it('renders the tagline', () => {
    renderScreen();
    expect(screen.getByText('UNLOCK YOUR DREAM CLOSET')).toBeTruthy();
  });

  it('renders an Email text input', () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const emailInput = inputs.find(
      (i: any) => i.props.placeholder === 'Email'
    );
    expect(emailInput).toBeTruthy();
  });

  it('renders a Password text input with secureTextEntry', () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const passwordInput = inputs.find(
      (i: any) => i.props.placeholder === 'Password'
    );
    expect(passwordInput).toBeTruthy();
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('renders SIGN IN button', () => {
    renderScreen();
    expect(screen.getByText('SIGN IN')).toBeTruthy();
  });

  it('renders sign-up navigation link', () => {
    renderScreen();
    expect(screen.getByText('SIGN UP')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
describe('LoginScreen validation', () => {
  it('shows error when submitting with empty fields', async () => {
    renderScreen();

    await act(async () => { fireEvent.press(screen.getByText('SIGN IN')); });

    expect(screen.getByText('Please enter your email and password.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows error when email is empty but password is filled', async () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const passwordInput = inputs.find((i: any) => i.props.placeholder === 'Password');

    fireEvent.changeText(passwordInput, 'secret123');
    await act(async () => { fireEvent.press(screen.getByText('SIGN IN')); });

    expect(screen.getByText('Please enter your email and password.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Submit behaviour
// ---------------------------------------------------------------------------
describe('LoginScreen submit', () => {
  async function fillAndSubmit(email: string, password: string) {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const emailInput    = inputs.find((i: any) => i.props.placeholder === 'Email');
    const passwordInput = inputs.find((i: any) => i.props.placeholder === 'Password');

    fireEvent.changeText(emailInput, email);
    fireEvent.changeText(passwordInput, password);
    // signIn resolves asynchronously and the screen sets state afterwards, so
    // flush the press inside act().
    await act(async () => { fireEvent.press(screen.getByText('SIGN IN')); });
  }

  it('calls signIn with trimmed email and password', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    await fillAndSubmit('  user@test.com  ', 'pass123');

    expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'pass123');
  });

  it('displays error message returned by signIn', async () => {
    mockSignIn.mockResolvedValue({ error: 'Invalid credentials' });

    await fillAndSubmit('bad@test.com', 'wrong');

    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });

  it('does not display an error message on successful sign-in', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    await fillAndSubmit('user@test.com', 'pass123');

    expect(mockSignIn).toHaveBeenCalled();
    expect(screen.queryByText('Invalid credentials')).toBeNull();
    expect(screen.queryByText('Please enter your email and password.')).toBeNull();
  });

  it('clears a previous error when submitting again', async () => {
    mockSignIn.mockResolvedValueOnce({ error: 'Invalid credentials' });
    await fillAndSubmit('bad@test.com', 'wrong');
    expect(screen.getByText('Invalid credentials')).toBeTruthy();

    mockSignIn.mockResolvedValueOnce({ error: null });
    await act(async () => { fireEvent.press(screen.getByText('SIGN IN')); });

    expect(screen.queryByText('Invalid credentials')).toBeNull();
  });

  it('shows a spinner instead of the SIGN IN label while signing in', async () => {
    let resolveSignIn: (v: { error: null }) => void = () => {};
    mockSignIn.mockReturnValue(new Promise((resolve) => { resolveSignIn = resolve; }));

    await fillAndSubmit('user@test.com', 'pass123');

    const { ActivityIndicator } = require('react-native');
    expect(screen.queryByText('SIGN IN')).toBeNull();
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();

    await act(async () => { resolveSignIn({ error: null }); });

    expect(screen.getByText('SIGN IN')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
describe('LoginScreen navigation', () => {
  it('navigates to Signup when SIGN UP link is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByText('SIGN UP'));
    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });
});
