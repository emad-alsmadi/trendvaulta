import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

jest.mock('../lib/api', () => ({
  adminContactApi: { getMessages: jest.fn(), updateMessage: jest.fn() },
  errorMessage: (_e: unknown, fallback: string) => fallback,
}));

// Staff permissions per test (moderator/admin have content:write)
let canWrite = true;
jest.mock('../hooks/usePermissions', () => ({
  usePermissions: () => ({
    can: (permission: string) => permission !== 'content:write' || canWrite,
  }),
}));

import { adminContactApi, type AdminContactMessage } from '../lib/api';
import Messages from './Messages';
import { ToastProvider } from '../components/ui/Toast';

const mockedGetMessages = jest.mocked(adminContactApi.getMessages);
const mockedUpdateMessage = jest.mocked(adminContactApi.updateMessage);

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

const UNREAD: AdminContactMessage = {
  _id: 'm-new',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  subject: 'Where is my order?',
  message: 'I ordered last week.\nNo tracking yet.',
  status: 'new',
  staffNote: '',
  createdAt: '2026-09-28T10:00:00.000Z',
};

const HANDLED: AdminContactMessage = {
  _id: 'm-closed',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Size chart',
  message: 'Do you have a size chart for the linen shirt?',
  status: 'closed',
  staffNote: 'Sent the chart',
  createdAt: '2026-09-27T10:00:00.000Z',
};

beforeEach(() => {
  jest.resetAllMocks();
  canWrite = true;
  mockedGetMessages.mockResolvedValue({
    data: [UNREAD, HANDLED],
    meta: { total: 2, page: 1, pages: 1, limit: 25 },
    counts: { new: 1, read: 0, closed: 1 },
  });
  mockedUpdateMessage.mockImplementation(async (id, body) => ({
    ...(id === UNREAD._id ? UNREAD : HANDLED),
    ...body,
  }));
});

describe('Messages page', () => {
  it('lists messages with whole-inbox counts on the status filters', async () => {
    render(<Messages />, { wrapper: Wrapper });

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();

    const filters = screen.getByRole('group', { name: 'Filter by status' });
    expect(within(filters).getByRole('button', { name: 'New 1' })).toBeInTheDocument();
    expect(within(filters).getByRole('button', { name: 'Closed 1' })).toBeInTheDocument();
    expect(within(filters).getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('asks the API for one status when a filter is chosen', async () => {
    render(<Messages />, { wrapper: Wrapper });
    await screen.findByText('Grace Hopper');

    await userEvent.click(screen.getByRole('button', { name: 'New 1' }));

    await waitFor(() =>
      expect(mockedGetMessages).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'new', page: 1 }),
      ),
    );
  });

  it('marks an unread message read when it is opened', async () => {
    render(<Messages />, { wrapper: Wrapper });
    await userEvent.click(await screen.findByRole('button', { name: UNREAD.subject }));

    const dialog = await screen.findByRole('dialog', { name: UNREAD.subject });
    expect(within(dialog).getByText(/No tracking yet\./)).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedUpdateMessage).toHaveBeenCalledWith('m-new', { status: 'read' }),
    );
  });

  it('builds a reply email with the subject and the enquiry quoted', async () => {
    render(<Messages />, { wrapper: Wrapper });
    await userEvent.click(await screen.findByRole('button', { name: HANDLED.subject }));

    const reply = await screen.findByRole('link', { name: 'Reply by email' });
    const href = reply.getAttribute('href') as string;
    expect(href.startsWith('mailto:ada@example.com?')).toBe(true);
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('subject')).toBe('Re: Size chart');
    expect(params.get('body')).toContain('> Do you have a size chart');
  });

  it('closes a message and saves a trimmed staff note', async () => {
    render(<Messages />, { wrapper: Wrapper });
    await userEvent.click(await screen.findByRole('button', { name: UNREAD.subject }));
    const dialog = await screen.findByRole('dialog', { name: UNREAD.subject });

    const save = within(dialog).getByRole('button', { name: 'Save note' });
    expect(save).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Staff note'), '  Called the courier  ');
    await userEvent.click(save);
    await waitFor(() =>
      expect(mockedUpdateMessage).toHaveBeenCalledWith('m-new', {
        staffNote: 'Called the courier',
      }),
    );

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close message' }));
    await waitFor(() =>
      expect(mockedUpdateMessage).toHaveBeenCalledWith('m-new', { status: 'closed' }),
    );
  });

  it('is read-only for staff without content:write', async () => {
    canWrite = false;
    render(<Messages />, { wrapper: Wrapper });
    await userEvent.click(await screen.findByRole('button', { name: UNREAD.subject }));
    const dialog = await screen.findByRole('dialog', { name: UNREAD.subject });

    expect(within(dialog).queryByLabelText('Staff note')).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Close message' }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Reply by email' })).toBeInTheDocument();
    expect(mockedUpdateMessage).not.toHaveBeenCalled();
  });
});
