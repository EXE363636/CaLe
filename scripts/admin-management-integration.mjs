/**
 * Behavioral integration tests — Admin Account Management (task C/D).
 *
 * Kiểm thử Edge Function `admin-users` với Supabase THẬT, SAU khi đã:
 *   1. supabase db push  (schema Phase 1/2 sẵn có)
 *   2. supabase functions deploy admin-users
 * Lệnh: npm run test:admin
 *
 * Bảo mật:
 *   - service_role CHỈ dùng ở Node này để setup/cleanup (tạo user tạm, chèn ca).
 *     KHÔNG bao giờ gửi service_role vào Edge Function; hàm tự đọc từ env server.
 *   - Mọi lời gọi hàm dùng JWT của phiên đăng nhập (admin / worker) hoặc anon key,
 *     đúng như trình duyệt thật.
 *   - Chỉ xoá đúng user do test tạo (theo id). KHÔNG đụng admin bootstrap cố định.
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
if (missing.length) {
  console.error('⚠ INCOMPLETE — thiếu env:');
  for (const m of missing) console.error('  - ' + m);
  process.exitCode = 2;
}

let pass = 0, fail = 0; const failures = [];
function ok(cond, name) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ✗ ${name}`); }
}

const PW = 'test-password-123';
const ts = Date.now();
const rnd = () => Math.random().toString(36).slice(2, 8);
const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
let admin = null;
const createdUserIds = new Set();

async function svcCreateUser(email, meta, appMeta) {
  const opts = { email, password: PW, email_confirm: true, user_metadata: meta };
  if (appMeta) opts.app_metadata = appMeta;
  const { data, error } = await admin.auth.admin.createUser(opts);
  if (error) throw new Error(`svcCreateUser ${email}: ${error.message}`);
  createdUserIds.add(data.user.id);
  return data.user.id;
}
async function signIn(email) {
  const c = mk();
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return c;
}
/** Gọi Edge Function; đọc cả body lỗi { ok:false, error } từ context. */
async function callFn(client, body) {
  const { data, error } = await client.functions.invoke('admin-users', { body });
  if (error) {
    let parsed = null; let status = 0;
    const ctx = error.context;
    if (ctx) { status = ctx.status ?? 0; try { parsed = await ctx.json(); } catch { /* non-json */ } }
    return { ok: false, status, error: parsed?.error ?? error.name ?? 'ERROR' };
  }
  return { ok: true, status: 200, ...(data ?? {}) };
}

