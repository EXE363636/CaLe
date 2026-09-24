/**
 * Behavioral integration test — ví + cọc + trả công/hoàn cọc TIỀN THẬT
 * (migration 0012 → 0019). KHÔNG gọi PayOS (không phát sinh tiền thật):
 *   - "Nạp" ví bằng service_role qua đúng đường webhook dùng
 *     (payment_orders + credit_wallet_from_payment).
 *   - Rút tiền chỉ thử phần DB (begin_withdrawal/settle_withdrawal), không chi.
 *
 * Chạy với Supabase THẬT sau `npx supabase db push` (tới 0019).
 * Lệnh: npm run test:payment   (cần SUPABASE_SERVICE_ROLE_KEY trong .env.test.local)
 *
 * ⚠ Database đang dùng chung dev + prod và có TIỀN THẬT: script chỉ tạo user
 * test (email @example.com, mật khẩu ngẫu nhiên), cuối cùng trả lại số dư két
 * đúng phần mình đã làm thay đổi rồi xoá user (mọi dữ liệu xoá dây chuyền).
 */

import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function loadEnv(p) {
  try {
    for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = l.trim(); if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('='); if (i === -1) continue;
      const k = t.slice(0, i).trim(); let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch { /* ignore */ }
}
loadEnv('.env.local'); loadEnv('.env.test.local');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const missing = [];
if (!URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
if (!ANON) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!SERVICE) missing.push('SUPABASE_SERVICE_ROLE_KEY (.env.test.local)');
if (missing.length) { console.error('⚠ INCOMPLETE — thiếu env:'); for (const m of missing) console.error('  - ' + m); process.exitCode = 2; }

let pass = 0, fail = 0; const failures = [];
function ok(cond, name) { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; failures.push(name); console.log(`  ✗ ${name}`); } }

const PW = randomBytes(24).toString('base64url') + 'Aa1!';
const ts = Date.now();
const rnd = () => Math.random().toString(36).slice(2, 8);
const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
let admin = null;
const createdUserIds = new Set();
// Theo dõi phần két do script làm thay đổi để trả lại khi cleanup.
let bankDelta = 0;

async function svcCreateUser(email, meta) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, user_metadata: meta });
  if (error) throw new Error('createUser: ' + error.message);
  createdUserIds.add(data.user.id);
  return data.user.id;
}
async function signIn(email) {
  const c = mk();
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error('signIn failed');
  return c;
}
async function rpc(client, fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) return { ok: false, code: error.message || 'ERROR' };
  return { ok: true, data };
}

