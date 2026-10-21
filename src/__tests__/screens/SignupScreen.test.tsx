/**
 * Tests for SignupScreen
 *
 * Covers:
 * - renders the form (name/email/password, CREATE ACCOUNT button, SIGN IN link)
 * - validation error when fields are empty
 * - calls signUp with trimmed values
 * - error returned by signUp is shown, form stays visible
 * - needsEmailConfirmation: switches to a "check your email" view naming the address,
 *   hides the form, and a link back to the form clears it
 * - mayAlreadyHaveAccount: shown as an error on the form, not the check-your-email view
 * - no confirmation state shown on an immediate-session success (RootNavigator's job)
 * - SIGN IN link navigates to Login, both from the form and from the confirmation view
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockSignUp = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    signIn:   jest.fn(),
    signUp:   mockSignUp,
    signOut:  jest.fn(),
    session:  null,
    user:     null,
    profile:  null,
    loading:  false,
  }),
}));

import SignupScreen from '../../screens/auth/SignupScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockSignUp.mockResolvedValue({ error: null, needsEmailConfirmation: false, mayAlreadyHaveAccount: false });
});

function renderScreen() {
  return render(<SignupScreen />);
}

function fillForm(name: string, email: string, password: string) {
  const { UNSAFE_getAllByType } = screen;
  const { TextInput } = require('react-native');
  const inputs = UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(inputs.find((i: any) => i.props.placeholder === 'Display Name'), name);
  fireEvent.changeText(inputs.find((i: any) => i.props.placeholder === 'Email'), email);
  fireEvent.changeText(inputs.find((i: any) => i.props.placeholder === 'Password'), password);
}

async function submit() {
  await act(async () => { fireEvent.press(screen.getByText('CREATE ACCOUNT')); });
}

describe('SignupScreen render', () => {
  it('renders the wordmark and tagline', () => {
    renderScreen();
    expect(screen.getByText('WEAR')).toBeTruthy();
    expect(screen.getByText('JOIN YOUR CAMPUS CLOSET')).toBeTruthy();
  });

  it('renders name, email and password inputs', () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const placeholders = UNSAFE_getAllByType(TextInput).map((i: any) => i.props.placeholder);
    expect(placeholders).toEqual(expect.arrayContaining(['Display Name', 'Email', 'Password']));
  });

  it('renders the SIGN IN link', () => {
    renderScreen();
    expect(screen.getByText('SIGN IN')).toBeTruthy();
  });
});

describe('SignupScreen validation', () => {
  it('shows an error and does not call signUp when fields are empty', async () => {
    renderScreen();
    await submit();

    expect(screen.getByText('Please fill in all fields.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe('SignupScreen submit', () => {
  it('calls signUp with trimmed name and email', async () => {
    renderScreen();
    fillForm('  Maya Chen ', '  maya@test.com ', 'secret123');
    await submit();

    expect(mockSignUp).toHaveBeenCalledWith('maya@test.com', 'secret123', 'Maya Chen');
  });

  it('shows the error message returned by signUp, with the form still visible', async () => {
    mockSignUp.mockResolvedValue({ error: 'Email already registered', needsEmailConfirmation: false, mayAlreadyHaveAccount: false });
    renderScreen();
    fillForm('Maya', 'maya@test.com', 'secret123');
    await submit();

    expect(screen.getByText('Email already registered')).toBeTruthy();
    expect(screen.getByText('CREATE ACCOUNT')).toBeTruthy(); // still on the form
  });

  it('shows no extra state on an immediate-session success (RootNavigator switches screens)', async () => {
    renderScreen();
    fillForm('Maya', 'maya@test.com', 'secret123');
    await submit();

    expect(screen.queryByText(/check your email/i)).toBeNull();
    expect(screen.getByText('CREATE ACCOUNT')).toBeTruthy();
  });
});

describe('SignupScreen email confirmation', () => {
  it('switches to a check-your-email view naming the submitted address, hiding the form', async () => {
    mockSignUp.mockResolvedValue({ error: null, needsEmailConfirmation: true, mayAlreadyHaveAccount: false });
    renderScreen();
    fillForm('Maya', 'maya@test.com', 'secret123');
    await submit();

    expect(screen.getByText(/check your email/i)).toBeTruthy();
    expect(screen.getByText(/maya@test\.com/)).toBeTruthy();
    expect(screen.queryByText('CREATE ACCOUNT')).toBeNull();
  });

  it('trims the email before showing it back', async () => {
    mockSignUp.mockResolvedValue({ error: null, needsEmailConfirmation: true, mayAlreadyHaveAccount: false });
    renderScreen();
    fillForm('Maya', '  maya@test.com  ', 'secret123');
    await submit();

    expect(screen.getByText(/maya@test\.com/)).toBeTruthy();
  });

  it('a link back to the form clears the confirmation view', async () => {
    mockSignUp.mockResolvedValue({ error: null, needsEmailConfirmation: true, mayAlreadyHaveAccount: false });
    renderScreen();
    fillForm('Maya', 'maya@test.com', 'secret123');
    await submit();
    expect(screen.getByText(/check your email/i)).toBeTruthy();

    fireEvent.press(screen.getByText(/wrong email/i));

    expect(screen.queryByText(/check your email/i)).toBeNull();
    expect(screen.getByText('CREATE ACCOUNT')).toBeTruthy();
  });

  it('BACK TO SIGN IN navigates to Login from the confirmation view', async () => {
    mockSignUp.mockResolvedValue({ error: null, needsEmailConfirmation: true, mayAlreadyHaveAccount: false });
    renderScreen();
    fillForm('Maya', 'maya@test.com', 'secret123');
    await submit();

    fireEvent.press(screen.getByText('BACK TO SIGN IN'));

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});

describe('SignupScreen existing account', () => {
  it('shows a sign-in hint as a form error, not the check-your-email view', async () => {
    mockSignUp.mockResolvedValue({ error: null, needsEmailConfirmation: true, mayAlreadyHaveAccount: true });
    renderScreen();
    fillForm('Maya', 'maya@test.com', 'secret123');
    await submit();

    expect(screen.queryByText(/check your email/i)).toBeNull();
    expect(screen.getByText('CREATE ACCOUNT')).toBeTruthy(); // still on the form
    expect(screen.getByText(/already exist/i)).toBeTruthy();
  });
});

describe('SignupScreen navigation', () => {
  it('SIGN IN navigates to Login from the form', () => {
    renderScreen();
    fireEvent.press(screen.getByText('SIGN IN'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
