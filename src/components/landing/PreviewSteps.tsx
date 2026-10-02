'use client';

/**
 * Thanh 3 bước ở đầu hai minh hoạ "Thử đăng một ca" / "Tìm được ca là ứng tuyển
 * ngay" (03/10). Khi minh hoạ đang tự chạy: chỉ hiển thị (bước hiện tại tô cam,
 * bước đã qua có ✓). Chạy xong: mỗi bước là một nút để người xem tự xem lại từng
 * phần (`onSelect`). Không thay cho điều hướng của trang.
 */

export function PreviewSteps({
  labels,
  current,
  onSelect,
  label,
}: {
  labels: string[];
  /** 0-based. */
  current: number;
  /** Có → bấm được từng bước. */
  onSelect?: (i: number) => void;
  /** Nhãn cho trình đọc màn hình của cả nhóm nút. */
  label: string;
}) {
  return (
    <ol aria-label={label} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
      {labels.map((text, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'todo';
        const body = (
          <>
            <span
              className={[
                'block h-1 rounded-full transition-colors duration-300 motion-reduce:transition-none',
                state === 'todo' ? 'bg-gray-200' : 'bg-orange-500',
              ].join(' ')}
            />
            <span
              className={[
                'mt-1.5 block truncate text-left text-xs',
                state === 'now' ? 'font-semibold text-gray-900' : state === 'done' ? 'text-gray-700' : 'text-gray-500',
              ].join(' ')}
            >
              {state === 'done' ? '✓ ' : `${i + 1}. `}
              {text}
            </span>
          </>
        );
        return (
          <li key={text} className="min-w-0">
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={state === 'now' ? 'step' : undefined}
                className="block min-h-[44px] w-full rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                {body}
              </button>
            ) : (
              <span aria-current={state === 'now' ? 'step' : undefined} className="block min-h-[44px]">
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
