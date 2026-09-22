/**
 * Behavioral integration test — mock payment simulator (provider CALE_MOCK).
 * Chạy với Supabase THẬT sau `supabase db push` (tới migration 20260922000010).
 * Lệnh: npm run test:payment
 *
 * Gồm: luồng per-worker (0009) + luồng "cọc-trước-khi-đăng" (0010):
 * create_deposit_session (amount server-owned) → confirm_deposit_session
 * (PENDING→HELD + publish ca từ payload, idempotent).
 *
 * Chứng minh (server là nguồn sự thật): amount tính lại ở server (không tin client),
 * chọn kênh mock đúng, reload giữ phiên+kênh (RLS), kênh tắt không dùng được,
 * anon/non-owner bị chặn, confirm PENDING→HELD (idempotent, không publish ca),
 * sau khi hoàn thành thì giải ngân RELEASED và ledger không ghi trùng.
 *
 * An toàn: mật khẩu ngẫu nhiên/lần chạy; cleanup trong finally + verify; không in secret.
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
let disabledChannelId = null;
const createdShiftIds = new Set();

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
function vnDatePlus(days) {
  return new Date(Date.now() + days * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
function buildPayload(reqId) {
  return {
    title: 'PAY test',
    description: 'd', requirements: 'r',
    job_type: 'Phục vụ', location: 'Quận 1', district: 'Quận 1',
    date: vnDatePlus(3), start_time: '09:00', end_time: '12:00', // 3h
    hourly_wage: 50000, positions_total: 2, // → 300000
    on_site_contact_name: 'QL', on_site_contact_phone: '0901234567',
    requires_verified_document_on_arrival: false, evidence_requirement: 'None',
    __req: reqId,
  };
}
async function insertShift(employerId) {
  const { data, error } = await admin.from('shifts').insert({
    employer_id: employerId, client_request_id: `pay-${ts}-${rnd()}`,
    title: 'PAY test', description: 'd', requirements: 'r', job_type: 'Phục vụ',
    location: 'Quận 1', district: 'Quận 1', date: vnDatePlus(3),
    start_time: '09:00:00', end_time: '12:00:00', hourly_wage: 50000,
    positions_total: 1, positions_filled: 1, status: 'Published',
    escrow_status: 'Deposited', deposit_amount: 0,
    on_site_contact_name: 'QL', on_site_contact_phone: '0901234567',
    evidence_requirement: 'None',
  }).select('id').single();
  if (error) throw new Error('insertShift: ' + error.message);
  createdShiftIds.add(data.id);
  return data.id;
}
async function insertApprovedApp(shiftId, workerId) {
  const { data, error } = await admin.from('applications').insert({
    shift_id: shiftId, worker_id: workerId, status: 'Approved',
    approved_at: new Date().toISOString(), payout_amount: 150000,
  }).select('id').single();
  if (error) throw new Error('insertApprovedApp: ' + error.message);
  return data.id;
}
async function rpc(client, fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) return { ok: false, code: error.message || 'ERROR' };
  return { ok: true, data };
}

async function run() {
  // Kênh mock đang bật (seed sẵn).
  const { data: chans } = await admin.from('payment_channels').select('id,mode,enabled').eq('mode', 'MOCK').eq('enabled', true).limit(1);
  const mockChannelId = chans?.[0]?.id;
  if (!mockChannelId) throw new Error('Không có kênh MOCK enabled (seed migration chưa chạy?)');
  // Kênh tắt để test CHANNEL_DISABLED.
  const { data: dch } = await admin.from('payment_channels').insert({
    provider: 'CALE_MOCK', mode: 'MOCK', display_name: `Disabled ${ts}`, bank_code: 'X', enabled: false,
  }).select('id').single();
  disabledChannelId = dch.id;

  const eEmail = `pay-e-${ts}-${rnd()}@example.com`;
  const e2Email = `pay-e2-${ts}-${rnd()}@example.com`;
  const wEmail = `pay-w-${ts}-${rnd()}@example.com`;
  const employerId = await svcCreateUser(eEmail, { role: 'employer', company_name: 'PAY Co' });
  await svcCreateUser(e2Email, { role: 'employer', company_name: 'PAY Co2' });
  const workerId = await svcCreateUser(wEmail, { role: 'worker', full_name: 'PAY Worker' });
  const eC = await signIn(eEmail); const e2C = await signIn(e2Email); const anonC = mk();

  const shiftId = await insertShift(employerId);
  const applicationId = await insertApprovedApp(shiftId, workerId);

  const reqId = `pay-${ts}-${rnd()}`;
  const payload = buildPayload(reqId);

  console.log('\n▶ Chặn quyền + kênh');
  ok(!(await rpc(anonC, 'create_payment_session', { p_channel_id: mockChannelId, p_client_request_id: `${reqId}-anon`, p_shift_payload: payload })).ok, 'anon KHÔNG tạo được phiên');
  {
    const r = await rpc(eC, 'create_payment_session', { p_channel_id: disabledChannelId, p_client_request_id: `${reqId}-dis`, p_shift_id: shiftId, p_application_id: applicationId });
    ok(!r.ok && r.code.includes('CHANNEL_NOT_AVAILABLE'), 'kênh đã tắt → CHANNEL_NOT_AVAILABLE');
  }

  console.log('\n▶ Tạo phiên: amount tính ở server + đúng kênh');
  let session = null;
  {
    const r = await rpc(eC, 'create_payment_session', { p_channel_id: mockChannelId, p_client_request_id: reqId, p_shift_id: shiftId, p_application_id: applicationId });
    ok(r.ok, 'tạo phiên thành công');
    session = r.data;
    ok(session?.status === 'PENDING' && session?.provider === 'CALE_MOCK', 'phiên PENDING, provider CALE_MOCK');
    ok(session?.amount === 165000, `amount tính ở server = 50000×3h + 10% = 165000 (nhận ${session?.amount})`);
    ok(session?.payment_channel_id === mockChannelId, 'gắn đúng payment_channel_id đã chọn');
    // QR vô hại: không số TK/secret; realTransaction:false.
    const qr = JSON.parse(session?.qr_payload ?? '{}');
    ok(qr.type === 'CALE_MOCK_PAYMENT' && qr.realTransaction === false && !('accountNumber' in qr), 'qr_payload vô hại (realTransaction:false, không số TK)');
  }

  console.log('\n▶ Client KHÔNG sửa được amount + reload giữ phiên/kênh (RLS)');
  {
    // RPC không nhận tham số amount → client không thể đặt amount. Xác nhận lại qua reload.
    const { data: reloaded } = await eC.from('payment_sessions').select('*').eq('id', session.id).maybeSingle();
    ok(reloaded?.amount === 165000 && reloaded?.payment_channel_id === mockChannelId && reloaded?.status === 'PENDING', 'reload (RLS employer) giữ amount/kênh/PENDING');
    // employer thử UPDATE amount trực tiếp → bị chặn (không có quyền update).
    const { error: upErr } = await eC.from('payment_sessions').update({ amount: 1 }).eq('id', session.id);
    const { data: after } = await admin.from('payment_sessions').select('amount').eq('id', session.id).single();
    ok(after.amount === 165000, 'client KHÔNG sửa được amount (update bị RLS chặn / không đổi)');
    void upErr;
  }

  console.log('\n▶ Non-owner bị chặn');
  {
    const { data: seen } = await e2C.from('payment_sessions').select('id').eq('id', session.id);
    ok((seen?.length ?? 0) === 0, 'employer khác KHÔNG đọc được phiên (RLS)');
    ok(!(await rpc(e2C, 'confirm_payment_session', { p_payment_id: session.id })).ok, 'employer khác KHÔNG confirm được (NOT_OWNER)');
    ok(!(await rpc(e2C, 'cancel_payment_session', { p_payment_id: session.id })).ok, 'employer khác KHÔNG hủy được (NOT_OWNER)');
  }

  console.log('\n▶ Idempotent create + confirm PENDING→HELD (không publish ca)');
  {
    const r2 = await rpc(eC, 'create_payment_session', { p_channel_id: mockChannelId, p_client_request_id: reqId, p_shift_id: shiftId, p_application_id: applicationId });
    ok(r2.ok && r2.data.id === session.id, 'create trùng client_request_id → trả phiên cũ (không tạo trùng)');

    const c1 = await rpc(eC, 'confirm_payment_session', { p_payment_id: session.id });
    ok(c1.ok && c1.data.status === 'HELD' && c1.data.shift_id === shiftId, 'confirm → HELD, không publish ca');
    const c2 = await rpc(eC, 'confirm_payment_session', { p_payment_id: session.id });
    ok(c2.ok && c2.data.status === 'HELD', 'confirm lần 2 idempotent (vẫn HELD)');
    const { data: held } = await admin.from('payment_sessions').select('status,shift_id,application_id,paid_at').eq('id', session.id).single();
    ok(held.status === 'HELD' && held.shift_id === shiftId && held.application_id === applicationId && !!held.paid_at, 'reload giữ phiên HELD đúng ca/đơn');
    const { count: holdCount } = await admin.from('mock_payment_ledger').select('id', { count: 'exact', head: true }).eq('payment_session_id', session.id).eq('entry_type', 'HOLD');
    ok(holdCount === 1, 'ledger HOLD chỉ ghi một lần');
    await admin.from('applications').update({ status: 'Confirmed', confirmed_at: new Date().toISOString() }).eq('id', applicationId);
    await admin.from('shifts').update({ status: 'Completed' }).eq('id', shiftId);
    const released = await rpc(eC, 'employer_confirm_completion', { p_application_id: applicationId });
    ok(released.ok, 'xác nhận hoàn thành gọi flow giải ngân');
    const { data: final } = await admin.from('payment_sessions').select('status').eq('id', session.id).single();
    ok(final.status === 'RELEASED', 'phiên chuyển HELD→RELEASED');
    await rpc(eC, 'release_mock_payment', { p_payment_id: session.id });
    const { count: payoutCount } = await admin.from('mock_payment_ledger').select('id', { count: 'exact', head: true }).eq('payment_session_id', session.id).eq('entry_type', 'WORKER_PAYOUT');
    const { count: feeCount } = await admin.from('mock_payment_ledger').select('id', { count: 'exact', head: true }).eq('payment_session_id', session.id).eq('entry_type', 'PLATFORM_FEE');
    ok(payoutCount === 1 && feeCount === 1, 'ledger payout và fee mỗi loại chỉ ghi một lần');
  }

  console.log('\n▶ Ví read-only (get_wallet_ledger, 0011) — worker thấy lương ca đã hoàn thành');
  {
    const wC = await signIn(wEmail);
    const r = await rpc(wC, 'get_wallet_ledger', {});
    ok(r.ok, 'worker gọi get_wallet_ledger thành công');
    const entries = Array.isArray(r.data) ? r.data : [];
    const wage = entries.find((e) => e.applicationId === applicationId);
    ok(
      !!wage && wage.kind === 'WorkerWageReleased' && wage.amount === 150000,
      `ví có lương ca đã xác nhận = 150000 (nhận ${wage?.amount})`,
    );
    ok(!(await rpc(anonC, 'get_wallet_ledger', {})).ok, 'anon KHÔNG đọc được ví');
  }

  console.log('\n▶ Cọc-trước-khi-đăng: create_deposit_session → confirm publish ca (0010)');
  {
    const dReq = `pay-${ts}-dep-${rnd()}`;
    const dPayload = buildPayload(dReq); // 50000×3h×2 vị trí = 300000 + 10% phí = 330000
    ok(!(await rpc(anonC, 'create_deposit_session', { p_shift_payload: dPayload, p_channel_id: mockChannelId, p_client_request_id: `${dReq}-anon` })).ok, 'anon KHÔNG tạo được phiên cọc');
    const dc = await rpc(eC, 'create_deposit_session', { p_shift_payload: dPayload, p_channel_id: mockChannelId, p_client_request_id: dReq });
    ok(dc.ok, 'tạo phiên cọc thành công');
    const dSession = dc.data ?? {};
    ok(dSession.status === 'PENDING' && dSession.amount === 330000, `cọc PENDING, amount = 50000×3h×2 + 10% = 330000 (nhận ${dSession.amount})`);
    ok(!dSession.shift_id, 'chưa publish ca lúc PENDING (shift_id rỗng)');
    const dc2 = await rpc(eC, 'create_deposit_session', { p_shift_payload: dPayload, p_channel_id: mockChannelId, p_client_request_id: dReq });
    ok(dc2.ok && dc2.data.id === dSession.id, 'create cọc trùng reqId → trả phiên cũ (idempotent)');
    ok(!(await rpc(e2C, 'confirm_deposit_session', { p_payment_id: dSession.id })).ok, 'employer khác KHÔNG confirm được phiên cọc (NOT_OWNER)');
    const dConf = await rpc(eC, 'confirm_deposit_session', { p_payment_id: dSession.id });
    ok(dConf.ok && dConf.data.status === 'HELD' && !!dConf.data.shift_id, 'confirm cọc → HELD + publish ca (có shift_id)');
    const newShiftId = dConf.data?.shift_id;
    if (newShiftId) createdShiftIds.add(newShiftId);
    const { data: pubShift } = await admin.from('shifts').select('status,employer_id').eq('id', newShiftId).maybeSingle();
    ok(pubShift?.status === 'Published' && pubShift?.employer_id === employerId, 'ca đã publish (Published, đúng employer)');
    const dConf2 = await rpc(eC, 'confirm_deposit_session', { p_payment_id: dSession.id });
    ok(dConf2.ok && dConf2.data.status === 'HELD' && dConf2.data.shift_id === newShiftId, 'confirm cọc lần 2 idempotent (không publish trùng)');
    const { count: dHold } = await admin.from('mock_payment_ledger').select('id', { count: 'exact', head: true }).eq('payment_session_id', dSession.id).eq('entry_type', 'HOLD');
    ok(dHold === 1, 'ledger HOLD (cọc) chỉ ghi một lần');
  }

  console.log('\n▶ Phiên HELD không thể hủy và confirm vẫn idempotent');
  {
    const cancel = await rpc(eC, 'cancel_payment_session', { p_payment_id: session.id });
    ok(!cancel.ok, 'không hủy phiên HELD');
    const conf = await rpc(eC, 'confirm_payment_session', { p_payment_id: session.id });
    ok(conf.ok && conf.data.status === 'RELEASED', 'confirm sau release vẫn idempotent');
  }
}

async function cleanup() {
  // Xoá ca test (client_request_id pay-<ts>-) trước để giảm cascade.
  try { await admin.from('shifts').delete().like('client_request_id', `pay-${ts}-%`); } catch { /* ignore */ }
  for (const id of createdShiftIds) {
    try { await admin.from('shifts').delete().eq('id', id); } catch { /* ignore */ }
  }
  // Xoá phiên test còn sót.
  try { await admin.from('payment_sessions').delete().like('client_request_id', `pay-${ts}-%`); } catch { /* ignore */ }
  if (disabledChannelId) { try { await admin.from('payment_channels').delete().eq('id', disabledChannelId); } catch { /* ignore */ } }
  const leftovers = [];
  for (const id of createdUserIds) {
    try {
      await admin.auth.admin.deleteUser(id);
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user) leftovers.push(id.slice(0, 8));
    } catch { leftovers.push(id.slice(0, 8)); }
  }
  if (leftovers.length) { console.error('⚠ CLEANUP THẤT BẠI (id rút gọn):', leftovers.join(', ')); process.exitCode = 1; }
  else console.log('• cleanup: đã xoá user/phiên/kênh test.');
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
