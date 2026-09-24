// deno-lint-ignore-file no-explicit-any
/**
 * Edge Function `withdraw` — RÚT tiền THẬT từ ví về tài khoản ngân hàng qua
 * PayOS Kênh chi. Worker và employer đều dùng được.
 *
 * Trình duyệt gọi `functions.invoke('withdraw', { body })` (kèm JWT):
 *   { action: 'create', amount, toBin, toAccountNumber, toAccountName }
 *       -> begin_withdrawal (trừ ví + tạo payout_orders PENDING, service_role)
 *       -> POST PayOS /v1/payouts (referenceId = id lệnh, x-idempotency-key)
 *       -> settle_withdrawal: PROCESSING / SUCCEEDED, hoặc FAILED (hoàn ví).
 *   { action: 'status', id }
 *       -> hỏi PayOS trạng thái lệnh chưa xong -> settle_withdrawal.
 *
 * An toàn tiền:
 *   - Trừ ví TRƯỚC khi gọi PayOS (khoá dòng ví trong RPC) -> không rút vượt số dư.
 *   - PayOS TỪ CHỐI rõ ràng -> FAILED + hoàn ví. Lỗi mạng / không rõ kết quả ->
 *     KHÔNG hoàn (có thể tiền đã đi), để PROCESSING và tra lại bằng 'status'.
 *   - Hoàn ví tối đa một lần (settle_withdrawal bỏ qua lệnh đã ở trạng thái cuối).
 *   - PAYOS_MOCK=true: không gọi PayOS, lệnh thành công ngay (không có tiền thật đi).
 * Secret Kênh chi (PAYOS_PAYOUT_*) chỉ ở env server, KHÁC bộ key Kênh thu.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';
import { CORS, fail, json, PAYOS_BASE, signPayout } from '../_shared/payos.ts';

const MIN_AMOUNT = 2000;
const MAX_AMOUNT = 50_000_000;
/** Lệnh không có mã PayOS và PayOS không tìm thấy sau ngần này -> coi như chưa gửi được. */
const LOST_ORDER_MS = 15 * 60 * 1000;

type Settle = 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

/** Chuẩn hoá trạng thái PayOS. Chỉ các trạng thái THẤT BẠI rõ ràng mới hoàn ví. */
function mapState(raw: unknown): Settle {
  const u = String(raw ?? '').toUpperCase();
  if (u === 'SUCCEEDED' || u === 'SUCCESS' || u === 'COMPLETED') return 'SUCCEEDED';
  if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCELED', 'REVERSED', 'REJECTED', 'ERROR'].includes(u)) {
    return 'FAILED';
  }
  return 'PROCESSING';
}

