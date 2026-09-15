/**
 * Behavioral RLS integration tests — Phase 2 (Shifts + Applications), v3.
 * Chạy trên cale-dev SAU khi db push. service_role CHỈ ở Node (setup/cleanup).
 * Ngày/giờ dùng Asia/Ho_Chi_Minh (không dùng toISOString UTC làm ngày VN).
 * Lệnh: npm run test:rls:phase2
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
const code = (res) => res?.error?.message ?? '';
const isErr = (res, c) => !!res?.error && code(res).includes(c);

const ts = Date.now();
const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
let admin = null;

async function createUser(email, meta, appMeta) {
  const opts = { email, password: 'test-password-123', email_confirm: true, user_metadata: meta };
  if (appMeta) opts.app_metadata = appMeta;
  const { data, error } = await admin.auth.admin.createUser(opts);
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user.id;
}
async function signIn(email) {
  const c = mk();
  const { error } = await c.auth.signInWithPassword({ email, password: 'test-password-123' });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return c;
}
// Ngày/giờ theo Asia/Ho_Chi_Minh.
const vnDate = (deltaDays) => new Date(Date.now() + deltaDays * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
function vnParts(ms) {
  const d = new Date(ms);
  return {
    date: d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
    time: d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }).slice(0, 5),
  };
}
function payload(over = {}) {
  return {
    title: 'E2E P2', description: 'd', requirements: 'r', job_type: 'Phục vụ',
    location: 'Quận 1', district: 'Quận 1', date: vnDate(3), start_time: '09:00', end_time: '12:00',
    hourly_wage: 40000, positions_total: 2, evidence_requirement: 'OptionalPhoto',
    on_site_contact_name: 'QL', on_site_contact_phone: '0901234567',
    requires_verified_document_on_arrival: false, ...over,
  };
}
async function adminInsertShift(over = {}) {
  const row = {
    employer_id: over.employer_id, client_request_id: `adm-${ts}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'past', job_type: 'Phục vụ', location: 'Q1', date: vnDate(-1), start_time: '09:00', end_time: '12:00',
    hourly_wage: 40000, positions_total: 1, positions_filled: 0, status: 'Published', escrow_status: 'Deposited',
    deposit_amount: 0, on_site_contact_name: 'QL', on_site_contact_phone: '0901234567', ...over,
  };
  const { data, error } = await admin.from('shifts').insert(row).select('id').single();
  if (error) throw new Error('adminInsertShift: ' + error.message);
  return data.id;
}
async function adminInsertApp(shiftId, workerId, status = 'Pending') {
  const { data, error } = await admin.from('applications').insert({ shift_id: shiftId, worker_id: workerId, status }).select('id').single();
  if (error) throw new Error('adminInsertApp: ' + error.message);
  return data.id;
}

async function main() {
  if (missing.length) return;
  admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`\nPhase 2 behavioral RLS (v3) — ${URL}\n`);

  const E = `p2.e.${ts}@gmail.com`, E2 = `p2.e2.${ts}@gmail.com`, SE = `p2.se.${ts}@gmail.com`;
  const SW = `p2.sw.${ts}@gmail.com`, A = `p2.a.${ts}@gmail.com`, B = `p2.b.${ts}@gmail.com`, AD = `p2.ad.${ts}@gmail.com`;
  let idE, idE2, idSE, idSW, idA, idB, idAD;

  try {
    console.log('• setup:');
    const emp = (n) => ({ role: 'employer', company_name: n, business_type: 'NH', employer_type: 'business', employer_type10a: 'Company' });
    idE = await createUser(E, emp('E')); idE2 = await createUser(E2, emp('E2')); idSE = await createUser(SE, emp('SE'));
    idSW = await createUser(SW, { role: 'worker', full_name: 'SW', phone: '0900000009' });
    idA = await createUser(A, { role: 'worker', full_name: 'A', phone: '0900000001' });
    idB = await createUser(B, { role: 'worker', full_name: 'B', phone: '0900000002' });
    idAD = await createUser(AD, { role: 'worker', full_name: 'AD', phone: '0900000003' }, { role: 'admin' });
    const u1 = await admin.from('users').update({ suspended: true }).eq('id', idSE).select('id');
    const u2 = await admin.from('users').update({ suspended: true }).eq('id', idSW).select('id');
    const u3 = await admin.from('users').update({ role: 'admin' }).eq('id', idAD).select('id');
    ok(!u1.error && u1.data?.length === 1 && !u2.error && u2.data?.length === 1 && !u3.error && u3.data?.length === 1,
      'setup suspended/admin: mỗi update đúng 1 dòng, không lỗi');
    const cE = await signIn(E), cE2 = await signIn(E2), cSE = await signIn(SE), cSW = await signIn(SW);
    const cA = await signIn(A), cB = await signIn(B), cAD = await signIn(AD), anon = mk();

    // === publish validate (error code + không tạo row) ======================
    console.log('• publish validate:');
    ok(isErr(await cSE.rpc('publish_shift', { p_payload: payload(), p_client_request_id: `se-${ts}` }), 'SUSPENDED'), 'suspended employer publish → SUSPENDED');
    ok(isErr(await cE.rpc('publish_shift', { p_payload: payload({ date: vnDate(-1) }), p_client_request_id: `pp-${ts}` }), 'SHIFT_IN_PAST'), 'publish quá khứ → SHIFT_IN_PAST');
    ok(isErr(await cE.rpc('publish_shift', { p_payload: payload({ title: '' }), p_client_request_id: `nt-${ts}` }), 'TITLE_REQUIRED'), 'thiếu title → TITLE_REQUIRED');
    ok(isErr(await cE.rpc('publish_shift', { p_payload: payload({ on_site_contact_phone: '123' }), p_client_request_id: `bp-${ts}` }), 'CONTACT_PHONE_INVALID'), 'phone sai → CONTACT_PHONE_INVALID');
    ok(isErr(await cE.rpc('publish_shift', { p_payload: payload({ date: 'not-a-date' }), p_client_request_id: `bd-${ts}` }), 'DATE_REQUIRED'), 'date sai kiểu → DATE_REQUIRED (không lỗi cast thô)');
    ok(isErr(await cE.rpc('publish_shift', { p_payload: payload({ hourly_wage: 'abc' }), p_client_request_id: `bw-${ts}` }), 'INVALID_WAGE'), 'wage sai kiểu → INVALID_WAGE');
    ok(isErr(await cE.rpc('publish_shift', { p_payload: payload({ job_type: 'Khác', custom_job_type_name: '' }), p_client_request_id: `kc-${ts}` }), 'CUSTOM_JOB_TYPE_REQUIRED'), 'Khác thiếu custom → CUSTOM_JOB_TYPE_REQUIRED');
    { const { data } = await admin.from('shifts').select('id').eq('employer_id', idE); ok((data?.length ?? 0) === 0, 'publish lỗi KHÔNG tạo row'); }

    // === publish OK + idempotency + no Draft + public_shifts ================
    console.log('• publish OK:');
    const reqId = `ok-${ts}`;
    const shiftId = (await cE.rpc('publish_shift', { p_payload: payload({ positions_total: 2 }), p_client_request_id: reqId })).data;
    ok(!!shiftId, 'publish hợp lệ → id');
    ok((await cE.rpc('publish_shift', { p_payload: payload({ positions_total: 2 }), p_client_request_id: reqId })).data === shiftId, 'idempotent → 1 ca');
    { const { data } = await admin.from('shifts').select('id').eq('status', 'Draft'); ok((data?.length ?? 0) === 0, 'KHÔNG có Draft server'); }
    { const { data } = await anon.from('public_shifts').select('*').eq('id', shiftId).single();
      ok(data && !('on_site_contact_phone' in data) && !('escrow_status' in data) && !('deposit_amount' in data), 'public_shifts không contact/escrow/deposit'); }

    // === RLS đọc + direct write + NOT_OWNER =================================
    console.log('• apply + RLS + NOT_OWNER:');
    const aApp = (await cA.rpc('apply', { p_shift_id: shiftId })).data;
    ok(!!aApp, 'A apply');
    ok(isErr(await cA.rpc('apply', { p_shift_id: shiftId }), 'ALREADY_APPLIED'), 'A apply trùng → ALREADY_APPLIED');
    const bApp = (await cB.rpc('apply', { p_shift_id: shiftId })).data;
    ok(((await cA.from('applications').select('id').eq('id', bApp)).data?.length ?? 0) === 0, 'A KHÔNG đọc đơn B');
    ok(((await cE2.from('shifts').select('id').eq('id', shiftId)).data?.length ?? 0) === 0, 'E2 KHÔNG đọc ca của E');
    ok(!!(await cA.from('applications').update({ status: 'Approved' }).eq('id', aApp).select()).error, 'A KHÔNG UPDATE trực tiếp applications');
    ok(!!(await cE.from('shifts').update({ positions_filled: 9 }).eq('id', shiftId).select()).error, 'E KHÔNG UPDATE trực tiếp shifts');
    ok(!!(await cE.from('shifts').insert(payload()).select()).error, 'E KHÔNG INSERT trực tiếp shifts');
    const delRes = await cE.from('shifts').delete().eq('id', shiftId).select();
    ok(!!delRes.error || (delRes.data?.length ?? 0) === 0, 'E KHÔNG DELETE trực tiếp shifts');
    ok(isErr(await cE2.rpc('approve', { p_application_id: aApp }), 'NOT_OWNER'), 'E2 approve → NOT_OWNER');
    ok(isErr(await cE2.rpc('cancel_shift', { p_shift_id: shiftId, p_reason: 'x' }), 'NOT_OWNER'), 'E2 cancel → NOT_OWNER');

    // === reject → re-apply; approve invariant ===============================
    console.log('• reject/approve:');
    ok(isErr(await cE.rpc('reject', { p_application_id: bApp, p_reason: '' }), 'REASON_REQUIRED'), 'reject rỗng → REASON_REQUIRED');
    ok(!(await cE.rpc('reject', { p_application_id: bApp, p_reason: 'no' })).error, 'reject B');
    const bRe = (await cB.rpc('apply', { p_shift_id: shiftId })).data;
    ok(!!bRe, 'B apply lại sau Rejected');
    ok(!(await cE.rpc('approve', { p_application_id: aApp })).error, 'approve A');
    ok((await admin.from('shifts').select('positions_filled').eq('id', shiftId).single()).data?.positions_filled === 1, 'positions_filled=1');

    // === withdraw reason + CancelledByWorker → re-apply ======================
    console.log('• withdraw:');
    ok(isErr(await cB.rpc('withdraw', { p_application_id: bRe, p_reason: ' ' }), 'REASON_REQUIRED'), 'withdraw rỗng → REASON_REQUIRED');
    ok(isErr(await cSW.rpc('withdraw', { p_application_id: await adminInsertApp(shiftId, idSW, 'Pending'), p_reason: 'x' }), 'SUSPENDED'), 'suspended worker withdraw → SUSPENDED');
    ok(!(await cB.rpc('withdraw', { p_application_id: bRe, p_reason: 'bận' })).error, 'B withdraw (Pending)');
    { const { data } = await admin.from('applications').select('status, cancellation_reason_note').eq('id', bRe).single();
      ok(data?.status === 'CancelledByWorker' && data?.cancellation_reason_note === 'bận', 'B → CancelledByWorker + lưu reason'); }
    ok(!!(await cB.rpc('apply', { p_shift_id: shiftId })).data, 'CancelledByWorker → apply lại');

    // === get_shift_detail theo vai + admin ==================================
    console.log('• get_shift_detail:');
    ok(!!(await cA.rpc('get_shift_detail', { p_shift_id: shiftId })).data?.on_site_contact_phone, 'A (Approved) thấy contact');
    ok(isErr(await cE2.rpc('get_shift_detail', { p_shift_id: shiftId }), 'NOT_AUTHORIZED'), 'E2 (không liên quan) → NOT_AUTHORIZED');
    ok(!!(await anon.rpc('get_shift_detail', { p_shift_id: shiftId })).error, 'anon → chặn');
    ok(!!(await cAD.rpc('get_shift_detail', { p_shift_id: shiftId })).data?.on_site_contact_phone, 'admin đọc đầy đủ');
    ok(isErr(await cAD.rpc('cancel_shift', { p_shift_id: shiftId, p_reason: 'x' }), 'NOT_AN_EMPLOYER'), 'admin KHÔNG mutation (NOT_AN_EMPLOYER)');

    // === edit_shift =========================================================
    console.log('• edit_shift:');
    const edId = (await cE.rpc('publish_shift', { p_payload: payload({ positions_total: 2 }), p_client_request_id: `ed-${ts}` })).data;
    ok(!(await cE.rpc('edit_shift', { p_shift_id: edId, p_patch: { title: 'Đã sửa' } })).error, 'edit thành công');
    ok((await admin.from('shifts').select('title').eq('id', edId).single()).data?.title === 'Đã sửa', 'title đã đổi');
    ok(isErr(await cE.rpc('edit_shift', { p_shift_id: edId, p_patch: { title: '  ' } }), 'TITLE_REQUIRED'), 'edit title rỗng → TITLE_REQUIRED');
    ok((await admin.from('shifts').select('title').eq('id', edId).single()).data?.title === 'Đã sửa', 'row cũ KHÔNG đổi sau patch lỗi');
    ok(isErr(await cE.rpc('edit_shift', { p_shift_id: edId, p_patch: { start_time: '12:00', end_time: '10:00' } }), 'INVALID_TIME_RANGE'), 'edit time sai → INVALID_TIME_RANGE');
    // positions dưới số giữ chỗ: approve A2,B2 (2 holders) rồi hạ total=1.
    const a2 = (await cA.rpc('apply', { p_shift_id: edId })).data; const b2 = (await cB.rpc('apply', { p_shift_id: edId })).data;
    await cE.rpc('approve', { p_application_id: a2 }); await cE.rpc('approve', { p_application_id: b2 });
    ok(isErr(await cE.rpc('edit_shift', { p_shift_id: edId, p_patch: { positions_total: 1 } }), 'POSITIONS_BELOW_FILLED'), 'positions < giữ chỗ → POSITIONS_BELOW_FILLED');
    // TOO_LATE 24h: dùng ca quá khứ (>24h qua mốc start-24h).
    const pastEd = await adminInsertShift({ employer_id: idE });
    ok(isErr(await cE.rpc('edit_shift', { p_shift_id: pastEd, p_patch: { title: 'x' } }), 'TOO_LATE'), 'edit ca quá hạn 24h → TOO_LATE');

    // === approve/cancel sau giờ bắt đầu (ca quá khứ) ========================
    console.log('• time gate quá khứ:');
    const pastShift = await adminInsertShift({ employer_id: idE });
    const pastApp = await adminInsertApp(pastShift, idA, 'Pending');
    ok(isErr(await cE.rpc('approve', { p_application_id: pastApp }), 'SHIFT_ALREADY_STARTED'), 'approve sau giờ → SHIFT_ALREADY_STARTED');
    ok(isErr(await cE.rpc('cancel_shift', { p_shift_id: pastShift, p_reason: 'x' }), 'TOO_LATE_STARTED'), 'cancel sau giờ → TOO_LATE_STARTED');

    // === suspended employer không sửa/hủy/duyệt ca đã có ===================
    console.log('• suspended employer:');
    const seShift = await adminInsertShift({ employer_id: idSE, date: vnDate(3) });
    const seApp = await adminInsertApp(seShift, idA, 'Pending');
    ok(isErr(await cSE.rpc('edit_shift', { p_shift_id: seShift, p_patch: { title: 'x' } }), 'SUSPENDED'), 'suspended employer edit → SUSPENDED');
    ok(isErr(await cSE.rpc('cancel_shift', { p_shift_id: seShift, p_reason: 'x' }), 'SUSPENDED'), 'suspended employer cancel → SUSPENDED');
    ok(isErr(await cSE.rpc('approve', { p_application_id: seApp }), 'SUSPENDED'), 'suspended employer approve → SUSPENDED');

    // === near-future shift: 6h cancel + 3h withdraw + cancellation req ======
    // Dựng ca gần LUÔN hợp lệ ở mọi giờ VN: start = now+90'; nếu rơi vào [22:30,23:59]
    // (end +1h sẽ qua nửa đêm) thì ép start='22:30', end='23:30' cùng ngày. Còn lại
    // dùng start=now+90', end=start+60' (chắc chắn cùng ngày). Không bao giờ SKIP.
    console.log('• near-future (6h/3h):');
    const startMs = Date.now() + 90 * 60000;
    const sp = vnParts(startMs);
    let nDate, nStartTime, nEndTime;
    if (sp.date === vnDate(0) && sp.time >= '23:00') {
      // now+90' rơi vào 23:00–23:59 hôm nay → end+60' sẽ qua đêm; dời sang MAI 00:30–01:30.
      nDate = vnDate(1); nStartTime = '00:30'; nEndTime = '01:30';
    } else {
      // Các trường hợp khác: now+90' làm start, +60' làm end (chắc chắn cùng ngày, không qua đêm).
      nDate = sp.date; nStartTime = sp.time; nEndTime = vnParts(startMs + 3600000).time;
    }
    const nId = (await cE.rpc('publish_shift', { p_payload: payload({ date: nDate, start_time: nStartTime, end_time: nEndTime, positions_total: 1 }), p_client_request_id: `near-${ts}` })).data;
    ok(!!nId, 'publish ca gần (luôn dựng được ở mọi giờ VN)');
    const nApp = (await cA.rpc('apply', { p_shift_id: nId })).data;
    ok(!!nApp, 'A apply ca gần');
    ok(isErr(await cE.rpc('cancel_shift', { p_shift_id: nId, p_reason: 'x' }), 'TOO_LATE_HAS_APPLICANTS'), 'cancel trong 6h + có applicant → TOO_LATE_HAS_APPLICANTS');
    ok(!(await cE.rpc('approve', { p_application_id: nApp })).error, 'approve A (ca gần, trước giờ)');
    ok((await cA.rpc('withdraw', { p_application_id: nApp, p_reason: 'kẹt' })).data === 'CancellationRequested', 'Approved withdraw trong 3h → CancellationRequested');
    ok(!(await cE.rpc('reject_cancellation_request', { p_application_id: nApp })).error, 'employer reject cancellation request');
    ok((await admin.from('applications').select('status').eq('id', nApp).single()).data?.status === 'Approved', 'đơn về Approved sau reject request');
    await cA.rpc('withdraw', { p_application_id: nApp, p_reason: 'kẹt lại' });
    ok(!(await cE.rpc('approve_cancellation_request', { p_application_id: nApp })).error, 'employer approve cancellation request');
    ok((await admin.from('shifts').select('positions_filled').eq('id', nId).single()).data?.positions_filled === 0, 'positions_filled=0 sau approve cancellation');

    // === concurrency: approve song song =====================================
    console.log('• concurrency:');
    const sc = (await cE.rpc('publish_shift', { p_payload: payload({ positions_total: 1 }), p_client_request_id: `c-${ts}` })).data;
    const c1 = (await cA.rpc('apply', { p_shift_id: sc })).data; const c2 = (await cB.rpc('apply', { p_shift_id: sc })).data;
    const [x1, x2] = await Promise.all([cE.rpc('approve', { p_application_id: c1 }), cE.rpc('approve', { p_application_id: c2 })]);
    ok([x1, x2].filter((x) => !x.error).length === 1, 'total=1: đúng 1 approve (không overbook)');
    ok((await admin.from('shifts').select('positions_filled, status').eq('id', sc).single()).data?.status === 'FullyBooked', 'ca → FullyBooked');
    // cancel || approve không hồi sinh
    const sd = (await cE.rpc('publish_shift', { p_payload: payload({ positions_total: 1 }), p_client_request_id: `d-${ts}` })).data;
    const dApp = (await cA.rpc('apply', { p_shift_id: sd })).data;
    await Promise.all([cE.rpc('approve', { p_application_id: dApp }), cE.rpc('cancel_shift', { p_shift_id: sd, p_reason: 'đổi' })]);
    { const { data: sh } = await admin.from('shifts').select('status, positions_filled').eq('id', sd).single();
      const { data: ap } = await admin.from('applications').select('status').eq('id', dApp).single();
      ok(sh?.status === 'Cancelled' && sh?.positions_filled === 0 && ap?.status !== 'Approved', 'cancel‖approve: Cancelled, positions=0, không hồi sinh'); }

    // === cancel_shift đầy đủ trạng thái đơn + detail sau Cancelled ==========
    console.log('• cancel_shift đầy đủ:');
    await cE.rpc('cancel_shift', { p_shift_id: shiftId, p_reason: 'đổi kế hoạch' });
    ok((await admin.from('applications').select('status').eq('id', aApp).single()).data?.status === 'CancelledByEmployer', 'A (Approved) → CancelledByEmployer');
    ok((await admin.from('shifts').select('positions_filled, status').eq('id', shiftId).single()).data?.status === 'Cancelled', 'ca Cancelled');
    ok(((await admin.from('public_shifts').select('id').eq('id', shiftId)).data?.length ?? 0) === 0, 'ca Cancelled gỡ khỏi public_shifts');
    ok(!!(await cE.rpc('get_shift_detail', { p_shift_id: shiftId })).data?.on_site_contact_phone, 'owner đọc detail sau Cancelled');
    ok((await cA.rpc('get_shift_detail', { p_shift_id: shiftId })).data?.id === shiftId, 'worker-có-đơn đọc detail sau Cancelled');

    // === repost ownership/status/idempotency ================================
    console.log('• repost:');
    const rep1 = await cE.rpc('publish_shift', { p_payload: payload({ date: vnDate(4) }), p_client_request_id: `rp-${ts}`, p_reposted_from_shift_id: shiftId });
    ok(!rep1.error && !!rep1.data, 'repost từ ca Cancelled của mình → OK');
    ok((await cE.rpc('publish_shift', { p_payload: payload({ date: vnDate(4) }), p_client_request_id: `rp-${ts}`, p_reposted_from_shift_id: shiftId })).data === rep1.data, 'repost idempotent (cùng key)');
    const openShift = (await cE.rpc('publish_shift', { p_payload: payload(), p_client_request_id: `open-${ts}` })).data;
    ok(isErr(await cE.rpc('publish_shift', { p_payload: payload({ date: vnDate(4) }), p_client_request_id: `rp2-${ts}`, p_reposted_from_shift_id: openShift }), 'REPOST_SOURCE_NOT_REPOSTABLE'), 'repost từ ca Published → NOT_REPOSTABLE');
    ok(isErr(await cE2.rpc('publish_shift', { p_payload: payload({ date: vnDate(4) }), p_client_request_id: `rp3-${ts}`, p_reposted_from_shift_id: shiftId }), 'REPOST_SOURCE_NOT_OWNED'), 'repost ca không sở hữu → NOT_OWNED');
  } catch (e) {
    ok(false, 'Lỗi không mong đợi: ' + (e?.message ?? e));
  } finally {
    console.log('• cleanup:');
    for (const id of [idE, idE2, idSE, idSW, idA, idB, idAD].filter(Boolean)) {
      const del = await admin.auth.admin.deleteUser(id);
      ok(!del.error, `xoá ${id.slice(0, 8)}…`);
    }
  }
  console.log(`\n${fail === 0 ? '✓ PASS' : '✗ FAIL'} — ${pass} passed, ${fail} failed`);
  if (fail > 0) { console.log('Thất bại:'); for (const f of failures) console.log('  - ' + f); }
  process.exitCode = fail === 0 ? 0 : 1;
}
main().catch((e) => { console.error('Lỗi ngoài vòng test:', e?.message ?? e); process.exitCode = 1; });
