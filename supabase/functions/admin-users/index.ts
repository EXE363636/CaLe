// deno-lint-ignore-file no-explicit-any
/**
 * Edge Function `admin-users` — quản trị tài khoản Worker/Employer AN TOÀN,
 * chạy TRÊN Supabase (Deno), KHÔNG bao giờ để service_role rò ra trình duyệt.
 *
 * Trình duyệt gọi qua supabase-js `functions.invoke('admin-users', { body })`
 * (JWT của người gọi tự đính vào Authorization). Hàm này:
 *   1. Xác thực JWT → lấy user thật (server-verified).
 *   2. CHỈ cho phép khi trusted `app_metadata.role === 'admin'` (không tin
 *      public.users.role, không tin body). Ngược lại → 403.
 *   3. Dùng service_role (chỉ có ở server, đọc từ env) để thao tác Admin API.
 *
 * Actions:
 *   - list         : liệt kê mọi user + hồ sơ (admin xem được email).
 *   - create       : tạo Worker/Employer thật (Auth + public.users + profile
 *                    do trigger handle_new_user tạo). KHÔNG cho tạo admin.
 *   - delete       : xoá vĩnh viễn Worker/Employer KHÔNG có lịch sử (ca/đơn).
 *                    Có lịch sử → USER_HAS_HISTORY (admin dùng "Khoá" thay thế,
 *                    vì schema cascade có thể xoá lây ca/đơn của người khác).
 *   - setSuspended : khoá/mở khoá (giữ nguyên tài khoản + lịch sử).
 *
 * Bảo mật/bất biến:
 *   - service_role CHỈ ở đây (server). Không NEXT_PUBLIC_, không trả về client.
 *   - Không tạo được role 'admin' qua create (chặn cứng).
 *   - Không xoá admin, không tự xoá chính mình.
 *   - anon/non-admin gọi bất kỳ action → 401/403.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
function fail(error: string, status: number, message?: string): Response {
  return json({ ok: false, error, message }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return fail('SERVER_MISCONFIGURED', 500);

  // service_role client — CHỈ dùng server-side trong hàm này.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Xác thực người gọi từ JWT (Authorization: Bearer ...).
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return fail('UNAUTHENTICATED', 401);

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const caller = userData?.user;
  if (userErr || !caller) return fail('UNAUTHENTICATED', 401);

  // 2) CHỈ admin tin cậy (trusted app_metadata.role) mới được đi tiếp.
  const callerRole = (caller.app_metadata as any)?.role;
  if (callerRole !== 'admin') return fail('FORBIDDEN', 403);

  // 3) Đọc body.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_JSON', 400);
  }
  const action = String(body?.action ?? '');

  try {
    switch (action) {
      case 'list':
        return await handleList(admin);
      case 'create':
        return await handleCreate(admin, body);
      case 'delete':
        return await handleDelete(admin, body, caller.id);
      case 'setSuspended':
        return await handleSetSuspended(admin, body, caller.id);
      default:
        return fail('UNKNOWN_ACTION', 400);
    }
  } catch (e) {
    return fail('SERVER_ERROR', 500, e instanceof Error ? e.message : String(e));
  }
});

// ---------------------------------------------------------------------------

async function handleList(admin: any): Promise<Response> {
  const { data: users, error } = await admin
    .from('users')
    .select('id, role, email, phone, suspended, created_at')
    .order('created_at', { ascending: true });
  if (error) return fail('SERVER_ERROR', 500, error.message);

  const ids = (users ?? []).map((u: any) => u.id);
  const [{ data: wp }, { data: ep }] = await Promise.all([
    admin.from('worker_profiles').select('*').in('user_id', ids.length ? ids : ['']),
    admin.from('employer_profiles').select('*').in('user_id', ids.length ? ids : ['']),
  ]);
  const wById = new Map((wp ?? []).map((r: any) => [r.user_id, r]));
  const eById = new Map((ep ?? []).map((r: any) => [r.user_id, r]));

  const rows = (users ?? []).map((u: any) => ({
    id: u.id,
    role: u.role,
    email: u.email,
    phone: u.phone ?? '',
    suspended: !!u.suspended,
    created_at: u.created_at,
    worker: u.role === 'worker' ? wById.get(u.id) ?? null : null,
    employer: u.role === 'employer' ? eById.get(u.id) ?? null : null,
  }));
  return json({ ok: true, users: rows });
}

async function handleCreate(admin: any, body: any): Promise<Response> {
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  const displayName = String(body?.displayName ?? '').trim();
  const role = String(body?.role ?? '');

  if (!EMAIL_RE.test(email)) return fail('INVALID_EMAIL', 400);
  if (password.length < 8) return fail('WEAK_PASSWORD', 400);
  if (displayName === '') return fail('MISSING_DISPLAY_NAME', 400);
  // Chặn cứng: KHÔNG tạo được admin (kể cả body cố truyền).
  if (role !== 'worker' && role !== 'employer') return fail('INVALID_ROLE', 400);

  const user_metadata: Record<string, unknown> =
    role === 'worker'
      ? { role, full_name: displayName }
      : { role, company_name: displayName };

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata,
    // KHÔNG set app_metadata.role → tài khoản này KHÔNG phải admin.
  });
  if (error) {
    const msg = (error.message ?? '').toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return fail('EMAIL_EXISTS', 409);
    }
    return fail('CREATE_FAILED', 400, error.message);
  }

  const newId = created?.user?.id;
  // Xác nhận trigger đã tạo public.users + profile.
  const { data: urow } = await admin
    .from('users')
    .select('id, role, email')
    .eq('id', newId)
    .single();
  if (!urow) return fail('CREATE_INCOMPLETE', 500);

  return json({ ok: true, user: { id: newId, email: urow.email, role: urow.role } });
}

async function handleDelete(admin: any, body: any, callerId: string): Promise<Response> {
  const userId = String(body?.userId ?? '');
  if (!userId) return fail('INVALID_INPUT', 400);
  // Tự xoá phải bị chặn TRƯỚC khi kiểm role đích: admin tự xoá luôn nhận
  // CANNOT_DELETE_SELF (không phải CANNOT_DELETE_ADMIN) để thông báo đúng ngữ cảnh.
  // KHÔNG đổi thứ tự hai kiểm tra này.
  if (userId === callerId) return fail('CANNOT_DELETE_SELF', 400);

  const { data: target, error: tErr } = await admin
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .single();
  if (tErr || !target) return fail('NOT_FOUND', 404);
  if (target.role === 'admin') return fail('CANNOT_DELETE_ADMIN', 400);

  // Kiểm tra lịch sử SERVER-SIDE (không tin client). Schema cascade → xoá
  // employer có ca sẽ xoá lây ca + đơn của người khác → chặn, buộc dùng Khoá.
  const { count: shiftCount, error: sErr } = await admin
    .from('shifts')
    .select('id', { count: 'exact', head: true })
    .eq('employer_id', userId);
  if (sErr) return fail('SERVER_ERROR', 500, sErr.message);

  const { count: appCount, error: aErr } = await admin
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('worker_id', userId);
  if (aErr) return fail('SERVER_ERROR', 500, aErr.message);

  if ((shiftCount ?? 0) > 0 || (appCount ?? 0) > 0) {
    return fail('USER_HAS_HISTORY', 409);
  }

  // Xoá thật user Auth → cascade public.users + profiles (FK on delete cascade).
  const { error: dErr } = await admin.auth.admin.deleteUser(userId);
  if (dErr) return fail('DELETE_FAILED', 500, dErr.message);

  // Xác minh public.users đã biến mất (cascade từ DB, không chỉ Auth).
  const { data: still } = await admin
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (still) return fail('DELETE_INCOMPLETE', 500);

  return json({ ok: true, deletedId: userId });
}

async function handleSetSuspended(admin: any, body: any, callerId: string): Promise<Response> {
  const userId = String(body?.userId ?? '');
  const suspended = Boolean(body?.suspended);
  if (!userId) return fail('INVALID_INPUT', 400);
  if (userId === callerId) return fail('CANNOT_SUSPEND_SELF', 400);

  const { data: target, error: tErr } = await admin
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .single();
  if (tErr || !target) return fail('NOT_FOUND', 404);
  if (target.role === 'admin') return fail('CANNOT_SUSPEND_ADMIN', 400);

  const { data, error } = await admin
    .from('users')
    .update({ suspended })
    .eq('id', userId)
    .select('id, suspended');
  if (error) return fail('SERVER_ERROR', 500, error.message);
  if (!data || data.length !== 1) return fail('UPDATE_FAILED', 500);

  return json({ ok: true, user: { id: userId, suspended } });
}
