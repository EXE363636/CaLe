/**
 * Bằng chứng xã hội cho các trang landing: ảnh nhóm CaLẻ TỰ CHỤP ở các quán đã
 * chạy thử và lời chia sẻ của người đã làm / đã đăng ca thật.
 *
 * QUY TẮC (02/10, đã duyệt): chỉ điền khi có THẬT —
 *   - Không bịa tên, lời chia sẻ, logo hay số liệu; không dùng ảnh stock ở đây.
 *   - Phải xin phép người trong ảnh / người nói trước khi đăng; ghi ngày xin phép vào
 *     `consentDate` (YYYY-MM-DD). Lưu bằng chứng đồng ý (tin nhắn, giấy) ngoài repo.
 *   - Ảnh đặt trong `public/images/proof/`, nén WebP; ghi nguồn ở docs/IMAGE_CREDITS.md.
 *   - Lời chia sẻ giữ nguyên câu người đó nói (có thể bỏ bớt, không sửa ý).
 *
 * Danh sách trống → khối `LandingProof` tự ẩn trên cả 3 trang. Test
 * `LandingProof.test.tsx` kiểm ngày xin phép và file ảnh của mọi mục ở đây.
 */

export interface ProofQuote {
  /** Lời chia sẻ nguyên văn (tiếng Việt). */
  quote: string;
  /** Bản dịch tiếng Anh; bỏ trống thì trang tiếng Anh giữ lời gốc. */
  quoteEn?: string;
  /** Tên người nói, theo cách họ đồng ý được ghi (vd "Chị Lan" hay "Minh, sinh viên"). */
  name: string;
  /** Vai trò / nơi, vd "Chủ quán lẩu, Cầu Giấy" hoặc "Sinh viên, làm phục vụ". */
  role: string;
  roleEn?: string;
  /** Hiện ở trang vai trò nào (trang chủ hiện cả hai). */
  audience: 'worker' | 'employer';
  /** Ảnh chân dung (đường dẫn trong public/), đã xin phép. */
  photo?: string;
  /** Ngày người đó đồng ý cho đăng (YYYY-MM-DD). */
  consentDate: string;
}

export interface ProofPhoto {
  /** Đường dẫn trong public/, vd "/images/proof/quan-lau-cau-giay.webp". */
  src: string;
  alt: string;
  altEn?: string;
  /** Nơi chụp, vd "Quán lẩu ở Cầu Giấy, ca tối thứ 7". */
  place: string;
  placeEn?: string;
  /** Ngày quán / người trong ảnh đồng ý cho đăng (YYYY-MM-DD). */
  consentDate: string;
}

/** Chưa có lời chia sẻ thật nào — điền khi chạy thử xong và đã xin phép. */
export const PROOF_QUOTES: ProofQuote[] = [];

/** Chưa có ảnh tự chụp nào — điền khi chạy thử xong và đã xin phép. */
export const PROOF_PHOTOS: ProofPhoto[] = [];

/** Câu chữ của khối (giống nhau ở cả 3 trang). Gọi với `tx` của trang. */
export function proofCopy(tx: (viText: string) => string) {
  return {
    title: tx('Từ những ca đã chạy thử'),
    lead: tx('Ảnh nhóm CaLẻ tự chụp ở các quán đã dùng thử, và lời của người đã làm ca, đã đăng ca.'),
    note: tx('Ảnh và lời chia sẻ chỉ được đăng khi người trong ảnh, người nói đã đồng ý.'),
  };
}
