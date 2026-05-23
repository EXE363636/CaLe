import { InfoPage, InfoSection } from '@/components/layout/InfoPage';

/**
 * Public user guide — Phase 9Y.
 *
 * Server component. Renders a substantial walk-through for both
 * audiences — workers (`/shifts`, `/worker/*`) and employers
 * (`/employer/*`) — using the existing `<InfoPage>` shell. The
 * step content matches the actual product flows (verification gate,
 * deposit ratios, cancellation windows, reputation arithmetic, etc.)
 * so it's not generic AI filler.
 *
 * No `'use client'` — the FAQ accordion uses native `<details>` /
 * `<summary>` so JS isn't needed.
 */

interface Step {
  title: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Worker timeline (9 steps, in order)
// ---------------------------------------------------------------------------

const WORKER_STEPS: Step[] = [
  {
    title: 'Đăng ký tài khoản người làm.',
    body:
      'Tại /register, chọn "Tôi muốn tìm ca làm", nhập họ tên, email, số điện thoại, mật khẩu (≥ 8 ký tự). Sau khi đăng ký xong, hệ thống đăng nhập tự động.',
  },
  {
    title: 'Hoàn thiện hồ sơ.',
    body:
      'Tại /worker/profile, thêm giới thiệu ngắn, kỹ năng, loại công việc ưa thích, khu vực ưa thích. Hồ sơ đầy đủ giúp nhà tuyển dụng tin tưởng và duyệt nhanh hơn.',
  },
  {
    title: 'Xác minh thông tin.',
    body:
      'Bật xác minh số điện thoại, CMND/CCCD, thẻ sinh viên (nếu có). Trong bản MVP các xác minh được giả lập (mock); người làm phải có ít nhất xác minh số điện thoại trước khi ứng tuyển.',
  },
  {
    title: 'Tìm ca làm.',
    body:
      'Vào /shifts để xem các ca đang tuyển. Hệ thống chỉ hiển thị ca đã được nhà tuyển dụng đặt cọc (Đang tuyển + còn vị trí trống + chưa quá giờ bắt đầu). Lọc theo khu vực, ngày, lương, loại công việc.',
  },
  {
    title: 'Ứng tuyển ca phù hợp.',
    body:
      'Bấm vào ca để xem chi tiết, sau đó bấm "Ứng tuyển". Hệ thống chặn ứng tuyển khi: chưa xác minh số điện thoại, điểm uy tín dưới 50, ca trùng giờ với ca đã được duyệt hoặc với lịch cá nhân, ca đã đủ người, hoặc bạn đã ứng tuyển trước đó.',
  },
  {
    title: 'Chờ nhà tuyển dụng duyệt.',
    body:
      'Đơn vào trạng thái Chờ duyệt. Khi được duyệt, đơn chuyển sang Đã duyệt và bạn sẽ nhận thông báo. Nhà tuyển dụng có thể từ chối kèm lý do — bạn xem lý do tại "Đơn bị từ chối gần đây" trên Tổng quan người lao động.',
  },
  {
    title: 'Đi làm — check-in / check-out.',
    body:
      'Đến giờ ca, vào /worker/dashboard và bấm "Check-in". Sau khi xong ca bấm "Check-out". Hệ thống chuyển trạng thái thành Đã check-out và chờ nhà tuyển dụng xác nhận.',
  },
  {
    title: 'Nhận thanh toán.',
    body:
      'Khi nhà tuyển dụng bấm "Xác nhận hoàn thành ca", đơn chuyển sang Đã xác nhận và tiền công được giải ngân (giả lập trong MVP). Ô "Tổng thu nhập" trên Tổng quan tăng tương ứng.',
  },
  {
    title: 'Theo dõi điểm uy tín.',
    body:
      'Mỗi ca hoàn thành cộng +5 điểm. Vắng mặt không báo trước trừ 20 điểm. Huỷ ca trong vòng 24 giờ trước giờ bắt đầu trừ 10 điểm. Điểm dưới 50 sẽ bị hạn chế ứng tuyển. Bấm ô "Điểm uy tín" trên Tổng quan để xem dòng thời gian chi tiết.',
  },
];

// ---------------------------------------------------------------------------
// Employer timeline (9 steps, in order)
// ---------------------------------------------------------------------------

const EMPLOYER_STEPS: Step[] = [
  {
    title: 'Đăng ký tài khoản nhà tuyển dụng.',
    body:
      'Tại /register, chọn "Tôi cần tuyển người làm". Chọn loại tài khoản: Cá nhân/Freelance hoặc Doanh nghiệp. Doanh nghiệp đã xác minh sẽ được hưởng tỷ lệ đặt cọc thấp hơn.',
  },
  {
    title: 'Hoàn thiện hồ sơ doanh nghiệp.',
    body:
      'Tại /employer/profile thêm mô tả, loại hình kinh doanh, logo (nếu có). Trong MVP, xác minh doanh nghiệp được giả lập.',
  },
  {
    title: 'Đăng ca tuyển.',
    body:
      'Vào /employer/shifts/new. Điền tên ca, mô tả, yêu cầu, loại công việc, khu vực, ngày, giờ bắt đầu/kết thúc, lương theo giờ (₫), số lượng vị trí cần.',
  },
  {
    title: 'Đặt cọc tiền công.',
    body:
      'Hệ thống tự tính số tiền đặt cọc dựa trên cấp độ tin cậy: Thấp 100%, Trung bình 70%, Cao 50% tổng tiền lương. Bấm "Xác nhận đã thanh toán" để mô phỏng đặt cọc — ca chuyển từ Bản nháp sang Đang tuyển.',
  },
  {
    title: 'Nhận đơn ứng tuyển.',
    body:
      'Đơn ứng tuyển hiện trên /employer/shifts/[id] và ô "Đơn chờ duyệt" trên Tổng quan nhà tuyển dụng. Bấm "Xem hồ sơ" để xem chi tiết người ứng tuyển kèm điểm uy tín, lịch sử và xác minh.',
  },
  {
    title: 'Duyệt người làm.',
    body:
      'Bấm "Duyệt" để chấp nhận đơn, hoặc "Từ chối" và nhập lý do (bắt buộc). Người làm sẽ nhận thông báo kèm lý do từ chối.',
  },
  {
    title: 'Theo dõi ca làm.',
    body:
      'Khi đến giờ, ca tự chuyển sang Đang diễn ra. Sau giờ kết thúc nếu có người check-out, ca chuyển sang Chờ xác nhận.',
  },
  {
    title: 'Xác nhận hoàn thành.',
    body:
      'Bấm "Xác nhận hoàn thành" trên từng người làm. Tiền công được giải ngân (mô phỏng) và ca chuyển sang Đã hoàn thành. Nếu người làm vắng mặt, bấm "Vắng mặt" — bạn được tặng 1 lượt boost cho ca tiếp theo.',
  },
  {
    title: 'Đánh giá sau ca.',
    body:
      'Sau khi ca hoàn thành, đánh giá người làm với 1–5 sao và nhận xét ngắn. Đánh giá hai chiều — người làm cũng có thể đánh giá doanh nghiệp.',
  },
];

// ---------------------------------------------------------------------------
// Inline helpers (server components, scoped to this file)
// ---------------------------------------------------------------------------

function StepNumber({ n }: { n: number }) {
  // Mirrors the homepage `<StepNumber />` from `src/app/page.tsx` so
  // both surfaces feel like one product.
  return (
    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-md ring-4 ring-orange-50">
      {n}
    </span>
  );
}

function StepCard({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="relative flex items-start gap-3">
      <StepNumber n={n} />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">{body}</p>
      </div>
    </li>
  );
}

function RoleColumn({
  title,
  eyebrow,
  steps,
}: {
  title: string;
  eyebrow: string;
  steps: Step[];
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-bold text-gray-900">{title}</h2>
      <ol className="mt-5 flex flex-col gap-5">
        {steps.map((step, idx) => (
          <StepCard
            key={step.title}
            n={idx + 1}
            title={step.title}
            body={step.body}
          />
        ))}
      </ol>
    </div>
  );
}

function FaqEntry({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-gray-900">
        <span>{question}</span>
        <span
          aria-hidden="true"
          className="text-xs text-gray-500 transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">{answer}</p>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserGuidePage() {
  return (
    <InfoPage
      eyebrow="Hướng dẫn sử dụng"
      title="Cách dùng CaLẻ / ShiftNow"
      intro="Hướng dẫn từng bước cho người lao động và nhà tuyển dụng. Mỗi bước gắn liền với thao tác thật trên ứng dụng — không phải mô tả chung chung."
      ctas={[
        { label: 'Tìm ca làm ngay', href: '/shifts' },
        {
          label: 'Đăng ca tuyển',
          href: '/register?role=employer',
          variant: 'secondary',
        },
      ]}
    >
      {/* Hero summary — what is CaLê / ShiftNow */}
      <section>
        <p>
          CaLẻ / ShiftNow là nền tảng kết nối ca làm ngắn hạn tại Việt Nam.
          Người lao động linh hoạt (sinh viên, freelance, người làm thêm) tìm
          thấy ca làm phù hợp với lịch của mình; nhà tuyển dụng đặt cọc tiền
          công trước khi đăng ca, đảm bảo người làm yên tâm về thanh toán.
        </p>
        <p className="mt-3">
          Toàn bộ giao dịch trong bản dùng thử (MVP) đều được giả lập trong
          trình duyệt — không có thanh toán thật, không có xác minh thật.
          Trang hướng dẫn này mô tả luồng đầy đủ để bạn hình dung sản phẩm
          khi triển khai chính thức.
        </p>
      </section>

      {/* Two-column timeline */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <RoleColumn
          title="Dành cho người lao động"
          eyebrow="Worker"
          steps={WORKER_STEPS}
        />
        <RoleColumn
          title="Dành cho nhà tuyển dụng"
          eyebrow="Employer"
          steps={EMPLOYER_STEPS}
        />
      </div>

      {/* FAQ accordion */}
      <InfoSection title="Câu hỏi thường gặp">
        <div className="mt-2 flex flex-col gap-3">
          <FaqEntry
            question="Tôi cần đặt cọc khi ứng tuyển không?"
            answer="Không. Người lao động không bao giờ phải đặt cọc bất kỳ khoản nào. Chỉ nhà tuyển dụng đặt cọc tiền công trước khi đăng ca công khai."
          />
          <FaqEntry
            question="Tôi có thể huỷ ca đã được duyệt không?"
            answer="Có, nhưng có quy định: huỷ trên 3 giờ trước giờ bắt đầu là huỷ ngay; huỷ trong vòng 3 giờ phải được nhà tuyển dụng đồng ý; huỷ trong vòng 24 giờ làm giảm 10 điểm uy tín. Tổng số lượt huỷ trong tuần và tháng cũng có hạn mức."
          />
          <FaqEntry
            question="Tỷ lệ đặt cọc của nhà tuyển dụng được tính như thế nào?"
            answer="Cấp độ tin cậy thấp 100%, trung bình 70% (đã xác minh hoặc ≥ 3 ca hoàn thành), cao 50% (đã xác minh và ≥ 5 ca hoàn thành). Tiền cọc giữ trong hệ thống, chỉ giải ngân khi ca hoàn thành."
          />
          <FaqEntry
            question="Phiên bản này có giao dịch tiền thật không?"
            answer="Không. Đây là bản dùng thử (MVP). Toàn bộ thanh toán, xác minh, đăng nhập đều giả lập trong trình duyệt (localStorage). Khi triển khai thật, các luồng này sẽ được thay bằng dịch vụ tương ứng."
          />
          <FaqEntry
            question="Tôi cần làm gì khi có tranh chấp?"
            answer="Bấm “Báo cáo vấn đề” trên trang quản lý ca. Quản trị viên sẽ vào xem xét và quyết định giải ngân hoặc hoàn tiền theo Chính sách xử lý tranh chấp tại /disputes."
          />
        </div>
      </InfoSection>
    </InfoPage>
  );
}
