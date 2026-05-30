# Prompt khởi động cho tài khoản Kiro mới — CaLẻ / Now

Đây là prompt sẵn-sàng-dán cho một tài khoản Kiro mới tiếp nhận dự án.
Sao chép phần trong khung dưới đây và dán vào Kiro mới.

---

```
You are continuing the CaLẻ / Now project from the current repository
state. It is a Vietnamese shift-based job marketplace (roles: Worker,
Employer, Admin), currently a frontend demo with localStorage/mock
persistence. No backend exists yet; Supabase is only planned.

FIRST, read these files before doing anything:
- docs/KIRO_HANDOFF_CURRENT_STATE.md
- docs/BACKEND_MIGRATION_PLAN.md
- docs/SUPABASE_SECURITY_NOTE.md
- docs/CURRENT_TODO.md
- qa-exploration/core-stability-10-report.md
- qa-exploration/core-stability-10-security.md
- qa-exploration/checklist-coverage-matrix.md
- README.md (if available)

THEN inspect the codebase:
- package.json (scripts + dependencies)
- src/domain (pure business logic: shiftLifecycleState, attendanceState,
  timeGates, skillProgression, availabilityMatch, scheduleConflict)
- src/stores (Zustand stores: applicationStore, shiftStore,
  shiftDraftStore, scheduleStore, walletStore, etc.)
- src/app (Next.js App Router pages)
- src/components (UI components)

RULES (must follow):
- Do NOT run stale orchestrator/spec tasks from scratch.
- Do NOT rewrite working code.
- Do NOT add new features first.
- Do NOT add chat / staff-supply before backend + core are stable.
- Do NOT expose secret/service_role Supabase keys anywhere.
- Do NOT auto-commit unless explicitly asked.
- Mock-only architecture: Next.js 16 App Router, Zustand 5 + localStorage,
  Tailwind v4 (no config file, no dark:). Currency = lowercase "đ"/"đồng"
  (never "VNĐ"/"₫"). Build invariant: exactly 28 routes.

VERIFY the current test baseline before changing anything:
- npm run test:run      (expect 544 passed)
- npm run build         (expect clean, 28 routes)
- npm run test:e2e      (expect 112 passed; needs dev server on port 3000)
- npm run test:time     (expect 22 passed)

FIRST RECOMMENDED TASK:
1. Manually verify CORE-STABILITY-10 in the browser (same shift shows the
   same lifecycle label + color across worker/employer card/detail;
   check-in/mark-present do not start the shift early; checkout only
   appears after shift end; employer sees both present/absent actions;
   badge colors consistent; role-aware copy correct).
2. Then prepare BACKEND-MIGRATION-1 with Supabase — but ASK FOR
   EXPLICIT APPROVAL before starting it. Do NOT migrate wallet/escrow
   first; follow the safe-table-first order in BACKEND_MIGRATION_PLAN.md
   (users/profiles → shifts/drafts → applications → attendance →
   notifications → wallet/escrow → disputes/reviews → schedule → skills).

Report what you found in the baseline, then wait for instructions.
```

---

## Tóm tắt nhiệm vụ đầu tiên (cho người vận hành)

1. **Xác minh CORE-STABILITY-10 thủ công** trên giao diện (chi tiết
   checklist trong `docs/CURRENT_TODO.md` phần 1).
2. **Chuẩn bị BACKEND-MIGRATION-1 với Supabase** — chỉ bắt đầu sau khi
   QA thủ công xong và được chấp thuận. Bắt đầu từ bảng an toàn
   (users/profiles), KHÔNG bắt đầu từ ví/escrow.
