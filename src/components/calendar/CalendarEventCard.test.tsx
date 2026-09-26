import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarEventCard, calendarSlotRowHeight } from './CalendarEventCard';

describe('CalendarEventCard', () => {
  it('renders title, time range, and subtitle', () => {
    render(
      <CalendarEventCard
        title="Phục vụ quầy bar"
        timeRange="08:00 - 12:00"
        subtitle="3/5 vị trí"
        variant="publishedShift"
      />,
    );

    expect(screen.getByText('Phục vụ quầy bar')).toBeInTheDocument();
    expect(screen.getByText('08:00 - 12:00')).toBeInTheDocument();
    expect(screen.getByText('3/5 vị trí')).toBeInTheDocument();
  });

  it('renders as a div when no onClick is provided', () => {
    const { container } = render(
      <CalendarEventCard
        title="Busy"
        timeRange="09:00 - 10:00"
        variant="personalBusy"
      />,
    );

    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders as a button and triggers onClick when provided', () => {
    const handleClick = vi.fn();
    render(
      <CalendarEventCard
        title="Approved shift"
        timeRange="13:00 - 17:00"
        variant="approvedShift"
        onClick={handleClick}
      />,
    );

    const button = screen.getByRole('button', { name: /Approved shift/ });
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant color classes', () => {
    const { rerender, container } = render(
      <CalendarEventCard
        title="Cancelled"
        timeRange="08:00 - 12:00"
        variant="cancelledShift"
      />,
    );

    let root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-red-100');
    expect(root.className).toContain('line-through');

    rerender(
      <CalendarEventCard
        title="Personal"
        timeRange="08:00 - 12:00"
        variant="personalBusy"
      />,
    );
    root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-slate-100');
  });

  it('adds absolute-friendly classes when absolute prop is true', () => {
    const { container } = render(
      <CalendarEventCard
        title="Filled"
        timeRange="08:00 - 12:00"
        variant="publishedShift"
        absolute
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('h-full');
    expect(root.className).toContain('w-full');
  });

  it('renders a status chip when provided', () => {
    render(
      <CalendarEventCard
        title="Awaiting"
        timeRange="08:00 - 12:00"
        variant="awaitingShift"
        statusChip={<span data-testid="chip">Chờ xác nhận</span>}
      />,
    );

    expect(screen.getByTestId('chip')).toBeInTheDocument();
  });

  it('meets the 44px minimum tap target', () => {
    const { container } = render(
      <CalendarEventCard
        title="Tap"
        timeRange="08:00 - 12:00"
        variant="approvedShift"
        onClick={() => {}}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('min-h-[44px]');
  });

  it('grid (absolute) card shows the text status label instead of the chip', () => {
    render(
      <CalendarEventCard
        title="Ca ngắn"
        timeRange="17:00 - 18:00"
        statusLabel="Hoàn thành"
        statusChip={<span data-testid="chip-hidden">chip</span>}
        variant="completedShift"
        absolute
      />,
    );
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument();
    expect(screen.queryByTestId('chip-hidden')).toBeNull();
  });

  it('calendarSlotRowHeight gives every hour at least 60px', () => {
    expect(calendarSlotRowHeight(120)).toBe(120);
    expect(calendarSlotRowHeight(60)).toBe(60);
    expect(calendarSlotRowHeight(30)).toBe(60);
    expect(calendarSlotRowHeight(Number.NaN)).toBe(60);
  });
});
