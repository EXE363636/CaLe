'use client';

/**
 * Minh hoạ cho các khối gộp từ trang hướng dẫn nhỏ vào trang vai trò (03/10):
 *   - `SchedulePreview` (`/for-workers#worker-schedule`): lịch cá nhân ở chế độ Danh sách
 *     trong khung điện thoại — giờ bận, ca đã duyệt / chờ duyệt, tóm tắt tuần. Ca trùng
 *     giờ bận bị chặn CHỈ ở bản demo (bản thật chưa kiểm trùng lịch → không vẽ).
 *   - `CancelWindowPreview` (`/for-workers#worker-cancel`): ba mốc huỷ ca trên một thanh
 *     thời gian, tính từ hằng số thật (`shiftMilestones`), và việc xảy ra lúc 15:20.
 *   - `ApplicantPreview` (`/for-employers#employer-applicants`): thẻ ứng viên đúng theo
 *     bản (bản thật: số ca đã làm với bạn, số lần vắng, sao; demo thêm uy tín, kỹ năng).
 * Đứng yên, không vòng lặp (ngân sách chuyển động trang vai trò đã dùng cho hero).
 * Phần minh hoạ `aria-hidden`; `figcaption` nói đây là ví dụ.
 */

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { useT, useTx } from '@/i18n/LocaleProvider';
import { LandingIconGlyph } from './LandingSections';
import { PhoneFrame } from './PhoneFrame';
import { shiftMilestones } from './shiftMilestones';

const CARD = 'rounded-3xl bg-white p-5 text-left shadow-modal ring-1 ring-black/5 sm:p-6';

function Caption({ children }: { children: ReactNode }) {
  return <figcaption className="mt-4 text-center text-xs text-gray-600">{children}</figcaption>;
}

// ---------------------------------------------------------------------------
// Lịch cá nhân
// ---------------------------------------------------------------------------

