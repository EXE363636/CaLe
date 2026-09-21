/**
 * Behavioral integration test — P0 attendance persistence + review fixes.
 * Chạy với Supabase THẬT sau khi `supabase db push` migration 0005 + 0006 + 0008.
 * Lệnh: npm run test:attendance
 *
 * Chứng minh: check-in / mark-present / check-out / confirm tồn tại trong
 * Supabase và ĐÚNG sau refetch (session khác) — không chỉ đổi state RAM. Kèm:
 *   - Chặn anon / worker khác / employer không sở hữu / sai role / sai trạng thái.
 *   - Time gate check-in start+15 (start+10 pass, start+16 blocked).
 *   - Evidence server-side theo domain contract (ChecklistOnly, RequiredHandover,
 *     gửi ARRAY JSON thật — không JSON.stringify; chặn thiếu/sai độ dài/false/sai kiểu).
 *   - check_in_at vs marked_present_at độc lập; idempotency.
 *   - Check-out muộn vẫn thành công; employer có thể xác nhận thủ công mà
 *     không tạo check_out_at giả (có confirmed_without_checkout để audit).
 *
 * An toàn: mật khẩu NGẪU NHIÊN mỗi lần chạy; setup/test trong try, cleanup trong
 * finally + kiểm tra kết quả xóa; KHÔNG in token/key/password. service_role chỉ ở
 * Node để setup/cleanup; mọi mutation attendance gọi bằng JWT worker/employer thật.
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

// Mật khẩu ngẫu nhiên mạnh cho mỗi lần chạy (không cố định, không in ra).
const PW = randomBytes(24).toString('base64url') + 'Aa1!';
const ts = Date.now();
const rnd = () => Math.random().toString(36).slice(2, 8);
const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
let admin = null;
const createdUserIds = new Set();

async function svcCreateUser(email, meta) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, user_metadata: meta });
  if (error) throw new Error(`createUser: ${error.message}`);
  createdUserIds.add(data.user.id);
  return data.user.id;
}
async function signIn(email) {
  const c = mk();
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error('signIn failed');
  return c;
}
function vnParts(ms) {
  const d = new Date(ms);
  return {
    date: d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
    time: d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }).slice(0, 5),
  };
}
async function insertShift(employerId, startMs, endMs, evidence = 'None') {
  const st = vnParts(startMs), en = vnParts(endMs);
  const { data, error } = await admin.from('shifts').insert({
    employer_id: employerId, client_request_id: `att-${ts}-${rnd()}`,
    title: 'ATT test', job_type: 'Phục vụ', location: 'Q1',
    date: st.date, start_time: st.time + ':00', end_time: en.time + ':00',
    hourly_wage: 40000, positions_total: 1, positions_filled: 1,
    status: 'Published', escrow_status: 'Deposited', deposit_amount: 0,
    on_site_contact_name: 'QL', on_site_contact_phone: '0901234567',
    evidence_requirement: evidence,
  }).select('id').single();
  if (error) throw new Error('insertShift: ' + error.message);
  return data.id;
}
async function insertApp(shiftId, workerId, patch = {}) {
  const { data, error } = await admin.from('applications').insert({
    shift_id: shiftId, worker_id: workerId, status: 'Approved', approved_at: new Date().toISOString(),
    payout_amount: 120000, ...patch,
  }).select('id').single();
  if (error) throw new Error('insertApp: ' + error.message);
  return data.id;
}
async function rpc(client, fn, args) {
  const { error } = await client.rpc(fn, args);
  if (error) return { ok: false, code: error.message || 'ERROR' };
  return { ok: true, code: null };
}
async function readApp(id) {
  const { data } = await admin.from('applications').select('*').eq('id', id).maybeSingle();
  return data;
}

async function run() {
  const now = Date.now();
  const eEmail = `att-emp-${ts}-${rnd()}@example.com`;
  const e2Email = `att-emp2-${ts}-${rnd()}@example.com`;
  const w1Email = `att-w1-${ts}-${rnd()}@example.com`;
  const w2Email = `att-w2-${ts}-${rnd()}@example.com`;
  const E = await svcCreateUser(eEmail, { role: 'employer', company_name: 'ATT Co' });
  const E2 = await svcCreateUser(e2Email, { role: 'employer', company_name: 'ATT Co2' });
  const W1 = await svcCreateUser(w1Email, { role: 'worker', full_name: 'ATT W1' });
  const W2 = await svcCreateUser(w2Email, { role: 'worker', full_name: 'ATT W2' });
  const eC = await signIn(eEmail), e2C = await signIn(e2Email), w1C = await signIn(w1Email), w2C = await signIn(w2Email);
  const anonC = mk();

  const shiftA = await insertShift(E, now + 2 * 60000, now + 30 * 60000);
  const appA = await insertApp(shiftA, W1);

  console.log('\n▶ Chặn quyền (anon / khác chủ / sai role)');
  ok(!(await rpc(anonC, 'worker_check_in', { p_application_id: appA })).ok, 'anon KHÔNG check-in được');
  {
    const r = await rpc(w2C, 'worker_check_in', { p_application_id: appA });
    ok(!r.ok && r.code.includes('NOT_OWNER'), 'worker khác KHÔNG check-in hộ (NOT_OWNER)');
  }
  {
    const r = await rpc(eC, 'worker_check_in', { p_application_id: appA });
    ok(!r.ok && r.code.includes('NOT_A_WORKER'), 'employer gọi worker_check_in bị chặn (NOT_A_WORKER)');
  }
  {
    const r = await rpc(w1C, 'employer_mark_present', { p_application_id: appA });
    ok(!r.ok && r.code.includes('NOT_AN_EMPLOYER'), 'worker gọi employer_mark_present bị chặn (NOT_AN_EMPLOYER)');
  }
  {
    const r = await rpc(e2C, 'employer_mark_present', { p_application_id: appA });
    ok(!r.ok && r.code.includes('NOT_OWNER'), 'employer không sở hữu ca KHÔNG mark-present (NOT_OWNER)');
  }

  console.log('\n▶ Worker check-in + tồn tại sau refetch + session khác thấy');
  {
    const r = await rpc(w1C, 'worker_check_in', { p_application_id: appA });
    ok(r.ok, 'worker check-in thành công');
    const row = await readApp(appA);
    ok(row?.status === 'CheckedIn' && !!row?.check_in_at, 'check_in_at tồn tại trong DB sau refetch');
    const { data: seenByE } = await eC.from('applications').select('check_in_at').eq('id', appA).maybeSingle();
    ok(!!seenByE?.check_in_at, 'employer (session khác) thấy check_in_at của worker');
    ok(!row?.marked_present_at, 'marked_present_at CHƯA set (độc lập với check-in)');
  }

  console.log('\n▶ Idempotency (double-click không tạo timestamp trùng)');
  {
    const before = (await readApp(appA)).check_in_at;
    const r = await rpc(w1C, 'worker_check_in', { p_application_id: appA });
    ok(r.ok && before === (await readApp(appA)).check_in_at, 'check-in lần 2 no-op, check_in_at không đổi');
  }

  console.log('\n▶ Employer mark-present độc lập với check-in');
  {
    const r = await rpc(eC, 'employer_mark_present', { p_application_id: appA });
    ok(r.ok, 'employer mark-present thành công');
    const row = await readApp(appA);
    ok(!!row?.marked_present_at && row?.marked_present_by_employer_id === E, 'marked_present_at + by_employer_id set');
    ok(!!row?.check_in_at, 'check_in_at KHÔNG bị mark-present ghi đè (hai dấu độc lập)');
    const before = row.marked_present_at;
    await rpc(eC, 'employer_mark_present', { p_application_id: appA });
    ok((await readApp(appA)).marked_present_at === before, 'mark-present lần 2 no-op');
  }

  console.log('\n▶ Time gate check-in start+15 (item 2)');
  {
    // now = start+10 → success.
    const s10 = await insertShift(E, now - 10 * 60000, now + 20 * 60000);
    const a10 = await insertApp(s10, W1);
    ok((await rpc(w1C, 'worker_check_in', { p_application_id: a10 })).ok, 'check-in tại start+10 phút → thành công');
    // now = start+16 → blocked.
    const s16 = await insertShift(E, now - 16 * 60000, now + 20 * 60000);
    const a16 = await insertApp(s16, W1);
    const r = await rpc(w1C, 'worker_check_in', { p_application_id: a16 });
    ok(!r.ok && r.code.includes('CHECK_IN_WINDOW_CLOSED'), 'check-in tại start+16 phút → bị chặn');
  }

  console.log('\n▶ Time gate: check-out / confirm khi ca chưa kết thúc bị chặn');
  {
    const r = await rpc(w1C, 'worker_check_out', { p_application_id: appA, p_note: null, p_evidence_file_name: null, p_checklist: null });
    ok(!r.ok && r.code.includes('CHECKOUT_WINDOW_CLOSED'), 'check-out khi ca CHƯA kết thúc bị chặn');
    const appAco = await insertApp(shiftA, W2, { status: 'CheckedOut', check_in_at: new Date().toISOString(), check_out_at: new Date().toISOString() });
    const rc = await rpc(eC, 'employer_confirm_completion', { p_application_id: appAco });
    ok(!rc.ok && rc.code.includes('SHIFT_NOT_ENDED'), 'confirm khi ca chưa kết thúc bị chặn (SHIFT_NOT_ENDED)');
  }

  console.log('\n▶ Evidence server-side validation (item 3, gửi ARRAY JSON thật)');
  {
    // ChecklistOnly (2 phần tử, tất cả true).
    const sc = await insertShift(E, now - 2 * 3600000, now - 5 * 60000, 'ChecklistOnly');
    const ac = await insertApp(sc, W1, { status: 'CheckedIn', check_in_at: new Date().toISOString() });
    ok(!(await rpc(w1C, 'worker_check_out', { p_application_id: ac, p_checklist: null })).ok, 'ChecklistOnly thiếu checklist → chặn');
    ok((await rpc(w1C, 'worker_check_out', { p_application_id: ac, p_checklist: [true] })).code?.includes('CHECKLIST_INCOMPLETE'), 'ChecklistOnly sai độ dài → CHECKLIST_INCOMPLETE');
    ok((await rpc(w1C, 'worker_check_out', { p_application_id: ac, p_checklist: [true, false] })).code?.includes('CHECKLIST_INCOMPLETE'), 'ChecklistOnly có false → CHECKLIST_INCOMPLETE');
    ok((await rpc(w1C, 'worker_check_out', { p_application_id: ac, p_checklist: 'notarray' })).code?.includes('EVIDENCE_INVALID'), 'checklist JSON string → EVIDENCE_INVALID');
    ok((await rpc(w1C, 'worker_check_out', { p_application_id: ac, p_checklist: [true, 1] })).code?.includes('EVIDENCE_INVALID'), 'checklist phần tử không boolean → EVIDENCE_INVALID');
    ok((await rpc(w1C, 'worker_check_out', { p_application_id: ac, p_checklist: [true, true] })).ok, 'ChecklistOnly đúng [true,true] → thành công');
    ok((await readApp(ac)).status === 'CheckedOut', 'ChecklistOnly check-out tồn tại sau refetch');

    // RequiredHandoverChecklist (3 phần tử true + note).
    const sh = await insertShift(E, now - 2 * 3600000, now - 5 * 60000, 'RequiredHandoverChecklist');
    const ah = await insertApp(sh, W1, { status: 'CheckedIn', check_in_at: new Date().toISOString() });
    ok((await rpc(w1C, 'worker_check_out', { p_application_id: ah, p_checklist: [true, true, true], p_note: '  ' })).code?.includes('NOTE_REQUIRED'), 'RequiredHandover thiếu note → NOTE_REQUIRED');
    ok((await rpc(w1C, 'worker_check_out', { p_application_id: ah, p_checklist: [true, true], p_note: 'ok' })).code?.includes('CHECKLIST_INCOMPLETE'), 'RequiredHandover sai độ dài → CHECKLIST_INCOMPLETE');
    ok((await rpc(w1C, 'worker_check_out', { p_application_id: ah, p_checklist: [true, true, true], p_note: 'đã bàn giao' })).ok, 'RequiredHandover đủ checklist+note → thành công');
    ok((await readApp(ah)).worker_checkout_note === 'đã bàn giao', 'note check-out lưu đúng sau refetch');
  }

  console.log('\n▶ Check-out + confirm (ca đã kết thúc) tồn tại sau refetch');
  {
    await admin.from('shifts').update({ date: vnParts(now - 2 * 3600000).date, start_time: vnParts(now - 2 * 3600000).time + ':00', end_time: vnParts(now - 5 * 60000).time + ':00' }).eq('id', shiftA);
    ok(!(await rpc(w2C, 'worker_check_out', { p_application_id: appA, p_checklist: null })).ok, 'worker khác KHÔNG check-out hộ');
    ok((await rpc(w1C, 'worker_check_out', { p_application_id: appA, p_note: 'xong', p_checklist: null })).ok, 'worker check-out thành công (None)');
    ok((await readApp(appA)).status === 'CheckedOut', 'check_out_at tồn tại sau refetch');
    ok(!(await rpc(e2C, 'employer_confirm_completion', { p_application_id: appA })).ok, 'employer không sở hữu KHÔNG confirm');
    ok((await rpc(eC, 'employer_confirm_completion', { p_application_id: appA })).ok, 'employer confirm hoàn thành thành công');
    ok((await readApp(appA)).status === 'Confirmed', 'confirmed_at tồn tại sau refetch (Confirmed)');
    const before = (await readApp(appA)).confirmed_at;
    await rpc(eC, 'employer_confirm_completion', { p_application_id: appA });
    ok((await readApp(appA)).confirmed_at === before, 'confirm lần 2 no-op');
  }

  console.log('\n▶ P0 ca kẹt: check-out muộn + employer xác nhận không có check-out');
  {
    const lateShift = await insertShift(E, now - 3 * 3600000, now - 2 * 3600000);
    const lateApp = await insertApp(lateShift, W1, {
      status: 'CheckedIn',
      check_in_at: new Date(now - 3 * 3600000).toISOString(),
    });
    ok(
      (await rpc(w1C, 'worker_check_out', {
        p_application_id: lateApp,
        p_checklist: null,
      })).ok,
      'worker check-out sau grace 60 phút vẫn thành công',
    );
    const lateRow = await readApp(lateApp);
    ok(
      lateRow?.status === 'CheckedOut' && !!lateRow?.check_out_at,
      'check-out muộn ghi check_out_at thật',
    );

    const manualShift = await insertShift(E, now - 2 * 3600000, now - 5 * 60000);
    const manualApp = await insertApp(manualShift, W2, {
      status: 'CheckedIn',
      marked_present_at: new Date(now - 90 * 60000).toISOString(),
      marked_present_by_employer_id: E,
    });
    ok(
      (await rpc(eC, 'employer_confirm_completion', {
        p_application_id: manualApp,
      })).ok,
      'employer xác nhận thủ công sau khi ca kết thúc',
    );
    const manualRow = await readApp(manualApp);
    ok(
      manualRow?.status === 'Confirmed' &&
        !!manualRow?.confirmed_at &&
        manualRow?.confirmed_without_checkout === true,
      'xác nhận thủ công được audit bằng confirmed_without_checkout',
    );
    ok(
      manualRow?.check_out_at === null,
      'xác nhận thủ công không tạo check_out_at giả',
    );
  }

  console.log('\n▶ Sai trạng thái: check-out khi Approved');
  {
    const sb = await insertShift(E, now - 2 * 3600000, now - 5 * 60000);
    const ab = await insertApp(sb, W2);
    const r = await rpc(w2C, 'worker_check_out', { p_application_id: ab, p_checklist: null });
    ok(!r.ok && r.code.includes('INVALID_STATE_FOR_CHECKOUT'), 'check-out khi Approved → INVALID_STATE_FOR_CHECKOUT');
  }

  void E2; void W2;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Xoá 1 user + xác minh đã biến mất, chịu được lỗi/độ trễ tạm thời (retry). */
