/**
 * Trợ lý hỗ trợ nội bộ của CaLẻ (bong bóng chat, tab "Hỏi CaLẻ") — truy hồi trên kho hỏi
 * đáp, không gọi AI bên ngoài, chạy hoàn toàn ở trình duyệt.
 *
 * Hiểu câu hỏi:
 * 1. `foldText`: bỏ dấu, chữ thường, bỏ dấu câu, mở viết tắt ("ck", "stk", "ntd"...);
 *    sửa chữ gõ Telex khi chưa bật bộ gõ ("ruts tieenf" → "rut tien").
 * 2. Tách câu xã giao (chào, cảm ơn, "bạn là ai", "gặp người thật", bực bội, "sai rồi")
 *    khỏi câu hỏi; "chào bạn, rút tiền sao?" vẫn trả lời phần rút tiền.
 * 3. Bỏ từ đệm / cụm hỏi; gom từ đồng nghĩa về một từ ("lương" = "tiền công", "bom ca" =
 *    "vắng mặt"); "không / chưa … được" thêm từ riêng; sửa lỗi gõ lệch một ký tự.
 *
 * Chấm điểm (kiểu TF-IDF / BM25 rút gọn cho câu ngắn):
 * 4. Từ đơn + cặp từ liền nhau, trọng số IDF; cộng khi có nguyên cụm từ khoá, khi từ nằm
 *    trong câu hỏi chính của mục, khi từ CÓ DẤU trùng nguyên dấu ("ví" ≠ "vì"); ưu tiên
 *    mục đúng vai trò; ẩn mục chỉ dành cho quản trị viên. Xếp theo điểm × (tỷ lệ khớp)².
 * 5. Ngưỡng tin cậy: khớp dưới một nửa câu, câu nhiều từ mà chỉ trùng một từ, hay có từ
 *    lạ hẳn với kho → không đoán bừa. Lưới an toàn cuối: so bộ ba ký tự (character
 *    trigram) cho chữ gõ dính liền ("quenmatkhau").
 *
 * Hội thoại:
 * 6. Câu nối tiếp ngắn ("bao lâu?", "còn nhà tuyển dụng thì sao?") ghép với câu trước;
 *    nhiều câu trong một tin → trả lời từng câu; gõ trơn một từ khoá mơ hồ ("cọc") → hỏi
 *    lại kèm lựa chọn; câu về dữ liệu của chính người hỏi (số dư, ca tới, đơn, tin nhắn)
 *    → trả lời từ ảnh chụp dữ liệu giao diện đưa vào.
 * 7. Không chắc → nói thật, gợi ý mục gần nhất + kênh liên hệ; không hiểu lần thứ hai
 *    liên tiếp → khuyên gặp đội hỗ trợ (phiếu hỗ trợ kèm sẵn câu đã hỏi).
 *
 * Logic thuần, không React / IO; luôn trả về chữ không rỗng, không ném lỗi.
 */

export type SupportRole = 'worker' | 'employer' | 'guest' | 'admin';
export type SupportLocale = 'vi' | 'en';

export interface SupportText {
  vi: string;
  en: string;
}

export interface SupportLink {
  href: string;
  label: SupportText;
}

export interface SupportEntry {
  id: string;
  /** Nhóm để hiển thị (tuỳ chọn), vd 'wallet', 'shift'. */
  category?: string;
  /** Vai trò hay hỏi mục này; bỏ trống = chung cho mọi người. */
  roles?: SupportRole[];
  /** Các cách hỏi khác nhau (cả hai thứ tiếng đều được dùng để khớp). */
  questions: { vi: string[]; en: string[] };
  /** Từ / cụm từ khoá, viết không dấu hoặc có dấu đều được. */
  keywords: string[];
  /** `live`: bản dành cho production (tiền thật) nếu khác bản demo. */
  answer: SupportText & { live?: SupportText };
  /** Liên kết tới trang liên quan trong app. */
  links?: SupportLink[];
}

export type SmalltalkIntent =
  | 'greeting'
  | 'thanks'
  | 'whoami'
  | 'human'
  | 'bye'
  /** Người dùng bực bội ("bực quá", "app lỗi hoài"). */
  | 'complaint'
  /** "Sai rồi", "không phải ý mình" sau một câu trả lời. */
  | 'notHelpful';

/** Câu hỏi về dữ liệu của chính người hỏi (đọc từ app, không từ kho hỏi đáp). */
export type PersonalIntent = 'balance' | 'nextShift' | 'applications' | 'unread';

/** Mục trả lời thêm khi một tin có nhiều câu hỏi. */
export interface SupportExtraAnswer {
  entryId: string;
  text: string;
}

export type SupportReply =
  | {
      kind: 'answer';
      text: string;
      entryId: string;
      related: string[];
      /** Các câu hỏi khác trong cùng tin nhắn (tối đa 2). */
      also?: SupportExtraAnswer[];
      showContacts?: boolean;
    }
  | { kind: 'smalltalk'; text: string; intent: SmalltalkIntent; related: string[]; showContacts?: boolean }
  /** Câu quá mơ hồ: hỏi lại, đưa 2–3 mục để người dùng chọn. */
  | { kind: 'clarify'; text: string; options: string[]; related: string[]; showContacts?: boolean }
  | {
      kind: 'personal';
      text: string;
      intent: PersonalIntent;
      links?: SupportLink[];
      related: string[];
      showContacts?: boolean;
    }
  | { kind: 'fallback'; text: string; related: string[]; showContacts: true };

/**
 * Ảnh chụp dữ liệu của người đang hỏi, do giao diện dựng từ store. `null` = khách
 * (chưa đăng nhập); `undefined` ở từng trường = chưa có dữ liệu đó.
 */
export interface PersonalSnapshot {
  /** Họ tên hiển thị; trợ lý gọi bằng tên (từ cuối). */
  name?: string | null;
  /** Số dư ví (đồng). */
  balance?: number | null;
  /** Ca sắp tới gần nhất (người lao động: ca đã được nhận; NTD: ca đã đăng). */
  nextShift?: { title: string; when: string; href: string } | null;
  /** Người lao động: đơn đang chờ duyệt / đã được nhận (chưa làm). */
  applications?: { pending: number; approved: number } | null;
  /** Nhà tuyển dụng: số đơn ứng tuyển đang chờ bạn duyệt. */
  pendingReviews?: number | null;
  /** Tin chat chưa đọc. */
  unreadMessages?: number | null;
}

export interface SupportQueryOptions {
  kb: readonly SupportEntry[];
  locale: SupportLocale;
  /** true = production (tiền thật) → dùng `answer.live` nếu có. */
  live: boolean;
  role?: SupportRole | null;
  /** Lượt hỏi trước (để hiểu câu nối tiếp "bao lâu?", "còn nhà tuyển dụng thì sao?"). */
  previous?: { question: string; entryId?: string | null } | null;
  /** Dữ liệu của người hỏi; `null` = khách; bỏ trống = không trả lời câu hỏi cá nhân. */
  personal?: PersonalSnapshot | null;
  /** Giờ hiện tại (0–23) để chào theo buổi. */
  hour?: number;
  /** Số bất kỳ (vd số tin đã gửi) để đổi cách nói, không lặp y hệt. */
  seed?: number;
  /** Số lần liền trước trợ lý không hiểu — từ lần thứ hai khuyên gặp người thật. */
  recentFallbacks?: number;
}

// ---------------------------------------------------------------------------
// Chuẩn hoá chữ
// ---------------------------------------------------------------------------

/** Viết tắt hay gặp khi nhắn tin (đã bỏ dấu). */
const ABBREVIATIONS: Record<string, string> = {
  k: 'khong',
  ko: 'khong',
  kh: 'khong',
  hok: 'khong',
  hong: 'khong',
  kg: 'khong',
  khg: 'khong',
  dc: 'duoc',
  dk: 'dang ky',
  dn: 'dang nhap',
  ck: 'chuyen khoan',
  stk: 'so tai khoan',
  tk: 'tai khoan',
  acc: 'tai khoan',
  mk: 'mat khau',
  pass: 'mat khau',
  ntd: 'nha tuyen dung',
  nld: 'nguoi lao dong',
  nv: 'nhan vien',
  sdt: 'so dien thoai',
  dt: 'dien thoai',
  tt: 'thanh toan',
  tg: 'thoi gian',
  j: 'gi',
  z: 'vay',
  v: 'vay',
  r: 'roi',
  ns: 'noi',
  vs: 'voi',
  bn: 'bao nhieu',
  bnhieu: 'bao nhieu',
  ntn: 'nhu the nao',
  lm: 'lam',
  mik: 'minh',
  mn: 'moi nguoi',
  ib: 'nhan tin',
  inbox: 'nhan tin',
  cmnd: 'cccd',
  cmt: 'cccd',
  sp: 'ho tro',
  cskh: 'cham soc khach hang',
  camon: 'cam on',
  tks: 'thanks',
  thx: 'thanks',
  // Không map "ty" → thanks: "công ty" / "tỷ" gặp nhiều hơn.
  ng: 'nguoi',
  hk: 'khong',
  hem: 'khong',
  kp: 'khong phai',
  trc: 'truoc',
  ms: 'moi',
  bik: 'biet',
  lun: 'luon',
  nhiu: 'nhieu',
  cty: 'cong ty',
  dki: 'dang ky',
  dky: 'dang ky',
  xn: 'xac nhan',
  tkhoan: 'tai khoan',
  gg: 'google',
  fb: 'facebook',
  pw: 'mat khau',
  oke: 'ok',
  okay: 'ok',
  okie: 'ok',
};