// ---- Thời gian (giờ Việt Nam) ---------------------------------------------
const pad = (n) => String(n).padStart(2, '0');
function vnDatePlus(days) {
  return new Date(Date.now() + days * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
/** Ca 3 giờ đã KẾT THÚC trong vòng 1–6 giờ qua (chưa tới hạn tự chốt 24h). */
function recentPastWindow() {
  const d = new Date(Date.now() + 7 * 3600000);
  const hour = d.getUTCHours();
  if (hour >= 4) return { date: d.toISOString().slice(0, 10), start_time: `${pad(hour - 4)}:00:00`, end_time: `${pad(hour - 1)}:00:00` };
  return { date: vnDatePlus(-1), start_time: '19:00:00', end_time: '22:00:00' };
}

// ---- Helpers nghiệp vụ -----------------------------------------------------
function buildPayload(reqId) {
  return {
    title: 'PAY test', description: 'd', requirements: 'r',
    job_type: 'Phục vụ', location: 'Quận 1', district: 'Quận 1',
    date: vnDatePlus(3), start_time: '09:00', end_time: '12:00', // 3h
    hourly_wage: 50000, positions_total: 2, // cọc = 50000×3×2 + 10% = 330000
    on_site_contact_name: 'QL', on_site_contact_phone: '0901234567',
    requires_verified_document_on_arrival: false, evidence_requirement: 'None',
    __req: reqId,
  };
}
/** Nạp ví qua đúng đường webhook PayOS dùng (service_role). */
async function topUp(userId, amount) {
  const orderCode = ts * 1000 + Math.floor(Math.random() * 1000);
  const { error } = await admin.from('payment_orders').insert({ order_code: orderCode, user_id: userId, amount, status: 'PENDING' });
  if (error) throw new Error('topUp insert: ' + error.message);
  const r = await rpc(admin, 'credit_wallet_from_payment', { p_order_code: orderCode });
  if (!r.ok) throw new Error('credit_wallet_from_payment: ' + r.code);
  bankDelta += amount;
}
async function balance(client) { return (await rpc(client, 'get_wallet_state', {})).data?.balance ?? 0; }
async function bank(client) { return (await rpc(client, 'get_system_bank', {})).data?.balance ?? 0; }
/** Đăng ca qua luồng thật: tạo phiên cọc → giữ cọc từ ví. Trả { shiftId, sessionId }. */
async function publishWithDeposit(eC, channelId) {
  const reqId = `pay-${ts}-${rnd()}`;
  const c = await rpc(eC, 'create_deposit_session', { p_shift_payload: buildPayload(reqId), p_channel_id: channelId, p_client_request_id: reqId });
  if (!c.ok) throw new Error('create_deposit_session: ' + c.code);
  const h = await rpc(eC, 'confirm_deposit_session', { p_payment_id: c.data.id });
  if (!h.ok) throw new Error('confirm_deposit_session: ' + h.code);
  return { shiftId: h.data.shift_id, sessionId: c.data.id };
}
async function insertApp(shiftId, workerId, status, extra = {}) {
  const { data, error } = await admin.from('applications').insert({
    shift_id: shiftId, worker_id: workerId, status,
    approved_at: new Date().toISOString(), payout_amount: 150000, ...extra,
  }).select('id').single();
  if (error) throw new Error('insertApp: ' + error.message);
  return data.id;
}
async function moveShift(shiftId, patch) {
  const { error } = await admin.from('shifts').update(patch).eq('id', shiftId);
  if (error) throw new Error('moveShift: ' + error.message);
}
async function sessionStatus(id) {
  return (await admin.from('payment_sessions').select('status').eq('id', id).single()).data?.status;
}
async function appRow(id) {
  return (await admin.from('applications').select('*').eq('id', id).single()).data;
}
const checkedOut = () => {
  const now = new Date().toISOString();
  return { check_in_at: now, check_out_at: now };
};

async function run() {
  const { data: chans } = await admin.from('payment_channels').select('id').eq('mode', 'MOCK').eq('enabled', true).limit(1);
  const channelId = chans?.[0]?.id;
  if (!channelId) throw new Error('Không có kênh cọc (payment_channels MOCK enabled)');

  const eEmail = `pay-e-${ts}-${rnd()}@example.com`;
  const e2Email = `pay-e2-${ts}-${rnd()}@example.com`;
  const w1Email = `pay-w1-${ts}-${rnd()}@example.com`;
  const w2Email = `pay-w2-${ts}-${rnd()}@example.com`;
  const employerId = await svcCreateUser(eEmail, { role: 'employer', company_name: 'PAY Co' });
  await svcCreateUser(e2Email, { role: 'employer', company_name: 'PAY Co2' });
  const w1 = await svcCreateUser(w1Email, { role: 'worker', full_name: 'PAY Worker 1' });
  const w2 = await svcCreateUser(w2Email, { role: 'worker', full_name: 'PAY Worker 2' });
  const eC = await signIn(eEmail); const e2C = await signIn(e2Email);
  const w1C = await signIn(w1Email); const anonC = mk();

  console.log('\n▶ Các RPC mô phỏng / nội bộ bị khoá với người dùng');
  for (const [fn, args] of [
    ['publish_shift', { p_payload: buildPayload('x'), p_client_request_id: `pay-${ts}-x`, p_reposted_from_shift_id: null }],
    ['create_payment_session', { p_shift_id: employerId, p_application_id: employerId, p_channel_id: channelId, p_client_request_id: 'x' }],
    ['confirm_payment_session', { p_payment_id: employerId }],
    ['release_mock_payment', { p_payment_id: employerId }],
    ['wallet_top_up', { p_amount: 1000 }],
    ['wallet_withdraw', { p_amount: 1000 }],
    ['employer_confirm_completion_before_payment_release', { p_application_id: employerId }],
    ['edit_shift_before_deposit_guard', { p_shift_id: employerId, p_patch: {} }],
    ['_pay_worker_wage', { p_application_id: employerId }],
    ['_finalize_shift_deposit', { p_shift_id: employerId, p_allow_stale: true }],
    ['_auto_settle_overdue', { p_limit: 1 }],
    ['credit_wallet_from_payment', { p_order_code: 1 }],
    ['begin_withdrawal', { p_user: employerId, p_amount: 1000, p_bin: '970422', p_account: '0000123456', p_name: 'X', p_idem: 'xxxxxxxxxx' }],
    ['settle_withdrawal', { p_id: employerId, p_state: 'FAILED', p_provider_ref: null, p_reason: 'x' }],
  ]) {
    ok(!(await rpc(eC, fn, args)).ok, `authenticated KHÔNG gọi được ${fn}`);
  }
  ok(!(await rpc(eC, 'admin_payout_health', {})).ok, 'employer KHÔNG xem được admin_payout_health');
  ok(!(await rpc(anonC, 'sync_overdue_settlements', {})).ok, 'anon KHÔNG gọi được sync_overdue_settlements');

  console.log('\n▶ Nạp ví (đường webhook) + đăng ca giữ cọc từ ví');
  const bank0 = await bank(eC);
  await topUp(employerId, 2_000_000);
  ok((await balance(eC)) === 2_000_000, 'ví employer = 2.000.000 sau khi nạp');
  ok((await bank(eC)) === bank0 + 2_000_000, 'nạp làm két tăng đúng 2.000.000');
  const s1 = await publishWithDeposit(eC, channelId);
  ok((await balance(eC)) === 2_000_000 - 330000, 'đăng ca trừ ví employer đúng 330.000');
  ok((await sessionStatus(s1.sessionId)) === 'HELD', 'phiên cọc HELD');
  {
    const e2 = await publishWithDeposit(e2C, channelId).then(() => 'ok', (e) => String(e.message));
    ok(e2.includes('INSUFFICIENT_BALANCE'), 'employer ví trống → INSUFFICIENT_BALANCE');
  }

  console.log('\n▶ Sửa ca không được vượt tiền cọc');
  {
    const up = await rpc(eC, 'edit_shift', { p_shift_id: s1.shiftId, p_patch: { positions_total: '3' } });
    ok(!up.ok && up.code.includes('DEPOSIT_TOO_LOW'), 'tăng 2 → 3 vị trí → DEPOSIT_TOO_LOW');
    const { data: sh } = await admin.from('shifts').select('positions_total').eq('id', s1.shiftId).single();
    ok(sh.positions_total === 2, 'số vị trí giữ nguyên 2 (rollback)');
    ok((await rpc(eC, 'edit_shift', { p_shift_id: s1.shiftId, p_patch: { title: 'PAY test 2' } })).ok, 'sửa tiêu đề vẫn được');
  }

  console.log('\n▶ Trả công NGAY khi xác nhận từng người + vắng mặt + hoàn cọc dư');
  {
    const a1 = await insertApp(s1.shiftId, w1, 'Approved');
    const a2 = await insertApp(s1.shiftId, w2, 'Approved');
    await moveShift(s1.shiftId, recentPastWindow());
    await admin.from('applications').update({ status: 'CheckedOut', ...checkedOut() }).eq('id', a1);
    const bankBefore = await bank(eC);

    ok((await rpc(eC, 'employer_confirm_completion', { p_application_id: a1 })).ok, 'xác nhận hoàn thành worker 1');
    ok((await balance(w1C)) === 150000, 'ví worker 1 +150.000 NGAY (không chờ worker 2)');
    bankDelta -= 150000;
    ok((await bank(eC)) === bankBefore - 150000, 'két −150.000 (tiền công rời két)');
    ok((await sessionStatus(s1.sessionId)) === 'HELD', 'cọc vẫn HELD vì worker 2 chưa xử lý');
    await rpc(eC, 'employer_confirm_completion', { p_application_id: a1 });
    ok((await balance(w1C)) === 150000, 'xác nhận lần 2 KHÔNG trả trùng');

    ok(!(await rpc(e2C, 'employer_mark_no_show', { p_application_id: a2 })).ok, 'employer khác KHÔNG đánh dấu vắng mặt được');
    const empBefore = await balance(eC);
    ok((await rpc(eC, 'employer_mark_no_show', { p_application_id: a2 })).ok, 'đánh dấu worker 2 vắng mặt');
    // paid 150.000; phí giữ lại = 30.000 × 150.000/300.000 = 15.000 → hoàn 330.000 − 150.000 − 15.000.
    ok((await balance(eC)) === empBefore + 165000, 'hoàn employer 165.000 (vị trí vắng + phí tương ứng)');
    ok((await sessionStatus(s1.sessionId)) === 'RELEASED', 'phiên cọc RELEASED');
    const { data: sh } = await admin.from('shifts').select('status').eq('id', s1.shiftId).single();
    ok(sh.status === 'Completed', 'ca → Completed');
    const r = await rpc(eC, 'employer_revert_no_show', { p_application_id: a2, p_reason: 'đến muộn' });
    ok(!r.ok, 'không chuyển vắng mặt → có mặt khi cọc đã chốt');
  }

  console.log('\n▶ Vắng mặt → có mặt (đến muộn) khi cọc chưa chốt');
  {
    const s2 = await publishWithDeposit(eC, channelId);
    const a1 = await insertApp(s2.shiftId, w1, 'Approved');
    const a2 = await insertApp(s2.shiftId, w2, 'Approved');
    await moveShift(s2.shiftId, recentPastWindow());
    ok((await rpc(eC, 'employer_mark_no_show', { p_application_id: a1 })).ok, 'đánh dấu worker 1 vắng mặt');
    const noReason = await rpc(eC, 'employer_revert_no_show', { p_application_id: a1, p_reason: '  ' });
    ok(!noReason.ok && noReason.code.includes('REASON_REQUIRED'), 'chuyển có mặt thiếu lý do → REASON_REQUIRED');
    ok((await rpc(eC, 'employer_revert_no_show', { p_application_id: a1, p_reason: 'đến muộn 20 phút' })).ok, 'chuyển worker 1 sang có mặt');
    const row = await appRow(a1);
    ok(row.status === 'CheckedIn' && !!row.marked_present_at && !!row.no_show_reverted_at, 'đơn → CheckedIn + dấu có mặt + dấu sửa');
    const w1Before = await balance(w1C);
    ok((await rpc(eC, 'employer_confirm_completion', { p_application_id: a1 })).ok, 'xác nhận hoàn thành (không check-out)');
    ok((await balance(w1C)) === w1Before + 150000, 'worker 1 nhận 150.000');
    bankDelta -= 150000;
    await rpc(eC, 'employer_mark_no_show', { p_application_id: a2 });
    ok((await sessionStatus(s2.sessionId)) === 'RELEASED', 'người cuối xử lý xong → chốt cọc');
  }

  console.log('\n▶ Tự chốt ca quá hạn (sau giờ kết thúc + 24h)');
  {
    const s3 = await publishWithDeposit(eC, channelId);
    const a1 = await insertApp(s3.shiftId, w1, 'CheckedOut', checkedOut());
    const a2 = await insertApp(s3.shiftId, w2, 'Approved');
    // Chụp số dư TRƯỚC khi dời ngày (pg_cron có thể tự chốt ngay sau đó).
    const w1Before = await balance(w1C);
    const empBefore = await balance(eC);
    await moveShift(s3.shiftId, { date: vnDatePlus(-3) });
    ok((await rpc(w1C, 'sync_overdue_settlements', {})).ok, 'worker gọi sync_overdue_settlements');
    const r1 = await appRow(a1); const r2 = await appRow(a2);
    ok(r1.status === 'Confirmed' && !!r1.auto_settled_at, 'CheckedOut → tự Confirmed');
    ok(r2.status === 'NoShow' && !!r2.auto_settled_at, 'Approved không điểm danh → tự NoShow');
    ok((await balance(w1C)) === w1Before + 150000, 'worker 1 tự nhận 150.000');
    bankDelta -= 150000;
    ok((await balance(eC)) === empBefore + 165000, 'employer tự được hoàn 165.000');
    ok((await sessionStatus(s3.sessionId)) === 'RELEASED', 'phiên cọc RELEASED');
    await rpc(w1C, 'sync_overdue_settlements', {});
    ok((await balance(w1C)) === w1Before + 150000, 'chạy lại KHÔNG trả trùng');
  }

  console.log('\n▶ Hoàn cọc ca huỷ + các chặn');
  {
    const s4 = await publishWithDeposit(eC, channelId);
    const a = await insertApp(s4.shiftId, w1, 'Approved');
    const early = await rpc(eC, 'employer_mark_no_show', { p_application_id: a });
    ok(!early.ok && early.code.includes('NO_SHOW_TOO_EARLY'), 'vắng mặt trước giờ bắt đầu → NO_SHOW_TOO_EARLY');
    const notYet = await rpc(eC, 'refund_deposit_for_shift', { p_shift_id: s4.shiftId });
    ok(!notYet.ok && notYet.code.includes('SHIFT_NOT_REFUNDABLE'), 'ca chưa huỷ/chưa hết hạn → không hoàn');
    await moveShift(s4.shiftId, { status: 'Cancelled' });
    await admin.from('applications').update({ status: 'Expired', expired_at: new Date().toISOString(), expired_reason: 'SHIFT_CANCELLED' }).eq('id', a);
    ok(!(await rpc(e2C, 'refund_deposit_for_shift', { p_shift_id: s4.shiftId })).ok, 'employer khác KHÔNG hoàn được');
    const before = await balance(eC);
    const r = await rpc(eC, 'refund_deposit_for_shift', { p_shift_id: s4.shiftId });
    ok(r.ok && r.data.status === 'REFUNDED', 'ca huỷ → REFUNDED');
    ok((await balance(eC)) === before + 330000, 'hoàn đủ 330.000 về ví employer');
    const r2 = await rpc(eC, 'refund_deposit_for_shift', { p_shift_id: s4.shiftId });
    ok(r2.ok && r2.data.status === 'NO_HELD_SESSION', 'hoàn lần 2 → no-op');
    ok((await balance(eC)) === before + 330000, 'không cộng trùng');
  }

  console.log('\n▶ Rút tiền (chỉ phần database, KHÔNG gọi PayOS)');
  {
    const bal0 = await balance(w1C);
    const idem = `pay-${ts}-wd-${rnd()}`;
    const big = await rpc(admin, 'begin_withdrawal', { p_user: w1, p_amount: bal0 + 1, p_bin: '970422', p_account: '0000123456', p_name: 'TEST', p_idem: `${idem}-big` });
    ok(!big.ok && big.code.includes('INSUFFICIENT_BALANCE'), 'rút quá số dư → INSUFFICIENT_BALANCE');
    const b = await rpc(admin, 'begin_withdrawal', { p_user: w1, p_amount: 2000, p_bin: '970422', p_account: '0000123456', p_name: 'TEST', p_idem: idem });
    ok(b.ok && (await balance(w1C)) === bal0 - 2000, 'begin_withdrawal trừ ví 2.000');
    const replay = await rpc(admin, 'begin_withdrawal', { p_user: w1, p_amount: 2000, p_bin: '970422', p_account: '0000123456', p_name: 'TEST', p_idem: idem });
    ok(replay.ok && replay.data.replayed === true && (await balance(w1C)) === bal0 - 2000, 'cùng idempotency key → không trừ lần hai');
    await rpc(admin, 'settle_withdrawal', { p_id: b.data?.id, p_state: 'FAILED', p_provider_ref: null, p_reason: 'test' });
    ok((await balance(w1C)) === bal0, 'lệnh FAILED → hoàn ví');
    await rpc(admin, 'settle_withdrawal', { p_id: b.data?.id, p_state: 'FAILED', p_provider_ref: null, p_reason: 'test' });
    ok((await balance(w1C)) === bal0, 'settle lần 2 KHÔNG hoàn trùng');
  }
}

async function cleanup() {
  // Trả két về như trước khi chạy (chỉ phần do script thay đổi).
  if (bankDelta !== 0) {
    const r = await rpc(admin, '_bank_apply', { p_delta: -bankDelta });
    if (!r.ok) {
      const { data } = await admin.from('system_bank').select('balance').eq('id', true).single();
      const { error } = await admin.from('system_bank').update({ balance: (data?.balance ?? 0) - bankDelta }).eq('id', true);
      if (error) { console.error(`⚠ Không trả lại được két (lệch ${bankDelta}đ) — sửa tay!`); process.exitCode = 1; }
    }
  }
  // Gỡ dấu "employer xác nhận có mặt" trỏ tới user test (phòng DB chưa có 0020).
  try {
    await admin.from('applications').update({ marked_present_by_employer_id: null })
      .in('marked_present_by_employer_id', [...createdUserIds]);
  } catch { /* ignore */ }
  const leftovers = [];
  for (const id of createdUserIds) {
    try {
      await admin.auth.admin.deleteUser(id);   // ví/sổ cái/ca/đơn/phiên xoá dây chuyền
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user) leftovers.push(id.slice(0, 8));
    } catch { leftovers.push(id.slice(0, 8)); }
  }
  if (leftovers.length) { console.error('⚠ CLEANUP THẤT BẠI (id rút gọn):', leftovers.join(', ')); process.exitCode = 1; }
  else console.log('• cleanup: đã trả két + xoá user/dữ liệu test.');
}

async function main() {
  if (missing.length) return;
  admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  try { await run(); }
  catch (e) { fail++; failures.push('EXCEPTION: ' + (e instanceof Error ? e.message : String(e))); console.error('✗ Lỗi giữa chừng:', e instanceof Error ? e.message : e); }
  finally { await cleanup(); }
  console.log(`\n${fail === 0 ? '✓' : '✗'} payment: ${pass} pass, ${fail} fail`);
  if (fail > 0) { console.log('Thất bại:'); for (const f of failures) console.log('  - ' + f); process.exitCode = 1; }
}
main().catch((e) => { console.error('✗ Lỗi không mong đợi:', e?.message ?? e); process.exitCode = 1; });
