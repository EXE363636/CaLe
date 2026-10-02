/**
 * Đường dẫn lọc sẵn loại việc: `/shifts?viec=pha-che` (02/10 — thẻ loại việc ở
 * trang chủ dẫn thẳng vào danh sách đã lọc). Slug không dấu để link dễ chia sẻ.
 */

import { describe, expect, it } from 'vitest';

import { homeJobs } from '@/components/landing/homeJobs';
import { JOB_TYPE_SLUGS, jobTypeFromSlug, jobTypeSlug } from '@/lib/jobTypeSlug';

describe('jobTypeSlug', () => {
  it('đổi slug sang loại việc của form đăng ca', () => {
    expect(jobTypeFromSlug('pha-che')).toBe('Pha chế');
    expect(jobTypeFromSlug('phuc-vu')).toBe('Phục vụ');
    expect(jobTypeFromSlug('su-kien')).toBe('Hỗ trợ sự kiện');
  });

  it('slug lạ, rỗng hoặc thiếu → không lọc', () => {
    expect(jobTypeFromSlug('phu-bep')).toBeUndefined();
    expect(jobTypeFromSlug('')).toBeUndefined();
    expect(jobTypeFromSlug(null)).toBeUndefined();
    expect(jobTypeFromSlug(undefined)).toBeUndefined();
    expect(jobTypeFromSlug('__proto__')).toBeUndefined();
    expect(jobTypeFromSlug('toString')).toBeUndefined();
  });

  it('hai chiều khớp nhau cho mọi loại việc có slug', () => {
    for (const [slug, jobType] of Object.entries(JOB_TYPE_SLUGS)) {
      expect(jobTypeSlug(jobType)).toBe(slug);
      expect(jobTypeFromSlug(slug)).toBe(jobType);
      expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('"Khác" không có slug (không lọc được theo một việc cụ thể)', () => {
    expect(jobTypeSlug('Khác')).toBeUndefined();
  });

  it('thẻ loại việc ở trang chủ chỉ dùng slug có thật', () => {
    const id = (s: string) => s;
    const jobs = homeJobs(id, id);
    for (const job of jobs) {
      if (job.filter) expect(jobTypeFromSlug(job.filter), job.id).toBeDefined();
    }
    // Mọi loại việc có slug đều có thẻ ở trang chủ.
    expect(new Set(jobs.map((j) => j.filter).filter(Boolean))).toEqual(new Set(Object.keys(JOB_TYPE_SLUGS)));
  });
});
