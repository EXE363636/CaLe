/**
 * Biểu tượng bong bóng hỗ trợ: khung chat bo tròn + ba chấm, CÂN GIỮA trong ô
 * 24×24 (khung + đuôi chiếm đúng 4→20 cả hai chiều, ba chấm nằm giữa thân khung)
 * — bản cũ lệch xuống / sang phải vì đuôi kéo trọng tâm.
 */

export function SupportGlyph({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Dịch xuống 0,75: thân khung (nặng) gần tâm, đuôi mảnh không kéo lệch. */}
      <g transform="translate(0 0.75)">
      <path
        d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-3.6L9.5 19.6a.6.6 0 0 1-1-.45V16H7a3 3 0 0 1-3-3z"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <circle cx="8.6" cy="10" r="1.15" fill="currentColor" />
      <circle cx="12" cy="10" r="1.15" fill="currentColor" />
      <circle cx="15.4" cy="10" r="1.15" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Ảnh đại diện tròn của trợ lý (nền cam thương hiệu, chữ mực — không chữ trắng trên cam). */
export function SupportAvatar({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const box = size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  const glyph = size === 'md' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-full bg-orange-500 text-gray-900 shadow-sm`}
    >
      <SupportGlyph className={glyph} />
    </span>
  );
}
