import type { ReactNode } from 'react';

/**
 * Khung điện thoại cho minh hoạ ở trang vai trò (03/10): viền mực bo tròn, "đảo" camera,
 * màn hình nền `gray-50` để thẻ trắng bên trong nổi lên. Bóng `.phone-bezel` trong
 * globals.css (có độ lệch + nhoè, không phải quầng sáng). Chỉ để minh hoạ: nội dung
 * bên trong là `aria-hidden`, chú thích đọc được nằm ở `figcaption` của nơi dùng.
 */
export function PhoneFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={['phone-bezel mx-auto w-full max-w-[20rem] rounded-[2.75rem] bg-gray-900 p-2.5', className].join(' ')}>
      <div className="relative overflow-hidden rounded-[2.2rem] bg-gray-50">
        <div aria-hidden="true" className="mx-auto mt-2.5 h-6 w-24 rounded-full bg-gray-900" />
        <div className="px-3.5 pb-5 pt-3">{children}</div>
      </div>
    </div>
  );
}
