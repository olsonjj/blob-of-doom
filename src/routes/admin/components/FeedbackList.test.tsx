// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FeedbackRow } from '../../../db/feedback.func';
import { FeedbackList } from './FeedbackList';

// Mock ErrorBanner
vi.mock('../../../components/ErrorBanner', () => ({
  ErrorBanner: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div data-testid="error-banner">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

function buildFeedback(overrides: Partial<FeedbackRow> = {}): FeedbackRow {
  return {
    id: 1,
    message: 'Great app!',
    category: 'feature',
    resolved: 0,
    createdAt: '2025-07-01T00:00:00.000Z',
    email: 'user@test.com',
    submitterProfileId: 'prof_1',
    submitterProvider: 'github',
    ...overrides,
  } as FeedbackRow;
}

describe('FeedbackList', () => {
  it('shows loading skeleton when loading', () => {
    render(
      <FeedbackList
        feedbackItems={[]}
        loading={true}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const skeletons = document.querySelectorAll('.animate-pulse > div');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('shows error banner on error', () => {
    render(
      <FeedbackList
        feedbackItems={[]}
        loading={false}
        error={new Error('Failed')}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByTestId('error-banner')).toBeInTheDocument();
  });

  it('shows empty state when no feedback', () => {
    render(
      <FeedbackList
        feedbackItems={[]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('No feedback submissions yet.')).toBeInTheDocument();
  });

  it('renders feedback items with messages', () => {
    const items = [
      buildFeedback({ id: 1, message: 'Love it!' }),
      buildFeedback({ id: 2, message: 'Needs dark mode', category: 'bug' }),
    ];
    render(
      <FeedbackList
        feedbackItems={items}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Love it!')).toBeInTheDocument();
    expect(screen.getByText('Needs dark mode')).toBeInTheDocument();
  });

  it('shows Feature badge for feature requests', () => {
    render(
      <FeedbackList
        feedbackItems={[buildFeedback({ category: 'feature' })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Feature')).toBeInTheDocument();
  });

  it('shows Bug badge for bug reports', () => {
    render(
      <FeedbackList
        feedbackItems={[buildFeedback({ category: 'bug' })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('shows Resolved badge for resolved items', () => {
    render(
      <FeedbackList
        feedbackItems={[buildFeedback({ resolved: 1 })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('shows submitter email with provider', () => {
    render(
      <FeedbackList
        feedbackItems={[buildFeedback({ email: 'dev@test.com', submitterProvider: 'github' })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/dev@test.com/)).toBeInTheDocument();
    expect(screen.getByText(/Github/)).toBeInTheDocument();
  });

  it('shows Anonymous for unauthenticated feedback', () => {
    render(
      <FeedbackList
        feedbackItems={[buildFeedback({ email: null, submitterProfileId: null })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });

  it('calls onResolve when resolve button is clicked', async () => {
    const onResolve = vi.fn();
    render(
      <FeedbackList
        feedbackItems={[buildFeedback()]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={onResolve}
        onDelete={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText('Resolve'));
    expect(onResolve).toHaveBeenCalledWith(1);
  });

  it('shows Unresolve for already-resolved items', () => {
    render(
      <FeedbackList
        feedbackItems={[buildFeedback({ resolved: 1 })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Unresolve')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <FeedbackList
        feedbackItems={[buildFeedback()]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={onDelete}
      />,
    );
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('sorts unresolved items before resolved', () => {
    const items = [
      buildFeedback({ id: 1, message: 'Resolved item', resolved: 1 }),
      buildFeedback({ id: 2, message: 'Urgent bug', resolved: 0, category: 'bug' }),
    ];
    render(
      <FeedbackList
        feedbackItems={items}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onResolve={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const messages = screen.getAllByText(/item|bug/).map((el) => el.textContent);
    // Unresolved should appear first
    expect(messages[0]).toBe('Urgent bug');
    expect(messages[1]).toBe('Resolved item');
  });
});
