// deno-lint-ignore-file no-explicit-any
/**
 * Edge Function `create-payment` — tạo link/QR NẠP tiền THẬT qua PayOS (Kênh thu),
 * KÈM MOCK MODE để chạy full luồng nạp KHÔNG cần PayOS account / STK.
 *
 * Hai action (phân biệt bằng body.action):
 *   (mặc định) tạo đơn nạp:
 *     Trình duyệt gọi `functions.invoke('create-payment', { body: { amount } })`.
 *       1. Xác thực JWT -> user thật (server-verified).
 *       2. Sinh orderCode duy nhất, ghi payment_orders (PENDING) bằng service_role.
 *       3a. PAYOS_MOCK=true  -> trả QR GIẢ (không gọi PayOS), đánh dấu mock=true.
 *       3b. mặc định (thật)  -> ký request + gọi PayOS Create Payment Link.
 *       4. Trả { orderCode, checkoutUrl, qrCode, mock } cho client hiển thị QR.
 *   action='mock-confirm' (CHỈ khi PAYOS_MOCK=true):
 *     Thay cho webhook thật — người dùng bấm "đã chuyển khoản (mô phỏng)" →
 *     verify JWT + chủ đơn → gọi RPC credit_wallet_from_payment (idempotent) →
 *     cộng ví ngay. Ngoài mock mode, action này bị từ chối.
 *
 * Tiền THẬT chỉ được cộng ví khi webhook PayOS xác nhận (payos-webhook). Mock mode
 * cộng ví qua cùng RPC credit_wallet_from_payment — đi đúng đường tiền thật sẽ đi.
 * Secret PayOS chỉ đọc từ env, không rò ra client.
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
  if (!url || !serviceKey) return fail('SERVER_MISCONFIGURED', 500);

  // MOCK MODE: chạy full luồng nạp mà không cần PayOS account / STK.
  const mock = Deno.env.get('PAYOS_MOCK') === 'true';

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Xác thực người gọi (mọi action đều cần JWT).
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return fail('UNAUTHENTICATED', 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const caller = userData?.user;
  if (userErr || !caller) return fail('UNAUTHENTICATED', 401);

  // 2) Đọc body.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_JSON', 400);
  }

  // ---------------------------------------------------------------------------
  // Action: mock-confirm (CHỈ mock) — cộng ví ngay thay cho webhook thật.
  // ---------------------------------------------------------------------------
  if (body?.action === 'mock-confirm') {
    if (!mock) return fail('MOCK_DISABLED', 403, 'mock-confirm chỉ dùng khi PAYOS_MOCK=true.');
    const orderCode = Math.floor(Number(body?.orderCode));
    if (!Number.isFinite(orderCode)) return fail('INVALID_ORDER_CODE', 400);

    // Guard chủ đơn: chỉ chủ đơn PENDING mới xác nhận được (chống confirm đơn người khác).
    const { data: order, error: selErr } = await admin
      .from('payment_orders')
      .select('user_id, status')
      .eq('order_code', orderCode)
      .maybeSingle();
    if (selErr) return fail('ORDER_LOOKUP_FAILED', 500, selErr.message);
    if (!order) return fail('ORDER_NOT_FOUND', 404);
    if (order.user_id !== caller.id) return fail('NOT_OWNER', 403);

    // Cộng ví qua RPC idempotent (đơn đã PAID -> no-op, trả ALREADY_PAID).
    const { data: rpcData, error: rpcErr } = await admin.rpc('credit_wallet_from_payment', {
      p_order_code: orderCode,
    });
    if (rpcErr) return fail('CREDIT_FAILED', 500, rpcErr.message);
    return json({ ok: true, mock: true, result: rpcData });
  }

  // ---------------------------------------------------------------------------
  // Action mặc định: tạo đơn nạp + link/QR.
  // ---------------------------------------------------------------------------
  const amount = Math.floor(Number(body?.amount));
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return fail('INVALID_AMOUNT', 400);
  }

  // Secret PayOS chỉ cần ở chế độ THẬT. Mock mode bỏ qua để chạy không cần account.
  const clientId = Deno.env.get('PAYOS_CLIENT_ID');
  const apiKey = Deno.env.get('PAYOS_API_KEY');
  const checksumKey = Deno.env.get('PAYOS_CHECKSUM_KEY');
  const returnUrl = Deno.env.get('PAYOS_RETURN_URL') ?? '';
  const cancelUrl = Deno.env.get('PAYOS_CANCEL_URL') ?? '';
  const description = Deno.env.get('PAYOS_DESCRIPTION') ?? 'CALE nap vi';
  if (!mock && (!clientId || !apiKey || !checksumKey || !returnUrl || !cancelUrl)) {
    return fail('PAYOS_NOT_CONFIGURED', 500, 'Thiếu PAYOS_* trong secrets Edge Function.');
  }

  // orderCode duy nhất (số nguyên an toàn < 2^53). Unique constraint DB bắt trùng.
  const orderCode = Date.now() * 1000 + Math.floor(Math.random() * 1000);

  const { error: insErr } = await admin.from('payment_orders').insert({
    order_code: orderCode,
    user_id: caller.id,
    amount,
    status: 'PENDING',
    provider: 'PAYOS',
  });
  if (insErr) return fail('ORDER_CREATE_FAILED', 500, insErr.message);

  // MOCK: không gọi PayOS. Trả QR GIẢ (vô hại, đánh dấu không phải giao dịch
  // thật). Ví sẽ cộng khi client gọi action mock-confirm.
  if (mock) {
    const qrCode = JSON.stringify({
      realTransaction: false,
      provider: 'PAYOS_MOCK',
      purpose: 'wallet_topup',
      orderCode,
      amount,
    });
    const checkoutUrl = `payos-mock://order/${orderCode}`;
    await admin.from('payment_orders').update({
      checkout_url: checkoutUrl,
      qr_code: qrCode,
      updated_at: new Date().toISOString(),
    }).eq('order_code', orderCode);

    return json({ ok: true, mock: true, orderCode, amount, checkoutUrl, qrCode });
  }

  // THẬT: Ký + gọi PayOS Create Payment Link.
  const signature = await signCreatePayment(checksumKey!, {
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
        'x-client-id': clientId!,
        'x-api-key': apiKey!,
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
    mock: false,
    orderCode,
    amount,
    checkoutUrl: d.checkoutUrl,
    qrCode: d.qrCode ?? null,
  });
});
