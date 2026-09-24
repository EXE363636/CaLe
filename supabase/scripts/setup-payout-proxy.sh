#!/usr/bin/env bash
# =============================================================================
# Cài PROXY CHUYỂN LỆNH CHI PayOS trên VPS Ubuntu (IP cố định).
#
# Vì sao: Kênh chi PayOS chỉ nhận lệnh từ IP đã khai (whitelist), còn Supabase
# Edge Function không có IP cố định. Edge Function `withdraw` gửi lệnh chi qua
# proxy này (secret PAYOS_PAYOUT_PROXY_URL) → PayOS thấy IP của VPS.
#
# An toàn:
#   - Có mật khẩu (BasicAuth, sinh ngẫu nhiên).
#   - CHỈ cho đi tới api-merchant.payos.vn:443 — mọi đích khác bị chặn, nên
#     không thể bị lợi dụng làm proxy mở.
#   - HTTPS tới PayOS mã hoá đầu cuối (CONNECT tunnel): VPS không đọc được key
#     kênh chi hay nội dung lệnh chi.
#
# Chạy (quyền root) trên VPS Ubuntu 22.04 / 24.04:
#   sudo bash setup-payout-proxy.sh
# Chạy lại sẽ tạo MẬT KHẨU MỚI → nhớ cập nhật lại secret trên Supabase.
# =============================================================================
set -euo pipefail

PORT="${PORT:-8888}"
PROXY_USER="cale"
PROXY_PASS="$(openssl rand -hex 16)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Hãy chạy bằng quyền root: sudo bash $0" >&2
  exit 1
fi

echo "==> Cài tinyproxy..."
apt-get update -y >/dev/null
DEBIAN_FRONTEND=noninteractive apt-get install -y tinyproxy curl >/dev/null

echo "==> Chỉ cho phép đi tới PayOS..."
cat > /etc/tinyproxy/filter <<'EOF'
^api-merchant\.payos\.vn$
EOF

cat > /etc/tinyproxy/tinyproxy.conf <<EOF
User tinyproxy
Group tinyproxy
Port ${PORT}
Timeout 120
DefaultErrorFile "/usr/share/tinyproxy/default.html"
StatFile "/usr/share/tinyproxy/stats.html"
Syslog On
LogLevel Warning
MaxClients 50
BasicAuth ${PROXY_USER} ${PROXY_PASS}
Filter "/etc/tinyproxy/filter"
FilterDefaultDeny Yes
ConnectPort 443
DisableViaHeader Yes
EOF

echo "==> Mở cổng ${PORT} (nếu có ufw)..."
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow "${PORT}/tcp" >/dev/null
fi

systemctl enable tinyproxy >/dev/null 2>&1 || true
systemctl restart tinyproxy
sleep 1

PUBLIC_IP="$(curl -4 -fsS https://api.ipify.org || echo 'KHONG_LAY_DUOC_IP')"
LOCAL_PROXY="http://${PROXY_USER}:${PROXY_PASS}@127.0.0.1:${PORT}"

echo "==> Kiểm tra..."
PAYOS_CODE="$(curl -s -o /dev/null -w '%{http_code}' -x "${LOCAL_PROXY}" https://api-merchant.payos.vn/ || true)"
OTHER_CODE="$(curl -s -o /dev/null -w '%{http_code}' -x "${LOCAL_PROXY}" https://example.com/ || true)"

echo
echo "============================================================"
if [ "${PAYOS_CODE}" != "000" ] && [ "${OTHER_CODE}" = "000" ]; then
  echo " ✅ PROXY CHẠY ĐÚNG (tới PayOS: được | tới nơi khác: bị chặn)"
else
  echo " ⚠️  Kiểm tra chưa như mong đợi: PayOS=${PAYOS_CODE}, nơi khác=${OTHER_CODE}"
  echo "    (PayOS phải KHÁC 000, nơi khác phải BẰNG 000)"
fi
echo "============================================================"
echo
echo " 1) IP của VPS (khai vào Kênh chi PayOS):"
echo "      ${PUBLIC_IP}"
echo
echo " 2) Chạy lệnh này TRÊN MÁY TÍNH CỦA BẠN (thư mục D:\\CaLe) — CHUỖI NÀY LÀ BÍ MẬT,"
echo "    KHÔNG gửi vào chat / không chụp màn hình:"
echo
echo "      npx supabase secrets set PAYOS_PAYOUT_PROXY_URL=\"http://${PROXY_USER}:${PROXY_PASS}@${PUBLIC_IP}:${PORT}\""
echo
echo " 3) Nếu nhà cung cấp VPS có tường lửa riêng trên trang quản lý,"
echo "    mở cổng TCP ${PORT} (chiều vào)."
echo "============================================================"
