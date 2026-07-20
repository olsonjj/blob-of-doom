// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { GalleryBlob } from '../../../db/gallery.func';
import { BlobTable } from './BlobTable';

// Mock ErrorBanner
vi.mock('../../../components/ErrorBanner', () => ({
  ErrorBanner: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div data-testid="error-banner">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

function buildBlob(overrides: Partial<GalleryBlob> = {}): GalleryBlob {
  return {
    id: 1,
    title: 'Test Blob',
    imageThumbnailUrl: 'https://example.com/thumb.jpg',
    filamentType: 'PLA',
    averageRating: 4.2,
    createdAt: '2025-07-01T00:00:00.000Z',
    moderationScores: null,
    ...overrides,
  } as GalleryBlob;
}

describe('BlobTable', () => {
  it('shows loading skeleton when loading', () => {
    render(<BlobTable blobs={[]} loading={true} error={null} onRetry={vi.fn()} onDelete={vi.fn()} />);
    const skeletons = document.querySelectorAll('.animate-pulse > div');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('shows error banner on error', () => {
    render(<BlobTable blobs={[]} loading={false} error={new Error('Failed')} onRetry={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByTestId('error-banner')).toBeInTheDocument();
  });

  it('shows empty state when no blobs', () => {
    render(<BlobTable blobs={[]} loading={false} error={null} onRetry={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No blobs in the gallery.')).toBeInTheDocument();
  });

  it('renders blob rows with titles and filament types', () => {
    const blobs = [
      buildBlob({ id: 1, title: 'Cool Print', filamentType: 'ABS' }),
      buildBlob({ id: 2, title: 'Another Print', filamentType: 'PETG' }),
    ];
    render(<BlobTable blobs={blobs} loading={false} error={null} onRetry={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Cool Print')).toBeInTheDocument();
    expect(screen.getByText('ABS')).toBeInTheDocument();
    expect(screen.getByText('Another Print')).toBeInTheDocument();
    expect(screen.getByText('PETG')).toBeInTheDocument();
  });

  it('shows average rating', () => {
    render(
      <BlobTable
        blobs={[buildBlob({ averageRating: 3.7 })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('3.7')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(<BlobTable blobs={[buildBlob()]} loading={false} error={null} onRetry={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByTitle('Delete blob'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('shows moderation badges when scores are present', () => {
    render(
      <BlobTable
        blobs={[buildBlob({ moderationScores: { nudity: 0.85, weapons: 0.3, alcohol: 0.1, drugs: 0.05 } })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    // High score (0.85) should show
    expect(screen.getByText(/Nudity/)).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('does not show moderation badges when scores are null', () => {
    render(
      <BlobTable
        blobs={[buildBlob({ moderationScores: null })]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Nudity/)).toBeNull();
  });
});
