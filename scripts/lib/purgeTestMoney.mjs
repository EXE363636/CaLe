/**
 * Dọn dữ liệu TIỀN của user test trước khi xoá user (dùng chung cho các script
 * tích hợp `scripts/*-integration.mjs`).
 *
 * Từ migration 0030, trigger `users_block_delete_with_money` chặn xoá người có sổ
 * ví / ví ≠ 0 / đơn nạp / đơn chi / cọc (USER_HAS_MONEY_HISTORY) để không mất dấu
 * tiền thật. User test luôn có sổ ví → `auth.admin.deleteUser` lỗi. Trước 0030 các
 * dòng này bị xoá dây chuyền khi xoá user; hàm này làm đúng việc đó, có chủ đích,
 * CHỈ cho các id user test do chính lần chạy tạo ra.
 *
 * Gọi SAU khi script đã trả két (system_bank) phần mình làm thay đổi.
 * Thứ tự theo khoá ngoại: khiếu nại cọc → cọc → dòng kiểm tra nạp → đơn chi → đơn
 * nạp → sổ ví → ví.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin client service_role
 * @param {Iterable<string>} userIds id user test của lần chạy này
 * @returns {Promise<string[]>} các bước lỗi (rỗng = dọn xong)
 */
export async function purgeTestUserMoney(admin, userIds) {
  const ids = [...userIds];
  if (ids.length === 0) return [];
  const errors = [];
  const run = async (label, query) => {
    const { error } = await query;
    // Bảng chưa có ở DB cũ (vd. chưa push 0028/0029) → bỏ qua, không coi là lỗi.
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      errors.push(`${label}: ${error.message}`);
    }
  };
  await run('no_show_contests', admin.from('no_show_contests').delete().in('worker_id', ids));
  await run('worker_holds (worker)', admin.from('worker_holds').delete().in('worker_id', ids));
  await run('worker_holds (employer)', admin.from('worker_holds').delete().in('employer_id', ids));
  await run('payment_review_items', admin.from('payment_review_items').delete().in('user_id', ids));
  await run('payout_orders', admin.from('payout_orders').delete().in('user_id', ids));
  await run('payment_orders', admin.from('payment_orders').delete().in('user_id', ids));
  await run('wallet_ledger', admin.from('wallet_ledger').delete().in('user_id', ids));
  await run('wallets', admin.from('wallets').delete().in('user_id', ids));
  return errors;
}
