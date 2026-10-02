/**
 * Khối "Từ những ca đã chạy thử" (bằng chứng xã hội, 02/10).
 *
 * Ghim lại:
 *   - Chưa có ảnh / lời chia sẻ thật → KHÔNG vẽ gì (không khung trống, không câu mẫu).
 *   - Có dữ liệu → vẽ tiêu đề, ảnh kèm chú thích nơi chụp, lời chia sẻ kèm tên + vai trò.
 *   - Lọc theo phía (người lao động / nhà tuyển dụng) ở trang vai trò.
 *   - Tiếng Anh: dùng bản dịch nếu có, không thì giữ nguyên lời tiếng Việt.
 *   - Dữ liệu thật trong `proofData.ts` phải có ngày xin phép hợp lệ và ảnh nằm
 *     trong public/ (chặn việc thêm nội dung chưa được đồng ý).
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LandingProofView } from './LandingProof';
import { PROOF_PHOTOS, PROOF_QUOTES, type ProofPhoto, type ProofQuote } from './proofData';

const COPY = { title: 'Từ những ca đã chạy thử', lead: 'Lead', note: 'Note' };

const QUOTES: ProofQuote[] = [
  {
    quote: 'Câu của người lao động',
    quoteEn: 'Worker quote',
    name: 'Người A',
    role: 'Sinh viên',
    roleEn: 'Student',
    audience: 'worker',
    consentDate: '2026-10-01',
  },
  {
    quote: 'Câu của nhà tuyển dụng',
    name: 'Người B',
    role: 'Chủ quán',
    audience: 'employer',
    consentDate: '2026-10-01',
  },
];

const PHOTOS: ProofPhoto[] = [
  { src: '/images/landing/job-phuc-vu.webp', alt: 'Ảnh thử', place: 'Quán thử', consentDate: '2026-10-01' },
];

describe('LandingProofView', () => {
  it('không vẽ gì khi chưa có ảnh hay lời chia sẻ', () => {
    const { container } = render(<LandingProofView id="p" copy={COPY} locale="vi" quotes={[]} photos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('không vẽ gì khi lọc theo phía mà phía đó chưa có lời nào (và không có ảnh)', () => {
    const { container } = render(
      <LandingProofView id="p" copy={COPY} locale="vi" audience="worker" quotes={[QUOTES[1]]} photos={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('có dữ liệu: tiêu đề, ảnh + nơi chụp, lời chia sẻ + tên + vai trò', () => {
    render(<LandingProofView id="p" copy={COPY} locale="vi" quotes={QUOTES} photos={PHOTOS} />);
    expect(screen.getByRole('heading', { level: 2, name: COPY.title })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ảnh thử' })).toBeInTheDocument();
    expect(screen.getByText('Quán thử')).toBeInTheDocument();
    expect(screen.getByText(/Câu của người lao động/)).toBeInTheDocument();
    expect(screen.getByText(/Câu của nhà tuyển dụng/)).toBeInTheDocument();
    expect(screen.getByText('Người A')).toBeInTheDocument();
    expect(screen.getByText('Sinh viên')).toBeInTheDocument();
  });

  it('lọc theo phía', () => {
    render(<LandingProofView id="p" copy={COPY} locale="vi" audience="employer" quotes={QUOTES} photos={[]} />);
    expect(screen.getByText(/Câu của nhà tuyển dụng/)).toBeInTheDocument();
    expect(screen.queryByText(/Câu của người lao động/)).toBeNull();
  });

  it('tiếng Anh: dùng bản dịch nếu có, không thì giữ lời gốc', () => {
    render(<LandingProofView id="p" copy={COPY} locale="en" quotes={QUOTES} photos={[]} />);
    expect(screen.getByText(/Worker quote/)).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText(/Câu của nhà tuyển dụng/)).toBeInTheDocument();
    expect(screen.getByText('Chủ quán')).toBeInTheDocument();
  });
});

describe('proofData.ts — dữ liệu thật', () => {
  const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

  it('mỗi lời chia sẻ có tên, vai trò và ngày xin phép hợp lệ', () => {
    for (const q of PROOF_QUOTES) {
      expect(q.quote.trim()).not.toBe('');
      expect(q.name.trim()).not.toBe('');
      expect(q.role.trim()).not.toBe('');
      expect(isDate(q.consentDate)).toBe(true);
      if (q.photo) expect(existsSync(join(process.cwd(), 'public', q.photo))).toBe(true);
    }
  });

  it('mỗi ảnh có mô tả, nơi chụp, ngày xin phép và file nằm trong public/', () => {
    for (const p of PROOF_PHOTOS) {
      expect(p.alt.trim()).not.toBe('');
      expect(p.place.trim()).not.toBe('');
      expect(isDate(p.consentDate)).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', p.src))).toBe(true);
    }
  });
});
