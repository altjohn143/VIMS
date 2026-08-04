import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from '../config/axios';
import { AuthProvider, useAuth } from './AuthContext';

jest.mock('../config/axios', () => ({
  __esModule: true,
  default: {
    defaults: { headers: { common: {} }, baseURL: 'https://api.example.test' },
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

function AuthProbe() {
  const auth = useAuth();

  return (
    <div>
      <span data-testid="bootstrapping">{String(auth.bootstrapping)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="email">{auth.currentUser?.email || ''}</span>
      <button onClick={() => auth.login('resident@example.com', 'secret', 'resident')}>
        Log in
      </button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  axios.defaults.headers.common = {};
});

test('finishes bootstrap as signed out when no token is stored', async () => {
  renderAuth();

  await waitFor(() => {
    expect(screen.getByTestId('bootstrapping')).toHaveTextContent('false');
  });
  expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  expect(axios.get).not.toHaveBeenCalled();
});

test('restores and validates an existing session', async () => {
  sessionStorage.setItem('token', 'stored-token');
  sessionStorage.setItem('lastActivityAt', String(Date.now()));
  axios.get.mockResolvedValue({
    data: {
      success: true,
      user: { id: 7, email: 'resident@example.com', role: 'resident', isApproved: true },
    },
  });

  renderAuth();

  await waitFor(() => {
    expect(screen.getByTestId('email')).toHaveTextContent('resident@example.com');
  });
  expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
  expect(axios.get).toHaveBeenCalledWith('/api/auth/me');
  expect(axios.defaults.headers.common.Authorization).toBe('Bearer stored-token');
});

test('logs in, stores the token, and refreshes the authoritative user', async () => {
  axios.post.mockResolvedValue({
    data: {
      success: true,
      token: 'new-token',
      user: { id: 7, email: 'resident@example.com', role: 'resident' },
    },
  });
  axios.get.mockResolvedValue({
    data: {
      success: true,
      user: { id: 7, email: 'resident@example.com', role: 'resident', isApproved: true },
    },
  });

  renderAuth();
  await waitFor(() => expect(screen.getByTestId('bootstrapping')).toHaveTextContent('false'));
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

  await waitFor(() => {
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
  });
  expect(axios.post).toHaveBeenCalledWith(
    '/api/auth/login',
    { email: 'resident@example.com', password: 'secret', expectedRole: 'resident' },
    { headers: { 'Content-Type': 'application/json' } }
  );
  expect(sessionStorage.getItem('token')).toBe('new-token');
  expect(axios.defaults.headers.common.Authorization).toBe('Bearer new-token');
});

test('clears a stored session when server validation fails', async () => {
  sessionStorage.setItem('token', 'invalid-token');
  sessionStorage.setItem('user', JSON.stringify({ email: 'old@example.com' }));
  sessionStorage.setItem('lastActivityAt', String(Date.now()));
  axios.get.mockRejectedValue(new Error('Unauthorized'));

  renderAuth();
  await waitFor(() => {
    expect(screen.getByTestId('bootstrapping')).toHaveTextContent('false');
  });

  expect(sessionStorage.getItem('token')).toBeNull();
  expect(sessionStorage.getItem('user')).toBeNull();
  expect(axios.get).toHaveBeenCalledWith('/api/auth/me');
  expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
});

