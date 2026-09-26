export type HandbookAudience = 'worker' | 'employer';
export interface HandbookArticleSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
  imageUrl?: string;
  imageCaption?: string;
}
export interface HandbookArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  audience: HandbookAudience;
  categoryId: string;
  categoryLabel: string;
  tags: string[];
  publishedAt: string;
  updatedAt?: string;
  author: string;
  readingTime: number;
  imageUrl: string;
  imageAlt: string;
  featured?: boolean;
  featuredOrder?: number;
  content: HandbookArticleSection[];
  relatedSlugs: string[];
}

export const handbookArticles: HandbookArticle[] = [
  {
    id: "evidence-levels",
    slug: "muc-bang-chung-thanh-toan",
    title: "Hiểu đúng về Mức Bằng Chứng Thanh Toán",
    excerpt: "Mức bằng chứng là cơ chế bảo vệ quyền lợi cho cả nhà tuyển dụng và người lao động trong quá trình thanh toán tiền công. Cùng tìm hiểu chi tiết về 5 mức bằng chứng trên CaLẻ.",
    audience: "worker",
    categoryId: "chinh-sach-thanh-toan",
    categoryLabel: "Chính sách thanh toán",
    tags: ["evidence", "payment", "policy"],
    publishedAt: "2026-07-17T08:00:00.000Z",
    author: "CaLẻ Team",
    readingTime: 5,
    imageUrl: "/images/handbook/unique/safe_art4_shield.png",
    imageAlt: "Hướng dẫn các mức bằng chứng",
    featured: true,
    featuredOrder: 0,
    content: [
      {
        paragraphs: [
          "Trên CaLẻ, việc thanh toán tiền công dựa trên nguyên tắc tự động hóa và bảo vệ hai chiều. Khi kết thúc ca làm, người lao động sẽ cần xác nhận hoàn thành công việc (check-out). Lúc này, tùy vào tính chất công việc, hệ thống hoặc Nhà tuyển dụng có thể yêu cầu cung cấp các mức bằng chứng (Evidence) khác nhau.",
          "Mức bằng chứng càng cao thì khả năng xảy ra tranh chấp càng thấp, nhưng bù lại sẽ yêu cầu người lao động mất thêm chút thời gian thao tác."
        ]
      },
      {
        heading: "1. Không yêu cầu (None)",
        paragraphs: [
          "Phù hợp với các công việc nhẹ nhàng, rủi ro cực thấp hoặc không có tài sản để bàn giao như: Phát tờ rơi, Nhặt bóng tennis, Phụ dọn bàn cơ bản.",
          "Ở mức này, bạn chỉ cần bấm nút Check-out là xong. Không cần chụp ảnh, không cần ghi chú thêm gì cả."
        ]
      },
      {
        heading: "2. Chỉ cần ghi chú (OptionalNotesOnly)",
        paragraphs: [
          "Phù hợp với các công việc cần trao đổi một chút thông tin với người quản lý ca sau. Ví dụ: Hỗ trợ kho vặt, Phụ bếp.",
          "Bạn được khuyến khích để lại vài dòng ghi chú (Ví dụ: 'Em đã cất gọn đồ vào góc bếp'). Ghi chú này tuy không bắt buộc, nhưng sẽ giúp quản lý có thiện cảm và đánh giá bạn cao hơn."
        ]
      },
      {
        heading: "3. Có thể đính kèm ảnh (OptionalPhoto)",
        paragraphs: [
          "Đây là mức khuyến nghị cho hầu hết các công việc trên CaLẻ. Bạn có thể tải lên 1-2 bức ảnh chụp lại thành quả công việc của mình.",
          "Việc chụp ảnh (tuy không bắt buộc) sẽ là 'chiếc phao cứu sinh' cho bạn nếu nhà tuyển dụng đột nhiên khiếu nại rằng bạn làm việc chưa tốt."
        ]
      },
      {
        heading: "4. Bắt buộc chụp ảnh bàn giao (RequiredPhoto)",
        paragraphs: [
          "Bắt buộc đối với các công việc đụng chạm đến tiền bạc hoặc tài sản có giá trị (Thu ngân, Kho vận, Giao hàng).",
          "Hệ thống sẽ không cho phép bạn Check-out nếu chưa tải lên ít nhất một bức ảnh. Hãy chụp lại khu vực làm việc gọn gàng, hoặc biên lai bàn giao tiền mặt."
        ]
      },
      {
        heading: "5. Bắt buộc Checklist + Ghi chú (RequiredNotesAndPhoto)",
        paragraphs: [
          "Mức độ bảo vệ cao nhất. Thường áp dụng cho các công việc quản lý, giám sát hoặc có quy trình bàn giao phức tạp.",
          "Bạn sẽ phải vừa chụp ảnh minh chứng, vừa viết ghi chú tường trình lại ca làm việc."
        ],
        note: "Quy tắc vàng: Không chụp mặt khách hàng nếu chưa được phép. Tuyệt đối không chụp các giấy tờ cá nhân, hóa đơn nhạy cảm hay không gian riêng tư của cửa hàng."
      }
    ],
    relatedSlugs: []
  },
  {
    "id": "1",
    "slug": "lan-dau-nhan-ca-chuan-bi-gi",
    "title": "Lần đầu nhận ca: 5 điều cần chuẩn bị trước khi đi làm",
    "excerpt": "Lần đầu đi làm chắc chắn sẽ có bỡ ngỡ. Nhưng với những bước chuẩn bị thực tế và chuyên nghiệp dưới đây, bạn sẽ tự tin bước vào ca làm đầu tiên và để lại ấn tượng tốt với quản lý, tạo tiền đề vững chắc cho công việc tương lai.",
    "audience": "worker",
    "categoryId": "bat-dau-lam-ca",
    "categoryLabel": "Bắt đầu làm ca",
    "tags": [
      "workers",
      "newbie"
    ],
    "publishedAt": "2026-07-16T08:00:00.000Z",
    "author": "CaLẻ Team",
    "readingTime": 8,
    "imageUrl": "/images/handbook/unique/inline_art1.png",
    "imageAlt": "Chuẩn bị trang phục và vật dụng trước khi đi làm",
    "featured": true,
    "featuredOrder": 1,
    "content": [
      {
        "paragraphs": [
          "Bạn vừa lướt ứng dụng CaLẻ, ấn ứng tuyển và nhận được thông báo \"Đã được duyệt\" từ phía cửa hàng! Cảm giác lúc này chắc hẳn là sự pha trộn giữa niềm vui vì có thêm một nguồn thu nhập, và chút hồi hộp vì không biết môi trường làm việc ngày mai sẽ ra sao.",
          "Đối với mô hình công việc ngắn hạn tính theo giờ, các cơ sở kinh doanh kỳ vọng bạn có thể nhanh chóng bắt nhịp và hỗ trợ họ ngay lập tức, đặc biệt là trong các khung giờ cao điểm. Việc tỏ ra bối rối hay thiếu chuẩn bị không chỉ làm giảm năng suất chung mà còn ảnh hưởng trực tiếp đến điểm đánh giá uy tín của bạn trên hệ thống. Vậy làm thế nào để biến ca làm đầu tiên trở thành một khởi đầu hoàn hảo?"
        ]
      },
      {
        "heading": "1. Nghiên cứu kỹ lưỡng mô tả công việc",
        "paragraphs": [
          "Một sai lầm rất phổ biến của những bạn trẻ lần đầu đi làm là chỉ nhìn vào mức lương và thời gian, bỏ qua phần yêu cầu chi tiết. Hãy mở lại ứng dụng và rà soát từng dòng mô tả. Chủ quán yêu cầu đồng phục màu gì? Có cần mang theo tạp dề hay sổ tay nhỏ không?",
          "Nhiều nhà hàng yêu cầu nhân viên phục vụ mặc áo sơ mi trắng có cổ, quần âu tối màu và đi giày kín mũi. Việc xuất hiện với một chiếc áo thun không cổ hay đôi dép lê có thể khiến bạn bị từ chối nhận việc ngay lập tức. Tuân thủ nghiêm ngặt quy định về tác phong là minh chứng rõ nét nhất cho tính chuyên nghiệp của bạn."
        ],
        "imageUrl": "/images/handbook/unique/safe_art8.png",
        "imageCaption": "Chuẩn bị kỹ lưỡng trước giờ G giúp bạn tự tin hoàn thành ca làm đầu tiên."
      },
      {
        "heading": "2. Lên kế hoạch di chuyển từ trước",
        "paragraphs": [
          "Nguyên tắc bất di bất dịch của ngành dịch vụ: \"Đi làm đúng giờ nghĩa là đến sớm 15 phút\". Khoảng thời gian dự phòng này giúp bạn ổn định hơi thở, tìm chỗ gửi xe, thay đồng phục và làm quen nhanh với không gian làm việc.",
          "Để không bị trễ giờ, hãy tra cứu đường đi trên bản đồ số từ tối hôm trước. Tính toán khoảng cách, xem xét các điểm có thể ùn tắc giao thông vào giờ đi làm, và cộng thêm ít nhất 20 phút cho những sự cố dọc đường. Tuyệt đối không để đến sát giờ khởi hành mới bắt đầu tìm đường."
        ]
      },
      {
        "heading": "3. Chủ động giao tiếp và sẵn sàng học hỏi",
        "paragraphs": [
          "Khi vừa đến nơi, hãy chủ động tìm gặp người quản lý hoặc trưởng ca để xác nhận sự có mặt. Một lời chào rõ ràng: \"Dạ em chào anh/chị, em là [Tên bạn], em nhận ca làm qua nền tảng từ 18:00 ạ\" sẽ ngay lập tức tạo được thiện cảm.",
          "Trong quá trình làm việc, đừng ngại đặt câu hỏi nếu bạn không chắc chắn về một quy trình nào đó. Các cửa hàng thà dành 1 phút để hướng dẫn bạn cách phân loại rác đúng chuẩn, còn hơn là mất 10 phút để dọn dẹp hậu quả do bạn làm sai. Hãy luôn mang theo một cuốn sổ tay nhỏ để ghi chép nhanh số bàn hoặc quy trình phục vụ."
        ]
      },
      {
        "heading": "4. Tôn trọng văn hóa doanh nghiệp",
        "paragraphs": [
          "Mỗi cơ sở kinh doanh, dù nhỏ hay lớn, đều có một văn hóa làm việc riêng biệt. Có nơi đề cao sự nhanh nhẹn, ồn ào và náo nhiệt; có nơi lại yêu cầu sự yên tĩnh, cẩn trọng và tỉ mỉ. Dù chỉ làm việc trong vài giờ đồng hồ, việc quan sát và điều chỉnh hành vi của bản thân cho phù hợp với tập thể xung quanh là một kỹ năng vô cùng quan trọng."
        ]
      },
      {
        "heading": "5. Kết thúc công việc trọn vẹn",
        "paragraphs": [
          "Một ca làm tốt phải được duy trì từ đầu đến cuối. Trước khi rời đi, hãy đảm bảo bạn đã hoàn tất mọi công việc được giao, dọn dẹp sạch sẽ khu vực mình phụ trách. Hãy bàn giao lại công việc cho người ca sau (nếu có) và báo cáo với quản lý trước khi ra về.",
          "Sự chỉn chu ở phút chót chính là yếu tố quyết định để chủ quán dành tặng bạn mức đánh giá 5 sao tuyệt đối trên hệ thống.",
          "Hãy nhớ rằng mục tiêu của mỗi ca làm là để nhà tuyển dụng hài lòng và muốn mời bạn quay lại: làm đủ phần việc đã thỏa thuận, giữ thái độ vui vẻ, và nếu có việc đột xuất thì báo sớm qua ứng dụng thay vì im lặng vắng mặt."
        ]
      },
      {
        "heading": "Lời kết",
        "note": "Sự chuyên nghiệp không tự nhiên mà có, nó được bồi đắp qua từng ca làm việc nhỏ nhất. Chỉ cần bạn mang một thái độ nghiêm túc, tinh thần cầu thị và sự chuẩn bị kỹ lưỡng, ca làm đầu tiên chắc chắn sẽ là một kỷ niệm đẹp và là bước đệm vững chắc cho hồ sơ năng lực của bạn.",
        "paragraphs": []
      }
    ],
    "relatedSlugs": [
      "chua-co-kinh-nghiem-chon-ca-lam-nao",
      "cach-xay-dung-ho-so-ca-le-uy-tin"
    ]
  },
  {
    "id": "2",
    "slug": "chua-co-kinh-nghiem-chon-ca-lam-nao",
    "title": "Chưa có kinh nghiệm nên bắt đầu với những công việc nào?",
    "excerpt": "Hồ sơ chưa có đánh giá nào? Thị trường làm ca ngắn hạn luôn có sẵn những vị trí lý tưởng không yêu cầu chuyên môn, giúp bạn dễ dàng tích lũy thu nhập và kinh nghiệm.",
    "audience": "worker",
    "categoryId": "bat-dau-lam-ca",
    "categoryLabel": "Bắt đầu làm ca",
    "tags": [
      "workers",
      "newbie"
    ],
    "publishedAt": "2026-07-15T10:00:00.000Z",
    "author": "CaLẻ Team",
    "readingTime": 6,
    "imageUrl": "/images/handbook/unique/inline_art2.png",
    "imageAlt": "Sinh viên làm việc tại sự kiện tiệc cưới",
    "featured": false,
    "content": [
      {
        "paragraphs": [
          "Bạn vừa thiết lập xong tài khoản, mọi thông tin đều đã hoàn thiện nhưng phần \"Kinh nghiệm làm việc\" vẫn còn là một trang giấy trắng. Bạn có thể cảm thấy chùn bước khi thấy nhiều bản tin tuyển dụng yêu cầu \"thành thạo máy POS\", \"có kinh nghiệm pha chế\", hay \"kỹ năng giao tiếp tiếng Anh\".",
          "Đừng quá lo lắng! Đặc thù của mô hình việc làm ngắn hạn là giải quyết các bài toán nhân sự tức thời vào những khung giờ cao điểm. Tại những thời điểm này, doanh nghiệp cần một nguồn lực lao động có sức khỏe, sự chăm chỉ và thái độ nghiêm túc hơn là những kỹ năng chuyên môn phức tạp. Dưới đây là những nhóm công việc hoàn hảo để bạn bắt đầu."
        ]
      },
      {
        "heading": "1. Phụ việc tại Nhà hàng Tiệc cưới / Sự kiện cuối tuần",
        "paragraphs": [
          "Đây là nhóm công việc lý tưởng bậc nhất cho những người mới gia nhập thị trường lao động ngắn hạn. Vào cuối tuần, các trung tâm hội nghị và tiệc cưới cần vận hành với công suất tối đa. Họ luôn có nhu cầu tuyển dụng số lượng lớn nhân viên thời vụ để hỗ trợ bưng bê thức ăn, sắp xếp bàn ghế, hoặc dọn dẹp hội trường sau buổi lễ.",
          "Công việc này được phân chia thành các quy trình rất cơ bản. Bạn sẽ không phải tự mình ghi nhớ các menu phức tạp hay giao tiếp sâu với khách hàng. Thay vào đó, bạn sẽ làm việc theo nhóm dưới sự điều phối trực tiếp của một nhóm trưởng. Điều bạn cần duy nhất là sự cẩn thận và một thể lực tốt để liên tục di chuyển trong nhiều giờ."
        ],
        "imageUrl": "/images/handbook/unique/new_inline_art2.png",
        "imageCaption": "Các công việc phổ thông như phục vụ, sự kiện là bước đệm hoàn hảo cho người mới."
      },
      {
        "heading": "2. Nhân viên Phụ kho / Sắp xếp hàng hóa",
        "paragraphs": [
          "Trong các dịp lễ, tết, hay các kỳ khuyến mãi lớn của các hệ thống siêu thị, khối lượng hàng hóa vận chuyển tăng vọt. Các vị trí như bốc dỡ hàng, phân loại sản phẩm, dán tem nhãn, và bổ sung hàng lên kệ liên tục được mở tuyển.",
          "Ưu điểm lớn nhất của công việc này là bạn gần như không phải đối mặt với áp lực từ khách hàng. Bạn chỉ cần làm việc trực tiếp với sản phẩm và hệ thống kho bãi. Tính chất công việc lặp đi lặp lại giúp những người mới không bị ngợp, đồng thời rèn luyện tính kiên nhẫn và sự tỉ mỉ."
        ]
      },
      {
        "heading": "3. Phụ dọn dẹp / Rửa chén giờ cao điểm",
        "paragraphs": [
          "Nhiều bạn trẻ tỏ ra e ngại với nhóm công việc này vì sợ vất vả và bẩn. Tuy nhiên, nếu gạt bỏ rào cản tâm lý, đây lại là một trong những công việc dễ nhận nhất và có mức thù lao tương đối cao so với mặt bằng chung. Các nhà hàng luôn rơi vào tình trạng thiếu nhân sự rửa dọn từ 19:00 đến 22:00.",
          "Công việc này có tính độc lập cao, hướng dẫn rõ ràng (ví dụ: quy trình rửa 3 bước, sấy khô), và một khi kết thúc ca, bạn có thể ra về ngay lập tức mà không phải vướng bận bất kỳ báo cáo hay bàn giao phức tạp nào."
        ]
      },
      {
        "heading": "Lời khuyên cho người mới",
        "note": "Đừng ngại bắt đầu bằng những công việc lao động tay chân đơn giản. Giá trị cốt lõi bạn thu được trong giai đoạn đầu không chỉ là tiền công, mà là các chỉ số đánh giá 5 sao từ nhà tuyển dụng. Một lịch sử hoàn thành xuất sắc 10 ca phụ kho sẽ giúp bạn ghi điểm tuyệt đối khi ứng tuyển vào các vị trí bán hàng hay phục vụ cao cấp hơn sau này.",
        "paragraphs": []
      }
    ],
    "relatedSlugs": [
      "lan-dau-nhan-ca-chuan-bi-gi"
    ]
  },
  {
    "id": "3",
    "slug": "cach-xay-dung-ho-so-ca-le-uy-tin",
    "title": "Thiết kế hồ sơ cá nhân uy tín: Chìa khóa để luôn được nhận ca",
    "excerpt": "Hồ sơ trực tuyến là bộ mặt của bạn. Trong môi trường tuyển dụng siêu tốc độ, một hồ sơ được trình bày chuyên nghiệp sẽ giúp bạn vượt qua hàng chục ứng viên khác.",
    "audience": "worker",
    "categoryId": "kinh-nghiem-di-lam",
    "categoryLabel": "Kinh nghiệm đi làm",
    "tags": [
      "profile",
      "tips"
    ],
    "publishedAt": "2026-07-14T09:00:00.000Z",
    "author": "CaLẻ Team",
    "readingTime": 7,
    "imageUrl": "/images/handbook/unique/fix_grid_art3.png",
    "imageAlt": "Giao diện hiển thị hồ sơ năng lực của người lao động trên nền tảng",
    "featured": false,
    "content": [
      {
        "paragraphs": [
          "Bạn ứng tuyển liên tục nhưng các ca làm đều hiển thị trạng thái \"Bị từ chối\" hoặc \"Đang chờ duyệt\" mòn mỏi? Vấn đề có thể không nằm ở kinh nghiệm của bạn, mà nằm ở cách bạn thể hiện bản thân qua Hồ sơ cá nhân.",
          "Trong thế giới tuyển dụng nhân sự ngắn hạn, tốc độ là yếu tố then chốt. Một quản lý đang cần gấp người thay thế cho buổi tối sẽ không có thời gian để đọc những bản CV PDF dài 3 trang. Họ sẽ nhìn lướt qua hồ sơ của bạn trên ứng dụng trong đúng 5 giây để đưa ra quyết định. Làm thế nào để chinh phục nhà tuyển dụng trong 5 giây ngắn ngủi đó?"
        ]
      },
      {
        "heading": "1. Ảnh đại diện: Trực quan, thân thiện và chuyên nghiệp",
        "paragraphs": [
          "Ảnh đại diện là thứ đầu tiên nhà tuyển dụng nhìn thấy. Bạn không cần thiết phải mặc áo vest hay ra studio để chụp một tấm ảnh thẻ cứng nhắc. Tuy nhiên, việc sử dụng ảnh phong cảnh, ảnh động vật, hay những bức ảnh tự sướng với góc máy tối tăm, che khuất nửa khuôn mặt là một điểm trừ rất lớn.",
          "Tiêu chuẩn cho một bức ảnh tốt: Hãy mặc một chiếc áo thun có cổ hoặc áo sơ mi sáng màu. Chọn một không gian có ánh sáng tự nhiên tốt, phông nền đơn giản. Hãy nhìn thẳng vào camera và mỉm cười nhẹ nhàng. Một khuôn mặt sáng sủa, đáng tin cậy sẽ là tấm vé thông hành tuyệt vời trong ngành dịch vụ."
        ],
        "imageUrl": "/images/handbook/unique/new_inline_art3.png",
        "imageCaption": "Một hồ sơ trực tuyến chỉn chu, rõ ràng sẽ ngay lập tức thu hút nhà tuyển dụng."
      },
      {
        "heading": "2. Tối ưu hóa phần giới thiệu bản thân",
        "paragraphs": [
          "Phần giới thiệu không phải là nơi để bạn kể lể tiểu sử. Hãy viết nó như một bản tóm tắt năng lực (Elevator Pitch) thực sự sắc bén. Độ dài tối đa chỉ nên khoảng 3-4 câu.",
          "**Công thức hiệu quả:** [Tình trạng hiện tại] + [Điểm mạnh cá nhân] + [Lịch trình rảnh rỗi].",
          "**Ví dụ tốt:** \"Em là sinh viên năm 3, sức khỏe tốt, chăm chỉ và học hỏi nhanh. Có thể chịu được áp lực cao trong môi trường quán ăn đông khách. Em thường rảnh các buổi tối từ 18h-22h trong tuần.\"",
          "Chỉ với 3 câu, bạn đã cung cấp cho chủ quán mọi thông tin thiết yếu nhất để họ đánh giá mức độ phù hợp."
        ]
      },
      {
        "heading": "3. Bảo vệ \"Điểm Uy Tín\" và Lịch sử hoàn thành",
        "paragraphs": [
          "Thuật toán của các nền tảng việc làm luôn ưu tiên hiển thị những ứng viên có độ tin cậy cao lên đầu danh sách. Độ tin cậy này được xây dựng hoàn toàn dựa trên Lịch sử làm việc của bạn.",
          "Mỗi đánh giá 5 sao kèm theo những lời khen ngợi từ quản lý cũ như \"Nhân viên ngoan, nhanh nhẹn, dọn dẹp sạch sẽ\" có sức nặng gấp trăm lần những gì bạn tự viết về bản thân. Hãy trân trọng từng cơ hội làm việc để tích lũy những viên gạch uy tín này."
        ]
      },
      {
        "heading": "Cảnh báo: Lịch sử Hủy ca",
        "note": "Hành vi hủy ca sát giờ, hoặc nghiêm trọng hơn là không đến làm (No-show) mà không có bất kỳ thông báo nào, là điều tối kỵ. Hệ thống sẽ ghi nhận những vi phạm này vào hồ sơ hiển thị công khai. Một tài khoản có tỷ lệ hủy ca cao sẽ gần như không thể được duyệt nhận việc ở các cửa hàng khác.",
        "paragraphs": []
      }
    ],
    "relatedSlugs": [
      "chua-co-kinh-nghiem-chon-ca-lam-nao"
    ]
  },
  {
    "id": "4",
    "slug": "nhan-dien-ca-lam-uy-tin",
    "title": "Phân tích tin đăng: Nhận diện việc làm an toàn và tránh bẫy lừa đảo",
    "excerpt": "Không phải cơ hội việc làm nào cũng minh bạch. Hãy trang bị cho mình kỹ năng phân tích tin đăng để bảo vệ thời gian, công sức và tiền bạc của chính mình.",
    "audience": "worker",
    "categoryId": "an-toan-nhan-ca",
    "categoryLabel": "An toàn khi nhận ca",
    "tags": [
      "safety",
      "tips"
    ],
    "publishedAt": "2026-07-13T15:00:00.000Z",
    "author": "CaLẻ Team",
    "readingTime": 8,
    "imageUrl": "/images/handbook/unique/inline_art4.png",
    "imageAlt": "Người lao động cẩn thận phân tích nội dung trên tin tuyển dụng",
    "featured": false,
    "content": [
      {
        "paragraphs": [
          "Thị trường việc làm bán thời gian và làm thêm luôn sôi động, nhưng đồng thời cũng là mảnh đất màu mỡ cho những chiêu trò lừa đảo trục lợi từ người lao động, đặc biệt là sinh viên. Những lời chào mời \"việc nhẹ lương cao\", \"làm tại nhà thu nhập chục triệu\" vẫn xuất hiện nhan nhản mỗi ngày.",
          "Việc nhận diện một tin đăng tuyển dụng thiếu minh bạch không quá khó nếu bạn nắm vững các nguyên tắc cơ bản và giữ cho mình một cái đầu lạnh."
        ]
      },
      {
        "heading": "1. Dấu hiệu của một tin đăng chuẩn mực",
        "paragraphs": [
          "Một nhà tuyển dụng nghiêm túc, có nhu cầu tìm người thực sự sẽ luôn cố gắng minh bạch hóa mọi thông tin để tiết kiệm thời gian cho cả hai bên. Một tin đăng đáng tin cậy phải bao gồm:",
          "- **Thông tin định danh:** Tên cơ sở kinh doanh rõ ràng, kèm địa chỉ chính xác, cụ thể đến từng số nhà, tên đường. (Ví dụ: \"Quán cà phê ABC, 123 Đường XYZ, Quận 1\").",
          "- **Thông số công việc đo lường được:** Thời gian bắt đầu - kết thúc rõ ràng (VD: 18:00 - 22:30). Mức tiền công được tính theo giờ hoặc theo ca cụ thể.",
          "- **Mô tả công việc thực tế:** Liệt kê các đầu việc cụ thể sẽ phải làm, không sử dụng các từ ngữ chung chung như \"phụ việc vặt\", \"đến rồi trao đổi\"."
        ],
        "imageUrl": "/images/handbook/unique/new_inline_art4.png",
        "imageCaption": "Luôn cảnh giác và xác minh kỹ thông tin cửa hàng trước khi quyết định nhận ca."
      },
      {
        "heading": "2. Các tín hiệu cảnh báo đỏ (Red Flags)",
        "paragraphs": [
          "Nếu bạn bắt gặp một trong những yêu cầu sau, hãy lập tức ngừng giao dịch và báo cáo tin đăng:",
          "- **Yêu cầu nộp phí:** Bất kể dưới danh nghĩa là phí giữ chỗ, phí đăng ký, tiền cọc đồng phục hay phí mở tài khoản. Theo luật lao động, người sử dụng lao động không được phép thu tiền của người xin việc dưới bất kỳ hình thức nào.",
          "- **Định giá thù lao vô lý:** Mức lương được chào mời cao gấp 2, gấp 3 lần mặt bằng chung của thị trường cho những công việc phổ thông giản đơn. Không có bữa trưa nào là miễn phí.",
          "- **Từ chối giao dịch qua hệ thống:** Nhà tuyển dụng yêu cầu bạn nhắn tin riêng qua Zalo/Telegram và đề nghị thanh toán qua chuyển khoản cá nhân thay vì thông qua hệ thống của nền tảng. Khi rời khỏi nền tảng, bạn sẽ hoàn toàn mất đi sự bảo vệ pháp lý nếu xảy ra tình trạng quỵt lương."
        ]
      },
      {
        "heading": "3. Bảo vệ bản thân bằng hệ thống đánh giá",
        "paragraphs": [
          "Trên các nền tảng việc làm chuyên nghiệp, không chỉ người lao động mới bị đánh giá. Bạn hoàn toàn có thể xem được uy tín của cửa hàng thông qua số lượng ca làm họ đã hoàn thành và điểm số mà các nhân sự trước đây chấm cho họ.",
          "Hãy ưu tiên nhận việc từ những nhà tuyển dụng đã có lịch sử hoạt động tốt trên hệ thống, điều này giúp giảm thiểu 99% rủi ro so với việc tự tìm việc trôi nổi trên mạng xã hội."
        ]
      }
    ],
    "relatedSlugs": [
      "cach-tinh-luong-ca-le-va-phu-cap"
    ]
  },
  {
    "id": "5",
    "slug": "sap-xep-ca-lam-khong-anh-huong-viec-hoc",
    "title": "Nghệ thuật cân bằng: Đi làm thêm không ảnh hưởng đến việc học",
    "excerpt": "Làm thế nào để vừa tối ưu hóa được nguồn thu nhập từ các ca làm linh hoạt, vừa đảm bảo duy trì kết quả học tập xuất sắc? Tất cả nằm ở kỹ năng quản lý thời gian.",
    "audience": "worker",
    "categoryId": "kinh-nghiem-di-lam",
    "categoryLabel": "Kinh nghiệm đi làm",
    "tags": [
      "students",
      "tips",
      "time-management"
    ],
    "publishedAt": "2026-07-12T14:00:00.000Z",
    "author": "CaLẻ Team",
    "readingTime": 7,
    "imageUrl": "/images/handbook/unique/inline_art5.png",
    "imageAlt": "Sinh viên đang đối chiếu thời khóa biểu với lịch làm việc",
    "featured": false,
    "content": [
      {
        "paragraphs": [
          "Đối với phần lớn sinh viên, việc làm thêm không chỉ để trang trải chi phí sinh hoạt mà còn là môi trường tuyệt vời để rèn luyện kỹ năng mềm và mở rộng mối quan hệ xã hội. Tuy nhiên, ranh giới giữa việc \"đi làm thêm\" và \"bỏ bê việc học\" rất mong manh.",
          "Nhiều bạn sinh viên rơi vào vòng xoáy của các ca làm cố định, bị kiệt sức và kết quả học tập sa sút nghiêm trọng. Với sự phát triển của mô hình việc làm nhận ca linh hoạt, bạn có thể nắm lại quyền kiểm soát thời gian của mình."
        ]
      },
      {
        "heading": "1. Sức mạnh của sự linh hoạt",
        "paragraphs": [
          "Đặc thù nổi bật nhất của việc làm ca ngắn hạn là sự tự do. Bạn không bị ép buộc phải đăng ký lịch làm cố định cho cả tháng. Tuần này bạn thi giữa kỳ? Hãy tập trung hoàn toàn vào việc ôn tập. Sang tuần bạn có nhiều khoảng thời gian trống? Hãy đăng ký nhận 3-4 ca làm để bù lại thu nhập.",
          "Sự linh hoạt này giúp bạn chủ động xếp lịch làm việc xen kẽ vào các khe hở của thời khóa biểu, thay vì phải hy sinh thời gian học để đi làm."
        ],
        "imageUrl": "/images/handbook/unique/new_inline_art5.png",
        "imageCaption": "Sắp xếp thời gian biểu hợp lý giúp sinh viên vừa có thu nhập vừa giữ vững thành tích."
      },
      {
        "heading": "2. Tối ưu hóa khoảng cách di chuyển",
        "paragraphs": [
          "Đừng để những con số thù lao cao hơn 5.000đ/giờ làm mờ mắt bạn nếu công việc đó cách nhà bạn tới 15km. Thời gian di chuyển trong môi trường giao thông đô thị, cộng với sự kẹt xe và khói bụi, sẽ bòn rút thể lực của bạn một cách nhanh chóng.",
          "Hãy thiết lập bán kính tìm kiếm việc làm tối đa 5km xung quanh khu vực bạn sống hoặc học tập. 30 phút tiết kiệm được từ việc không phải di chuyển xa mỗi ngày có thể dùng để nghỉ ngơi hoặc ôn lại bài vở."
        ]
      },
      {
        "heading": "3. Thiết lập giới hạn thời gian (Time-boxing)",
        "paragraphs": [
          "Hãy tự đặt ra cho mình một quy tắc nghiêm ngặt: Tổng thời gian làm thêm trong một tuần không vượt quá 20 giờ. Nếu vượt qua ngưỡng này, cơ thể bạn sẽ không đủ thời gian để phục hồi năng lượng.",
          "Việc phân bổ thời gian hợp lý nhất là dồn các ca làm dài (6-8 tiếng) vào những ngày cuối tuần rảnh rỗi. Các ngày trong tuần, nếu đi làm, chỉ nên nhận các ca ngắn (3-4 tiếng) vào buổi tối và phải đảm bảo kết thúc trước 22:30 để không ảnh hưởng đến giấc ngủ."
        ]
      },
      {
        "heading": "Kết luận",
        "paragraphs": [
          "Bản chất của từ \"làm thêm\" là để bổ trợ cho cuộc sống của bạn, chứ không phải để thay thế nhiệm vụ chính là học tập. Một sinh viên thông minh là người biết dùng việc làm thêm như một công cụ phát triển bản thân, chứ không để nó trở thành gánh nặng."
        ]
      }
    ],
    "relatedSlugs": [
      "chua-co-kinh-nghiem-chon-ca-lam-nao",
      "cach-xay-dung-ho-so-ca-le-uy-tin"
    ]
  },
  {
    "id": "6",
    "slug": "cach-tinh-luong-ca-le-va-phu-cap",
    "title": "Minh bạch thu nhập: Phân tích cấu trúc lương và phụ cấp",
    "excerpt": "Làm thế nào để chắc chắn bạn nhận được đúng phần thù lao xứng đáng với công sức bỏ ra? Cùng mổ xẻ các thành phần tạo nên thu nhập của một ca làm.",
    "audience": "worker",
    "categoryId": "luong-quyen-loi",
    "categoryLabel": "Lương & quyền lợi",
    "tags": [
      "salary",
      "benefits"
    ],
    "publishedAt": "2026-07-11T10:00:00.000Z",
    "author": "CaLẻ Team",
    "readingTime": 7,
    "imageUrl": "/images/handbook/unique/inline_art6.png",
    "imageAlt": "Chi tiết bảng tổng hợp tiền công và phụ cấp trên ứng dụng",
    "featured": false,
    "content": [
      {
        "paragraphs": [
          "Sự rành mạch về tài chính là cơ sở cho mọi mối quan hệ hợp tác lao động tốt đẹp. Khi bạn nhận một công việc ngắn hạn, điều quan trọng nhất là bạn phải tự nhẩm tính được chính xác số tiền mình sẽ cầm về trước cả khi đặt chân đến cửa hàng."
        ]
      },
      {
        "heading": "1. Tiền công cơ bản định mức",
        "paragraphs": [
          "Hầu hết các ca làm việc bán thời gian đều tính lương dựa trên số giờ lao động. Công thức cốt lõi là: **[Mức lương 1 giờ] × [Số giờ làm việc thực tế]**.",
          "Ví dụ: Bạn nhận một ca từ 18:00 đến 22:00 (4 tiếng) với mức giá 30.000đ/giờ. Tổng tiền lương cơ bản của bạn sẽ là 120.000đ. Mức giá theo giờ này phải được ghi nhận rõ ràng trên tin tuyển dụng và trên hệ thống, không được phép thay đổi sau khi bạn đã chấp nhận công việc."
        ],
        "imageUrl": "/images/handbook/unique/new_inline_art6.png",
        "imageCaption": "Nắm rõ cách tính lương theo giờ và phụ cấp giúp bạn bảo vệ quyền lợi của mình."
      },
      {
        "heading": "2. Các khoản phụ cấp và chi phí phát sinh",
        "paragraphs": [
          "Tùy thuộc vào tính chất công việc và quy định của mỗi cửa hàng, bạn có thể được hưởng thêm các quyền lợi ngoài lương cơ bản. Hãy kiểm tra kỹ xem mô tả công việc có bao gồm:",
          "- **Phụ cấp bữa ăn:** Thường được áp dụng nếu ca làm của bạn kéo dài trên 6 tiếng hoặc bao trùm các khung giờ dùng bữa chính (VD: làm từ 10:00 đến 15:00).",
          "- **Phụ cấp chuyên cần / ca đêm:** Các công việc kết thúc sau 22:00 thường có thêm phụ cấp đi lại để hỗ trợ chi phí xăng xe.",
          "- **Quy tắc làm thêm giờ (Overtime):** Trong những ngày lễ Tết đông đúc, quản lý có thể yêu cầu bạn nán lại thêm 30 phút - 1 tiếng. Bạn có quyền từ chối nếu bận, nhưng nếu đồng ý, hãy thỏa thuận rõ việc khoảng thời gian này có được tính thêm tiền hay không."
        ]
      },
      {
        "heading": "3. Phương thức thanh toán thực tế",
        "paragraphs": [
          "Bạn cần thống nhất phương thức nhận tiền ngay trong ca làm việc. Thông thường, đối với các nền tảng việc làm kết nối trực tiếp, tiền lương sẽ được chủ quán thanh toán bằng tiền mặt ngay khi bạn kết thúc ca, hoặc chuyển khoản trực tiếp vào tài khoản ngân hàng của bạn trong vòng 24 giờ.",
          "Hãy đảm bảo mọi thỏa thuận về thời gian trả tiền đều rõ ràng và công khai."
        ]
      },
      {
        "heading": "Lưu ý khi đối soát",
        "note": "Khi kết thúc ca, luôn kiểm tra lại số giờ làm việc thực tế cùng quản lý. Nếu có sai lệch do bạn phải ở lại muộn hơn dự kiến, hãy lịch sự yêu cầu cập nhật lại giờ làm trên hệ thống để đảm bảo quyền lợi.",
        "paragraphs": []
      }
    ],
    "relatedSlugs": [
      "nhan-dien-ca-lam-uy-tin"
    ]
  },
  {
    "id": "7",
    "slug": "cach-dang-tin-tuyen-nguoi-ngan-han",
    "title": "Tuyển người cấp tốc: Kỹ năng viết tin đăng thu hút ứng viên tức thì",
    "excerpt": "Cửa hàng đang quá tải và cần bổ sung nhân sự ngay lập tức? Học cách tối ưu hóa bản tin tuyển dụng để thu hút đúng người, đúng việc trong thời gian ngắn nhất.",
    "audience": "employer",
    "categoryId": "danh-cho-doanh-nghiep",
    "categoryLabel": "Dành cho doanh nghiệp",
    "tags": [
      "employer",
      "hiring"
    ],
    "publishedAt": "2026-07-10T08:00:00.000Z",
    "author": "CaLẻ Team",
    "readingTime": 8,
    "imageUrl": "/images/handbook/unique/megaphone_shouting_crowd.png",
    "imageAlt": "Giao diện tạo ca làm mới dành cho nhà tuyển dụng",
    "featured": true,
    "featuredOrder": 2,
    "content": [
      {
        "paragraphs": [
          "Đối mặt với tình trạng thiếu hụt nhân sự đột xuất trong các khung giờ cao điểm là bài toán thường trực của ngành F&B và bán lẻ. Khi tình huống cấp bách xảy ra, mục tiêu duy nhất của bạn là tìm được người hỗ trợ ngay lập tức.",
          "Nhiều quản lý vội vã tạo một tin đăng cẩu thả, thiếu thông tin, dẫn đến việc không có ai ứng tuyển, hoặc tệ hơn là tuyển nhầm người không đáp ứng được công việc. Dưới đây là cấu trúc của một tin tuyển dụng có sức thu hút cao."
        ]
      },
      {
        "heading": "1. Tiêu đề: Khẩn cấp và Trọng tâm",
        "paragraphs": [
          "Trong danh sách hàng chục ca làm đang mở, tiêu đề của bạn phải lập tức bắt lấy sự chú ý. Đừng dùng các tiêu đề lãng mạn hay chung chung. Hãy sử dụng cấu trúc: **[Trạng thái khẩn] + [Vị trí] + [Khung giờ/Địa điểm]**.",
          "Ví dụ thay vì viết: \"Cửa hàng trà sữa ABC tuyển nhân viên\", hãy viết: \"CẦN GẤP 2 Phục vụ ca tối nay (18h-22h) tại Quận Bình Thạnh\". Sự cấp bách và rõ ràng về thời gian sẽ kích thích những ứng viên ở gần khu vực đó ứng tuyển ngay."
        ],
        "imageUrl": "/images/handbook/unique/new_inline_art7.png",
        "imageCaption": "Tin đăng rõ ràng, mức lương minh bạch là thỏi nam châm thu hút người lao động."
      },
      {
        "heading": "2. Thông tin thù lao: Trực diện và Đủ hấp dẫn",
        "paragraphs": [
          "Thu nhập là động lực số 1 của người lao động ngắn hạn. Việc sử dụng các cụm từ như \"Lương thỏa thuận\" hay \"Theo năng lực\" trong các tin tuyển dụng thời vụ là một sai lầm chết người, khiến ứng viên bỏ qua ngay lập tức.",
          "Hãy điền chính xác con số: \"30.000đ/giờ\", kèm theo các lợi ích phụ trội nếu có, ví dụ: \"Bao ăn 1 bữa\", \"Hỗ trợ 20k tiền xăng\". Đôi khi, chỉ cần thêm một bữa ăn nhẹ, tin đăng của bạn sẽ vượt trội hoàn toàn so với đối thủ cạnh tranh.",
          "Mức lương cũng cần hợp lý so với khối lượng công việc và mặt bằng khu vực: ca đêm, ca cuối tuần hay việc nặng nên được trả tương xứng. Trả thấp hơn mặt bằng có thể tiết kiệm được vài chục nghìn, nhưng thường khiến ít người ứng tuyển và người đã nhận ca cũng dễ bỏ ca hơn."
        ]
      },
      {
        "heading": "3. Mô tả công việc: Chân thực, không tô vẽ",
        "paragraphs": [
          "Đối với công việc thời vụ, ứng viên cần biết chính xác họ sẽ phải làm gì bằng chân tay. Đừng dùng các từ ngữ đao to búa lớn. Hãy liệt kê gạch đầu dòng các công việc cụ thể.",
          "- \"Nhiệm vụ: Chạy bàn bưng đồ ăn, dọn dẹp bàn sau khi khách về. Không yêu cầu ghi order.\"",
          "- \"Yêu cầu: Mặc quần dài đen, áo thun tối màu, mang giày thể thao. Cần có thái độ nhanh nhẹn, nghe theo sự điều phối của tổ trưởng.\"",
          "Mô tả thực tế giúp loại bỏ những ứng viên sợ vất vả, giữ lại những người thực sự sẵn sàng làm việc."
        ]
      },
      {
        "heading": "Kết luận",
        "paragraphs": [
          "Sự rõ ràng chính là thỏi nam châm mạnh nhất trong tuyển dụng nhân sự phổ thông. Khi bạn đặt mọi thông tin một cách minh bạch lên bàn cân, những người lao động phù hợp nhất sẽ tự động tìm đến và giúp bạn vượt qua khủng hoảng nhân sự."
        ]
      }
    ],
    "relatedSlugs": [
      "cach-chon-nguoi-phu-hop-cho-ca-ngan-han",
      "xu-ly-khi-nguoi-lao-dong-huy-ca"
    ]
  },
  {
    "id": "8",
    "slug": "cach-chon-nguoi-phu-hop-cho-ca-ngan-han",
    "title": "Chiến lược duyệt hồ sơ: Chọn đúng người cho ca làm siêu ngắn",
    "excerpt": "Đứng trước hàng chục lượt ứng tuyển, việc ra quyết định nhanh gọn và chính xác đòi hỏi bạn phải nắm vững các chỉ số đánh giá năng lực của người lao động.",
    "audience": "employer",
    "categoryId": "danh-cho-doanh-nghiep",
    "categoryLabel": "Dành cho doanh nghiệp",
    "tags": [
      "employer",
      "management"
    ],
    "publishedAt": "2026-07-09T09:00:00.000Z",
    "author": "CaLẻ Team",
    "readingTime": 7,
    "imageUrl": "/images/handbook/unique/new_grid_art8.png",
    "imageAlt": "Chủ cửa hàng duyệt danh sách các ứng viên đăng ký",
    "featured": false,
    "content": [
      {
        "paragraphs": [
          "Tin tuyển dụng của bạn thu hút được 15 người ứng tuyển, nhưng bạn chỉ cần 2 người. Vấn đề là bạn chỉ còn đúng 3 giờ đồng hồ trước khi ca làm bắt đầu, không có thời gian để gọi điện thoại phỏng vấn từng người một.",
          "Trong mô hình việc làm tức thời, kỹ năng sàng lọc hồ sơ nhanh qua các chỉ số trên hệ thống là yếu tố sống còn giúp cửa hàng vận hành trơn tru."
        ]
      },
      {
        "heading": "1. Phân tích \"Điểm Uy Tín\" và Lịch sử hoàn thành",
        "paragraphs": [
          "Đây là màng lọc quan trọng nhất. Một ứng viên có đánh giá 4.8/5 sao với lịch sử hoàn thành 20 ca làm việc tại các nhà hàng khác nhau là bảo chứng vàng cho thái độ của họ. Bạn có thể lướt đọc nhanh các nhận xét từ những người chủ trước.",
          "Hãy đặc biệt chú ý đến tỷ lệ vắng mặt (No-show). Nếu một hồ sơ có lịch sử nhận việc nhưng không đến làm mà không báo trước, bạn nên cân nhắc từ chối ngay lập tức để tránh rủi ro vỡ trận nhân sự."
        ],
        "imageUrl": "/images/handbook/unique/new_inline_art8.png",
        "imageCaption": "Đánh giá nhanh dựa trên điểm uy tín và kinh nghiệm giúp chủ quán tiết kiệm thời gian."
      },
      {
        "heading": "2. Đánh giá tính chuyên nghiệp qua sự chuẩn bị",
        "paragraphs": [
          "Bạn không cần tìm một người có bằng cấp, nhưng bạn cần một người có thái độ nghiêm túc. Điều này thể hiện qua việc họ chăm chút hồ sơ như thế nào. Ảnh đại diện rõ ràng, trang phục lịch sự, phần giới thiệu bản thân đi thẳng vào trọng tâm là những tín hiệu tích cực.",
          "Nếu một người lao động chủ động nhắn tin thông qua tính năng chat của hệ thống: \"Dạ em đã ứng tuyển, em ở cách quán 2km và có thể qua sớm 15 phút ạ\", đây chắc chắn là một cá nhân đáng tin cậy mà bạn nên duyệt ngay."
        ]
      },
      {
        "heading": "3. Trao cơ hội cho những người mới",
        "paragraphs": [
          "Đừng vội từ chối những hồ sơ hoàn toàn mới, chưa có kinh nghiệm. Mọi chuyên gia đều từng là người mới bắt đầu. Đối với những công việc không đòi hỏi kỹ năng chuyên môn như bốc xếp hàng, rửa bát, hay phụ chạy bàn, sự nhiệt tình và thể lực tốt quan trọng hơn kinh nghiệm.",
          "Rất nhiều bạn trẻ lần đầu đi làm mang trong mình tinh thần cống hiến rất cao. Việc bạn trao cho họ cơ hội đầu tiên không chỉ giúp bạn có được một nhân sự chăm chỉ mà còn tạo ra sự gắn kết, khiến họ mong muốn quay lại làm việc cho bạn trong tương lai."
        ]
      }
    ],
    "relatedSlugs": [
      "cach-dang-tin-tuyen-nguoi-ngan-han",
      "cach-danh-gia-nguoi-lao-dong-sau-ca"
    ]
  },
  {
    "id": "9",
    "slug": "cach-danh-gia-nguoi-lao-dong-sau-ca",
    "title": "Văn hóa đánh giá: Chìa khóa xây dựng nguồn nhân sự bền vững",
    "excerpt": "Dành ra 2 phút để đánh giá nhân sự sau mỗi ca làm không chỉ giúp cộng đồng phát triển mà còn là chiến lược giữ chân nhân tài cho riêng cơ sở của bạn.",
    "audience": "employer",
    "categoryId": "danh-cho-doanh-nghiep",
    "categoryLabel": "Dành cho doanh nghiệp",
    "tags": [
      "employer",
      "management",
      "rating"
    ],
    "publishedAt": "2026-07-08T14:00:00.000Z",
    "author": "CaLẻ Team",
    "readingTime": 6,
    "imageUrl": "/images/handbook/unique/new_grid_art9.png",
    "imageAlt": "Màn hình chấm điểm và viết nhận xét sau ca làm",
    "featured": false,
    "content": [
      {
        "paragraphs": [
          "Sau khi đóng cửa hàng, kiểm kê doanh thu và dọn dẹp, việc mở điện thoại lên để viết một dòng đánh giá nhân sự thường bị nhiều quản lý bỏ qua vì quá mệt mỏi. \"Việc xong rồi thì thôi, trả đủ tiền là được\" là một tư duy rất lỗi thời.",
          "Trong nền kinh tế chia sẻ (Gig Economy), hệ thống đánh giá hai chiều chính là hệ thống pháp luật định hình hành vi của người dùng."
        ]
      },
      {
        "heading": "1. Vũ khí giữ chân nhân sự tốt",
        "paragraphs": [
          "Nhu cầu được công nhận là một nhu cầu cơ bản của con người. Khi một bạn sinh viên hoàn thành tốt công việc, việc bạn tặng họ 5 sao cùng lời nhận xét: \"Em làm rất tốt, nhanh nhẹn, sạch sẽ. Lần sau quán đông khách anh sẽ gọi lại nhé!\" mang lại giá trị tinh thần cực lớn.",
          "Sự thiện cảm này khiến ứng viên đó luôn ưu tiên ứng tuyển vào cửa hàng của bạn mỗi khi bạn đăng ca mới, từ chối những công việc khác để quay lại làm cho một \"người sếp tốt\"."
        ],
        "imageUrl": "/images/handbook/unique/new_inline_art9.png",
        "imageCaption": "Đánh giá 5 sao sau mỗi ca làm là cách tốt nhất để xây dựng cộng đồng uy tín."
      },
      {
        "heading": "2. Xây dựng một mạng lưới ứng viên tin cậy",
        "paragraphs": [
          "Mỗi khi bạn đánh giá tốt một người, hệ thống sẽ ghi nhớ sự liên kết đó. Về lâu dài, bạn sẽ tự xây dựng được một tệp \"nhân sự quen\". Bất cứ khi nào bạn đăng ca khẩn cấp, hệ thống có thể ưu tiên thông báo cho những người này.",
          "Việc dùng đi dùng lại những người quen việc giúp bạn cắt giảm hoàn toàn thời gian đào tạo và hướng dẫn lại từ đầu, tối ưu hóa năng suất hoạt động của cửa hàng."
        ]
      },
      {
        "heading": "3. Có trách nhiệm với cộng đồng doanh nghiệp",
        "paragraphs": [
          "Ngược lại, nếu người lao động có thái độ trễ nải, lười biếng, hay vi phạm quy tắc, hãy thẳng thắn để lại phản hồi trung thực nhưng lịch sự. Đừng ngần ngại cho điểm thấp nếu họ xứng đáng. Hành động này giúp cảnh báo các doanh nghiệp khác, đồng thời là bài học quý giá để người lao động đó tự nhìn nhận và điều chỉnh lại hành vi của bản thân."
        ]
      }
    ],
    "relatedSlugs": [
      "xu-ly-khi-nguoi-lao-dong-huy-ca",
      "cach-chon-nguoi-phu-hop-cho-ca-ngan-han"
    ]
  },
  {
    "id": "10",
    "slug": "xu-ly-khi-nguoi-lao-dong-huy-ca",
    "title": "Khủng hoảng vắng mặt: Cách quản lý xử lý tình huống vỡ ca đột xuất",
    "excerpt": "Nhân sự báo hủy ca trước giờ G là cơn ác mộng lớn nhất. Hãy chuẩn bị các phương án dự phòng để luôn giữ cho hoạt động kinh doanh diễn ra suôn sẻ.",
    "audience": "employer",
    "categoryId": "danh-cho-doanh-nghiep",
    "categoryLabel": "Dành cho doanh nghiệp",
    "tags": [
      "employer",
      "management",
      "absence"
    ],
    "publishedAt": "2026-07-07T10:00:00.000Z",
    "author": "CaLẻ Team",
    "readingTime": 7,
    "imageUrl": "/images/handbook/unique/frustrated_cafe_manager.png",
    "imageAlt": "Quản lý tìm giải pháp thay thế khi nhân viên hủy ca",
    "featured": false,
    "content": [
      {
        "paragraphs": [
          "Đồng hồ điểm 17:30, chỉ còn 30 phút nữa là nhà hàng bước vào khung giờ phục vụ cao điểm bữa tối. Bất ngờ, điện thoại rung lên, ứng viên bạn vừa duyệt nhận việc báo tin nhắn: \"Anh ơi em bị hỏng xe không qua được\".",
          "Sự phẫn nộ và hoảng loạn là phản ứng tự nhiên, nhưng nó không giải quyết được vấn đề thiếu hụt người bưng bê. Thay vì nổi nóng, bạn cần khởi động ngay quy trình xử lý khủng hoảng."
        ]
      },
      {
        "heading": "1. Hành động ngay lập tức: Đăng ca siêu tốc",
        "paragraphs": [
          "Đừng lãng phí thời gian để đôi co với người lao động vừa hủy ca. Lập tức vào hệ thống, tái kích hoạt tin đăng tuyển dụng. Lần này, bạn cần sử dụng vũ khí mạnh nhất: Tăng thù lao.",
          "Việc nhích mức lương lên thêm 10.000đ/giờ so với bình thường sẽ ngay lập tức thu hút sự chú ý của lực lượng lao động dự bị ở khu vực lân cận. Số tiền chênh lệch này là chi phí hoàn toàn xứng đáng để cứu vãn một buổi tối đông khách thay vì để khách hàng phải chờ đợi và phản ánh dịch vụ tệ."
        ],
        "imageUrl": "/images/handbook/unique/new_inline_art1.png",
        "imageCaption": "Luôn có phương án dự phòng và xử lý khéo léo khi nhân sự bất ngờ hủy ca."
      },
      {
        "heading": "2. Xử lý triệt để vi phạm của nhân sự",
        "paragraphs": [
          "Chỉ sau khi mọi thứ đã được sắp xếp ổn thỏa và kết thúc giờ cao điểm, bạn mới tiến hành xử lý nhân sự vi phạm. Hãy sử dụng tính năng \"Báo cáo vắng mặt không lý do chính đáng\" trên ứng dụng.",
          "Nền tảng được thiết kế để bảo vệ quyền lợi của bạn. Việc báo cáo sẽ làm giảm điểm uy tín của tài khoản đó, thậm chí khóa tính năng nhận việc nếu vi phạm nhiều lần, tạo ra sự răn đe cần thiết đối với ý thức kỷ luật của người lao động."
        ]
      },
      {
        "heading": "3. Phương pháp phòng ngừa chủ động",
        "paragraphs": [
          "Quản lý giỏi là người không để khủng hoảng xảy ra. Bạn có thể áp dụng chiến lược \"Xác nhận kép\". Trước ca làm khoảng 3 tiếng, hãy gửi một tin nhắn ngắn gọn: \"Chào em, 18h tối nay em nhớ đến làm đúng giờ nhé, áo thun tối màu em nha\". Việc này không chỉ nhắc nhở ứng viên mà còn giúp bạn dò xét phản ứng của họ.",
          "Thứ hai, hãy luôn duy trì mối quan hệ tốt với những bạn sinh viên từng làm việc chăm chỉ tại quán. Lưu số điện thoại hoặc kết nối Zalo với họ. Trong những tình huống khẩn cấp \"cháy\" nhân sự, một cuộc gọi nhờ vả những người quen việc luôn hiệu quả hơn việc tìm kiếm người lạ từ đầu."
        ]
      }
    ],
    "relatedSlugs": [
      "cach-dang-tin-tuyen-nguoi-ngan-han",
      "cach-chon-nguoi-phu-hop-cho-ca-ngan-han"
    ]
  }
];
