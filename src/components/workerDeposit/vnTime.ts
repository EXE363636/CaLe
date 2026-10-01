/**
 * Giờ hiển thị cho cọc người lao động — luôn theo Asia/Ho_Chi_Minh (khớp server
 * shift_end_ts), không theo múi giờ máy người xem.
 */

const TZ = 'Asia/Ho_Chi_Minh';

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** `YYYY-MM-DD` + `HH:mm` giờ Việt Nam → ISO. */
export function vnShiftInstantIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

export function formatVnDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function formatVnDate(iso: string): string {
  return DATE.format(new Date(iso));
}
