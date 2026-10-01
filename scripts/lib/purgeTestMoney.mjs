/**
 * Dọn dữ liệu TIỀN của user test trước khi xoá user (dùng chung cho các script
 * tích hợp `scripts/*-integration.mjs`, chạy bằng service_role trên DB DÙNG CHUNG
 * với production — có tiền thật).
 *
 * Từ migration 0030, trigger `users_block_delete_with_money` chặn xoá người có sổ
 * ví / ví ≠ 0 / đơn nạp / đơn chi / cọc (USER_HAS_MONEY_HISTORY). User test luôn
 * có sổ ví → `auth.admin.deleteUser` lỗi nếu không dọn trước.
 *
 * Thứ tự (security-reviewer 01/10) — dừng ở bước lỗi đầu tiên, KHÔNG làm tiếp:
 *   1. Chỉ nhận user email `@example.com` (chặn truyền nhầm id người thật).
 *   2. Có cọc / khiếu nại cọc của người lao động THẬT trên ca test (họ ứng tuyển
 *      ca test đang hiện công khai) → DỪNG, in id để admin hoàn qua luồng chuẩn.
 *      KHÔNG bao giờ xoá cọc của người không phải user test.
 *   3. Đảo phí nền tảng của ca test đã vào ví người nhận phí (0021: ví admin +phí,
 *      két −phí) → ví −phí, két +phí, có dòng sổ `PlatformFeeTestReversal`.
 *   4. Xoá dữ liệu tiền của user test (theo user_id / worker_id của user test).
 *   5. Trả két phần script đã làm thay đổi (`bankDelta`) — chỉ khi 1–4 xong; lỗi
 *      giữa chừng thì két vẫn khớp với ví test còn lại.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin client service_role
 * @param {{ userIds: Iterable<string>, bankDelta?: number }} opts
 * @returns {Promise<{ ok: boolean, errors: string[] }>} ok = được phép xoá user
 */
export async function cleanupTestMoney(admin, { userIds, bankDelta = 0 }) {
  const ids = [...userIds];
  const errors = [];
  if (ids.length === 0) return { ok: true, errors };

  // Bảng chưa có ở DB cũ (chưa push 0028/0029) → bỏ qua; lỗi khác đều tính.
  const missingTable = (e) => e && (e.code === '42P01' || e.code === 'PGRST205');
  const run = async (label, query) => {
    const { data, error } = await query;
    if (error && !missingTable(error)) errors.push(`${label}: ${error.message}`);
    return error ? null : data;
  };

  // 1. Chỉ user test.
  for (const id of ids) {
    const { data, error } = await admin.auth.admin.getUserById(id);
    const email = data?.user?.email ?? '';
    if (error || !email.endsWith('@example.com')) {
      errors.push(`user ${id.slice(0, 8)} không phải user test (@example.com) — dừng dọn`);
    }
  }
  if (errors.length) return { ok: false, errors };

  // 2. Cọc / khiếu nại của người THẬT trên ca test → dừng.
  const shifts = (await run('shifts', admin.from('shifts').select('id').in('employer_id', ids))) ?? [];
  const shiftIds = shifts.map((s) => s.id);
  if (errors.length) return { ok: false, errors };
  if (shiftIds.length) {
    const notTest = `(${ids.join(',')})`;
    const foreignHolds =
      (await run('worker_holds (người thật)', admin.from('worker_holds').select('id, worker_id, amount, status')
        .in('shift_id', shiftIds).not('worker_id', 'in', notTest))) ?? [];
    const apps = (await run('applications', admin.from('applications').select('id').in('shift_id', shiftIds))) ?? [];
    const foreignContests = apps.length
      ? ((await run('no_show_contests (người thật)', admin.from('no_show_contests').select('application_id, worker_id')
          .in('application_id', apps.map((a) => a.id)).not('worker_id', 'in', notTest))) ?? [])
      : [];
    if (foreignHolds.length || foreignContests.length) {
      errors.push(
        'Ca test có cọc / khiếu nại của người dùng THẬT — KHÔNG dọn, KHÔNG xoá user. Hoàn cọc qua luồng chuẩn rồi chạy lại cleanup: ' +
          JSON.stringify({ holds: foreignHolds, contests: foreignContests }),
      );
    }
    if (errors.length) return { ok: false, errors };

    // 3. Đảo phí nền tảng của ca test (ví người nhận phí −, két +).
    const fees =
      (await run('phí ca test', admin.from('wallet_ledger').select('user_id, amount, shift_id')
        .eq('kind', 'PlatformFeeReceived').in('shift_id', shiftIds))) ?? [];
    if (errors.length) return { ok: false, errors };
    for (const f of fees) {
      const w = await admin.rpc('_wallet_apply', {
        p_user: f.user_id, p_amount: -f.amount, p_kind: 'PlatformFeeTestReversal',
        p_shift: f.shift_id, p_app: null, p_note: 'Đảo phí ca test của script tích hợp',
      });
      if (w.error) { errors.push(`đảo phí (ví): ${w.error.message}`); return { ok: false, errors }; }
      const b = await admin.rpc('_bank_apply', { p_delta: f.amount });
      if (b.error) {
        errors.push(`đảo phí (két, +${f.amount}đ — ví đã trừ, SỬA TAY két): ${b.error.message}`);
        return { ok: false, errors };
      }
    }
  }

  // 4. Dữ liệu tiền của chính user test (lọc theo user_id / worker_id của họ).
  await run('no_show_contests', admin.from('no_show_contests').delete().in('worker_id', ids));
  await run('worker_holds', admin.from('worker_holds').delete().in('worker_id', ids));
  await run('payment_review_items', admin.from('payment_review_items').delete().in('user_id', ids));
  await run('payout_orders', admin.from('payout_orders').delete().in('user_id', ids));
  await run('payment_orders', admin.from('payment_orders').delete().in('user_id', ids));
  await run('wallet_ledger', admin.from('wallet_ledger').delete().in('user_id', ids));
  await run('wallets', admin.from('wallets').delete().in('user_id', ids));
  if (errors.length) return { ok: false, errors };

  // 5. Trả két (chỉ biểu thức nguyên tử trong SQL; không đọc-sửa-ghi từ JS).
  if (bankDelta !== 0) {
    const r = await admin.rpc('_bank_apply', { p_delta: -bankDelta });
    if (r.error) errors.push(`trả két (${-bankDelta}đ) lỗi — SỬA TAY: ${r.error.message}`);
  }
  return { ok: errors.length === 0, errors };
}
