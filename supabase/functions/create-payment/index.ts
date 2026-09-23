// deno-lint-ignore-file no-explicit-any
/**
 * Edge Function `create-payment` — tạo link/QR NẠP tiền THẬT qua PayOS (Kênh thu).
 *
 * Trình duyệt gọi `functions.invoke('create-payment', { body: { amount } })`
 * (JWT tự đính vào Authorization). Hàm này:
 *   1. Xác thực JWT -> user thật (server-verified).
 *   2. Sinh orderCode duy nhất, ghi payment_orders (PENDING) bằng service_role.
 *   3. Ký request + gọi PayOS Create Payment Link, lưu checkoutUrl/qrCode.
 *   4. Trả { orderCode, checkoutUrl, qrCode } cho client hiển thị QR.
 *
 * Tiền chỉ được CỘNG VÍ khi webhook PayOS xác nhận (payos-webhook) — KHÔNG cộng
 * ở đây. Secret PayOS chỉ đọc từ env, không rò ra client.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';
import { CORS, fail, json, PAYOS_BASE, signCreatePayment } from '../_shared/payos.ts';

const MIN_AMOUNT = 2000;        // PayOS tối thiểu ~2.000đ
const MAX_AMOUNT = 500_000_000; // guard an toàn

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const clientId = Deno.env.get('PAYOS_CLIENT_ID');
  const apiKey = Deno.env.get('PAYOS_API_KEY');
  const checksumKey = Deno.env.get('PAYOS_CHECKSUM_KEY');
  const returnUrl = Deno.env.get('PAYOS_RETURN_URL') ?? '';
  const cancelUrl = Deno.env.get('PAYOS_CANCEL_URL') ?? '';
  const description = Deno.env.get('PAYOS_DESCRIPTION') ?? 'CALE nap vi';
  if (!url || !serviceKey) return fail('SERVER_MISCONFIGURED', 500);
  if (!clientId || !apiKey || !checksumKey || !returnUrl || !cancelUrl) {
    return fail('PAYOS_NOT_CONFIGURED', 500, 'Thiếu PAYOS_* trong secrets Edge Function.');
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Xác thực người gọi.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return fail('UNAUTHENTICATED', 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const caller = userData?.user;
  if (userErr || !caller) return fail('UNAUTHENTICATED', 401);

  // 2) Đọc + validate amount.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_JSON', 400);
  }
  const amount = Math.floor(Number(body?.amount));
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return fail('INVALID_AMOUNT', 400);
  }

  // 3) orderCode duy nhất (số nguyên an toàn < 2^53). Unique constraint DB bắt trùng.
  const orderCode = Date.now() * 1000 + Math.floor(Math.random() * 1000);

  const { error: insErr } = await admin.from('payment_orders').insert({
    order_code: orderCode,
    user_id: caller.id,
    amount,
    status: 'PENDING',
    provider: 'PAYOS',
  });
  if (insErr) return fail('ORDER_CREATE_FAILED', 500, insErr.message);

  // 4) Ký + gọi PayOS Create Payment Link.
  const signature = await signCreatePayment(checksumKey, {
    amount,
    cancelUrl,
    description,
    orderCode,
    returnUrl,
  });

  let payos: any;
  try {
    const res = await fetch(`${PAYOS_BASE}/v2/payment-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        orderCode,
        amount,
        description,
        returnUrl,
        cancelUrl,
        signature,
      }),
    });
    payos = await res.json();
  } catch (e) {
    await admin.from('payment_orders').update({ status: 'FAILED', updated_at: new Date().toISOString() })
      .eq('order_code', orderCode);
    return fail('PAYOS_UNREACHABLE', 502, e instanceof Error ? e.message : String(e));
  }

  if (payos?.code !== '00' || !payos?.data?.checkoutUrl) {
    await admin.from('payment_orders').update({ status: 'FAILED', updated_at: new Date().toISOString() })
      .eq('order_code', orderCode);
    return fail('PAYOS_REJECTED', 502, payos?.desc ?? 'PayOS trả lỗi tạo link.');
  }

  const d = payos.data;
  await admin.from('payment_orders').update({
    checkout_url: d.checkoutUrl,
    qr_code: d.qrCode ?? null,
    provider_ref: d.paymentLinkId ?? null,
    updated_at: new Date().toISOString(),
  }).eq('order_code', orderCode);

  return json({
    ok: true,
    orderCode,
    amount,
    checkoutUrl: d.checkoutUrl,
    qrCode: d.qrCode ?? null,
  });
});
