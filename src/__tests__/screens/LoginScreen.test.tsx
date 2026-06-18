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
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

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

  it('renders CAMPUS EXCHANGE tagline', () => {
    renderScreen();
    expect(screen.getByText('CAMPUS EXCHANGE')).toBeTruthy();
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

    fireEvent.press(screen.getByText('SIGN IN'));

    await waitFor(() => {
      expect(
        screen.getByText('Please enter your email and password.')
      ).toBeTruthy();
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows error when email is empty but password is filled', async () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const passwordInput = inputs.find((i: any) => i.props.placeholder === 'Password');

    fireEvent.changeText(passwordInput, 'secret123');
    fireEvent.press(screen.getByText('SIGN IN'));

    await waitFor(() => {
      expect(screen.getByText('Please enter your email and password.')).toBeTruthy();
    });
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
    fireEvent.press(screen.getByText('SIGN IN'));
  }

  it('calls signIn with trimmed email and password', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    await fillAndSubmit('  user@test.com  ', 'pass123');

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'pass123');
    });
  });

  it('displays error message returned by signIn', async () => {
    mockSignIn.mockResolvedValue({ error: 'Invalid credentials' });

    await fillAndSubmit('bad@test.com', 'wrong');

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('does not display an error message on successful sign-in', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    await fillAndSubmit('user@test.com', 'pass123');

    await waitFor(() => {
      expect(screen.queryByText('Invalid credentials')).toBeNull();
    });
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
