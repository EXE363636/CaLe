/**
 * Behavioral RLS integration tests — Phase 1 (Auth + Profile).
 *
 * CỔNG NGHIỆM THU RLS. Chạy bằng anon/auth/admin client THẬT trên `cale-dev`
 * (không cần Docker). Xem docs/PHASE_1_PLAN.md (v4) mục 8/10.
 *
 * Cách tạo user test — ỔN ĐỊNH, KHÔNG gửi email thật:
 *   - Tạo A/B/admin bằng service-role `auth.admin.createUser({ email_confirm:true })`.
 *     Cách này VẪN kích hoạt trigger `auth.users` (tạo users/profile/public_profiles)
 *     nhưng KHÔNG gửi thư xác nhận và không phụ thuộc trạng thái Confirm Email.
 *   - Email ngẫu nhiên domain hợp lệ (gmail.com).
 *   - Đăng nhập A/B bằng client publishable + signInWithPassword rồi chạy RLS checks.
 *   - Luồng anon end-user `signUp()` sẽ kiểm RIÊNG ở bước auth/E2E — KHÔNG trộn
 *     việc gửi email vào cổng RLS này.
 *
 * Điều kiện chạy (BẮT BUỘC đủ — thiếu → INCOMPLETE, exitCode 2):
 *   - Đã `supabase db push` migration lên `cale-dev`.
 *   - Env (process.env hoặc .env.local / .env.test.local):
 *       NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *       SUPABASE_SERVICE_ROLE_KEY (CHỈ .env.test.local — GITIGNORED, local-only,
 *       KHÔNG commit / KHÔNG Vercel / KHÔNG chat).
 *
 * Lệnh: npm run test:rls:supabase
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// --- nạp .env.local / .env.test.local (parser tối giản) ---------------------
function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* file không tồn tại — bỏ qua */
  }
}
loadEnvFile('.env.local');
loadEnvFile('.env.test.local');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- khung test tối giản -----------------------------------------------------
let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  ✗ ${name}`);
  }
}

const ts = Date.now();
const rand = () => Math.random().toString(36).slice(2, 8);
const mkClient = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

// admin (service-role) — gán trong main() sau khi kiểm đủ env.
let admin = null;

const PASSWORD = 'test-password-123';
const NEW_PHONE = '+84911111111';
const A = { email: `rls-a-${ts}-${rand()}@gmail.com`, password: PASSWORD, full_name: 'RLS User A' };
const B = { email: `rls-b-${ts}-${rand()}@gmail.com`, password: PASSWORD, full_name: 'RLS User B' };
const ADMIN = { email: `rls-admin-${ts}-${rand()}@gmail.com`, password: PASSWORD };

/** Tạo user (Admin API, email đã confirm, không gửi thư). Trigger vẫn chạy. */
async function createUser(u, { appMetadata } = {}) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { role: 'worker', full_name: u.full_name ?? 'RLS User', phone: '+84900000000' },
    ...(appMetadata ? { app_metadata: appMetadata } : {}),
  });
  if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
  return data.user.id;
}

/** Đăng nhập bằng client publishable, trả client đã có session. */
async function signIn(u) {
  const c = mkClient();
  const { data, error } = await c.auth.signInWithPassword({ email: u.email, password: u.password });
  if (error) throw new Error(`signIn ${u.email}: ${error.message}`);
  if (!data.session) throw new Error(`signIn ${u.email}: không tạo được session`);
  return c;
}

async function main() {
  // Cổng đầy đủ ⇒ thiếu bất kỳ biến nào là INCOMPLETE (không PASS). KHÔNG in secret.
  const missing = [];
  if (!URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!ANON) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!SERVICE) missing.push('SUPABASE_SERVICE_ROLE_KEY (.env.test.local, local-only)');
  if (missing.length > 0) {
    console.error('⚠ INCOMPLETE — thiếu biến môi trường (không thể nghiệm thu đầy đủ):');
    for (const m of missing) console.error('  - ' + m);
    console.error('\nĐặt đủ 3 biến rồi chạy lại.');
    process.exitCode = 2;
    return;
  }

  admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`\nPhase 1 behavioral RLS (full gate) — target: ${URL}\n`);

  let idA = null;
  let idB = null;
  let idAdmin = null;

  try {
    // 1) Tạo A, B, admin qua Admin API (trigger chạy, không gửi email) -------
    console.log('• Tạo user test (Admin API, email_confirm):');
    idA = await createUser(A);
    idB = await createUser(B);
    idAdmin = await createUser(ADMIN, { appMetadata: { role: 'admin' } });
    ok(!!idA && !!idB && !!idAdmin, 'Tạo A/B/admin qua Admin API (trigger tạo users/profile/public_profiles)');

    // Trigger tạo role 'worker' cho admin; nâng thành 'admin' bằng service client.
    // (Quyền admin thực sự lấy từ app_metadata trong is_admin(); dòng này để bảng
    //  nhất quán VÀ để kiểm service_role có quyền UPDATE bảng.)
    {
      const { data, error } = await admin
        .from('users').update({ role: 'admin' }).eq('id', idAdmin).select('id, role');
      if (error) console.log(`    (service update role err: ${error.code ?? ''} ${error.message})`);
      ok(
        !error && data?.length === 1 && data[0].id === idAdmin && data[0].role === 'admin',
        'service client nâng users.role=admin (đúng 1 dòng, role=admin)',
      );
    }

    const cA = await signIn(A);

    // 2) anon (không session) -----------------------------------------------
    console.log('• anon:');
    const anon = mkClient();
    {
      const { error } = await anon.from('public_profiles').select('user_id, role, display_name').limit(5);
      ok(!error, 'anon ĐỌC được public_profiles');
    }
    {
      const { data, error } = await anon.from('users').select('id').limit(1);
      ok(!!error || (data?.length ?? 0) === 0, 'anon KHÔNG đọc được bảng users');
    }

    // 3) A (đã đăng nhập) ---------------------------------------------------
    console.log('• user A:');
    {
      const { data, error } = await cA.from('users').select('id, role').eq('id', idA);
      ok(!error && data?.length === 1 && data[0].id === idA, 'A đọc được dòng users của chính mình');
    }
    {
      const { data, error } = await cA.from('users').select('id').eq('id', idB);
      ok(!error && (data?.length ?? 0) === 0, 'A KHÔNG đọc được dòng users của B');
    }
    {
      const { data, error } = await cA.from('public_profiles').select('user_id, display_name').eq('user_id', idB);
      ok(!error && data?.length === 1, 'A đọc được public_profiles của B');
    }
    {
      const { data, error } = await cA
        .from('worker_profiles').update({ full_name: 'A updated' }).eq('user_id', idA).select();
      ok(!error && data?.length === 1, 'A sửa được worker_profiles của chính mình');
    }
    {
      const { data, error } = await cA
        .from('worker_profiles').update({ full_name: 'hacked' }).eq('user_id', idB).select();
      ok(!error && (data?.length ?? 0) === 0, 'A KHÔNG sửa được worker_profiles của B (0 dòng)');
    }
    {
      const { error } = await cA.from('users').update({ role: 'admin' }).eq('id', idA).select();
      ok(!!error, 'A KHÔNG đổi được users.role (quyền cột bị từ chối)');
    }
    {
      const { error } = await cA.from('users').update({ suspended: true }).eq('id', idA).select();
      ok(!!error, 'A KHÔNG đổi được users.suspended (quyền cột bị từ chối)');
    }
    {
      const { data, error } = await cA
        .from('users').update({ phone: NEW_PHONE }).eq('id', idA).select('id, phone');
      ok(
        !error && data?.length === 1 && data[0].id === idA && data[0].phone === NEW_PHONE,
        'A đổi được users.phone (đúng 1 dòng của A, giá trị mới)',
      );
    }
    {
      const { error } = await cA.rpc('admin_set_suspended', { target: idB, value: true });
      ok(!!error, 'A (không phải admin) gọi admin_set_suspended bị từ chối');
    }

    // 4) admin --------------------------------------------------------------
    console.log('• admin:');
    const cAdmin = await signIn(ADMIN);
    ok(true, 'admin đăng nhập được');
    {
      const { error } = await cAdmin.rpc('admin_set_suspended', { target: idB, value: true });
      ok(!error, 'admin gọi admin_set_suspended thành công');
    }
    {
      // Xác nhận qua CẢ HAI đường để phân biệt lỗi RPC với lỗi table privilege:
      //   - cAdmin (authenticated admin) đọc qua RLS admin policy.
      //   - service client bypass RLS (cần GRANT bảng — migration ...0002).
      const viaAdmin = await cAdmin.from('users').select('suspended').eq('id', idB).single();
      const viaService = await admin.from('users').select('suspended').eq('id', idB).single();
      if (viaAdmin.error) {
        console.log(`    (cAdmin read err: ${viaAdmin.error.code ?? ''} ${viaAdmin.error.message})`);
      }
      if (viaService.error) {
        console.log(`    (service read err: ${viaService.error.code ?? ''} ${viaService.error.message})`);
      }
      ok(
        (!viaAdmin.error && viaAdmin.data?.suspended === true) ||
          (!viaService.error && viaService.data?.suspended === true),
        'B.suspended = true sau admin RPC (xác nhận qua cAdmin và/hoặc service)',
      );
    }
    {
      const { data, error } = await cAdmin.from('users').select('id').eq('id', idA);
      ok(!error && data?.length === 1, 'admin đọc được dòng users của người khác');
    }
  } catch (e) {
    ok(false, 'Lỗi không mong đợi: ' + (e?.message ?? e));
  } finally {
    // 5) cleanup — luôn chạy dù có lỗi giữa chừng --------------------------
    console.log('• cleanup (service_role):');
    for (const id of [idA, idB, idAdmin].filter(Boolean)) {
      const del = await admin.auth.admin.deleteUser(id);
      ok(!del.error, `xoá user test ${id.slice(0, 8)}…`);
    }
  }

  console.log(`\n${fail === 0 ? '✓ PASS' : '✗ FAIL'} — ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('Thất bại:');
    for (const f of failures) console.log('  - ' + f);
  }
  process.exitCode = fail === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error('Lỗi không mong đợi (ngoài vòng test):', e?.message ?? e);
  process.exitCode = 1;
});
