/**
 * English dictionary — chat người lao động ↔ nhà tuyển dụng (0035, 03/10).
 *
 * Gộp vào `en` trong `en.ts` (sau các đợt trước, không ghi đè khoá cũ). Khoá
 * trùng `vi.ts`; tiền tệ viết `đ`; câu production không được ghi "simulated".
 * ⚠️ Bản dịch do AI viết — nhờ người đọc lại.
 */

export const enChat: Record<string, string> = {
  'notification.kind.ChatMessage': 'New message',
  'notification.chat.title': 'New message about {shiftTitle}',
  'notification.chat.body.fromWorker': 'A worker just messaged you. Open it to read and reply.',
  'notification.chat.body.fromEmployer': 'The employer just messaged you. Open it to read and reply.',
  'notification.chat.body.generic': 'You have a new message. Open it to read and reply.',
  'chat.error.notAvailable': 'This conversation is not open to you.',
  'chat.error.closed': 'This conversation is closed. You can only read it.',
  'chat.error.empty': 'Please type a message.',
  'chat.error.tooLong': 'Messages can be at most 1000 characters. Please shorten it.',
  'chat.error.cannotReportOwn': 'You cannot report your own message.',
  'chat.error.dailyLimit': 'You have sent too many messages today. Please try again tomorrow.',
  'chat.error.loadFailed': 'Could not load messages. Please try again.',
  'chat.worker.open': 'Message the employer',
  'chat.worker.view': 'View messages with the employer',
  'chat.worker.title': 'Chat with the employer',
  'chat.worker.intro':
    'Ask about arrival time, parking, uniform… The employer is notified when you send a message.',
  'chat.employer.open': 'Message',
  'chat.employer.openWith': 'Message {name}',
  'chat.employer.title': 'Chat with {name}',
  'chat.employer.intro':
    'Tell the worker about arrival time, parking, uniform… The worker is notified when you send a message.',
  'chat.unread': '{count} unread',
  'chat.list.label': 'Messages',
  'chat.empty.worker':
    'No messages yet. You can ask the employer about arrival time, parking or uniform.',
  'chat.empty.employer':
    'No messages yet. You can tell the worker about arrival time, parking or uniform.',
  'chat.empty.readonly': 'This conversation has no messages.',
  'chat.loading': 'Loading messages…',
  'chat.loadOlder': 'Show older messages',
  'chat.sender.me': 'You',
  'chat.sender.worker': 'Worker',
  'chat.sender.employer': 'Employer',
  'chat.reported': 'Reported',
  'chat.composer.label': 'Your message',
  'chat.composer.placeholder': 'Type a message…',
  'chat.composer.hint': 'Press Enter to send, Shift + Enter for a new line.',
  'chat.composer.counter': '{count}/{max} characters',
  'chat.composer.overLimit': 'Over the {max} character limit.',
  'chat.send': 'Send',
  'chat.readonly': 'This conversation is closed. You can only read it.',
  'chat.readonly.why':
    'Conversations close 7 days after the shift ends, or when the application or shift is cancelled.',
  'chat.offPlatform':
    'Keep messages and payments on CaLẻ. Private bank transfers or moving to Zalo, Telegram… are not recorded on CaLẻ, and CaLẻ cannot handle disputes about them.',
  'chat.demoNote': 'Demo: messages are only stored in this browser.',
  'chat.report': 'Report',
  'chat.report.aria': 'Report the message sent at {time}',
  'chat.report.title': 'Report message',
  'chat.report.intro':
    'Tell the CaLẻ administrators why this message is inappropriate (scam, abuse, asking to pay outside CaLẻ…). An administrator will review the conversation.',
  'chat.report.reasonLabel': 'Reason',
  'chat.report.reasonPlaceholder': 'For example: asked for a private transfer, abusive language…',
  'chat.report.submit': 'Send report',
  'chat.report.success': 'Report sent. An administrator will review it.',
};
