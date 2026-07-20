// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StorageStats } from '../../../db/admin.func';
import { StorageCards } from './StorageCards';

// Mock ErrorBanner to simplify assertions
vi.mock('../../../components/ErrorBanner', () => ({
  ErrorBanner: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div data-testid="error-banner">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

function buildStats(overrides: Partial<StorageStats> = {}): StorageStats {
  return {
    blobCount: 42,
    totalSizeBytes: 1_073_741_824, // 1 GB
    capacityBytes: 10_737_418_240, // 10 GB
    ...overrides,
  };
}

describe('StorageCards', () => {
  it('shows loading skeletons when loading', () => {
    render(<StorageCards stats={null} loading={true} error={null} onRetry={vi.fn()} />);
    // Should have 3 pulse skeletons (one per card value area)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders stats when loaded', () => {
    render(<StorageCards stats={buildStats()} loading={false} error={null} onRetry={vi.fn()} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('1.0 GB')).toBeInTheDocument();
    expect(screen.getByText('10.0 GB')).toBeInTheDocument();
  });

  it('shows error banner on error', () => {
    render(<StorageCards stats={null} loading={false} error={new Error('Network error')} onRetry={vi.fn()} />);
    expect(screen.getByTestId('error-banner')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('shows usage bar with percentage', () => {
    render(<StorageCards stats={buildStats()} loading={false} error={null} onRetry={vi.fn()} />);
    expect(screen.getByText('10.0% used')).toBeInTheDocument();
  });

  it('shows danger color when usage > 90%', () => {
    render(
      <StorageCards
        stats={buildStats({ totalSizeBytes: 9.5 * 1024 * 1024 * 1024, capacityBytes: 10 * 1024 * 1024 * 1024 })}
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );
    const bar = document.querySelector('.bg-doom-500');
    expect(bar).not.toBeNull();
  });

  it('shows warning color when usage > 70%', () => {
    render(
      <StorageCards
        stats={buildStats({ totalSizeBytes: 8 * 1024 * 1024 * 1024, capacityBytes: 10 * 1024 * 1024 * 1024 })}
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );
    const bar = document.querySelector('.bg-yellow-500');
    expect(bar).not.toBeNull();
  });

  it('shows green color when usage <= 70%', () => {
    render(<StorageCards stats={buildStats()} loading={false} error={null} onRetry={vi.fn()} />);
    const bar = document.querySelector('.bg-green-500');
    expect(bar).not.toBeNull();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<StorageCards stats={null} loading={false} error={new Error('fail')} onRetry={onRetry} />);
    await userEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
