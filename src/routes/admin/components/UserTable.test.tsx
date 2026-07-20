// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { AdminUser } from '../../../db/admin.func';
import { UserTable } from './UserTable';

// Mock ErrorBanner
vi.mock('../../../components/ErrorBanner', () => ({
  ErrorBanner: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div data-testid="error-banner">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    clerkUserId: 'user_abc123',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: '',
    approved: false,
    banned: false,
    isAdmin: false,
    uploadCountToday: 3,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('UserTable', () => {
  it('shows loading skeleton when loading', () => {
    render(
      <UserTable
        users={[]}
        loading={true}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    const skeletons = document.querySelectorAll('.animate-pulse > div');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('shows error banner on error', () => {
    render(
      <UserTable
        users={[]}
        loading={false}
        error={new Error('Failed')}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    expect(screen.getByTestId('error-banner')).toBeInTheDocument();
  });

  it('shows empty state when no users', () => {
    render(
      <UserTable
        users={[]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });

  it('renders user rows with names and emails', () => {
    const users = [
      buildUser({ name: 'Alice', email: 'alice@test.com' }),
      buildUser({ clerkUserId: 'user_2', name: 'Bob', email: 'bob@test.com' }),
    ];
    render(
      <UserTable
        users={users}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('bob@test.com')).toBeInTheDocument();
  });

  it('shows correct status badge for default user', () => {
    render(
      <UserTable
        users={[buildUser()]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows correct status badge for approved user', () => {
    render(
      <UserTable
        users={[buildUser({ approved: true })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('shows correct status badge for banned user', () => {
    render(
      <UserTable
        users={[buildUser({ banned: true })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    expect(screen.getByText('Banned')).toBeInTheDocument();
  });

  it('shows correct status badge for admin user', () => {
    render(
      <UserTable
        users={[buildUser({ isAdmin: true })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('calls onToggleApproved when approve button is clicked', async () => {
    const onToggleApproved = vi.fn();
    render(
      <UserTable
        users={[buildUser()]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={onToggleApproved}
        onToggleBanned={vi.fn()}
      />,
    );
    // The approve button has title "Approve user" for unapproved users
    await userEvent.click(screen.getByTitle('Approve user'));
    expect(onToggleApproved).toHaveBeenCalledWith('user_abc123', false);
  });

  it('calls onToggleBanned when ban button is clicked', async () => {
    const onToggleBanned = vi.fn();
    render(
      <UserTable
        users={[buildUser()]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={onToggleBanned}
      />,
    );
    await userEvent.click(screen.getByTitle('Ban user'));
    expect(onToggleBanned).toHaveBeenCalledWith('user_abc123', false);
  });

  it('hides approve button for banned users', () => {
    render(
      <UserTable
        users={[buildUser({ banned: true })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    expect(screen.queryByTitle('Approve user')).toBeNull();
    expect(screen.queryByTitle('Revoke approval')).toBeNull();
  });

  it('hides approve and ban buttons for admin users', () => {
    render(
      <UserTable
        users={[buildUser({ isAdmin: true })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    expect(screen.queryByTitle('Approve user')).toBeNull();
    expect(screen.queryByTitle('Ban user')).toBeNull();
  });

  it('shows upload count', () => {
    render(
      <UserTable
        users={[buildUser({ uploadCountToday: 7 })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onToggleApproved={vi.fn()}
        onToggleBanned={vi.fn()}
      />,
    );
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
