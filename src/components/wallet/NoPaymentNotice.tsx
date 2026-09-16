/**
 * Thông báo trung thực khi CaLẻ CHƯA thu/giữ/chuyển tiền (chế độ supabase/production).
 * Thay cho các CTA ví/nạp-rút/cọc/escrow mô phỏng vốn chỉ dành cho local/demo.
 */
export function NoPaymentNotice(): React.ReactNode {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-card">
      <p className="font-semibold text-gray-900">Thanh toán</p>
      <p className="mt-1 leading-relaxed">
        CaLẻ hiện chưa thu hoặc giữ tiền. Nhà tuyển dụng và người lao động tự thống nhất
        phương thức thanh toán.
      </p>
    </div>
  );
}
