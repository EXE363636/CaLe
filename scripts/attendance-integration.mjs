/**
 * Behavioral integration test — P0 attendance persistence.
 * Chạy với Supabase THẬT sau khi `supabase db push` migration 0005.
 * Lệnh: npm run test:attendance
 *
 * Chứng minh: check-in / mark-present / check-out / confirm HOÀN THÀNH tồn tại
 * trong Supabase và ĐÚNG sau refetch (session khác) — không chỉ đổi state RAM.
 * Kèm chặn anon / worker khác / employer không sở hữu / sai role / sai trạng thái /
 * time gate, tính độc lập của check_in_at vs marked_present_at, và idempotency.
 *
 * service_role CHỈ dùng ở Node để SETUP/cleanup (tạo user tạm, chèn shift/app,
 * dịch giờ ca). Mọi mutation attendance gọi bằng JWT của worker/employer thật.
 * Chỉ xoá user do chính test tạo (theo id).
 */

import { readFileSync } from 'node:fs';
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

const PW = 'test-password-123';
const ts = Date.now();
const rnd = () => Math.random().toString(36).slice(2, 8);
const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
let admin = null;
const createdUserIds = new Set();

async function svcCreateUser(email, meta) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, user_metadata: meta });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  createdUserIds.add(data.user.id);
  return data.user.id;
}
async function signIn(email) {
  const c = mk();
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return c;
}
/** VN wall-clock parts (YYYY-MM-DD, HH:MM) từ epoch ms. */
function vnParts(ms) {
  const d = new Date(ms);
  return {
    date: d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
    time: d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }).slice(0, 5),
  };
}
async function insertShift(employerId, startMs, endMs) {
  const st = vnParts(startMs), en = vnParts(endMs);
  const { data, error } = await admin.from('shifts').insert({
    employer_id: employerId, client_request_id: `att-${ts}-${rnd()}`,
    title: 'ATT test', job_type: 'Phục vụ', location: 'Q1',
    date: st.date, start_time: st.time + ':00', end_time: en.time + ':00',
    hourly_wage: 40000, positions_total: 1, positions_filled: 1,
    status: 'Published', escrow_status: 'Deposited', deposit_amount: 0,
    on_site_contact_name: 'QL', on_site_contact_phone: '0901234567',
    evidence_requirement: 'None',
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
async function setShiftTimes(shiftId, startMs, endMs) {
  const st = vnParts(startMs), en = vnParts(endMs);
  const { error } = await admin.from('shifts').update({ date: st.date, start_time: st.time + ':00', end_time: en.time + ':00' }).eq('id', shiftId);
  if (error) throw new Error('setShiftTimes: ' + error.message);
}
/** Gọi RPC; trả {ok, code}. code = message lỗi DB (mã raise exception) khi lỗi. */
async function rpc(client, fn, args) {
  const { error } = await client.rpc(fn, args);
  if (error) return { ok: false, code: error.message || 'ERROR' };
  return { ok: true, code: null };
}
/** Đọc lại 1 application (service role) — chứng minh tồn tại sau refetch. */
async function readApp(id) {
  const { data } = await admin.from('applications').select('*').eq('id', id).maybeSingle();
  return data;
}

async function main() {
  if (missing.length) return;
  admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // --- Setup users ---
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

  const now = Date.now();
  // Shift A: check-in/mark-present (start = now+2p, end = now+30p — cùng ngày VN).
  const shiftA = await insertShift(E, now + 2 * 60000, now + 30 * 60000);
  const appA = await insertApp(shiftA, W1);

  console.log('\n▶ Chặn quyền (anon / khác chủ / sai role)');
  {
    const r = await rpc(anonC, 'worker_check_in', { p_application_id: appA });
    ok(!r.ok, 'anon KHÔNG check-in được');
  }
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
    ok(row?.status === 'CheckedIn' && !!row?.check_in_at, 'check_in_at tồn tại trong DB sau refetch (status CheckedIn)');
    // Employer session (session khác) thấy check-in.
    const { data: seenByE } = await eC.from('applications').select('check_in_at,status').eq('id', appA).maybeSingle();
    ok(!!seenByE?.check_in_at, 'employer (session khác) thấy check_in_at của worker');
    ok(!row?.marked_present_at, 'marked_present_at CHƯA set (độc lập với check-in)');
  }

  console.log('\n▶ Idempotency (double-click không tạo timestamp trùng/đổi)');
  {
    const before = (await readApp(appA)).check_in_at;
    const r = await rpc(w1C, 'worker_check_in', { p_application_id: appA });
    const after = (await readApp(appA)).check_in_at;
    ok(r.ok && before === after, 'check-in lần 2 no-op, check_in_at không đổi');
  }

  console.log('\n▶ Employer mark-present độc lập với check-in');
  {
    const r = await rpc(eC, 'employer_mark_present', { p_application_id: appA });
    ok(r.ok, 'employer mark-present thành công');
    const row = await readApp(appA);
    ok(!!row?.marked_present_at && row?.marked_present_by_employer_id === E, 'marked_present_at + by_employer_id set');
    ok(!!row?.check_in_at, 'check_in_at của worker KHÔNG bị mark-present ghi đè (hai dấu độc lập)');
    // idempotent
    const before = row.marked_present_at;
    await rpc(eC, 'employer_mark_present', { p_application_id: appA });
    ok((await readApp(appA)).marked_present_at === before, 'mark-present lần 2 no-op');
  }

  console.log('\n▶ Time gate: check-out trước khi ca kết thúc bị chặn');
  {
    const r = await rpc(w1C, 'worker_check_out', { p_application_id: appA, p_note: null, p_evidence_file_name: null, p_checklist: null });
    ok(!r.ok && r.code.includes('CHECKOUT_WINDOW_CLOSED'), 'check-out khi ca CHƯA kết thúc bị chặn');
  }
  console.log('▶ Time gate: confirm khi ca chưa kết thúc bị chặn');
  {
    // Seed 1 app CheckedOut trên shift A (end tương lai) để test SHIFT_NOT_ENDED.
    const appAco = await insertApp(shiftA, W2, { status: 'CheckedOut', check_in_at: new Date().toISOString(), check_out_at: new Date().toISOString() });
    const r = await rpc(eC, 'employer_confirm_completion', { p_application_id: appAco });
    ok(!r.ok && r.code.includes('SHIFT_NOT_ENDED'), 'confirm khi ca chưa kết thúc bị chặn (SHIFT_NOT_ENDED)');
  }

  console.log('\n▶ Check-out + confirm hoàn thành (ca đã kết thúc) tồn tại sau refetch');
  {
    // Dời giờ shift A về QUÁ KHỨ (kết thúc 5 phút trước) để mở check-out.
    await setShiftTimes(shiftA, now - 2 * 3600000, now - 5 * 60000);
    // worker khác check-out hộ → chặn
    const rOther = await rpc(w2C, 'worker_check_out', { p_application_id: appA, p_note: null, p_evidence_file_name: null, p_checklist: null });
    ok(!rOther.ok && rOther.code.includes('NOT_OWNER'), 'worker khác KHÔNG check-out hộ (NOT_OWNER)');

    const r = await rpc(w1C, 'worker_check_out', { p_application_id: appA, p_note: 'xong ca', p_evidence_file_name: null, p_checklist: JSON.stringify([true]) });
    ok(r.ok, 'worker check-out thành công (ca đã kết thúc)');
    const row = await readApp(appA);
    ok(row?.status === 'CheckedOut' && !!row?.check_out_at, 'check_out_at tồn tại trong DB sau refetch');
    ok(row?.worker_checkout_note === 'xong ca', 'note check-out được lưu');

    // Confirm trước khi employer sở hữu? e2 confirm → NOT_OWNER
    const rE2 = await rpc(e2C, 'employer_confirm_completion', { p_application_id: appA });
    ok(!rE2.ok && rE2.code.includes('NOT_OWNER'), 'employer không sở hữu KHÔNG confirm (NOT_OWNER)');

    const rc = await rpc(eC, 'employer_confirm_completion', { p_application_id: appA });
    ok(rc.ok, 'employer confirm hoàn thành thành công');
    const row2 = await readApp(appA);
    ok(row2?.status === 'Confirmed' && !!row2?.confirmed_at, 'confirmed_at tồn tại trong DB sau refetch (status Confirmed)');
    // idempotent confirm
    const before = row2.confirmed_at;
    await rpc(eC, 'employer_confirm_completion', { p_application_id: appA });
    ok((await readApp(appA)).confirmed_at === before, 'confirm lần 2 no-op');
  }

  console.log('\n▶ Sai trạng thái: check-out khi app đang Approved');
  {
    const shiftB = await insertShift(E, now - 2 * 3600000, now - 5 * 60000);
    const appB = await insertApp(shiftB, W1); // Approved
    const r = await rpc(w1C, 'worker_check_out', { p_application_id: appB, p_note: null, p_evidence_file_name: null, p_checklist: null });
    ok(!r.ok && r.code.includes('INVALID_STATE_FOR_CHECKOUT'), 'check-out khi Approved bị chặn (INVALID_STATE_FOR_CHECKOUT)');
  }

  // --- Cleanup: xoá user test (cascade shifts/apps) ---
  for (const id of createdUserIds) {
    try { await admin.auth.admin.deleteUser(id); } catch { /* ignore */ }
  }

  console.log(`\n${fail === 0 ? '✓' : '✗'} attendance: ${pass} pass, ${fail} fail`);
  if (fail > 0) { console.log('Thất bại:'); for (const f of failures) console.log('  - ' + f); process.exitCode = 1; }
}

main().catch((e) => { console.error('✗ Lỗi không mong đợi:', e?.message ?? e); process.exitCode = 1; });