async function main() {
  if (missing.length) return;
  admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // --- Setup: một admin tạm (app_metadata.role=admin) + một worker thường ---
  const adminEmail = `it-admin-${ts}-${rnd()}@example.com`;
  const adminId = await svcCreateUser(adminEmail, { role: 'worker', full_name: 'IT Admin' }, { role: 'admin' });
  await admin.from('users').update({ role: 'admin' }).eq('id', adminId);
  await admin.from('worker_profiles').delete().eq('user_id', adminId);
  await admin.from('public_profiles').delete().eq('user_id', adminId);

  const workerEmail = `it-worker-${ts}-${rnd()}@example.com`;
  await svcCreateUser(workerEmail, { role: 'worker', full_name: 'IT Worker' });

  const adminClient = await signIn(adminEmail);
  const workerClient = await signIn(workerEmail);
  const anonClient = mk();

  console.log('\n▶ Quyền gọi hàm (anon / non-admin bị chặn)');
  {
    const r = await callFn(anonClient, { action: 'create', email: `x-${rnd()}@e.com`, password: PW, displayName: 'X', role: 'worker' });
    ok(!r.ok && (r.status === 401 || r.error === 'UNAUTHENTICATED'), 'anon KHÔNG tạo được tài khoản (401)');
  }
  {
    const r = await callFn(workerClient, { action: 'create', email: `x-${rnd()}@e.com`, password: PW, displayName: 'X', role: 'worker' });
    ok(!r.ok && (r.status === 403 || r.error === 'FORBIDDEN'), 'non-admin KHÔNG tạo được tài khoản (403)');
  }
  {
    const r = await callFn(anonClient, { action: 'delete', userId: adminId });
    ok(!r.ok && (r.status === 401 || r.error === 'UNAUTHENTICATED'), 'anon KHÔNG xoá được tài khoản (401)');
  }
  {
    const r = await callFn(workerClient, { action: 'delete', userId: adminId });
    ok(!r.ok && (r.status === 403 || r.error === 'FORBIDDEN'), 'non-admin KHÔNG xoá được tài khoản (403)');
  }

  console.log('\n▶ Admin tạo tài khoản Worker/Employer');
  let createdWorkerId = null, createdEmployerId = null;
  {
    const email = `it-new-worker-${ts}-${rnd()}@example.com`;
    const r = await callFn(adminClient, { action: 'create', email, password: PW, displayName: 'Người Mới', role: 'worker' });
    ok(r.ok && r.user?.role === 'worker', 'admin tạo được Worker');
    if (r.ok) {
      createdWorkerId = r.user.id; createdUserIds.add(createdWorkerId);
      const { data: u } = await admin.from('users').select('id, role').eq('id', createdWorkerId).single();
      const { data: wp } = await admin.from('worker_profiles').select('user_id').eq('user_id', createdWorkerId).single();
      const { data: au } = await admin.auth.admin.getUserById(createdWorkerId);
      ok(!!u && u.role === 'worker' && !!wp && !!au?.user, 'Worker tồn tại thật ở Auth + public.users + worker_profiles');
    }
  }
  {
    const email = `it-new-emp-${ts}-${rnd()}@example.com`;
    const r = await callFn(adminClient, { action: 'create', email, password: PW, displayName: 'Quán ABC', role: 'employer' });
    ok(r.ok && r.user?.role === 'employer', 'admin tạo được Employer');
    if (r.ok) {
      createdEmployerId = r.user.id; createdUserIds.add(createdEmployerId);
      const { data: ep } = await admin.from('employer_profiles').select('user_id').eq('user_id', createdEmployerId).single();
      ok(!!ep, 'Employer có employer_profiles');
    }
  }
  {
    // Trùng email → EMAIL_EXISTS.
    const email = `it-dup-${ts}-${rnd()}@example.com`;
    await callFn(adminClient, { action: 'create', email, password: PW, displayName: 'Dup1', role: 'worker' });
    const r2 = await callFn(adminClient, { action: 'create', email, password: PW, displayName: 'Dup2', role: 'worker' });
    ok(!r2.ok && r2.error === 'EMAIL_EXISTS', 'email trùng bị từ chối (EMAIL_EXISTS)');
    // dọn user vừa tạo
    const { data: dup } = await admin.from('users').select('id').eq('email', email).maybeSingle();
    if (dup?.id) createdUserIds.add(dup.id);
  }
  {
    // KHÔNG tạo được admin từ API.
    const r = await callFn(adminClient, { action: 'create', email: `it-admin2-${rnd()}@example.com`, password: PW, displayName: 'X', role: 'admin' });
    ok(!r.ok && r.error === 'INVALID_ROLE', 'KHÔNG tạo được role admin từ API (INVALID_ROLE)');
  }

  console.log('\n▶ Admin xoá vĩnh viễn (chỉ tài khoản sạch)');
  {
    // Worker sạch (chưa có đơn) → xoá được, biến mất khỏi Auth + DB.
    const r = await callFn(adminClient, { action: 'delete', userId: createdWorkerId });
    ok(r.ok && r.deletedId === createdWorkerId, 'xoá Worker sạch thành công');
    if (r.ok) {
      const { data: u } = await admin.from('users').select('id').eq('id', createdWorkerId).maybeSingle();
      const { data: au } = await admin.auth.admin.getUserById(createdWorkerId);
      ok(!u && !au?.user, 'Worker đã biến mất khỏi Auth + public.users');
      if (!u) createdUserIds.delete(createdWorkerId);
    }
  }
  {
    // Employer có lịch sử (1 ca) → USER_HAS_HISTORY, KHÔNG xoá.
    const { data: shift, error: sErr } = await admin.from('shifts').insert({
      employer_id: createdEmployerId, client_request_id: `it-${ts}-${rnd()}`,
      title: 'IT shift', job_type: 'Phục vụ', location: 'Q1',
      date: new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
      start_time: '09:00', end_time: '12:00', hourly_wage: 40000, positions_total: 1, positions_filled: 0,
      status: 'Published', escrow_status: 'Deposited', deposit_amount: 0,
      on_site_contact_name: 'QL', on_site_contact_phone: '0901234567',
    }).select('id').single();
    if (sErr) throw new Error('insert shift: ' + sErr.message);
    const r = await callFn(adminClient, { action: 'delete', userId: createdEmployerId });
    ok(!r.ok && r.error === 'USER_HAS_HISTORY', 'Employer có ca làm → USER_HAS_HISTORY (không xoá)');
    // dọn ca test để cleanup employer sau đó
    await admin.from('shifts').delete().eq('id', shift.id);
  }
  {
    // Admin không tự xoá mình.
    const r = await callFn(adminClient, { action: 'delete', userId: adminId });
    ok(!r.ok && r.error === 'CANNOT_DELETE_SELF', 'admin KHÔNG tự xoá tài khoản mình');
  }
  {
    // Không xoá được admin khác.
    const otherAdminEmail = `it-admin3-${ts}-${rnd()}@example.com`;
    const otherAdminId = await svcCreateUser(otherAdminEmail, { role: 'worker', full_name: 'IT Admin3' }, { role: 'admin' });
    await admin.from('users').update({ role: 'admin' }).eq('id', otherAdminId);
    const r = await callFn(adminClient, { action: 'delete', userId: otherAdminId });
    ok(!r.ok && r.error === 'CANNOT_DELETE_ADMIN', 'KHÔNG xoá được tài khoản admin');
  }

  console.log('\n▶ Khoá / mở khoá (giữ lịch sử)');
  {
    const r1 = await callFn(adminClient, { action: 'setSuspended', userId: createdEmployerId, suspended: true });
    const { data: u1 } = await admin.from('users').select('suspended').eq('id', createdEmployerId).single();
    ok(r1.ok && u1?.suspended === true, 'khoá tài khoản → suspended=true');
    const r2 = await callFn(adminClient, { action: 'setSuspended', userId: createdEmployerId, suspended: false });
    const { data: u2 } = await admin.from('users').select('suspended').eq('id', createdEmployerId).single();
    ok(r2.ok && u2?.suspended === false, 'mở khoá tài khoản → suspended=false');
  }

  // --- Cleanup: xoá mọi user test đã tạo (KHÔNG đụng admin bootstrap cố định) ---
  for (const id of createdUserIds) {
    try { await admin.auth.admin.deleteUser(id); } catch { /* ignore */ }
  }

  console.log(`\n${fail === 0 ? '✓' : '✗'} admin-management: ${pass} pass, ${fail} fail`);
  if (fail > 0) { console.log('Thất bại:'); for (const f of failures) console.log('  - ' + f); process.exitCode = 1; }
}

main().catch((e) => { console.error('✗ Lỗi không mong đợi:', e?.message ?? e); process.exitCode = 1; });