/** Trạng thái tổng của một payout: giao dịch lỗi -> FAILED; duyệt xong + mọi giao dịch xong -> SUCCEEDED. */
function payoutState(p: any): Settle {
  const txs: any[] = p?.transactions ? Object.values(p.transactions) : [];
  const txStates = txs.map((t) => mapState(t?.state));
  if (txStates.includes('FAILED') || mapState(p?.approvalState) === 'FAILED') return 'FAILED';
  if (mapState(p?.approvalState) === 'SUCCEEDED' && txStates.every((s) => s === 'SUCCEEDED')) {
    return 'SUCCEEDED';
  }
  return 'PROCESSING';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const clientId = Deno.env.get('PAYOS_PAYOUT_CLIENT_ID');
  const apiKey = Deno.env.get('PAYOS_PAYOUT_API_KEY');
  const checksumKey = Deno.env.get('PAYOS_PAYOUT_CHECKSUM_KEY');
  // Nội dung chi: chỉ chữ + số, KHÔNG dấu cách/dấu — tránh lệch chữ ký do cách mã hoá URL.
  const description = (Deno.env.get('PAYOS_PAYOUT_DESCRIPTION') ?? 'CALE').replace(/[^0-9A-Za-z]/g, '') || 'CALE';
  const mock = Deno.env.get('PAYOS_MOCK') === 'true';
  if (!url || !serviceKey) return fail('SERVER_MISCONFIGURED', 500);
  if (!mock && (!clientId || !apiKey || !checksumKey)) {
    return fail('PAYOUT_NOT_CONFIGURED', 500, 'Thiếu PAYOS_PAYOUT_* trong secrets Edge Function.');
  }
  const payosHeaders = { 'x-client-id': clientId ?? '', 'x-api-key': apiKey ?? '' };

  // Kênh chi PayOS chỉ nhận IP đã khai (whitelist), mà Edge Function không có IP
  // cố định → gửi lệnh chi qua proxy IP tĩnh (vd Fixie) nếu có PAYOS_PAYOUT_PROXY_URL
  // dạng http://user:pass@host:port. HTTPS tới PayOS vẫn mã hoá đầu cuối (CONNECT
  // tunnel) — proxy không đọc được key/nội dung. Không cấu hình → gọi thẳng.
  const proxyUrl = Deno.env.get('PAYOS_PAYOUT_PROXY_URL');
  let proxyClient: any = null;
  if (proxyUrl) {
    try {
      const p = new URL(proxyUrl);
      const basicAuth = p.username
        ? { username: decodeURIComponent(p.username), password: decodeURIComponent(p.password) }
        : undefined;
      proxyClient = (Deno as any).createHttpClient({
        proxy: { url: `${p.protocol}//${p.host}`, ...(basicAuth ? { basicAuth } : {}) },
      });
    } catch {
      return fail('PROXY_MISCONFIGURED', 500, 'PAYOS_PAYOUT_PROXY_URL không hợp lệ.');
    }
  }
  const payosFetch = (input: string, init: RequestInit = {}) =>
    fetch(input, proxyClient ? ({ ...init, client: proxyClient } as any) : init);

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

  async function settle(id: string, state: Settle, providerRef: string | null, reason: string | null) {
    const { data, error } = await admin.rpc('settle_withdrawal', {
      p_id: id, p_state: state, p_provider_ref: providerRef, p_reason: reason,
    });
    if (error) throw new Error(error.message);
    return data as { status: string };
  }

  try {
    const action = String(body?.action ?? 'create');

    // ---------------------------------------------------------------- status
    if (action === 'status') {
      const id = String(body?.id ?? '');
      const { data: order, error } = await admin
        .from('payout_orders')
        .select('id, user_id, status, provider_ref, created_at')
        .eq('id', id)
        .eq('kind', 'USER_WITHDRAWAL')
        .maybeSingle();
      if (error) return fail('SERVER_ERROR', 500, error.message);
      if (!order || order.user_id !== caller.id) return fail('ORDER_NOT_FOUND', 404);
      if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(order.status)) {
        return json({ ok: true, id, status: order.status });
      }
      if (mock) {
        const r = await settle(id, 'SUCCEEDED', 'mock', null);
        return json({ ok: true, id, status: r.status });
      }

      let payout: any = null;
      if (order.provider_ref) {
        const res = await payosFetch(`${PAYOS_BASE}/v1/payouts/${encodeURIComponent(order.provider_ref)}`, {
          headers: payosHeaders,
        });
        const j = await res.json().catch(() => null);
        if (j?.code === '00') payout = j.data;
      } else {
        const res = await payosFetch(`${PAYOS_BASE}/v1/payouts?referenceId=${encodeURIComponent(id)}`, {
          headers: payosHeaders,
        });
        const j = await res.json().catch(() => null);
        const list: any[] = j?.data?.payouts ?? j?.data?.items ?? (Array.isArray(j?.data) ? j.data : []);
        payout = list.find((p) => p?.referenceId === id) ?? null;
        if (!payout && j?.code === '00' && Date.now() - new Date(order.created_at).getTime() > LOST_ORDER_MS) {
          // PayOS xác nhận không có lệnh này -> chưa từng gửi được -> hoàn ví.
          const r = await settle(id, 'FAILED', null, 'PayOS không nhận được lệnh chi');
          return json({ ok: true, id, status: r.status });
        }
      }
      if (!payout) return json({ ok: true, id, status: order.status });
      const r = await settle(id, payoutState(payout), payout.id ?? null, 'PayOS báo chi thất bại');
      return json({ ok: true, id, status: r.status });
    }

    // ---------------------------------------------------------------- create
    if (action !== 'create') return fail('UNKNOWN_ACTION', 400);
    const amount = Math.floor(Number(body?.amount));
    const toBin = String(body?.toBin ?? '').trim();
    const toAccountNumber = String(body?.toAccountNumber ?? '').replace(/\s+/g, '');
    const toAccountName = String(body?.toAccountName ?? '').trim().slice(0, 100);
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return fail('INVALID_AMOUNT', 400);
    }
    if (!/^\d{6}$/.test(toBin)) return fail('INVALID_BANK', 400);
    if (!/^[0-9A-Za-z]{4,30}$/.test(toAccountNumber)) return fail('INVALID_ACCOUNT', 400);

    const idem = typeof body?.idempotencyKey === 'string' && body.idempotencyKey.length >= 8
      ? body.idempotencyKey
      : crypto.randomUUID();

    const { data: begun, error: bErr } = await admin.rpc('begin_withdrawal', {
      p_user: caller.id,
      p_amount: amount,
      p_bin: toBin,
      p_account: toAccountNumber,
      p_name: toAccountName,
      p_idem: idem,
    });
    if (bErr) {
      const code = ['INSUFFICIENT_BALANCE', 'INVALID_BANK', 'INVALID_ACCOUNT', 'INVALID_AMOUNT']
        .find((c) => bErr.message.includes(c)) ?? 'WITHDRAW_FAILED';
      return fail(code, 400, bErr.message);
    }
    const order = begun as { id: string; status: string; replayed?: boolean };
    if (order.replayed) return json({ ok: true, id: order.id, status: order.status });

    if (mock) {
      const r = await settle(order.id, 'SUCCEEDED', 'mock', null);
      return json({ ok: true, mock: true, id: order.id, status: r.status });
    }

    const payoutBody = {
      referenceId: order.id,
      amount,
      description,
      toBin,
      toAccountNumber,
    };
    const signature = await signPayout(checksumKey!, payoutBody);

    let j: any;
    try {
      const res = await payosFetch(`${PAYOS_BASE}/v1/payouts`, {
        method: 'POST',
        headers: {
          ...payosHeaders,
          'Content-Type': 'application/json',
          'x-idempotency-key': idem,
          'x-signature': signature,
        },
        body: JSON.stringify(payoutBody),
      });
      j = await res.json();
    } catch {
      // Không rõ PayOS đã nhận chưa -> KHÔNG hoàn ví; tra lại bằng action 'status'.
      const r = await settle(order.id, 'PROCESSING', null, null);
      return json({ ok: true, id: order.id, status: r.status, uncertain: true });
    }

    if (j?.code !== '00' || !j?.data) {
      // PayOS từ chối rõ ràng -> lệnh không được tạo -> hoàn ví.
      const r = await settle(order.id, 'FAILED', null, String(j?.desc ?? 'PayOS từ chối lệnh chi'));
      return json({ ok: false, error: 'PAYOUT_REJECTED', message: j?.desc, id: order.id, status: r.status }, 400);
    }

    const r = await settle(order.id, payoutState(j.data), j.data.id ?? null, 'PayOS báo chi thất bại');
    return json({ ok: true, id: order.id, status: r.status });
  } catch (e) {
    return fail('SERVER_ERROR', 500, e instanceof Error ? e.message : String(e));
  }
});