async function deleteAndVerify(id) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await admin.auth.admin.deleteUser(id); } catch { /* thử lại */ }
    await sleep(250);
    const { data } = await admin.auth.admin.getUserById(id);
    if (!data?.user) return true; // đã xoá
  }
  return false;
}

async function cleanup() {
  // Xoá ca test của LẦN CHẠY NÀY trước (client_request_id `att-<ts>-`), giảm tải
  // cascade khi xoá employer (tránh lỗi/timeout xoá user sở hữu nhiều ca/đơn).
  try { await admin.from('shifts').delete().like('client_request_id', `att-${ts}-%`); } catch { /* ignore */ }
  const leftovers = [];
  for (const id of createdUserIds) {
    const gone = await deleteAndVerify(id);
    if (!gone) leftovers.push(id.slice(0, 8));
  }
  if (leftovers.length) {
    console.error('⚠ CLEANUP THẤT BẠI cho user id (rút gọn):', leftovers.join(', '));
    process.exitCode = 1;
  } else {
    console.log('• cleanup: đã xoá toàn bộ user test do phiên tạo (đã xác minh).');
  }
}

async function main() {
  if (missing.length) return;
  admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    await run();
  } catch (e) {
    fail++;
    failures.push('EXCEPTION: ' + (e instanceof Error ? e.message : String(e)));
    console.error('✗ Lỗi giữa chừng:', e instanceof Error ? e.message : e);
  } finally {
    await cleanup();
  }
  console.log(`\n${fail === 0 ? '✓' : '✗'} attendance: ${pass} pass, ${fail} fail`);
  if (fail > 0) { console.log('Thất bại:'); for (const f of failures) console.log('  - ' + f); process.exitCode = 1; }
}

main().catch((e) => { console.error('✗ Lỗi không mong đợi:', e?.message ?? e); process.exitCode = 1; });
