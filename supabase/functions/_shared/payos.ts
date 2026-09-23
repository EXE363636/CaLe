// Helper dùng chung cho tích hợp PayOS (tiền THẬT). Chạy trên Deno (Edge Function).
//
// Bảo mật: Checksum Key / API Key CHỈ đọc từ env phía server, KHÔNG bao giờ trả
// về client. Chữ ký PayOS = HMAC-SHA256 trên chuỗi "key=value&..." sắp xếp
// alphabet theo tên field, ký bằng Checksum Key của kênh.

/** HMAC-SHA256 -> hex (lowercase). Dùng Web Crypto có sẵn trong Deno. */
export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Chuỗi ký từ một object: sắp xếp field theo alphabet, nối "k=v&k2=v2".
 * null/undefined -> "" (theo quy ước PayOS). Dùng cho verify webhook `data`.
 */
export function buildSignaturePayload(obj: Record<string, unknown>): string {
  return Object.keys(obj)
    .sort()
    .map((k) => {
      const v = obj[k];
      const val = v === null || v === undefined ? '' : String(v);
      return `${k}=${val}`;
    })
    .join('&');
}

/**
 * Chữ ký cho Create Payment Link: PayOS quy định ĐÚNG thứ tự 5 field
 * amount, cancelUrl, description, orderCode, returnUrl (alphabet).
 */
export async function signCreatePayment(
  checksumKey: string,
  input: { amount: number; cancelUrl: string; description: string; orderCode: number; returnUrl: string },
): Promise<string> {
  const data =
    `amount=${input.amount}` +
    `&cancelUrl=${input.cancelUrl}` +
    `&description=${input.description}` +
    `&orderCode=${input.orderCode}` +
    `&returnUrl=${input.returnUrl}`;
  return hmacSha256Hex(checksumKey, data);
}

/** Verify chữ ký webhook: HMAC-SHA256 trên `data` sắp xếp alphabet == signature. */
export async function verifyWebhookSignature(
  checksumKey: string,
  data: Record<string, unknown>,
  signature: string,
): Promise<boolean> {
  if (!signature) return false;
  const expected = await hmacSha256Hex(checksumKey, buildSignaturePayload(data));
  // So khớp không phân biệt hoa/thường, độ dài bằng nhau.
  return expected.length === signature.length && expected.toLowerCase() === signature.toLowerCase();
}

export const PAYOS_BASE = 'https://api-merchant.payos.vn';

export const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
export function fail(error: string, status: number, message?: string): Response {
  return json({ ok: false, error, message }, status);
}