/**
 * Bỏ dấu tiếng Việt, đ → d, chữ thường, dấu câu → khoảng trắng, gộp khoảng trắng,
 * mở viết tắt thường gặp. Dùng cho cả câu hỏi lẫn kho hỏi đáp.
 */
export function foldText(input: string): string {
  const base = String(input ?? '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!base) return '';
  const expanded = base
    .split(' ')
    .map((w) => ABBREVIATIONS[w] ?? w)
    .join(' ');
  // Tên app gõ rời ("ca lẻ") → một từ, không lẫn với "ca" (ca làm).
  return ` ${expanded} `.replace(/ ca le /g, ' cale ').trim();
}

/** Từ đệm / hư từ: không mang nghĩa để phân biệt câu hỏi. */
const STOPWORDS = new Set(
  (
    // tiếng Việt (đã bỏ dấu)
    'a ah ak oi nhe nha nhi vay the nao sao gi la cua cho va voi thi ma co khong duoc bi ' +
    'toi minh em anh chi ban ad cac nhung mot nay do kia o de ve ra vao lam roi da can muon ' +
    'phai nhu neu khi giup hoi xin u uh hay hoac nua luon chua ha cai con biet ah vui long ' +
    'dum gium voi tu trong tren duoi luc bay gio hien moi nguoi ai minh oi khac kieu cach ben ' +
    'shop van mai ro se cung rat xiu chut ay e ' +
    // tiếng Anh — KHÔNG gồm "that" (thật), "so" (số), "an" (an toàn): trùng âm tiết Việt.
    'i me my we our you your a the to of in on at for is are am be been do does did can ' +
    'could how what when where why which who it its this these those and or with please ' +
    'there have has should would will if about any from by as not just me want need im ' +
    'there s'
  ).split(/\s+/),
);
// "ai" là "ai" (ai đó) và "AI": chỉ dùng trong nhận diện xã giao, không dùng để khớp.

/**
 * Cụm hỏi (đã chuẩn hoá) không mang nghĩa phân biệt: "tại sao", "bao giờ", "bao nhiêu",
 * "ở đâu", "hôm nay". Bỏ cả cụm (không bỏ từng từ: "tài khoản", "thông báo" vẫn giữ).
 */
const STOP_PHRASES = [
  'tai sao', 'bao nhieu', 'o dau', 'hom nay',
  // "vì" bỏ dấu trùng "ví": bỏ các cụm "vì" để "vi" còn lại gần như luôn là ví tiền.
  'vi sao', 'tai vi', 'boi vi', 'vi the', 'vi vay',
  // "xử lý sao" = "làm gì bây giờ", không phải "đang xử lý" (giao dịch).
  'xu ly sao', 'xu ly the nao', 'xu ly ra sao', 'phai xu ly',
];

/**
 * Nhóm đồng nghĩa → một từ chung (áp cho cả câu hỏi lẫn kho), để câu hỏi dùng từ
 * khác với kho vẫn khớp: "lương" = "tiền công", "bom ca" = "vắng mặt"… Xét cụm dài
 * trước ("số lượng" không thành "tiền công").
 */
const SYNONYM_GROUPS: Array<[string, string[]]> = [
  ['soluong', ['so luong']],
  // Ý hỏi: "là gì" (định nghĩa), "khi nào / bao lâu" (thời điểm), "sai / oan" (khiếu nại).
  ['lagi', ['dung de lam gi', 'de lam gi', 'nghia la gi', 'la cai gi', 'la gi', 'what is', 'what does', 'meaning of']],
  ['khinao', ['khi nao', 'bao gio', 'bao lau', 'luc nao', 'when', 'how long']],
  ['trangthai', ['trang thai', 'duyet chua', 'nhan chua', 'den dau roi', 'status']],
  // Tiếng Anh về điểm uy tín: 'lose points' = 'bị trừ điểm'.
  ['diem', ['points', 'point', 'score']],
  ['tru', ['lose', 'lost', 'deduct', 'deducted']],
  ['phi', ['cat phan tram', 'tru phan tram', 'an chia', 'hoa hong', 'chiet khau', 'commission']],
  ['khongdung', ['khong dung', 'khong cong bang', 'bat cong', 'oan', 'unfair']],
  // Giữ cả "tien" để "tiền" chung chung vẫn khớp mục nói về tiền công.
  ['tiencong tien', ['tien cong', 'tien luong', 'luong', 'thu nhap', 'wage', 'wages', 'salary']],
  ['ntd', ['nha tuyen dung', 'employer', 'employers', 'chu quan', 'chu cua hang']],
  ['nld', ['nguoi lao dong', 'nguoi di lam', 'nguoi lam', 'nhan vien', 'worker', 'workers']],
  ['xongca', ['lam xong ca', 'lam xong', 'xong ca', 'het ca', 'ket thuc ca', 'finished my shift', 'finished the shift']],
  ['lichsu', ['lich su', 'history']],
  ['lichlam', ['lich lam viec', 'lich lam', 'lich ca', 'lich trinh', 'lich cua toi', 'lich ca nhan', 'schedule', 'calendar']],
  ['luadao', ['lua dao', 'bi lua', 'lua tien', 'scam', 'scammer', 'fraud']],
  ['tuchoi', ['tu choi', 'bi loai', 'reject', 'rejected', 'declined']],
  ['dunguoi', ['du nguoi', 'day nguoi', 'het cho', 'het slot', 'het suat', 'full slot']],
  ['vangmat', ['vang mat', 'khong co mat', 'khong den', 'khong toi', 'bom ca', 'bung ca', 'no show', 'absent']],
  ['danhgia', ['danh gia', 'rating', 'ratings', 'cham diem sao']],
  ['khuvuc', ['khu vuc', 'tinh thanh', 'thanh pho', 'ha noi', 'sai gon', 'hcm', 'tp hcm', 'ho chi minh', 'da nang', 'can tho', 'hai phong']],
  ['gannha', ['gan nha', 'gan day', 'gan toi', 'gan cho toi', 'nearby', 'near me']],
];

const SYNONYMS: Array<[string, string]> = SYNONYM_GROUPS.flatMap(([to, froms]) =>
  froms.map((from): [string, string] => [from, to]),
).sort((a, b) => b[0].length - a[0].length);

/** Ghép cụm hay gõ rời thành một từ để không lẫn ("check in" ≠ "check out"). */
const JOIN_PHRASES: Array<[string, string]> = [
  ['check in', 'checkin'],
  ['check out', 'checkout'],
  // "rối" / "rơi" trùng "rồi" (từ đệm) khi bỏ dấu.
  ['quay roi', 'quayroi'],
  ['to roi', 'toroi'],
];

/** "không / chưa … được" (không làm được) → thêm từ riêng để tách khỏi câu hỏi "làm thế nào". */
const NEGATION_TOKEN = 'khongduoc';
const NEGATION_WORDS = new Set(['khong', 'chua']);
const NEGATION_SPAN = 4;
const NUMBER_TOKEN = /^\d+[a-z]{0,2}$/;
const ARITHMETIC = /(^|\s)\d+ (cong|tru|nhan|chia|x|plus|minus|times) \d+(\s|$)/;

/** Rút gọn đuôi tiếng Anh; âm tiết tiếng Việt không bao giờ có các đuôi này. */
function stem(token: string): string {
  if (token.length <= 4) return token;
  if (token.endsWith('ing')) return token.slice(0, -3);
  if (token.endsWith('ed')) return token.slice(0, -2);
  if (token.endsWith('al')) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function contentTokens(folded: string): string[] {
  if (!folded) return [];
  let padded = ` ${folded} `;
  for (const [from, to] of JOIN_PHRASES) padded = padded.split(` ${from} `).join(` ${to} `);
  for (const p of STOP_PHRASES) padded = padded.split(` ${p} `).join(' ');
  for (const [from, to] of SYNONYMS) padded = padded.split(` ${from} `).join(` ${to} `);
  const raw = padded.split(' ').filter(Boolean);
  // Số ("3", "20 phút", "45k", "3h") không phân biệt câu hỏi mà dễ trùng ngẫu nhiên: bỏ.
  const out = raw.filter((t) => !STOPWORDS.has(t) && !NUMBER_TOKEN.test(t)).map(stem);
  const negated = raw.some(
    (t, i) => NEGATION_WORDS.has(t) && raw.slice(i + 1, i + 1 + NEGATION_SPAN).includes('duoc'),
  );
  if (negated) out.push(NEGATION_TOKEN);
  return out;
}

interface Features {
  uni: Set<string>;
  bi: Set<string>;
}

function featuresOf(tokens: string[]): Features {
  const uni = new Set(tokens);
  const bi = new Set<string>();
  for (let i = 0; i + 1 < tokens.length; i++) bi.add(`${tokens[i]} ${tokens[i + 1]}`);
  return { uni, bi };
}

// ---------------------------------------------------------------------------
// Chỉ mục kho hỏi đáp (dựng một lần cho mỗi mảng kho)
// ---------------------------------------------------------------------------

interface IndexedEntry {
  entry: SupportEntry;
  uni: Set<string>;
  bi: Set<string>;
  /** Cụm từ khoá đã chuẩn hoá (có khoảng trắng hai đầu để so nguyên từ). */
  phrases: string[];
  /** Từ của câu hỏi chính (câu đầu mỗi thứ tiếng) — chủ đề chính của mục. */
  title: Set<string>;
  /** Từ CÓ DẤU (giữ nguyên dấu) — phân biệt "ví"/"vì", "đăng"/"đang" khi người dùng gõ dấu. */
  accented: Set<string>;
  /** Bộ ba ký tự của từng câu hỏi (bỏ dấu, bỏ khoảng trắng) — bắt chữ gõ dính liền. */
  grams: Set<string>[];
}

interface KbIndex {
  items: IndexedEntry[];
  /** Mọi từ (đã bỏ dấu) xuất hiện trong kho — để nhận ra chữ gõ Telex đã sửa đúng. */
  words: Set<string>;
  df: Map<string, number>;
  vocab: string[];
  n: number;
}

const indexCache = new WeakMap<readonly SupportEntry[], KbIndex>();

function buildIndex(kb: readonly SupportEntry[]): KbIndex {
  const cached = indexCache.get(kb);
  if (cached) return cached;
  const df = new Map<string, number>();
  const items: IndexedEntry[] = kb.map((entry) => {
    const uni = new Set<string>();
    const bi = new Set<string>();
    const texts = [...entry.questions.vi, ...entry.questions.en, ...entry.keywords];
    for (const text of texts) {
      const f = featuresOf(contentTokens(foldText(text)));
      f.uni.forEach((u) => uni.add(u));
      f.bi.forEach((b) => bi.add(b));
    }
    const phrases = entry.keywords
      .map((k) => contentTokens(foldText(k)).join(' '))
      .filter(Boolean)
      .map((k) => ` ${k} `);
    const title = new Set(
      [entry.questions.vi[0], entry.questions.en[0]].flatMap((q) => (q ? contentTokens(foldText(q)) : [])),
    );
    const accented = new Set(texts.flatMap(accentedWords));
    // Hai dạng cho mỗi câu hỏi: đủ chữ và đã bỏ từ đệm (người gõ dính liền có thể gõ cả hai kiểu).
    const grams = [...entry.questions.vi, ...entry.questions.en]
      .flatMap((q) => [foldText(q).replace(/ /g, ''), contentTokens(foldText(q)).join('')])
      .map(trigrams)
      .filter((g) => g.size > 0);
    return { entry, uni, bi, phrases, title, accented, grams };
  });
  for (const it of items) {
    it.uni.forEach((u) => df.set(`u:${u}`, (df.get(`u:${u}`) ?? 0) + 1));
    it.bi.forEach((b) => df.set(`b:${b}`, (df.get(`b:${b}`) ?? 0) + 1));
  }
  const vocab = [...new Set(items.flatMap((it) => [...it.uni]))];
  const words = new Set<string>();
  for (const entry of kb) {
    for (const text of [...entry.questions.vi, ...entry.questions.en, ...entry.keywords]) {
      for (const w of foldText(text).split(' ')) if (w) words.add(w);
    }
  }
  const index = { items, words, df, vocab, n: Math.max(1, items.length) };
  indexCache.set(kb, index);
  return index;
}

/** Từ có dấu tiếng Việt trong một câu (chữ thường, giữ dấu). */
function accentedWords(text: string): string[] {
  return String(text ?? '')
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && /[^a-z0-9]/.test(w));
}

/** Tập bộ ba ký tự liên tiếp (character trigram) của một chuỗi. */
function trigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + 3 <= s.length; i++) out.add(s.slice(i, i + 3));
  return out;
}