export function SchedulePreview() {
  const t = useT();
  const tx = useTx();
  const live = isSupabaseEnv();
  const days = [tx('T2'), tx('T3'), tx('T4'), tx('T5'), tx('T6'), tx('T7'), tx('CN')];
  const busy = new Set([1, 2, 3]);
  return (
    <figure className="min-w-0">
      <PhoneFrame>
        <div aria-hidden="true" className="text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-bold text-gray-900">{tx('Lịch cá nhân')}</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-black/5">
              {tx('Danh sách')}
            </span>
          </div>

          {/* Dải 7 ngày: hôm nay ô cam, ngày có lịch có chấm. */}
          <ol className="mt-3 grid grid-cols-7 gap-1">
            {days.map((d, i) => (
              <li
                key={d}
                className={[
                  'flex flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-semibold',
                  i === 1 ? 'bg-orange-500 text-gray-900' : 'text-gray-600',
                ].join(' ')}
              >
                {d}
                <span className={['h-1 w-1 rounded-full', busy.has(i) ? (i === 1 ? 'bg-gray-900' : 'bg-orange-500') : 'bg-transparent'].join(' ')} />
              </li>
            ))}
          </ol>

          {/* Tóm tắt tuần */}
          <dl className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            {[
              [tx('Ca đã nhận'), '2'],
              [tx('Giờ làm'), '8'],
              [tx('Dự kiến'), '300.000 đ'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white px-1.5 py-2 ring-1 ring-black/5">
                <dt className="text-xs leading-tight text-gray-600">{k}</dt>
                <dd className="mt-0.5 text-sm font-bold text-gray-900 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-col gap-3">
            <DayGroup label={tx('Thứ Ba · hôm nay')}>
              <BusyItem time="14:00–16:00" title={tx('Giờ học')} tag={tx('Lịch bận')} />
              <ShiftItem time="17:00–21:00" title={tx('Phục vụ quán cà phê')} badge={<Badge tone="success">{t('application.status.Approved')}</Badge>} />
              {!live && (
                <div className="rounded-xl border border-dashed border-red-300 bg-red-50 px-3 py-2">
                  <p className="text-xs font-semibold text-red-800">{tx('Phát tờ rơi · 15:00–17:00')}</p>
                  <p className="mt-0.5 text-xs leading-snug text-red-800">{tx('Trùng giờ học: không ứng tuyển được')}</p>
                </div>
              )}
            </DayGroup>
            <DayGroup label={tx('Thứ Tư')}>
              <ShiftItem time="08:00–12:00" title={tx('Kiểm hàng kho')} badge={<Badge tone="warning">{t('application.status.Pending')}</Badge>} />
            </DayGroup>
            <DayGroup label={tx('Thứ Năm')}>
              <ShiftItem time="10:00–14:00" title={tx('Phụ bếp nhà hàng')} badge={<Badge tone="success">{t('application.status.Approved')}</Badge>} />
            </DayGroup>
          </div>
        </div>
      </PhoneFrame>
      <Caption>{tx('Minh hoạ lịch cá nhân trên điện thoại. Ca và giờ là ví dụ.')}</Caption>
    </figure>
  );
}

function DayGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 text-xs font-semibold text-gray-900">{label}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function ShiftItem({ time, title, badge }: { time: string; title: string; badge: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5">
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-600 tabular-nums">{time}</span>
      </span>
      <span className="shrink-0">{badge}</span>
    </div>
  );
}

function BusyItem({ time, title, tag }: { time: string; title: string; tag: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-gray-700">{title}</span>
        <span className="block text-xs text-gray-600 tabular-nums">{time}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-gray-600">{tag}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mốc huỷ ca
// ---------------------------------------------------------------------------

export function CancelWindowPreview({ start = '17:00', end = '22:00' }: { start?: string; end?: string }) {
  const tx = useTx();
  const live = isSupabaseEnv();
  const ms = shiftMilestones(start, end);
  const selfBy = ms?.workerCancelBy.time ?? '14:00';
  const late = ms?.checkInClose.time ?? '17:15';
  const zones = [
    { key: 'self', grow: 'flex-[3]', bar: 'bg-green-500', time: tx('Trước {time}').replace('{time}', selfBy), label: tx('Tự huỷ') },
    { key: 'ask', grow: 'flex-[3]', bar: 'bg-amber-400', time: `${selfBy}–${start}`, label: tx('Cần nhà tuyển dụng đồng ý') },
    { key: 'absent', grow: 'flex-[2]', bar: 'bg-red-500', time: tx('Sau {time}').replace('{time}', late), label: tx('Không đến = vắng mặt') },
  ];
  return (
    <figure className="min-w-0">
      <div aria-hidden="true" className={CARD}>
        <p className="text-lg font-semibold text-gray-900">{tx('Phục vụ tiệc cưới')}</p>
        <p className="text-sm text-gray-600 tabular-nums">
          {tx('Thứ Bảy')} · {start}–{end}
        </p>

        {/* Thanh ba mốc: chiều rộng tương đối, nhãn chữ dưới mỗi đoạn (không chỉ màu). */}
        <div className="relative mt-6">
          {/* Mũi "bây giờ" nằm trong đoạn giữa */}
          <div className="absolute -top-5 left-[52%] flex -translate-x-1/2 flex-col items-center">
            <span className="rounded-md bg-gray-900 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">15:20</span>
            <span className="h-2 w-px bg-gray-900" />
          </div>
          <div className="flex gap-1">
            {zones.map((z) => (
              <div key={z.key} className={[z.grow, 'min-w-0'].join(' ')}>
                <div className={['h-2.5 rounded-full', z.bar].join(' ')} />
                <p className="mt-2 text-xs font-semibold text-gray-900 tabular-nums">{z.time}</p>
                <p className="mt-0.5 text-xs leading-snug text-gray-600">{z.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lúc 15:20: trong 3 giờ trước ca → gửi yêu cầu, vẫn giữ chỗ. */}
        <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-900">{tx('Lúc 15:20: còn chưa tới 3 giờ')}</p>
          <p className="mt-0.5 text-sm text-amber-900">{tx('Nút huỷ gửi yêu cầu tới nhà tuyển dụng. Trong lúc chờ, bạn vẫn giữ chỗ.')}</p>
          <span className="mt-3 inline-flex min-h-[40px] items-center rounded-xl bg-white px-4 text-sm font-semibold text-gray-900 ring-1 ring-amber-300">
            {tx('Gửi yêu cầu huỷ')}
          </span>
        </div>

        <p className="mt-4 flex items-start gap-2 text-sm text-gray-700">
          <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
          {live
            ? tx('Nhà tuyển dụng huỷ ca: bạn không bị trừ gì, cọc (nếu có) hoàn đủ.')
            : tx('Nhà tuyển dụng huỷ ca: bạn không bị trừ gì.')}
        </p>
      </div>
      <Caption>{tx('Minh hoạ mốc huỷ cho một ca bắt đầu lúc {start}.').replace('{start}', start)}</Caption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Thẻ ứng viên (nhà tuyển dụng)
// ---------------------------------------------------------------------------

export function ApplicantPreview() {
  const t = useT();
  const tx = useTx();
  const live = isSupabaseEnv();
  return (
    <figure className="min-w-0">
      <div aria-hidden="true" className={CARD}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900">{tx('Phục vụ tiệc cưới')}</p>
            <p className="text-sm text-gray-600 tabular-nums">{tx('Thứ Bảy · 17:00–22:00 · cần 3 người')}</p>
          </div>
          <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 ring-1 ring-orange-200 tabular-nums">
            {tx('2/3 đã duyệt')}
          </span>
        </div>

        {/* Người đang chờ duyệt: đủ thông tin để quyết ngay trên thẻ. */}
        <div className="mt-5 rounded-2xl bg-orange-50/60 p-4 ring-1 ring-orange-200">
          <div className="flex items-center gap-3">
            <Avatar initials="TH" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-gray-900">Thu Hà</p>
              <p className="text-xs text-gray-600 tabular-nums">
                <span className="text-amber-500">★</span> {tx('4,9 · 21 đánh giá')}
              </p>
            </div>
            <Badge tone="warning">{t('application.status.Pending')}</Badge>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {(live
              ? [tx('2 ca đã làm với bạn'), tx('0 lần vắng mặt với bạn'), tx('Thích việc phục vụ')]
              : [tx('Uy tín 96/100'), tx('Phục vụ cấp 3'), tx('Đã xác thực SĐT')]
            ).map((c) => (
              <li key={c} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-800 ring-1 ring-black/5">
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <span className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-gray-900">
              {t('btn.approve')}
            </span>
            <span className="inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 text-sm font-semibold text-gray-700 ring-1 ring-gray-300">
              {t('btn.reject')}
            </span>
          </div>
        </div>

        {/* Ngày làm: có mặt / vắng mặt cho từng người đã duyệt. */}
        <ul className="mt-3 flex flex-col gap-2">
          <li className="flex items-center gap-3 rounded-xl px-1 py-1.5">
            <Avatar initials="MA" small />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">Minh Anh</span>
              <span className="block text-xs text-gray-600 tabular-nums">{tx('Đã check-in 16:52')}</span>
            </span>
            <Badge tone="success">{tx('Có mặt')}</Badge>
          </li>
          <li className="flex items-center gap-3 rounded-xl px-1 py-1.5">
            <Avatar initials="QB" small />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">Quốc Bảo</span>
              <span className="block text-xs text-gray-600">{tx('Phần tiền của vị trí này hoàn về ví')}</span>
            </span>
            <Badge tone="danger">{t('application.status.NoShow')}</Badge>
          </li>
        </ul>
      </div>
      <Caption>{tx('Minh hoạ trang quản lý ca. Tên và số liệu là ví dụ.')}</Caption>
    </figure>
  );
}

function Avatar({ initials, small }: { initials: string; small?: boolean }) {
  return (
    <span
      className={[
        'flex shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-800',
        small ? 'h-8 w-8 text-xs' : 'h-11 w-11 text-sm',
      ].join(' ')}
    >
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Điểm uy tín (người lao động) — 03/10
// ---------------------------------------------------------------------------

/**
 * Thẻ điểm uy tín: số điểm hiện tại, thước 0–100 có hai mốc (dưới 50 tạm khoá ứng tuyển,
 * từ 80 được ưu tiên) và 4 thay đổi gần nhất theo đúng luật +5 / −10 / −20
 * (`domain/reputation`). Bắt đầu 100: −20 → 80, −10 → 70, +5 → 75, +5 → 80. Bản thật chưa
 * tính điểm → chip "Sắp có" + chú thích "khi tính năng mở".
 */
export function ReputationPreview() {
  const tx = useTx();
  const live = isSupabaseEnv();
  const good = 'bg-green-50 text-green-800 ring-green-200';
  const rows = [
    { delta: '+5', tone: good, title: tx('Hoàn thành ca'), shift: tx('Phục vụ tiệc cưới'), after: 80 },
    { delta: '+5', tone: good, title: tx('Hoàn thành ca'), shift: tx('Pha chế quán cà phê'), after: 75 },
    { delta: '−10', tone: 'bg-amber-50 text-amber-900 ring-amber-200', title: tx('Huỷ trong 24 giờ trước ca'), shift: tx('Kiểm hàng kho'), after: 70 },
    { delta: '−20', tone: 'bg-red-50 text-red-800 ring-red-200', title: tx('Vắng mặt không báo'), shift: tx('Phát tờ rơi'), after: 80 },
  ];
  return (
    <figure className="min-w-0">
      <div aria-hidden="true" className={CARD}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-700">{tx('Điểm uy tín của bạn')}</p>
          {live && <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-semibold text-white">{tx('Sắp có')}</span>}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tracking-tight text-gray-900 tabular-nums">80</span>
          <span className="text-base font-semibold text-gray-500">/100</span>
          <span className="ml-auto rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800 ring-1 ring-green-200">
            {tx('Được ưu tiên')}
          </span>
        </div>

        {/* Thước 0–100: ba đoạn có nhãn chữ, chấm mực ở điểm hiện tại. */}
        <div className="relative mt-5">
          <div className="flex h-2.5 overflow-hidden rounded-full">
            <span className="w-1/2 bg-red-200" />
            <span className="w-[30%] bg-gray-200" />
            <span className="w-1/5 bg-green-400" />
          </div>
          <span className="absolute left-[80%] top-[5px] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gray-900 shadow" />
          <div className="relative mt-2 h-9 text-xs text-gray-600 tabular-nums">
            <span className="absolute left-0">0</span>
            <span className="absolute left-1/2 -translate-x-1/2 text-center leading-tight">
              50
              <span className="block text-red-800">{tx('tạm khoá')}</span>
            </span>
            <span className="absolute left-[80%] -translate-x-1/2 text-center leading-tight">
              80
              <span className="block text-green-800">{tx('ưu tiên')}</span>
            </span>
            <span className="absolute right-0">100</span>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-gray-700">{tx('Thay đổi gần đây')}</p>
        <ul className="mt-1 flex flex-col divide-y divide-gray-100">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 py-2.5">
              <span className={['flex h-8 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums ring-1', r.tone].join(' ')}>
                {r.delta}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">{r.title}</span>
                <span className="block truncate text-xs text-gray-600">{r.shift}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-gray-700 tabular-nums">→ {r.after}</span>
            </li>
          ))}
        </ul>
      </div>
      <Caption>
        {live
          ? tx('Minh hoạ khi tính năng điểm uy tín mở. Ca và số điểm là ví dụ.')
          : tx('Minh hoạ điểm uy tín. Ca và số điểm là ví dụ.')}
      </Caption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// "Bạn nắm được mọi thứ trong ca" (nhà tuyển dụng) — 03/10
// ---------------------------------------------------------------------------

/**
 * Thẻ quản lý ca gói 4 ý của khối: nhãn trạng thái thống nhất (đúng tông `info` của
 * "Đang diễn ra"), lịch tuyển dụng tuần này, lịch sử ví (giữ / hoàn / nạp; số tính từ
 * 3 người × 5 giờ × 45.000 đ, bản thật cộng phí 10%), nút "Đăng lại ca này".
 */
export function ShiftControlPreview() {
  const t = useT();
  const tx = useTx();
  const live = isSupabaseEnv();
  const days = [tx('T2'), tx('T3'), tx('T4'), tx('T5'), tx('T6'), tx('T7'), tx('CN')];
  // 0 = trống, 1 = ca đã đăng khác, 2 = ca đang xem
  const week = [0, 0, 1, 0, 0, 2, 1];
  const held = live ? 742500 : 675000;
  const refund = live ? 247500 : 225000;
  const vnd = (n: number) => `${n.toLocaleString('vi-VN')} đ`;
  return (
    <figure className="min-w-0">
      <div aria-hidden="true" className={CARD}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900">{tx('Phục vụ tiệc cưới')}</p>
            <p className="text-sm text-gray-600 tabular-nums">{tx('Thứ 7 · 17:00–22:00 · 3/3 người có mặt')}</p>
          </div>
          <Badge tone="info" className="shrink-0 whitespace-nowrap">{t('shift.lifecycle.InProgress')}</Badge>
        </div>

        <p className="mt-5 text-xs font-semibold text-gray-700">{tx('Lịch tuyển dụng tuần này')}</p>
        <ol className="mt-2 grid grid-cols-7 gap-1.5">
          {days.map((d, i) => (
            <li key={d} className="flex flex-col items-center gap-1">
              <span className={['text-xs font-semibold', week[i] === 2 ? 'text-orange-800' : 'text-gray-600'].join(' ')}>{d}</span>
              <span
                className={[
                  'flex h-12 w-full items-end justify-center rounded-lg p-1',
                  week[i] === 2 ? 'bg-orange-50 ring-1 ring-orange-300' : 'bg-gray-50 ring-1 ring-gray-100',
                ].join(' ')}
              >
                {week[i] > 0 && <span className={['h-5 w-full rounded', week[i] === 2 ? 'bg-orange-500' : 'bg-blue-200'].join(' ')} />}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-xs font-semibold text-gray-700">{live ? tx('Lịch sử ví') : tx('Lịch sử ví (mô phỏng)')}</p>
        <ul className="mt-1 flex flex-col divide-y divide-gray-100 text-sm">
          <li className="flex items-baseline justify-between gap-3 py-2">
            <span className="min-w-0 truncate text-gray-800">{tx('Giữ tiền · Phục vụ tiệc cưới')}</span>
            <span className="shrink-0 font-semibold text-red-700 tabular-nums">−{vnd(held)}</span>
          </li>
          <li className="flex items-baseline justify-between gap-3 py-2">
            <span className="min-w-0 truncate text-gray-800">{tx('Hoàn phần người vắng · Kiểm hàng kho')}</span>
            <span className="shrink-0 font-semibold text-green-800 tabular-nums">+{vnd(refund)}</span>
          </li>
          <li className="flex items-baseline justify-between gap-3 py-2">
            <span className="min-w-0 truncate text-gray-800">{live ? tx('Nạp tiền qua PayOS') : tx('Nạp tiền')}</span>
            <span className="shrink-0 font-semibold text-green-800 tabular-nums">+{vnd(2000000)}</span>
          </li>
        </ul>

        <span className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-gray-900 ring-1 ring-gray-300">
          <span className="text-orange-700">
            <LandingIconGlyph name="repeat" className="h-4 w-4" />
          </span>
          {tx('Đăng lại ca này')}
        </span>
      </div>
      <Caption>{tx('Minh hoạ trang quản lý ca. Tên và số liệu là ví dụ.')}</Caption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Lưu ý an toàn (/support#support-safety) — 03/10
// ---------------------------------------------------------------------------

/**
 * Thẻ hồ sơ + ví của người lao động gói 3 lưu ý của khối: xác minh (SĐT; bản thật thêm
 * CCCD quản trị viên duyệt, demo là mô phỏng), tiền công nhận trong ví với phí 0 đ, và
 * một tình huống cần từ chối (trả tiền mặt ngoài luồng). Đứng yên, `aria-hidden`.
 */
export function SafetyPreview() {
  const tx = useTx();
  const live = isSupabaseEnv();
  const ok = (label: string) => (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800 ring-1 ring-green-200">
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 10.5 3.2 3L15 6.5" />
      </svg>
      {label}
    </span>
  );
  return (
    <figure className="min-w-0">
      <div aria-hidden="true" className={CARD}>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900 text-base font-bold text-white">MA</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-gray-900">{tx('Hồ sơ của bạn')}</p>
            <p className="text-xs text-gray-600">{tx('Người lao động')}</p>
          </div>
          {ok(tx('Đã xác minh'))}
        </div>

        <ul className="mt-4 flex flex-col divide-y divide-gray-100 rounded-2xl bg-gray-50 px-4 text-sm ring-1 ring-black/5">
          <li className="flex items-center justify-between gap-3 py-3">
            <span className="text-gray-800">{tx('Số điện thoại')}</span>
            {ok(live ? tx('Đã xác thực') : tx('Đã xác thực (mô phỏng)'))}
          </li>
          <li className="flex items-center justify-between gap-3 py-3">
            <span className="text-gray-800">{live ? 'CCCD' : tx('Giấy tờ tuỳ thân')}</span>
            {ok(live ? tx('Quản trị viên đã duyệt') : tx('Đã xác minh (mô phỏng)'))}
          </li>
        </ul>

        <p className="mt-5 text-xs font-semibold text-gray-700">{live ? tx('Ví của bạn') : tx('Ví của bạn (mô phỏng)')}</p>
        <ul className="mt-1 flex flex-col divide-y divide-gray-100 text-sm">
          <li className="flex items-baseline justify-between gap-3 py-2">
            <span className="min-w-0 truncate text-gray-800">{tx('Tiền công · Phục vụ tiệc cưới')}</span>
            <span className="shrink-0 font-semibold text-green-800 tabular-nums">+180.000 đ</span>
          </li>
          <li className="flex items-baseline justify-between gap-3 py-2">
            <span className="min-w-0 truncate text-gray-800">{tx('Phí CaLẻ')}</span>
            <span className="shrink-0 font-semibold text-gray-900 tabular-nums">0 đ</span>
          </li>
        </ul>

        <div className="mt-4 flex gap-3 rounded-2xl bg-red-50 p-3.5 ring-1 ring-red-100">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-700 ring-1 ring-red-100">
            <LandingIconGlyph name="shield" className="h-4 w-4" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-red-900">{tx('"Trả tiền mặt cho nhanh nhé?"')}</p>
            <p className="mt-0.5 text-red-900/80">{tx('Từ chối. Chỉ nhận tiền công trong ứng dụng.')}</p>
          </div>
        </div>
      </div>
      <Caption>{tx('Minh hoạ hồ sơ và ví của người lao động. Số liệu là ví dụ.')}</Caption>
    </figure>
  );
}
