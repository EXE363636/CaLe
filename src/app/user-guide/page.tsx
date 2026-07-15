import { InfoPage, InfoSection } from '@/components/layout/InfoPage';

/**
 * Cẩm nang đi ca - practical dual-audience handbook.
 *
 * Cluster 5 · Task 19.1 (Property 7, Req 2.7). This page was previously
 * an app-usage walkthrough ("Cách dùng CaLẻ / Now" - step-by-step
 * timelines + feature-anchor cards). It is now reframed as a short,
 * PRACTICAL behavioural handbook ("Cẩm nang đi ca") that coaches BOTH
 * audiences on working together well, rather than on which button to
 * press:
 *
 *   • Người lao động - tạo thiện cảm với nhà tuyển dụng, đi làm đúng
 *     giờ, chủ động báo khi lịch trùng, và huỷ ca một cách văn minh.
 *   • Nhà tuyển dụng - thu hút và giữ chân người làm tốt, viết mô tả ca
 *     rõ ràng, trả công hợp lý/tương xứng, và giảm huỷ ca / vắng mặt.
 *
 * Copy is original (written for CaLẻ / Now, not sourced from the web).
 * The `/user-guide` route stays valid (Req 3.9) and still renders on the
 * shared `<InfoPage>` shell, so the page title continues to render as an
 * `<h1>`.
 *
 * Server component - no client interactivity needed.
 */