/** Hệ số Dice giữa hai tập bộ ba: 2·|A∩B| / (|A|+|B|). */
function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  a.forEach((g) => {
    if (b.has(g)) common++;
  });
  return (2 * common) / (a.size + b.size);
}

/** Từ hiếm nặng hơn; từ không có trong kho nặng nhất (kéo tỷ lệ khớp xuống). */
function idf(index: KbIndex, key: string): number {
  const d = index.df.get(key) ?? 0;
  return Math.log(1 + index.n / (d > 0 ? d : 0.5));
}

/**
 * Sửa lỗi gõ nhẹ: từ lạ (≥5 ký tự) lệch đúng 1 ký tự so với một từ (≥5 ký tự) trong kho.
 * Không sửa từ 4 ký tự: âm tiết Việt bỏ dấu lệch nhau một chữ rất nhiều ("tran" / "trang",
 * "banh" / "bang") nên dễ biến câu ngoài phạm vi thành câu "khớp".
 */
const TYPO_MIN_LENGTH = 5;
function closeEnough(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || a[0] !== b[0]) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function correctTypos(index: KbIndex, tokens: string[]): string[] {
  return tokens.map((t) => {
    if (t.length < TYPO_MIN_LENGTH || index.df.has(`u:${t}`)) return t;
    return index.vocab.find((v) => v.length >= TYPO_MIN_LENGTH && closeEnough(t, v)) ?? t;
  });
}

interface Scored {
  item: IndexedEntry;
  score: number;
  coverage: number;
  /** Số từ (khác nhau) của câu hỏi có trong mục. */
  matched: number;
  /** Cả câu hỏi trùng nguyên một từ khoá / câu hỏi chính của mục. */
  exact: boolean;
}

const ROLE_MATCH_BOOST = 1.25;
const ROLE_MISMATCH_FACTOR = 0.75;
/** Khách / chưa rõ vai trò: mục chỉ dành cho quản trị viên lùi xuống. */
const ADMIN_ONLY_FACTOR = 0.6;
const BIGRAM_WEIGHT = 1.2;
/** Từ nằm ngay trong câu hỏi chính của mục: tách hoà giữa các mục cùng có từ đó. */
const TITLE_WEIGHT = 0.25;
/** Từ có dấu trùng nguyên dấu với kho: cộng thêm tỷ lệ này × độ hiếm của từ. */
const ACCENT_WEIGHT = 0.15;
/** Bộ ba ký tự: ≥ ngưỡng này thì trả lời, ≥ ngưỡng gợi ý thì đưa vào "Có phải bạn muốn hỏi". */
const TRIGRAM_ANSWER = 0.6;
const TRIGRAM_GUESS = 0.45;
const TRIGRAM_MIN_LENGTH = 6;
const MIN_COVERAGE = 0.5;
const MIN_COVERAGE_WITH_UNKNOWN = 0.6;
const MIN_SCORE = 0.5;
const RELATED_SCORE_RATIO = 0.35;
const RELATED_MIN_COVERAGE = 0.3;
const GUESS_MIN_COVERAGE = 0.4;

/**
 * Ưu tiên theo vai trò người hỏi. Người lao động / nhà tuyển dụng: mục đúng vai trò
 * lên, mục của vai trò khác xuống. Khách: chỉ mục dành riêng cho khách lên, mục
 * chỉ của quản trị viên xuống (khách hỏi cả chuyện đi làm lẫn tuyển người).
 */
function roleFactor(roles: SupportRole[] | undefined, role: SupportRole | null | undefined): number {
  if (!roles || roles.length === 0) return 1;
  const adminOnly = roles.every((r) => r === 'admin');
  if (!role || role === 'guest') {
    if (role === 'guest' && roles.includes('guest')) return ROLE_MATCH_BOOST;
    return adminOnly ? ADMIN_ONLY_FACTOR : 1;
  }
  if (role === 'admin') return 1;
  return roles.includes(role) ? ROLE_MATCH_BOOST : ROLE_MISMATCH_FACTOR;
}

