// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FlaggedBlob } from '../../../db/admin.func';
import { FlaggedQueue } from './FlaggedQueue';

// Mock ErrorBanner
vi.mock('../../../components/ErrorBanner', () => ({
  ErrorBanner: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div data-testid="error-banner">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

function buildFlaggedBlob(overrides: Partial<FlaggedBlob> = {}): FlaggedBlob {
  return {
    id: 1,
    title: 'Flagged Blob',
    description: 'A suspicious print',
    imageThumbnailUrl: 'https://example.com/thumb.jpg',
    filamentType: 'PLA',
    machineUsed: 'Ender 3',
    createdAt: '2025-07-01T00:00:00.000Z',
    uploaderName: 'Uploader',
    uploaderAvatarUrl: null,
    moderationScores: { nudity: 0.85, weapons: 0.2, alcohol: 0.1, drugs: 0.05 },
    ...overrides,
  } as FlaggedBlob;
}

describe('FlaggedQueue', () => {
  it('shows loading skeleton when loading', () => {
    render(
      <FlaggedQueue
        flaggedBlobs={[]}
        loading={true}
        error={null}
        onRetry={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const skeletons = document.querySelectorAll('.animate-pulse > div');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('shows error banner on error', () => {
    render(
      <FlaggedQueue
        flaggedBlobs={[]}
        loading={false}
        error={new Error('Failed')}
        onRetry={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByTestId('error-banner')).toBeInTheDocument();
  });

  it('shows empty state when no flagged blobs', () => {
    render(
      <FlaggedQueue
        flaggedBlobs={[]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText('No flagged blobs awaiting review.')).toBeInTheDocument();
    expect(screen.getByText('All clear!')).toBeInTheDocument();
  });

  it('renders flagged blob cards with titles', () => {
    const blobs = [
      buildFlaggedBlob({ id: 1, title: 'Bad Print' }),
      buildFlaggedBlob({ id: 2, title: 'Sketchy Model' }),
    ];
    render(
      <FlaggedQueue
        flaggedBlobs={blobs}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText('Bad Print')).toBeInTheDocument();
    expect(screen.getByText('Sketchy Model')).toBeInTheDocument();
  });

  it('shows uploader info', () => {
    render(
      <FlaggedQueue
        flaggedBlobs={[buildFlaggedBlob({ uploaderName: 'Alice' })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows moderation scores', () => {
    render(
      <FlaggedQueue
        flaggedBlobs={[buildFlaggedBlob()]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText('Moderation Scores')).toBeInTheDocument();
    // 0.85 = 85.0%
    expect(screen.getByText(/85\.0%/)).toBeInTheDocument();
  });

  it('shows moderation unavailable warning', () => {
    render(
      <FlaggedQueue
        flaggedBlobs={[buildFlaggedBlob({ moderationScores: { moderationUnavailable: 1 } })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText(/Moderation service was unavailable/)).toBeInTheDocument();
  });

  it('calls onApprove when approve button is clicked', async () => {
    const onApprove = vi.fn();
    render(
      <FlaggedQueue
        flaggedBlobs={[buildFlaggedBlob()]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalledWith(1);
  });

  it('calls onReject when reject button is clicked', async () => {
    const onReject = vi.fn();
    render(
      <FlaggedQueue
        flaggedBlobs={[buildFlaggedBlob()]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onApprove={vi.fn()}
        onReject={onReject}
      />,
    );
    await userEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledWith(1);
  });

  it('renders view link with correct href', () => {
    render(
      <FlaggedQueue
        flaggedBlobs={[buildFlaggedBlob({ id: 42 })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const link = screen.getByText('View').closest('a');
    expect(link).toHaveAttribute('href', '/blobs/42');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
