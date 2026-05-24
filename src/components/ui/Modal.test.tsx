/**
 * Phase 10A-Fix-6 — Modal outside-click regression tests.
 *
 * Pins down:
 *   - clicking the dark backdrop calls `onClose`
 *   - clicking the empty padding around the panel (the centering
 *     wrapper) also calls `onClose` — this was the gap before Fix-6;
 *     the wrapper sits ABOVE the backdrop in z-order so its click
 *     wasn't reaching the backdrop's handler.
 *   - clicking inside the panel does NOT call `onClose`
 *   - the X button still works
 *   - ESC still works
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Modal } from './Modal';

describe('Modal — outside-click + close behaviour (Phase 10A-Fix-6)', () => {
  it('clicking the X button calls onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        <p>body</p>
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText('Đóng'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pressing Escape calls onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        <p>body</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the panel content does NOT call onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        <p data-testid="inner">body</p>
      </Modal>,
    );
    fireEvent.click(screen.getByTestId('inner'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clicking the centering wrapper (the empty padding area outside the panel) calls onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test modal">
        <p>body</p>
      </Modal>,
    );
    // The centering wrapper is the parent of the panel — find it via
    // the role="dialog" → first centering-wrapper child.
    const dialog = screen.getByRole('dialog');
    // The centering wrapper is the second top-level child (after the
    // backdrop). Find the panel's parent, then dispatch a click that
    // looks like it originated on the wrapper itself.
    const panel = dialog.querySelector('[tabindex="-1"]');
    expect(panel).not.toBeNull();
    const wrapper = panel?.parentElement;
    expect(wrapper).not.toBeNull();
    // Synthesise a click whose `target === currentTarget` so the
    // outside-click guard fires.
    fireEvent.click(wrapper!, { bubbles: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