function rank(
  index: KbIndex,
  tokens: string[],
  role: SupportRole | null | undefined,
  accents: ReadonlySet<string> = new Set(),
): Scored[] {
  const q = featuresOf(tokens);
  if (q.uni.size === 0) return [];
  const qJoined = ` ${tokens.join(' ')} `;
  let total = 0;
  q.uni.forEach((u) => (total += idf(index, `u:${u}`)));

  // Người lao động / nhà tuyển dụng / khách: không trả lời hay gợi ý mục chỉ dành cho
  // quản trị viên (chưa rõ vai trò thì vẫn xét, chỉ xếp thấp hơn).
  const hideAdminOnly = role === 'worker' || role === 'employer' || role === 'guest';
  const scored: Scored[] = [];
  for (const item of index.items) {
    const roles = item.entry.roles;
    if (hideAdminOnly && roles && roles.length > 0 && roles.every((r) => r === 'admin')) continue;
    let uniHit = 0;
    let titleHit = 0;
    let matched = 0;
    q.uni.forEach((u) => {
      if (item.uni.has(u)) {
        const w = idf(index, `u:${u}`);
        uniHit += w;
        matched++;
        if (item.title.has(u)) titleHit += w;
      }
    });
    if (uniHit === 0) continue;
    let biHit = 0;
    q.bi.forEach((b) => {
      if (item.bi.has(b)) biHit += idf(index, `b:${b}`);
    });
    let phraseHit = 0;
    let exact = false;
    for (const p of item.phrases) {
      if (p === qJoined) {
        phraseHit += 3;
        exact = true;
      }
      else if (qJoined.includes(p)) phraseHit += p.trim().includes(' ') ? 1.5 : 0.75;
    }
    // Người dùng gõ có dấu: từ có dấu trùng khớp nguyên dấu được cộng thêm (tách "ví" / "vì").
    let accentHit = 0;
    // Chỉ xét từ có nghĩa (bỏ "là", "gì", "được"…), nặng nhẹ theo độ hiếm của từ.
    accents.forEach((w) => {
      const folded = foldText(w);
      if (!folded || STOPWORDS.has(folded) || !item.accented.has(w)) return;
      accentHit += ACCENT_WEIGHT * idf(index, `u:${stem(folded)}`);
    });
    let score = uniHit + BIGRAM_WEIGHT * biHit + phraseHit + TITLE_WEIGHT * titleHit + accentHit;
    score *= roleFactor(item.entry.roles, role);
    scored.push({ item, score, coverage: uniHit / total, matched, exact: exact || titleHit === uniHit });
  }
  // Xếp theo điểm × (tỷ lệ khớp)²: mục giải thích được trọn câu hỏi thắng mục chỉ có
  // nhiều cách hỏi na ná (nhiều cặp từ trùng) mà thiếu một từ chính của câu.
  const key = (s: Scored) => s.score * s.coverage * s.coverage;
  return scored.sort((a, b) => key(b) - key(a) || b.coverage - a.coverage);
}

// ---------------------------------------------------------------------------
// Xã giao
// ---------------------------------------------------------------------------

/** Cụm (đã chuẩn hoá) theo ý định; xét cụm dài trước khi bóc khỏi câu. */
const SMALLTALK: Record<SmalltalkIntent, string[]> = {
  human: [
    'nguoi that', 'gap nguoi', 'noi chuyen voi nguoi', 'nhan vien ho tro', 'nhan vien cham soc',
    'nhan vien tu van', 'gap nhan vien', 'noi chuyen voi nhan vien', 'tu van vien',
    'cham soc khach hang', 'tong dai vien', 'gap admin', 'gap quan tri vien', 'human',
    'real person', 'live agent', 'talk to someone', 'talk to a person', 'speak to someone',
    'support staff', 'customer service', 'customer support',
  ],
  whoami: [
    'ban la ai', 'ban la bot', 'ban la gi', 'ban la nguoi hay may', 'ban la nguoi that khong',
    'ban co phai la ai khong', 'ban co phai bot khong', 'day la ai', 'ai dang tra loi',
    'who are you', 'what are you', 'are you a bot', 'are you human', 'are you real',
    'are you an ai', 'are you ai', 'chatbot', 'bot',
  ],
  thanks: [
    'cam on nhieu', 'cam on', 'thank you', 'thanks', 'thank', 'ok', 'hieu roi', 'da hieu',
    'got it', 'great', 'tuyet voi', 'tot qua',
  ],
  bye: ['tam biet', 'hen gap lai', 'bye bye', 'goodbye', 'bye', 'see you', 'pp'],
  greeting: [
    'xin chao', 'chao buoi sang', 'chao buoi chieu', 'chao buoi toi', 'chao ban', 'chao shop',
    'chao', 'hello', 'helo', 'hi', 'hey', 'alo', 'good morning', 'good afternoon', 'good evening',
  ],
  complaint: [
    'buc qua', 'buc minh', 'buc ghe', 'buc', 'uc che', 'te qua', 'te that su', 'te that', 'chan qua',
    'chan that', 'tuc qua', 'phien qua', 'kho chiu', 'loi hoai', 'loi mai', 'do qua', 'vo dung',
    'this sucks', 'annoying', 'terrible', 'useless', 'so frustrating', 'frustrated',
  ],
  notHelpful: [
    'sai roi', 'khong phai y minh', 'khong phai y toi', 'khong phai y em', 'khong phai cai do',
    'khong dung y', 'chua dung y', 'van khong duoc', 'van chua duoc', 'khong giup duoc gi',
    'chua hieu', 'khong hieu', 'that s wrong', 'wrong answer', 'not helpful', 'not what i asked',
  ],
};

/** Thứ tự ưu tiên khi một câu chỉ toàn xã giao ("chào, cảm ơn" → cảm ơn). */
const INTENT_PRIORITY: SmalltalkIntent[] = [
  'human', 'complaint', 'notHelpful', 'whoami', 'thanks', 'bye', 'greeting',
];

const ALL_SMALLTALK = (Object.keys(SMALLTALK) as SmalltalkIntent[])
  .flatMap((intent) => SMALLTALK[intent].map((phrase) => ({ intent, phrase })))
  .sort((a, b) => b.phrase.length - a.phrase.length);

function splitSmalltalk(folded: string): { intents: Set<SmalltalkIntent>; rest: string } {
  const intents = new Set<SmalltalkIntent>();
  let padded = ` ${folded} `;
  for (const { intent, phrase } of ALL_SMALLTALK) {
    const needle = ` ${phrase} `;
    if (padded.includes(needle)) {
      intents.add(intent);
      padded = padded.split(needle).join(' ');
    }
  }
  return { intents, rest: padded.trim() };
}

// ---------------------------------------------------------------------------
// Câu trả lời cố định của trợ lý
// ---------------------------------------------------------------------------

export const SUPPORT_BOT_COPY: Record<
  Exclude<SmalltalkIntent, 'complaint' | 'notHelpful'> | 'fallback' | 'welcome',
  SupportText
> = {
  welcome: {
    vi: 'Chào bạn, mình là trợ lý tự động của CaLẻ, rất vui được hỗ trợ bạn ạ. Mình chỉ trả lời các câu hỏi về CaLẻ: tìm ca, ứng tuyển, đăng ca, check-in, ví, cọc, tài khoản… Bạn cứ gõ câu hỏi, có dấu hay không dấu đều được nhé.',
    en: "Hi, I'm CaLẻ's automated assistant. I only answer questions about CaLẻ: finding shifts, applying, posting shifts, check-in, wallet, deposits, accounts… Just type your question.",
  },
  greeting: {
    vi: 'Dạ, chào bạn ạ! Mình là trợ lý tự động của CaLẻ, chỉ trả lời các câu hỏi về CaLẻ (ứng tuyển, đăng ca, ví, cọc, tài khoản…). Bạn cần mình giúp gì ạ?',
    en: "Hi! I'm CaLẻ's automated assistant and only answer questions about CaLẻ (applying, posting shifts, wallet, deposits, accounts…). What would you like to know?",
  },
  thanks: {
    vi: 'Dạ, không có gì đâu ạ! Bạn cần hỏi thêm gì về CaLẻ cứ nhắn mình nhé.',
    en: 'You are welcome! Ask me anything else about CaLẻ.',
  },
  whoami: {
    vi: 'Dạ, mình là trợ lý tự động của CaLẻ, không phải người thật ạ. Mình trả lời theo bộ hỏi đáp nội bộ của CaLẻ nên chỉ giúp được các câu hỏi về CaLẻ. Cần người thật thì bạn liên hệ đội hỗ trợ ở tab Liên hệ nhé.',
    en: "I'm CaLẻ's automated assistant, not a person. I answer from CaLẻ's internal help content, so I can only help with questions about CaLẻ. For a real person, use the Contact tab.",
  },
  human: {
    vi: 'Dạ, bạn có thể gặp đội hỗ trợ CaLẻ qua hotline, Facebook, Zalo hoặc gửi phiếu hỗ trợ qua email ạ. Khi nhắn, bạn ghi kèm email đăng ký và mã ca (nếu có) để được xử lý nhanh hơn nhé.',
    en: 'You can reach the CaLẻ support team by hotline, Facebook, Zalo or a support ticket by email. Include your account email and the shift code (if any) so we can help faster.',
  },
  bye: {
    vi: 'Dạ, tạm biệt bạn ạ! Khi cần, bạn cứ bấm vào bong bóng chat ở góc màn hình nhé.',
    en: 'Goodbye! Tap the chat bubble in the corner whenever you need help.',
  },
  fallback: {
    vi: 'Dạ, xin lỗi bạn, mình chưa hiểu câu này ạ. Mình chỉ trả lời các câu hỏi về CaLẻ; bạn thử hỏi ngắn gọn hơn giúp mình (vd "rút tiền thế nào", "huỷ ca có bị trừ điểm không"), hoặc liên hệ đội hỗ trợ qua các kênh bên dưới nhé.',
    en: "Sorry, I didn't catch that. I only answer questions about CaLẻ; try a shorter question (e.g. \"how do I withdraw\", \"can I cancel a shift\"), or contact the support team below.",
  },
};

