/**
 * Tests for the onboarding CreateAccountStep — the signup form behind "Get Started" on the
 * Welcome screen (the primary signup path; distinct from the secondary SignupScreen in
 * AuthStack, reached via Login's "Sign up" link).
 *
 * Covers:
 * - validation errors for empty/invalid fields, without calling signUp
 * - successful signUp switches to the "CHECK YOUR INBOX" view with the submitted email
 * - a signUp error is shown on the form, which stays visible
 * - resend: success starts the cooldown; a failure shows a readable message, not the "{}"
 *   @supabase/auth-js produces for a collapsed 5xx (see authService.test.ts for the root cause)
 * - "use a different email" returns from the inbox view to the form
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockSignUp = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}));

import { mockSupabase } from '../../setup/supabaseMock';
jest.mock('../../../lib/supabase', () => ({ supabase: mockSupabase }));

import CreateAccountStep from '../../../screens/onboarding/steps/CreateAccountStep';

function Harness() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  return (
    <CreateAccountStep
      onNext={mockOnNext}
      onBack={mockOnBack}
      name={name} setName={setName}
      email={email} setEmail={setEmail}
      password={password} setPassword={setPassword}
    />
  );
}

const mockOnNext = jest.fn();
const mockOnBack = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
});

function fillForm(name: string, email: string, password: string, confirm = password) {
  fireEvent.changeText(screen.getByPlaceholderText('Your name'), name);
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), email);
  fireEvent.changeText(screen.getByPlaceholderText('Min 8 characters'), password);
  fireEvent.changeText(screen.getByPlaceholderText('Repeat password'), confirm);
}

async function submit() {
  await act(async () => { fireEvent.press(screen.getByText('CONTINUE')); });
}

describe('CreateAccountStep validation', () => {
  it('shows an error and does not call signUp when the name is blank', async () => {
    render(<Harness />);
    fillForm('', 'user@test.com', 'password123');
    await submit();
    expect(screen.getByText('Please enter your full name.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows an error for an invalid email', async () => {
    render(<Harness />);
    fillForm('Jordan', 'not-an-email', 'password123');
    await submit();
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows an error for a short password', async () => {
    render(<Harness />);
    fillForm('Jordan', 'user@test.com', 'short');
    await submit();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("shows an error when the passwords don't match", async () => {
    render(<Harness />);
    fillForm('Jordan', 'user@test.com', 'password123', 'different123');
    await submit();
    expect(screen.getByText("Passwords don't match.")).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe('CreateAccountStep submit', () => {
  it('calls signUp with the trimmed-by-service values and shows the inbox view on success', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null, needsEmailConfirmation: true, mayAlreadyHaveAccount: false });
    render(<Harness />);
    fillForm('Jordan', 'jordan@test.com', 'password123');
    await submit();

    expect(mockSignUp).toHaveBeenCalledWith('jordan@test.com', 'password123', 'Jordan');
    expect(screen.getByText('CHECK YOUR INBOX')).toBeTruthy();
    expect(screen.getByText('jordan@test.com')).toBeTruthy();
  });

  it('shows the error from signUp on the form, which stays visible', async () => {
    mockSignUp.mockResolvedValueOnce({ error: 'Email already registered', needsEmailConfirmation: false, mayAlreadyHaveAccount: false });
    render(<Harness />);
    fillForm('Jordan', 'jordan@test.com', 'password123');
    await submit();

    expect(screen.getByText('Email already registered')).toBeTruthy();
    expect(screen.getByText('CREATE ACCOUNT')).toBeTruthy(); // form still showing, not the inbox view
  });
});

describe('CreateAccountStep resend', () => {
  async function getToInboxView() {
    mockSignUp.mockResolvedValueOnce({ error: null, needsEmailConfirmation: true, mayAlreadyHaveAccount: false });
    render(<Harness />);
    fillForm('Jordan', 'jordan@test.com', 'password123');
    await submit();
  }

  it('starts the cooldown on a successful resend', async () => {
    await getToInboxView();
    mockSupabase.auth.resend.mockResolvedValueOnce({ error: null });

    await act(async () => { fireEvent.press(screen.getByText('Resend confirmation email')); });

    expect(mockSupabase.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'jordan@test.com' });
    expect(screen.getByText(/Resend available in/)).toBeTruthy();
  });

  it('replaces a collapsed "{}" resend error with a readable message', async () => {
    await getToInboxView();
    mockSupabase.auth.resend.mockResolvedValueOnce({ error: { message: '{}' } });

    await act(async () => { fireEvent.press(screen.getByText('Resend confirmation email')); });

    expect(screen.queryByText('{}')).toBeNull();
    expect(screen.getByText('Something went wrong on our end. Please try again in a moment.')).toBeTruthy();
  });

  it('passes through a real resend error message unchanged', async () => {
    await getToInboxView();
    mockSupabase.auth.resend.mockResolvedValueOnce({ error: { message: 'Too many requests' } });

    await act(async () => { fireEvent.press(screen.getByText('Resend confirmation email')); });

    expect(screen.getByText('Too many requests')).toBeTruthy();
  });
});

describe('CreateAccountStep "use a different email"', () => {
  it('returns to the form from the inbox view', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null, needsEmailConfirmation: true, mayAlreadyHaveAccount: false });
    render(<Harness />);
    fillForm('Jordan', 'jordan@test.com', 'password123');
    await submit();
    expect(screen.getByText('CHECK YOUR INBOX')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByText('← Use a different email')); });

    expect(screen.getByText('CREATE ACCOUNT')).toBeTruthy();
  });
});
