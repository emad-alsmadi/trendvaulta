import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../lib/api', () => ({
  authApi: { login: jest.fn() },
  errorMessage: (_e: unknown, fallback: string) => fallback,
}));

import { authApi } from '../lib/api';
import { en } from '../i18n/en';
import Login from './Login';

const mockedLogin = jest.mocked(authApi.login);

function renderLogin(entry: string | { pathname: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Login />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Login page: why the visitor was signed out', () => {
  it('explains a session the API revoked', () => {
    renderLogin('/login?reason=revoked');
    expect(screen.getByRole('status')).toHaveTextContent(en.login.sessionRevoked);
  });

  it('explains a session that ran out', () => {
    renderLogin('/login?reason=expired');
    expect(screen.getByRole('status')).toHaveTextContent(en.login.sessionExpired);
  });

  it.each(['/login', '/login?reason=constructor', '/login?reason=forbidden'])(
    'shows no notice for %s',
    (entry) => {
      renderLogin(entry);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('still explains a non-staff account sent here by the router', () => {
    renderLogin({ pathname: '/login', state: { reason: 'forbidden' } });
    expect(screen.getByRole('alert')).toHaveTextContent(en.login.errorNoAccess);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('replaces the notice with the error once a sign-in fails', async () => {
    mockedLogin.mockRejectedValue(new Error('nope'));
    renderLogin('/login?reason=expired');

    await userEvent.type(screen.getByLabelText(en.login.email), 'admin@example.com');
    await userEvent.type(screen.getByLabelText(en.login.password), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: en.login.submit }));

    expect(await screen.findByRole('alert')).toHaveTextContent(en.login.errorInvalid);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