/** Cách nói thay phiên (chọn theo `seed`) để trợ lý không lặp một câu y hệt. */
const VARIANTS: Record<'thanks' | 'bye' | 'fallback' | 'complaint' | 'notHelpful' | 'clarify', SupportText[]> = {
  thanks: [
    SUPPORT_BOT_COPY.thanks,
    { vi: 'Dạ, rất vui được giúp bạn ạ! Còn thắc mắc gì về CaLẻ thì bạn cứ hỏi tiếp nhé.', en: 'Happy to help! Ask away if anything else about CaLẻ comes up.' },
    { vi: 'Dạ, không có chi ạ! Mình luôn ở góc màn hình nếu bạn cần nhé.', en: "Anytime! I'm right here in the corner if you need me." },
    { vi: 'Dạ vâng ạ! Chúc bạn làm ca suôn sẻ nhé.', en: 'Great! Hope your shifts go smoothly.' },
  ],
  bye: [
    SUPPORT_BOT_COPY.bye,
    { vi: 'Dạ, hẹn gặp lại bạn ạ! Chúc bạn một ngày làm việc suôn sẻ.', en: 'See you! Have a smooth day at work.' },
    { vi: 'Dạ, tạm biệt bạn nhé! Cần gì bạn cứ quay lại hỏi mình ạ.', en: 'Bye for now! Come back anytime.' },
  ],
  fallback: [
    SUPPORT_BOT_COPY.fallback,
    {
      vi: 'Dạ, câu này mình chưa có câu trả lời, mong bạn thông cảm ạ. Mình chỉ biết các chuyện về CaLẻ (ca làm, ứng tuyển, ví, cọc, tài khoản…). Bạn thử diễn đạt khác, hoặc nhắn đội hỗ trợ qua các kênh bên dưới nhé.',
      en: "I don't have an answer for that yet. I only know about CaLẻ (shifts, applying, wallet, deposits, accounts…). Try rephrasing, or message the support team below.",
    },
    {
      vi: 'Dạ, mình xin lỗi vì chưa nắm được ý bạn. Bạn hỏi ngắn hơn một chút giúp mình được không ạ, vd "đăng ca thế nào" hay "khi nào nhận lương"? Nếu cần gấp, đội hỗ trợ ở ngay bên dưới nhé.',
      en: 'Hmm, I didn\'t quite get that. Could you ask more briefly, e.g. "how do I post a shift" or "when do I get paid"? If it\'s urgent, the support team is right below.',
    },
  ],
  complaint: [
    {
      vi: 'Dạ, mình rất tiếc vì bạn gặp chuyện khó chịu. Bạn kể ngắn gọn bạn đang vướng ở bước nào (vd "không rút được tiền", "không check-in được"), mình chỉ cách ngay; hoặc nhắn thẳng đội hỗ trợ qua các kênh dưới đây, có người thật xử lý cho bạn.',
      en: "I'm really sorry you're having a rough time. Tell me briefly where you're stuck (e.g. \"can't withdraw\", \"can't check in\") and I'll help right away, or message the support team below — a real person will handle it.",
    },
    {
      vi: 'Dạ, mình xin lỗi bạn vì trải nghiệm chưa tốt. Mình muốn giúp bạn: bạn đang gặp lỗi gì ạ? Nếu cần người thật, đội hỗ trợ CaLẻ ở ngay bên dưới nhé.',
      en: "Sorry about the bad experience. I'd like to help — what went wrong? If you need a real person, the CaLẻ support team is right below.",
    },
  ],
  notHelpful: [
    {
      vi: 'Dạ, xin lỗi bạn, có lẽ mình hiểu sai ý bạn. Có phải bạn muốn hỏi một trong các ý dưới đây? Nếu không, bạn nhắn đội hỗ trợ để được giải đáp trực tiếp nhé.',
      en: 'Sorry, I may have misunderstood. Did you mean one of these? If not, message the support team for a direct answer.',
    },
    {
      vi: 'Dạ, mình xin lỗi vì câu trả lời chưa đúng ý. Bạn thử chọn một câu gần nhất dưới đây, hoặc diễn đạt lại giúp mình nhé.',
      en: "Sorry that wasn't what you needed. Try one of the closest questions below, or rephrase it for me.",
    },
  ],
  clarify: [
    { vi: 'Dạ, bạn muốn hỏi ý nào dưới đây ạ?', en: 'Which of these did you mean?' },
    { vi: 'Dạ, câu này có vài ý, bạn chọn giúp mình ý gần nhất nhé:', en: 'That could mean a few things — pick the closest one:' },
  ],
};

/** Không hiểu lần thứ hai liên tiếp: chuyển sang người thật thay vì bắt hỏi lại. */
const ESCALATE: SupportText = {
  vi: 'Dạ, mình thành thật xin lỗi vì vẫn chưa hiểu được câu hỏi này. Để không mất thời gian của bạn, bạn liên hệ đội hỗ trợ CaLẻ qua một trong các kênh dưới đây nhé; phiếu hỗ trợ sẽ kèm sẵn câu bạn vừa hỏi ạ.',
  en: "I still can't work this one out, sorry. To save you time, please contact the CaLẻ support team through one of the channels below; the support ticket will include your question.",
};

/** Câu mở đầu khi người dùng bực mà vẫn có câu hỏi rõ ràng. */
const EMPATHY_PREFIX: SupportText = {
  vi: 'Dạ, mình rất xin lỗi bạn vì sự bất tiện. ',
  en: 'Sorry for the trouble. ',
};

function pick(list: SupportText[], seed: number | undefined, locale: SupportLocale): string {
  const n = typeof seed === 'number' && Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  return list[n % list.length][locale];
}

function copy(key: keyof typeof SUPPORT_BOT_COPY, locale: SupportLocale): string {
  return SUPPORT_BOT_COPY[key][locale];
}

function answerText(entry: SupportEntry, locale: SupportLocale, live: boolean): string {
  const text = live && entry.answer.live ? entry.answer.live[locale] : entry.answer[locale];
  return text && text.trim() ? text : entry.answer.vi || copy('fallback', locale);
}

// ---------------------------------------------------------------------------
// Lễ phép: bộ hỏi đáp viết gọn kiểu tài liệu ("Không. …", "Bấm …"); trả nguyên văn
// nghe cộc lốc ("trống không"). Thêm lời mở "Dạ" + một câu kết hỏi han (đổi theo seed).
// ---------------------------------------------------------------------------

