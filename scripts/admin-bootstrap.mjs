/**
 * Admin bootstrap — tạo/đảm bảo MỘT tài khoản admin cố định để chủ dự án quản trị
 * qua Admin Dashboard, KHÔNG phải sửa database thủ công.
 *
 * CHỈ chạy trong Node (KHÔNG import vào app/browser). Idempotent.
 * Lệnh: npm run admin:bootstrap
 *
 * Bảo mật:
 *  - Đọc Supabase URL + SUPABASE_SERVICE_ROLE_KEY từ file local đã gitignore
 *    (.env.local / .env.test.local). KHÔNG hardcode, KHÔNG log secret/mật khẩu.
 *  - Email + mật khẩu: nhập qua terminal (mật khẩu ẩn) HOẶC biến môi trường local
 *    ADMIN_EMAIL / ADMIN_PASSWORD (không commit). service_role chỉ ở Node này.
 *  - Signup công khai KHÔNG chọn được admin (trigger chặn); script này dùng service_role.
 *
 * Việc script làm:
 *  1. Nếu user chưa tồn tại → createUser (email_confirm) qua service_role. Trigger
 *     tạo users(role=worker) + worker_profiles + public_profiles.
 *  2. Nâng: public.users.role='admin' + trusted auth app_metadata.role='admin'.
 *  3. Gỡ worker_profiles + public_profiles của admin (admin không phải hồ sơ công khai).
 *  4. Nếu đã tồn tại → KHÔNG tạo trùng, chỉ đảm bảo đúng role/app_metadata (idempotent).
 *  5. Xác minh đúng 1 user, role admin ở CẢ users.role và app_metadata. Không in secret.
 *
 * Tài khoản này PERSISTENT — KHÔNG nằm trong cleanup của integration test
 * (các test chỉ xoá đúng những user do chúng tạo, theo ID; không đụng admin).
 */

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createClient } from '@supabase/supabase-js';

// --- nạp env local (gitignored) ---------------------------------------------
function loadEnvFile(path) {
  try {
    for (const l of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const t = l.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* file không tồn tại — bỏ qua */
  }
}
loadEnvFile('.env.local');
loadEnvFile('.env.test.local');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error('✗ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  console.error('  → đặt trong .env.local / .env.test.local (đã gitignore). KHÔNG in giá trị.');
  process.exitCode = 2;
}

// --- prompt terminal (mật khẩu ẩn) ------------------------------------------
function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Ẩn ký tự mật khẩu: ghi đè _writeToOutput để không hiện.
      const orig = rl._writeToOutput?.bind(rl);
      rl._writeToOutput = (s) => {
        if (s.includes(question)) orig?.(s);
        // các ký tự khác (mật khẩu) không in.
      };
    }
    rl.question(question, (ans) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(ans.trim());
    });
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  if (!URL || !SERVICE) return;

  let email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!email) email = (await ask('Email admin: ')).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    console.error('✗ Email không hợp lệ.');
    process.exitCode = 2;
    return;
  }
  let password = process.env.ADMIN_PASSWORD ?? '';
  if (!password) password = await ask('Mật khẩu admin (ẩn): ', { hidden: true });
  if (typeof password !== 'string' || password.length < 8) {
    console.error('✗ Mật khẩu cần ≥ 8 ký tự.');
    process.exitCode = 2;
    return;
  }

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // Tìm user theo email (không tạo trùng).
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) {
    console.error('✗ listUsers lỗi:', listErr.message);
    process.exitCode = 1;
    return;
  }
  let user = list.users.find((u) => (u.email ?? '').toLowerCase() === email);

  if (!user) {
    // Tạo mới. Trigger yêu cầu role worker|employer → tạo qua 'worker' rồi flip.
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'worker', full_name: 'Quản trị viên' },
      app_metadata: { role: 'admin' },
    });
    if (cErr) {
      console.error('✗ createUser lỗi:', cErr.message);
      process.exitCode = 1;
      return;
    }
    user = created.user;
    console.log('• Đã tạo tài khoản admin (email đã confirm).');
  } else {
    console.log('• Tài khoản đã tồn tại — không tạo trùng, chỉ đảm bảo quyền admin.');
    // Đảm bảo email đã confirm + app_metadata.role=admin.
    await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      app_metadata: { ...(user.app_metadata ?? {}), role: 'admin' },
    });
  }

  // Nâng users.role='admin' (bảng app dùng để hiện Admin Dashboard).
  const { error: uErr } = await admin.from('users').update({ role: 'admin' }).eq('id', user.id);
  if (uErr) {
    console.error('✗ update users.role lỗi:', uErr.message);
    process.exitCode = 1;
    return;
  }
  // Đảm bảo app_metadata.role='admin' (trusted, dùng cho RLS is_admin()).
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(user.app_metadata ?? {}), role: 'admin' },
  });
  // Admin không phải hồ sơ công khai/worker → gỡ nếu có (do trigger tạo lúc signup).
  await admin.from('public_profiles').delete().eq('user_id', user.id);
  await admin.from('worker_profiles').delete().eq('user_id', user.id);

  // --- Xác minh ---------------------------------------------------------------
  const { data: urow, error: vErr } = await admin
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .single();
  const { data: got } = await admin.auth.admin.getUserById(user.id);
  const appRole = got?.user?.app_metadata?.role;

  const okUsers = !vErr && urow && urow.role === 'admin';
  const okMeta = appRole === 'admin';
  if (okUsers && okMeta) {
    console.log(`✓ OK — admin: ${urow.email}`);
    console.log(`  users.role = admin, app_metadata.role = admin (id ${user.id.slice(0, 8)}…)`);
    console.log('  Tài khoản PERSISTENT — không nằm trong cleanup của integration test.');
    console.log('  Đăng nhập bằng email/mật khẩu vừa đặt → vào /admin/dashboard.');
    process.exitCode = 0;
  } else {
    console.error(`✗ Xác minh thất bại — users.role=${urow?.role ?? '?'}, app_metadata.role=${appRole ?? '?'}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('✗ Lỗi không mong đợi:', e?.message ?? e);
  process.exitCode = 1;
});
