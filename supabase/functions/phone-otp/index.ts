// deno-lint-ignore-file no-explicit-any
/**
 * Edge Function `phone-otp` — GỬI mã OTP xác thực số điện thoại (migration 0022).
 *
 * Trình duyệt gọi `functions.invoke('phone-otp', { body: { phone } })` (kèm JWT).
 *   -> _phone_otp_issue (service_role): kiểm giới hạn chống spam + lưu HASH mã
 *   -> gửi SMS qua nhà cung cấp -> _phone_otp_mark SENT / FAILED.
 * Người dùng nhập mã -> RPC `verify_phone_otp` (không qua hàm này).
 *
 * Chống spam / đốt tiền SMS (kiểm trong SQL, có khoá — gọi song song vẫn đúng):
 *   - chỉ tài khoản đã đăng nhập; chỉ SĐT di động VN (không gửi quốc tế);
 *   - 60 giây giữa 2 lần gửi; tối đa 5 lần / tài khoản, 5 lần / SĐT, 10 lần / IP
 *     trong 24h; trần toàn hệ thống `platform_settings.otp_daily_cap` / 24h;
 *   - mã 6 số, hết hạn 5 phút, sai 5 lần là huỷ; DB chỉ lưu sha256.
 *
 * Secrets (npx supabase secrets set ...):
 *   SMS_PROVIDER      = speedsms | mock   (thiếu -> báo SMS_NOT_CONFIGURED)
 *   SPEEDSMS_TOKEN    = access token SpeedSMS
 *   SPEEDSMS_SMS_TYPE = 4 (mặc định: brandname chung "Notify", không cần đăng ký)
 *   SPEEDSMS_SENDER   = Notify (mặc định) hoặc brandname riêng khi đã đăng ký
 * mock: KHÔNG gửi SMS, mã in ra log của function (chỉ để test).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';
import { CORS, fail, json } from '../_shared/payos.ts';

const SPEEDSMS_URL = 'https://api.speedsms.vn/index.php/sms/send';

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomCode(): string {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0] % 1_000_000).padStart(6, '0');
}

/** Gửi qua SpeedSMS. Trả null nếu thành công, ngược lại lý do lỗi. */
async function sendSpeedSms(phone0: string, content: string): Promise<string | null> {
  const token = Deno.env.get('SPEEDSMS_TOKEN');
  if (!token) return 'SPEEDSMS_TOKEN chưa cấu hình';
  const smsType = Number(Deno.env.get('SPEEDSMS_SMS_TYPE') ?? '4');
  const sender = Deno.env.get('SPEEDSMS_SENDER') ?? 'Notify';
  try {
    const res = await fetch(SPEEDSMS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${token}:x`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [`84${phone0.slice(1)}`],
        content,
        sms_type: smsType,
        sender,
      }),
    });
    const data: any = await res.json().catch(() => null);
    if (res.ok && data?.status === 'success') {
      const invalid = data?.data?.invalidPhone;
      if (Array.isArray(invalid) && invalid.length > 0) return 'SpeedSMS: số điện thoại không hợp lệ';
      return null;
    }
    return `SpeedSMS ${data?.code ?? res.status}: ${data?.message ?? 'lỗi không rõ'}`;
  } catch (e) {
    return `SpeedSMS network: ${e instanceof Error ? e.message : String(e)}`;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const provider = (Deno.env.get('SMS_PROVIDER') ?? '').toLowerCase();
  if (!url || !serviceKey) return fail('SERVER_MISCONFIGURED', 500);
  if (provider !== 'speedsms' && provider !== 'mock') {
    return fail('SMS_NOT_CONFIGURED', 503, 'Chưa cấu hình nhà cung cấp SMS (SMS_PROVIDER).');
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return fail('UNAUTHENTICATED', 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const caller = userData?.user;
  if (userErr || !caller) return fail('UNAUTHENTICATED', 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_JSON', 400);
  }
  const phone = typeof body?.phone === 'string' ? body.phone : '';
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;

  const id = crypto.randomUUID();
  const code = randomCode();
  const codeHash = await sha256Hex(`${id}:${code}`);

  const { data: issued, error: issueErr } = await admin.rpc('_phone_otp_issue', {
    p_id: id,
    p_user_id: caller.id,
    p_phone: phone,
    p_ip: ip,
    p_code_hash: codeHash,
  });
  if (issueErr) return fail('BACKEND_ERROR', 500);
  if (!issued?.ok) {
    const status = String(issued?.error ?? '').startsWith('OTP_') ? 429 : 400;
    return json({ ok: false, error: issued?.error ?? 'BACKEND_ERROR', retryAfter: issued?.retryAfter }, status);
  }

  const content = `CaLe: Ma xac thuc so dien thoai cua ban la ${code}. Ma het han sau 5 phut. Khong chia se ma nay cho bat ky ai.`;
  let sendErr: string | null = null;
  if (provider === 'mock') {
    console.log(`[phone-otp MOCK] ${issued.phone} -> ${code}`);
  } else {
    sendErr = await sendSpeedSms(issued.phone, content);
  }

  await admin.rpc('_phone_otp_mark', {
    p_id: id,
    p_status: sendErr ? 'FAILED' : 'SENT',
    p_reason: sendErr,
  });
  if (sendErr) {
    console.error(`[phone-otp] gửi thất bại: ${sendErr}`);
    return fail('SMS_SEND_FAILED', 502);
  }

  return json({ ok: true, phone: issued.phone, expiresIn: 300, cooldown: 60, mock: provider === 'mock' });
});