/** Câu trả lời một chữ ở đầu → dạng lễ phép. */
const CURT_START: Array<[RegExp, string]> = [
  [/^Không\.\s*/, 'Dạ không ạ. '],
  [/^Không,\s*/, 'Dạ không ạ, '],
  [/^Được\.\s*/, 'Dạ được ạ. '],
  [/^Được,\s*/, 'Dạ được ạ, '],
  [/^Có\.\s*/, 'Dạ có ạ. '],
  [/^Có,\s*/, 'Dạ có ạ, '],
  [/^Chưa\.\s*/, 'Dạ chưa ạ. '],
  [/^Chưa,\s*/, 'Dạ chưa ạ, '],
];
/** Câu mệnh lệnh ("Bấm …", "Mở …") → "Dạ, bạn bấm …". */
const IMPERATIVE_START = /^(Bấm|Mở|Vào|Kiểm tra|Sửa|Thử|Tới|Chọn|Nhập|Gõ|Gửi|Liên hệ)\s/;
/** Từ đầu giữ chữ hoa: tên riêng, viết tắt (CCCD, OTP), chữ trong ngoặc kép. */
const KEEP_CASE_START = /^(CaLẻ|PayOS|Google|Zalo|Facebook|Beta|["“'(]|\p{Lu}{2,}|\p{Lu}\p{Ll}*\p{Lu})/u;

const CLOSINGS: SupportText[] = [
  { vi: 'Bạn cần hỏi thêm gì cứ nhắn mình nhé.', en: 'Let me know if there is anything else I can help with.' },
  { vi: 'Mình có thể giúp gì thêm cho bạn không ạ?', en: 'Is there anything else I can help you with?' },
  { vi: 'Nếu còn chỗ nào chưa rõ, bạn cứ hỏi tiếp mình nhé.', en: 'If anything is unclear, feel free to ask me.' },
];

/**
 * Câu trả lời lễ phép: (vi) lời mở "Dạ" — "Không." → "Dạ không ạ.", "Bấm …" → "Dạ, bạn
 * bấm …", còn lại "Dạ, " + chữ thường đầu (giữ tên riêng / viết tắt) — rồi (mặc định)
 * thêm một câu kết hỏi han chọn theo `seed`. Tiếng Anh chỉ thêm câu kết.
 */
export function politeAnswer(
  body: string,
  locale: SupportLocale,
  seed: number | undefined,
  { closing = true }: { closing?: boolean } = {},
): string {
  let text = body.trim();
  if (locale === 'vi' && !/^Dạ[\s,]/.test(text)) {
    const curt = CURT_START.find(([re]) => re.test(text));
    if (curt) text = text.replace(curt[0], curt[1]);
    else if (IMPERATIVE_START.test(text)) text = `Dạ, bạn ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    else if (KEEP_CASE_START.test(text)) text = `Dạ, ${text}`;
    else text = `Dạ, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  }
  return closing ? `${text} ${pick(CLOSINGS, seed, locale)}` : text;
}

/** Tên gọi thân mật: từ cuối của họ tên ("Nguyễn Văn An" → "An"); bỏ ký tự lạ. */
function callName(name: string | null | undefined): string {
  const clean = String(name ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .trim()
    .slice(0, 60);
  const parts = clean.split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1] ?? '').slice(0, 20);
}

function greetingText(locale: SupportLocale, name: string, hour: number | undefined): string {
  const h = typeof hour === 'number' && Number.isFinite(hour) ? Math.trunc(hour) : -1;
  const part =
    h >= 4 && h < 11
      ? { vi: 'buổi sáng', en: 'morning' }
      : h >= 11 && h < 14
        ? { vi: 'buổi trưa', en: 'afternoon' }
        : h >= 14 && h < 18
          ? { vi: 'buổi chiều', en: 'afternoon' }
          : h >= 18 && h < 23
            ? { vi: 'buổi tối', en: 'evening' }
            : null;
  if (locale === 'en') {
    const hello = name ? `Hi ${name}!` : 'Hi!';
    const wish = part ? ` Good ${part.en}.` : '';
    return `${hello}${wish} I'm CaLẻ's automated assistant and only answer questions about CaLẻ (applying, posting shifts, wallet, deposits, accounts…). What would you like to know?`;
  }
  const hello = name ? `Dạ, chào ${name} ạ!` : 'Dạ, chào bạn ạ!';
  const wish = part ? ` Chúc ${name || 'bạn'} ${part.vi} vui vẻ.` : '';
  return `${hello}${wish} Mình là trợ lý tự động của CaLẻ, chỉ trả lời các câu hỏi về CaLẻ (ứng tuyển, đăng ca, ví, cọc, tài khoản…). Bạn cần mình giúp gì ạ?`;
}

// ---------------------------------------------------------------------------
// Gõ Telex khi chưa bật bộ gõ ("ruts tieenf" → "rut tien")
// ---------------------------------------------------------------------------

/**
 * Bỏ dấu Telex khỏi một từ: "dd" → "d", "aa/ee/oo" → "a/e/o", "aw/ow/uw" → "a/o/u",
 * chữ dấu thanh (s f r x j) đứng SAU nguyên âm đầu tiên (âm cuối tiếng Việt không bao
 * giờ là các chữ này).
 */
function untelex(word: string): string {
  let w = word.replace(/dd/g, 'd');
  const firstVowel = w.search(/[aeiouy]/);
  if (firstVowel >= 0) {
    w = w.slice(0, firstVowel + 1) + w.slice(firstVowel + 1).replace(/[sfrxj]/g, '');
  }
  return w
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'e')
    .replace(/oo/g, 'o')
    .replace(/([aou])w/g, '$1')
    .replace(/w/g, 'u');
}

/** Chỉ sửa từ lạ với kho mà sau khi bỏ Telex thành từ có trong kho / từ đệm. */
function repairTelex(folded: string, index: KbIndex): string {
  if (!folded) return folded;
  return folded
    .split(' ')
    .map((w) => {
      if (w.length < 3 || index.words.has(w) || STOPWORDS.has(w)) return w;
      const fixed = untelex(w);
      if (fixed === w) return w;
      const expanded = ABBREVIATIONS[fixed] ?? fixed;
      return index.words.has(expanded) || STOPWORDS.has(expanded) ? expanded : w;
    })
    .join(' ');
}

// ---------------------------------------------------------------------------
// Câu hỏi về dữ liệu của chính người hỏi
// ---------------------------------------------------------------------------

/** Dấu hiệu "của tôi" / hỏi con số → câu hỏi cá nhân, không phải "xem ở đâu". */
const PERSONAL_MARKERS = [
  'cua toi', 'cua minh', 'cua em', 'cua tui', 'toi co', 'minh co', 'em co', 'toi con',
  'minh con', 'em con', 'bao nhieu', 'con lai', 'how much', 'my', 'i have',
];

const PERSONAL_TOPICS: Array<{ intent: PersonalIntent; phrases: string[]; needsMarker: boolean }> = [
  {
    intent: 'nextShift',
    phrases: ['ca tiep theo', 'ca sap toi', 'ca sap den', 'ca gan nhat', 'next shift', 'upcoming shift', 'lich lam sap toi'],
    needsMarker: false,
  },
  {
    intent: 'unread',
    phrases: ['tin nhan moi', 'tin nhan chua doc', 'co ai nhan tin', 'co ai nhan', 'new message', 'new messages', 'unread message', 'unread messages'],
    needsMarker: false,
  },
  { intent: 'balance', phrases: ['so du', 'balance', 'tien trong vi', 'vi con', 'vi co'], needsMarker: true },
  {
    intent: 'applications',
    phrases: ['don cua', 'don ung tuyen cua', 'my application', 'my applications', 'duoc nhan chua', 'duoc duyet chua'],
    needsMarker: true,
  },
];

function hasPhrase(padded: string, phrase: string): boolean {
  return padded.includes(` ${phrase} `);
}

function detectPersonal(folded: string): PersonalIntent | null {
  const padded = ` ${folded} `;
  const hasMarker = PERSONAL_MARKERS.some((m) => hasPhrase(padded, m));
  for (const topic of PERSONAL_TOPICS) {
    if (!topic.phrases.some((p) => hasPhrase(padded, p))) continue;
    if (!topic.needsMarker || hasMarker) return topic.intent;
  }
  return null;
}

