// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmModal
        open={false}
        title="Test"
        message="Are you sure?"
        confirmLabel="Confirm"
        confirmVariant="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open', () => {
    render(
      <ConfirmModal
        open={true}
        title="Delete Item"
        message="This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        open={true}
        title="Test"
        message="Msg"
        confirmLabel="OK"
        confirmVariant="warning"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText('OK'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open={true}
        title="Test"
        message="Msg"
        confirmLabel="OK"
        confirmVariant="danger"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when backdrop is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open={true}
        title="Test"
        message="Msg"
        confirmLabel="OK"
        confirmVariant="danger"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    // Backdrop is the first child (absolute inset-0)
    const backdrop = document.querySelector('.absolute.inset-0');
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop!);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders danger variant with correct colors', () => {
    render(
      <ConfirmModal
        open={true}
        title="Test"
        message="Msg"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const confirmBtn = screen.getByText('Delete');
    expect(confirmBtn.className).toContain('bg-doom-500');
  });

  it('renders warning variant with correct colors', () => {
    render(
      <ConfirmModal
        open={true}
        title="Test"
        message="Msg"
        confirmLabel="Approve"
        confirmVariant="warning"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const confirmBtn = screen.getByText('Approve');
    expect(confirmBtn.className).toContain('bg-yellow-600');
  });
});
