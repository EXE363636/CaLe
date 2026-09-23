// deno-lint-ignore-file no-explicit-any
/**
 * Edge Function `payos-webhook` — nhận xác nhận thanh toán THẬT từ PayOS.
 *
 * PayOS (server, KHÔNG có JWT người dùng) gọi endpoint này khi có biến động
 * thanh toán. Xác thực bằng CHỮ KÝ (HMAC-SHA256 checksum key), không phải JWT.
 * Nếu hợp lệ + đã trả -> gọi RPC credit_wallet_from_payment (idempotent) cộng
 * ví thật cho người nạp.
 *
 * Trả 200 cho cả webhook test lúc đăng ký URL (order không tồn tại) để PayOS
 * chấp nhận endpoint. Chỉ verify chữ ký rồi mới tin `data`.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';
import { CORS, fail, json, verifyWebhookSignature } from '../_shared/payos.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const checksumKey = Deno.env.get('PAYOS_CHECKSUM_KEY');
  if (!url || !serviceKey || !checksumKey) return fail('SERVER_MISCONFIGURED', 500);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return fail('INVALID_JSON', 400);
  }

  const data = payload?.data;
  const signature = String(payload?.signature ?? '');

  // Webhook đăng ký/test đôi khi không kèm data hợp lệ -> chấp nhận 200 để PayOS
  // xác nhận endpoint sống.
  if (!data || typeof data !== 'object') {
    return json({ ok: true, note: 'no-data (ack)' });
  }

  // 1) Verify chữ ký TRƯỚC khi tin bất cứ field nào trong data.
  const valid = await verifyWebhookSignature(checksumKey, data, signature);
  if (!valid) return fail('INVALID_SIGNATURE', 401);

  // 2) Chỉ xử lý khi PayOS báo thành công (code '00').
  const okCode = String(data.code ?? payload.code ?? '') === '00';
  const orderCode = Number(data.orderCode);
  if (!Number.isFinite(orderCode)) return json({ ok: true, note: 'no-orderCode (ack)' });

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!okCode) {
    // Giao dịch không thành công -> đánh dấu FAILED (không cộng ví). Idempotent-ish.
    await admin.from('payment_orders')
      .update({ status: 'FAILED', updated_at: new Date().toISOString() })
      .eq('order_code', orderCode).eq('status', 'PENDING');
    return json({ ok: true, note: 'not-paid (ack)' });
  }

  // 3) Cộng ví thật qua RPC idempotent. Order không tồn tại (webhook test) -> ack 200.
  const { data: rpcData, error } = await admin.rpc('credit_wallet_from_payment', {
    p_order_code: orderCode,
  });
  if (error) {
    if (error.message.includes('ORDER_NOT_FOUND')) return json({ ok: true, note: 'unknown-order (ack)' });
    return fail('CREDIT_FAILED', 500, error.message);
  }

  return json({ ok: true, result: rpcData });
});