function formatMoney(n: number): string {
  const v = Math.trunc(n);
  const sign = v < 0 ? '-' : '';
  return `${sign}${String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

const L_LOGIN: SupportLink = { href: '/login', label: { vi: 'Đăng nhập', en: 'Log in' } };
const L_SHIFTS: SupportLink = { href: '/shifts', label: { vi: 'Tìm ca', en: 'Find shifts' } };
const L_POST: SupportLink = { href: '/employer/shifts/new', label: { vi: 'Đăng ca', en: 'Post a shift' } };

function dashboardLink(role: SupportRole | null | undefined): SupportLink {
  return {
    href: role === 'employer' ? '/employer/dashboard' : '/worker/dashboard',
    label: { vi: 'Tổng quan', en: 'Dashboard' },
  };
}

/** Đường dẫn nội bộ an toàn (bắt đầu bằng "/", không "..", không giao thức lạ). */
function safeInternalHref(href: string, fallbackHref: string): string {
  return /^\/[A-Za-z0-9/_?=&.%-]*$/.test(href) && !href.includes('..') && !href.startsWith('//')
    ? href
    : fallbackHref;
}

function personalReply(
  intent: PersonalIntent,
  me: PersonalSnapshot | null,
  role: SupportRole | null | undefined,
  locale: SupportLocale,
): SupportReply {
  const vi = locale === 'vi';
  const reply = (text: string, links?: SupportLink[]): SupportReply => ({
    kind: 'personal',
    intent,
    text: politeAnswer(text, locale, undefined, { closing: false }),
    links,
    related: [],
  });
  if (!me || !role || role === 'guest') {
    return reply(
      vi
        ? 'Bạn cần đăng nhập để mình xem được thông tin tài khoản của bạn (số dư, ca sắp tới, đơn ứng tuyển, tin nhắn).'
        : 'Please log in so I can look up your account (balance, upcoming shift, applications, messages).',
      [L_LOGIN],
    );
  }
  const dash = dashboardLink(role);
  const noData = vi
    ? 'Mình chưa đọc được thông tin này lúc này. Bạn xem trực tiếp ở trang Tổng quan nhé.'
    : "I can't read that right now. Please check your Dashboard.";

  if (intent === 'balance') {
    if (typeof me.balance !== 'number' || !Number.isFinite(me.balance)) return reply(noData, [dash]);
    return reply(
      vi
        ? `Số dư ví hiện tại của bạn là ${formatMoney(me.balance)}. Chi tiết giao dịch có trong mục Ví ở trang Tổng quan.`
        : `Your current wallet balance is ${formatMoney(me.balance)}. Transaction details are in the Wallet section of your Dashboard.`,
      [dash],
    );
  }
  if (intent === 'nextShift') {
    if (me.nextShift === undefined) return reply(noData, [dash]);
    if (me.nextShift === null) {
      return role === 'employer'
        ? reply(
            vi ? 'Bạn chưa có ca nào sắp diễn ra. Đăng ca mới để tìm người lao động nhé.' : "You don't have any upcoming shifts. Post a new one to find workers.",
            [L_POST],
          )
        : reply(
            vi ? 'Bạn chưa có ca nào sắp tới. Xem các ca đang tuyển rồi ứng tuyển nhé.' : "You don't have any upcoming shifts yet. Browse open shifts and apply.",
            [L_SHIFTS],
          );
    }
    const { title, when, href } = me.nextShift;
    return reply(
      vi ? `Ca sắp tới của bạn: "${title}" — ${when}.` : `Your next shift: "${title}" — ${when}.`,
      [{ href: safeInternalHref(href, dash.href), label: { vi: 'Xem ca', en: 'View shift' } }],
    );
  }
  if (intent === 'applications') {
    if (role === 'employer') {
      if (typeof me.pendingReviews !== 'number') return reply(noData, [dash]);
      return reply(
        me.pendingReviews > 0
          ? vi
            ? `Bạn có ${me.pendingReviews} đơn ứng tuyển đang chờ duyệt. Mở từng ca trong trang Tổng quan để duyệt người lao động.`
            : `You have ${me.pendingReviews} applications waiting for review. Open each shift from your Dashboard to review workers.`
          : vi
            ? 'Hiện không có đơn ứng tuyển nào chờ bạn duyệt.'
            : 'No applications are waiting for your review right now.',
        [dash],
      );
    }
    if (!me.applications) return reply(noData, [dash]);
    const { pending, approved } = me.applications;
    return reply(
      vi
        ? `Bạn có ${pending} đơn đang chờ duyệt và ${approved} ca đã được nhận (chưa làm). Trạng thái từng đơn có ở trang Tổng quan.`
        : `You have ${pending} applications pending and ${approved} accepted shifts coming up. Each status is on your Dashboard.`,
      [dash],
    );
  }
  if (typeof me.unreadMessages !== 'number') return reply(noData, [dash]);
  return reply(
    me.unreadMessages > 0
      ? vi
        ? `Bạn có ${me.unreadMessages} tin nhắn chưa đọc. Mở tab Hộp thư ngay trong khung này để xem.`
        : `You have ${me.unreadMessages} unread messages. Open the Inbox tab right here to read them.`
      : vi
        ? 'Bạn không có tin nhắn mới nào.'
        : "You don't have any new messages.",
  );
}

// ---------------------------------------------------------------------------
// Hàm chính
// ---------------------------------------------------------------------------

interface Match {
  top: Scored | null;
  ranked: Scored[];
  tokens: string[];
  minMatched: number;
  hasUnknown: boolean;
}

function match(
  index: KbIndex,
  rest: string,
  role: SupportRole | null | undefined,
  accents?: ReadonlySet<string>,
): Match {
  const tokens = correctTypos(index, contentTokens(rest));
  const ranked = rank(index, tokens, role, accents);
  // Câu có từ hai từ trở lên: mục được chọn phải khớp ít nhất hai từ. Một từ trùng
  // ngẫu nhiên ("giá vàng" ↔ "vắng mặt") không đủ để trả lời.
  const minMatched = new Set(tokens).size >= 2 ? 2 : 1;
  // Câu có từ hoàn toàn lạ với kho ("bóng đá", "thời tiết") nhiều khả năng ngoài phạm
  // vi: đòi tỷ lệ khớp cao hơn trước khi trả lời.
  const hasUnknown = tokens.some((t) => t.length >= 3 && !index.df.has(`u:${t}`));
  const minCoverage = hasUnknown ? MIN_COVERAGE_WITH_UNKNOWN : MIN_COVERAGE;
  const top =
    ranked.find((s) => s.coverage >= minCoverage && s.score >= MIN_SCORE && s.matched >= minMatched) ?? null;
  return { top, ranked, tokens, minMatched, hasUnknown };
}

const rankKey = (s: Scored) => s.score * s.coverage * s.coverage;

/**
 * Lưới an toàn cho chữ gõ dính liền / sai nặng ("ruttienvenganhang"): so bộ ba ký tự
 * của cả câu với từng câu hỏi trong kho, lấy mục giống nhất.
 */
function trigramMatch(
  index: KbIndex,
  rest: string,
  role: SupportRole | null | undefined,
): { entryId: string; score: number }[] {
  const joined = rest.replace(/ /g, '');
  if (joined.length < TRIGRAM_MIN_LENGTH) return [];
  const q = trigrams(joined);
  const hideAdminOnly = role === 'worker' || role === 'employer' || role === 'guest';
  return index.items
    .filter((it) => !(hideAdminOnly && it.entry.roles?.length && it.entry.roles.every((r) => r === 'admin')))
    .map((it) => ({ entryId: it.entry.id, score: Math.max(0, ...it.grams.map((g) => dice(q, g))) }))
    .filter((x) => x.score >= TRIGRAM_GUESS)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/** Mở đầu kiểu nối tiếp: "còn…", "thế còn…", "vậy…", "what about…". */
const FOLLOW_UP_START = /^(con|the con|vay con|the|vay|neu|what about|how about|and)\b/;
/** Câu nối tiếp ngắn: tối đa ngần này từ có nghĩa. */
const FOLLOW_UP_MAX_TOKENS = 3;
/** Hỏi lại khi mục thứ hai đạt ≥ tỷ lệ này so với mục đầu (câu một từ khoá). */
const CLARIFY_RATIO = 0.8;
/** Chỉ hỏi lại khi người dùng gõ trơn từ khoá (tối đa ngần này từ). */
const CLARIFY_MAX_WORDS = 2;
const MULTI_MAX = 3;
/** Câu nối tiếp: mục cùng nhóm chủ đề với câu trả lời trước được nhân hệ số này. */
const TOPIC_BOOST = 1.5;

/** Tách một tin thành các câu hỏi: dấu ?, !, ;, xuống dòng, " và " / " and ". */
function splitQuestions(question: string): string[] {
  return question
    .split(/[?!;\n]+|\s+(?:và|va|and|với cả|voi ca)\s+/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

interface Resolved {
  entryId: string;
  text: string;
  ranked: Scored[];
  top: Scored;
}

function relatedOf(ranked: Scored[], top: Scored, exclude: Set<string>): string[] {
  return ranked
    .filter((s) => s !== top && !exclude.has(s.item.entry.id))
    .filter((s) => s.score >= top.score * RELATED_SCORE_RATIO && s.coverage >= RELATED_MIN_COVERAGE)
    .slice(0, 2)
    .map((s) => s.item.entry.id);
}

/** Câu thứ hai trở đi trong một tin: nếu ngắn, hiểu theo câu liền trước. */
function resolveParts(
  question: string,
  index: KbIndex,
  role: SupportRole | null | undefined,
  locale: SupportLocale,
  live: boolean,
): Resolved[] {
  const parts = splitQuestions(question);
  if (parts.length < 2) return [];
  const resolved: Resolved[] = [];
  let prev = '';
  for (const part of parts.slice(0, 4)) {
    const rest = splitSmalltalk(repairTelex(foldText(part).slice(0, 300), index)).rest;
    let m = match(index, rest, role);
    if (prev && new Set(m.tokens).size <= FOLLOW_UP_MAX_TOKENS - 1) {
      const c = match(index, `${prev} ${rest}`, role);
      const top = c.top;
      if (top && m.tokens.some((t) => top.item.uni.has(t))) m = c;
    }
    const top = m.top;
    if (top && !resolved.some((r) => r.entryId === top.item.entry.id)) {
      resolved.push({ entryId: top.item.entry.id, text: answerText(top.item.entry, locale, live), ranked: m.ranked, top });
    }
    if (rest) prev = rest;
  }
  return resolved;
}

export function answerSupportQuestion(question: string, opts: SupportQueryOptions): SupportReply {
  const { kb, locale, live, role, previous, personal, hour, seed, recentFallbacks } = opts;
  // Không hiểu lần thứ hai liên tiếp: thôi bắt người dùng hỏi lại, khuyên gặp người thật.
  const escalate = (recentFallbacks ?? 0) >= 1;
  const fallback = (related: string[] = []): SupportReply => ({
    kind: 'fallback',
    text: escalate ? ESCALATE[locale] : pick(VARIANTS.fallback, seed, locale),
    related,
    showContacts: true,
  });
  const accents = new Set(accentedWords(String(question ?? '').slice(0, 500)));

  const index = buildIndex(kb);
  const folded = repairTelex(foldText(question).slice(0, 500), index);
  if (!folded) return fallback();

  const { intents, rest } = splitSmalltalk(folded);
  if (intents.has('human')) {
    return { kind: 'smalltalk', intent: 'human', text: copy('human', locale), related: [], showContacts: true };
  }

  // Phép tính ("2 cộng 2", "15 x 3"): ngoài phạm vi, và chữ bỏ dấu dễ trùng ("cộng" ↔ "công").
  if (ARITHMETIC.test(rest)) return fallback();

  // Dữ liệu của chính người hỏi (chỉ khi giao diện truyền `personal`; null = khách).
  if (personal !== undefined) {
    const intent = detectPersonal(rest);
    if (intent) return personalReply(intent, personal, role, locale);
  }

  const prevEntryId = previous?.entryId ?? null;
  const current = match(index, rest, role, accents);
  const contentCount = new Set(current.tokens).size;

  // "Sai rồi / không phải ý mình" ngay sau một câu trả lời: gợi ý mục gần kề khác.
  if (intents.has('notHelpful') && prevEntryId && contentCount <= 1) {
    const prevRest = splitSmalltalk(foldText(previous?.question ?? '').slice(0, 300)).rest;
    const related = match(index, prevRest, role)
      .ranked.filter((s) => s.item.entry.id !== prevEntryId && s.coverage >= RELATED_MIN_COVERAGE)
      .slice(0, 3)
      .map((s) => s.item.entry.id);
    return {
      kind: 'smalltalk',
      intent: 'notHelpful',
      text: pick(VARIANTS.notHelpful, seed, locale),
      related,
      showContacts: true,
    };
  }

  // Bực bội mà không kèm câu hỏi rõ ràng: đồng cảm + kênh liên hệ.
  if (intents.has('complaint') && (!current.top || contentCount <= 1)) {
    return {
      kind: 'smalltalk',
      intent: 'complaint',
      text: pick(VARIANTS.complaint, seed, locale),
      related: [],
      showContacts: true,
    };
  }

  // Nhiều câu hỏi trong một tin: trả lời từng câu (tối đa 3 mục khác nhau).
  const parts = resolveParts(question, index, role, locale, live);
  if (parts.length >= 2) {
    const [first, ...others] = parts.slice(0, MULTI_MAX);
    return {
      kind: 'answer',
      text: politeAnswer(first.text, locale, seed, { closing: false }),
      entryId: first.entryId,
      also: others.map(({ entryId, text }) => ({ entryId, text })),
      related: relatedOf(first.ranked, first.top, new Set(parts.map((p) => p.entryId))),
    };
  }

  // Câu nối tiếp ("bao lâu?", "còn nhà tuyển dụng thì sao?"): ghép với câu trước.
  let chosen: Match = current;
  const isFollowUp = FOLLOW_UP_START.test(rest) || contentCount < FOLLOW_UP_MAX_TOKENS;
  if (previous?.question && isFollowUp && contentCount > 0 && contentCount <= FOLLOW_UP_MAX_TOKENS) {
    const prevRest = splitSmalltalk(repairTelex(foldText(previous.question).slice(0, 300), index)).rest;
    const prevAccents = accentedWords(previous.question.slice(0, 300));
    const combined = match(index, `${prevRest} ${rest}`, role, new Set([...accents, ...prevAccents]));
    // Giữ mạch chủ đề: trong các mục đủ tin cậy có dùng từ của câu mới, mục cùng nhóm
    // với câu trả lời trước được ưu tiên ("không trả lương thì sao?" → "bao lâu có tiền?").
    const prevCategory = index.items.find((it) => it.entry.id === prevEntryId)?.entry.category;
    const minCoverage = combined.hasUnknown ? MIN_COVERAGE_WITH_UNKNOWN : MIN_COVERAGE;
    const pickKey = (s: Scored) =>
      rankKey(s) * (prevCategory && s.item.entry.category === prevCategory ? TOPIC_BOOST : 1);
    const top = combined.ranked
      .filter(
        (s) =>
          s.coverage >= minCoverage &&
          s.score >= MIN_SCORE &&
          s.matched >= combined.minMatched &&
          current.tokens.some((t) => s.item.uni.has(t)),
      )
      .sort((a, b) => pickKey(b) - pickKey(a))[0];
    // Ưu tiên trước hết: mục CÙNG NHÓM chủ đề khớp đủ câu mới ngay cả khi đứng riêng
    // (câu mới là ý chính, câu trước chỉ cho biết đang nói chuyện gì).
    const sameTopic = prevCategory
      ? current.ranked.find(
          (s) =>
            s.item.entry.category === prevCategory &&
            s.item.entry.id !== prevEntryId &&
            s.coverage >= MIN_COVERAGE &&
            s.score >= MIN_SCORE &&
            s.matched >= current.minMatched,
        )
      : undefined;
    if (sameTopic) chosen = { ...current, top: sameTopic };
    else if (top && (!current.top || top.item.entry.id !== prevEntryId)) chosen = { ...combined, top };
  }

  const { top, ranked } = chosen;
  if (top) {
    // Chỉ gõ trơn một từ khoá ("cọc", "tiền cọc") mà nhiều mục khác nhau đều khớp sát
    // nhau: hỏi lại. Câu hỏi đủ ý ("hôm nay có ca nào không") thì trả lời luôn.
    const bareKeyword = rest.split(' ').filter(Boolean).length <= CLARIFY_MAX_WORDS;
    if (chosen === current && contentCount === 1 && bareKeyword) {
      // Mục đầu khớp đúng từ khoá / câu hỏi chính mà mục sau thì không → trả lời luôn.
      const close = ranked
        .filter((s) => s.coverage >= MIN_COVERAGE && rankKey(s) >= rankKey(top) * CLARIFY_RATIO)
        .slice(0, 3);
      const decisive = top.exact && close.slice(1).every((s) => !s.exact);
      if (close.length >= 2 && !decisive) {
        return {
          kind: 'clarify',
          text: pick(VARIANTS.clarify, seed, locale),
          options: close.map((s) => s.item.entry.id),
          related: [],
        };
      }
    }
    const body = answerText(top.item.entry, locale, live);
    const upset = intents.has('complaint');
    return {
      kind: 'answer',
      text: upset ? `${EMPATHY_PREFIX[locale]}${body} ${pick(CLOSINGS, seed, locale)}` : politeAnswer(body, locale, seed),
      entryId: top.item.entry.id,
      related: relatedOf(ranked, top, new Set()),
      ...(upset ? { showContacts: true } : {}),
    };
  }

  // Không có câu hỏi rõ ràng: đáp xã giao nếu có.
  const intent = INTENT_PRIORITY.find((i) => intents.has(i));
  if (intent && current.tokens.length <= 1) {
    if (intent === 'greeting') {
      return { kind: 'smalltalk', intent, text: greetingText(locale, callName(personal?.name), hour), related: [] };
    }
    if (intent === 'thanks' || intent === 'bye') {
      return { kind: 'smalltalk', intent, text: pick(VARIANTS[intent], seed, locale), related: [] };
    }
    if (intent === 'notHelpful' || intent === 'complaint') {
      return { kind: 'smalltalk', intent, text: pick(VARIANTS[intent], seed, locale), related: [], showContacts: true };
    }
    return { kind: 'smalltalk', intent, text: copy(intent, locale), related: [] };
  }

  // Chữ gõ dính liền / sai nặng: so theo bộ ba ký tự.
  const byChars = current.hasUnknown || current.tokens.length === 0 ? trigramMatch(index, rest, role) : [];
  const bestChars = byChars[0];
  const bestEntry = bestChars ? index.items.find((it) => it.entry.id === bestChars.entryId)?.entry : undefined;
  if (bestChars && bestEntry && bestChars.score >= TRIGRAM_ANSWER) {
    return {
      kind: 'answer',
      text: politeAnswer(answerText(bestEntry, locale, live), locale, seed),
      entryId: bestEntry.id,
      related: byChars.slice(1, 3).map((x) => x.entryId),
    };
  }

  // Đoán không chắc: gợi ý vài mục gần nhất để người dùng tự chọn.
  // Câu ngoài phạm vi ("thời tiết hôm nay") không kèm gợi ý lạc đề: mục gợi ý phải
  // khớp đủ số từ như khi trả lời, chỉ thiếu tỷ lệ khớp.
  const guessCoverage = current.hasUnknown ? MIN_COVERAGE_WITH_UNKNOWN : GUESS_MIN_COVERAGE;
  const guesses = current.ranked
    .filter((s) => s.coverage >= guessCoverage && s.matched >= current.minMatched)
    .map((s) => s.item.entry.id);
  for (const x of byChars) if (!guesses.includes(x.entryId)) guesses.push(x.entryId);
  return fallback(guesses.slice(0, 2));
}

/**
 * Lời chào mở đầu khung "Hỏi CaLẻ": gọi tên (nếu đã đăng nhập) + chào theo buổi, nói rõ
 * trợ lý chỉ trả lời về CaLẻ.
 */
export function supportWelcome(locale: SupportLocale, name?: string | null, hour?: number): string {
  const n = callName(name);
  if (!n && hour === undefined) return SUPPORT_BOT_COPY.welcome[locale];
  const tail = SUPPORT_BOT_COPY.welcome[locale].replace(/^(Chào bạn, |Hi, )/, '');
  const head = greetingText(locale, n, hour).split(/(?<=[.!])\s/)[0];
  const wish = greetingText(locale, n, hour).match(/(?:Chúc|Good) [^.]*\./)?.[0];
  return [head, wish, tail.charAt(0).toUpperCase() + tail.slice(1)].filter(Boolean).join(' ');
}

/** Câu hỏi hiển thị cho một mục (dùng cho chip gợi ý / "câu hỏi liên quan"). */
export function entryTitle(entry: SupportEntry, locale: SupportLocale): string {
  return entry.questions[locale][0] ?? entry.questions.vi[0] ?? entry.id;
}