interface Tip {
  title: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Người lao động - làm việc sao cho được tin tưởng và mời lại
// ---------------------------------------------------------------------------

const WORKER_TIPS: Tip[] = [
  {
    title: 'Làm nhà tuyển dụng hài lòng',
    body:
      'Hỏi rõ yêu cầu ngay đầu ca, làm tốt phần việc được giao và giữ thái độ tích cực đến phút cuối. Một người làm khiến nhà tuyển dụng hài lòng thường được mời lại cho các ca sau và nhận đánh giá cao - đây là cách bền vững nhất để có việc đều.',
  },
  {
    title: 'Đi làm đúng giờ, tốt nhất là sớm vài phút',
    body:
      'Cố gắng có mặt trước giờ bắt đầu 5–10 phút để nhận bàn giao và ổn định vị trí. Đúng giờ là điều đơn giản nhưng ảnh hưởng lớn nhất đến ấn tượng ban đầu, điểm uy tín và cơ hội được chọn cho ca kế tiếp.',
  },
  {
    title: 'Chủ động báo sớm khi lịch bị trùng',
    body:
      'Nếu một ca mới trùng giờ với lịch học, lịch cá nhân hoặc một ca đã nhận, hãy nhắn cho nhà tuyển dụng càng sớm càng tốt thay vì im lặng. Báo trước giúp họ kịp tìm người thay và giữ được thiện cảm cho những lần hợp tác sau.',
  },
  {
    title: 'Khi phải huỷ ca, hãy huỷ văn minh',
    body:
      'Nếu buộc phải huỷ, hãy huỷ càng sớm càng tốt và nói rõ lý do một cách lịch sự. Tránh huỷ sát giờ vì điều đó khiến nhà tuyển dụng trở tay không kịp, đồng thời làm giảm điểm uy tín và hạn mức huỷ của bạn.',
  },
];

// ---------------------------------------------------------------------------
// Nhà tuyển dụng - đăng ca sao cho tuyển được và giữ được người tốt
// ---------------------------------------------------------------------------

const EMPLOYER_TIPS: Tip[] = [
  {
    title: 'Thu hút và giữ chân người làm tốt',
    body:
      'Người làm giỏi thường quay lại nơi đối xử công bằng. Phản hồi đơn ứng tuyển nhanh, đánh giá đúng và ghi nhận nỗ lực sẽ giúp bạn thu hút ứng viên chất lượng và giữ chân họ cho các ca sau, thay vì phải tuyển lại từ đầu mỗi lần.',
  },
  {
    title: 'Viết mô tả ca rõ ràng',
    body:
      'Ghi cụ thể công việc phải làm, địa điểm, trang phục, người liên hệ và những thứ cần mang theo. Mô tả càng rõ thì càng đúng người ứng tuyển, càng ít hiểu lầm tại chỗ và người làm càng dễ chuẩn bị tốt trước khi đến.',
  },
  {
    title: 'Trả công hợp lý và tương xứng',
    body:
      'Đặt mức lương hợp lý so với mặt bằng khu vực và tương xứng với độ vất vả cũng như thời điểm của ca. Trả công xứng đáng giúp ca của bạn nổi bật giữa nhiều tin tuyển, thu hút ứng viên tốt hơn và giảm tình trạng bỏ ca giữa chừng.',
  },
  {
    title: 'Giảm huỷ ca và vắng mặt',
    body:
      'Duyệt ứng viên sớm, nhắc lịch trước giờ bắt đầu và mô tả đúng thực tế công việc để tránh gây bất ngờ. Khi người làm biết rõ mình sẽ làm gì và cảm thấy được tôn trọng, tỉ lệ huỷ ca và vắng mặt sẽ giảm rõ rệt.',
  },
];

// ---------------------------------------------------------------------------
// Presentational primitives (server components, scoped to this file)
// ---------------------------------------------------------------------------

function TipCard({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="relative flex items-start gap-4">
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-sm font-bold text-white shadow-md ring-4 ring-orange-50">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">{body}</p>
      </div>
    </li>
  );
}

function HandbookColumn({
  eyebrow,
  title,
  lead,
  tips,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  tips: Tip[];
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-bold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">{lead}</p>
      <ol className="mt-6 flex flex-col gap-6">
        {tips.map((tip, idx) => (
          <TipCard key={tip.title} n={idx + 1} title={tip.title} body={tip.body} />
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserGuidePage() {
  return (
    <InfoPage
      eyebrow="Cẩm nang"
      title="Cẩm nang đi ca cho người làm và nhà tuyển dụng"
      intro="Những lời khuyên ngắn gọn, thực tế giúp mỗi ca làm diễn ra suôn sẻ cho cả hai phía - từ cách tạo thiện cảm và giữ đúng giờ giấc đến cách viết tin tuyển rõ ràng và trả công hợp lý."
      ctas={[
        { label: 'Tìm ca làm ngay', href: '/shifts' },
        {
          label: 'Đăng ca tuyển',
          href: '/register?role=employer',
          variant: 'secondary',
        },
      ]}
    >
      <section>
        <p>
          Đây không phải hướng dẫn bấm nút, mà là cẩm nang về cách cư xử và
          làm việc để cả người lao động lẫn nhà tuyển dụng đều có trải nghiệm
          tốt. Người làm giữ được uy tín và việc đều; nhà tuyển dụng tuyển
          được và giữ được người tốt. Hãy xem đây là những nguyên tắc nền
          tảng, áp dụng cho mọi ca dù ngắn hay dài.
        </p>
      </section>

      {/* Two practical columns, one per audience */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <HandbookColumn
          eyebrow="Dành cho người lao động"
          title="Để được tin tưởng và mời lại"
          lead="Bốn thói quen giúp bạn giữ uy tín cao và luôn có ca để nhận."
          tips={WORKER_TIPS}
        />
        <HandbookColumn
          eyebrow="Dành cho nhà tuyển dụng"
          title="Để tuyển được và giữ được người tốt"
          lead="Bốn nguyên tắc giúp ca của bạn hấp dẫn và ít bị huỷ, bỏ."
          tips={EMPLOYER_TIPS}
        />
      </div>

      <InfoSection title="Ghi nhớ nhanh">
        <p>
          Tôn trọng thời gian của nhau và trao đổi sớm khi có thay đổi là hai
          điều tạo nên phần lớn sự khác biệt. Người làm chủ động và đúng giờ,
          cùng nhà tuyển dụng mô tả rõ ràng và trả công tương xứng, sẽ cùng
          nhau giảm hiểu lầm, giảm huỷ ca và xây dựng quan hệ hợp tác lâu dài.
        </p>
        <p className="mt-4">
          Đây là bản dùng thử (demo): mọi tài khoản, thanh toán và ca làm chỉ
          là dữ liệu mô phỏng trong trình duyệt. Trong MVP/demo không có giao
          dịch thật, nhưng những nguyên tắc trong cẩm nang này áp dụng đúng như
          ngoài đời.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
