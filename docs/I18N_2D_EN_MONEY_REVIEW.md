# Đọc lại bản tiếng Anh — câu về tiền / cọc / rút tiền (đợt 2d)

> Bản dịch do AI viết (`src/i18n/en-roles.ts`). Nhờ người đọc lại các câu dưới đây trước
> khi quảng bá bản tiếng Anh. Sửa thẳng trong `en-roles.ts` (giữ nguyên khoá bên trái và các
> chỗ `{…}`); chạy `npx vitest run src/__tests__/i18nEnglish.test.ts` sau khi sửa.
>
> Lưu ý khi đọc:
> - Khoá có đuôi `.real` / `Real` là câu **production (tiền thật qua PayOS)** — không được có chữ
>   "simulated".
> - Câu có "(mô phỏng)" / "simulated" chỉ hiện ở chế độ demo / local.
> - Tiền tệ viết `đ`, không dùng `VNĐ` / `₫`.

Tổng: 181 câu.

| Khoá | Tiếng Việt | Tiếng Anh |
|---|---|---|
| `applicantBucket.AwaitingConfirmation.hint.real` | Đã check-out: xác nhận để trả công, hoặc khiếu nại nếu có vấn đề. Không thao tác thì hệ thống tự xác nhận sau 24 giờ. | Checked out: confirm to pay, or file a complaint if something is wrong. If you do nothing, the system confirms automatically after 24 hours. |
| `applicantBucket.Confirmed.hint` | Đã thanh toán cho người lao động. | The worker has been paid. |
| `deposit.trust.low` | Độ uy tín: Thấp (tài khoản mới hoặc chưa xác minh). Cọc 100% tiền công. | Trust level: Low (new or unverified account). Deposit 100% of wages. |
| `deposit.trust.medium` | Độ uy tín: Trung bình (đã xác minh hoặc xong ít nhất 3 ca). Cọc 100% tiền công. | Trust level: Medium (verified or at least 3 completed shifts). Deposit 100% of wages. |
| `deposit.trust.high` | Độ uy tín: Cao (đã xác minh và xong ít nhất 5 ca). Cọc 100% tiền công. | Trust level: High (verified and at least 5 completed shifts). Deposit 100% of wages. |
| `escrow.PendingDeposit` | Chờ giữ cọc | Awaiting deposit |
| `escrow.Deposited` | Đã giữ cọc | Deposit held |
| `escrow.Released` | Đã thanh toán | Paid |
| `escrow.Refunded` | Đã hoàn tiền | Refunded |
| `shift.timeline.kind.DepositHeld` | Đã giữ cọc | Deposit held |
| `shift.timeline.kind.WageReleased` | Đã trả tiền công | Wages paid |
| `shift.timeline.kind.WageRefunded` | Đã hoàn cọc | Deposit refunded |
| `worker.profile.prompt.skills.hint` | Ví dụ: phục vụ, pha chế, thu ngân, bưng bê sự kiện. | For example: serving, bartending, cashier, event serving. |
| `feedback.checkOut.success.desc.real` | Nếu nhà tuyển dụng không thao tác, hệ thống tự xác nhận và trả tiền công vào ví của bạn sau 24 giờ kể từ giờ kết thúc ca. | If the employer does nothing, the system confirms and pays your wages into your wallet 24 hours after the shift ends. |
| `checkout.dialog.intro.real` | Hãy xác nhận các mục bên dưới trước khi check-out. Sau khi gửi, nhà tuyển dụng xác nhận hoặc khiếu nại - nếu không thao tác, hệ thống tự xác nhận và trả tiền công vào ví của bạn sau 24 giờ kể từ giờ kết thúc ca. | Confirm the items below before checking out. After you submit, the employer confirms or files a complaint - if they do nothing, the system confirms and pays your wages into your wallet 24 hours after the shift ends. |
| `help.checkout.description.real` | Chỉ gửi các mục được yêu cầu; đừng chụp khách hàng hay giấy tờ cá nhân. Nếu nhà tuyển dụng không thao tác, hệ thống tự xác nhận và trả tiền công khoảng 24 giờ sau ca. | Send only what is asked; do not photograph customers or personal documents. If the employer does nothing, the system confirms and pays your wages about 24 hours after the shift. |
| `help.paymentEvidence.description.real` | Việc nhẹ chỉ cần checklist; việc có tiền mặt hay kho hàng cần thêm ảnh bàn giao và ghi chú. Đừng chụp khách hàng, giấy tờ cá nhân hay hoá đơn nhạy cảm. | Light work needs only the checklist; work involving cash or stock also needs a handover photo and note. Do not photograph customers, personal documents or sensitive receipts. |
| `shifts.detail.paymentEvidence.autoReleaseRule.real` | Nếu nhà tuyển dụng không thao tác, hệ thống tự xác nhận và trả tiền công vào ví của bạn sau 24 giờ kể từ giờ kết thúc ca. | If the employer does nothing, the system confirms and pays your wages into your wallet 24 hours after the shift ends. |
| `employer.understaffed.runWithApproved.hint` | Ca vẫn diễn ra với những người đã được duyệt. Tiền cọc của các vị trí không dùng sẽ được hoàn lại khi ca kết thúc. | The shift goes ahead with the approved workers. The deposit for unused positions is refunded when the shift ends. |
| `employer.understaffed.requireFull.hint` | Nếu chưa đủ người trước giờ bắt đầu, ca sẽ tự hủy, hoàn lại toàn bộ tiền cọc và thông báo cho người đã được duyệt. | If the shift is not fully staffed before it starts, it is cancelled automatically, the whole deposit is refunded and approved workers are notified. |
| `help.employerSchedule.section.numbers.item2` | Số người trên chip hiển thị filled/total - ví dụ 2/3 nghĩa là đã có 2 trong 3 vị trí. | The number on the chip shows filled/total - for example 2/3 means 2 of 3 positions are filled. |
| `feedback.repost.success.desc` | Vui lòng chỉnh sửa ca mới và chọn ngày giờ trước khi giữ cọc. | Edit the new shift and pick a date and time before holding the deposit. |
| `employer.manageShift.cancel.successPenalty` | Hệ thống đã thông báo cho người lao động và áp dụng phí hủy {rate}% tiền cọc. | Workers have been notified and a cancellation fee of {rate}% of the deposit was applied. |
| `feedback.shift.cancel.success.desc` | Tiền cọc đã được hoàn (mô phỏng). | The deposit has been refunded (simulated). |
| `employer.manageShift.cancelled.penaltyPrefix` | Phí hủy sau khi đã duyệt người: | Fee for cancelling after approving workers: |
| `employer.manageShift.cancelled.penaltyUnit` | % tiền cọc | % of deposit |
| `attendance.markNoShow.confirm` | Đánh dấu người lao động này VẮNG MẶT? Thao tác không hoàn tác được: người này không nhận tiền công, phần cọc tương ứng sẽ được hoàn về ví của bạn khi ca chốt. | Mark this worker ABSENT? This cannot be undone: they will not be paid, and the matching part of the deposit returns to your wallet when the shift is settled. |
| `employer.manageShift.cancel.reasonPlaceholder` | Ví dụ: Lịch đột xuất thay đổi, không thể tổ chức ca. | For example: plans changed suddenly and the shift cannot go ahead. |
| `employer.manageShift.cancel.penaltyPrefix` | Phí hủy: | Cancellation fee: |
| `employer.dispute.statusLine.byWorker` | Người lao động đang khiếu nại ca này. Quản trị viên đang xem xét - tiền công đang được giữ lại. | The worker has filed a complaint about this shift. An administrator is reviewing it - the wages are on hold. |
| `employer.dispute.statusLine.byEmployer` | Bạn đã khiếu nại ca này. Quản trị viên đang xử lý - tiền công đang được giữ lại. | You filed a complaint about this shift. An administrator is handling it - the wages are on hold. |
| `attendance.revert.body` | Người lao động đến muộn? Chuyển từ vắng mặt sang có mặt để hoàn lại điểm uy tín và tiếp tục ca. | Did the worker arrive late? Switch them from absent to present to restore their reputation points and continue the shift. |
| `attendance.revert.reasonPlaceholder` | Ví dụ: người lao động đến muộn 20 phút do kẹt xe. | For example: the worker arrived 20 minutes late because of traffic. |
| `employer.manageShift.status.confirmed` | Đã xác nhận & thanh toán | Confirmed & paid |
| `feedback.applicant.markNoShow.success.descReal` | Phần cọc của vị trí này sẽ được hoàn về ví khi ca chốt. | The deposit for this position will return to your wallet when the shift is settled. |
| `applicantBucket.AwaitingConfirmation.hint` | Đã check-out: xác nhận để trả tiền công, hoặc khiếu nại nếu có vấn đề. Tự xác nhận sau 12 giờ. | Checked out: confirm to pay the wages, or file a complaint if something is wrong. Confirmed automatically after 12 hours. |
| `employer.manageShift.status.noShowReal` | Vắng mặt — phần cọc của vị trí này sẽ hoàn về ví khi ca chốt | Absent — the deposit for this position returns to your wallet when the shift is settled |
| `employer.manageShift.status.noShowLocal` | Vắng mặt — đã hoàn tiền & tặng boost | Absent — refunded & boost given |
| `feedback.shift.create.success.desc` | Bấm "Mô phỏng giữ cọc" để công khai ca cho người lao động. | Tap "Simulate deposit" to publish the shift to workers. |
| `feedback.shift.deposit.success` | Đã mô phỏng giữ cọc - ca đã được công khai | Deposit simulated - the shift is now public |
| `deposit.insufficient.savedDraft` | Đã lưu bản nháp ca làm. Bạn có thể nạp tiền và giữ cọc sau. | The shift was saved as a draft. You can top up and hold the deposit later. |
| `help.shiftCreate.intro` | Hoàn thành thông tin ca làm; ca chỉ được đăng sau khi giữ cọc tiền công. | Fill in the shift details; a shift is posted only after its wages are held as a deposit. |
| `help.shiftCreate.real.item2` | Khi bấm Đăng, hệ thống giữ tiền công + 10% phí từ ví. Ví thiếu thì nạp qua QR PayOS. | When you tap Post, the wages + 10% fee are held from your wallet. If your wallet is short, top up with a PayOS QR code. |
| `help.shiftCreate.real.item3` | Ca hiện công khai ngay sau khi giữ đủ tiền. | The shift goes public as soon as the full amount is held. |
| `help.shiftCreate.item3` | Bấm "Xác nhận đã thanh toán" để hoàn tất giữ cọc - không có giao dịch thật. | Tap "Confirm payment" to finish holding the deposit - no real transaction happens. |
| `help.shiftCreate.item4` | Sau khi hoàn tất giữ cọc, ca sẽ chuyển sang trạng thái "Đã đăng" công khai. | Once the deposit is held, the shift moves to the public "Posted" status. |
| `shifts.deposit.success` | Giữ cọc thành công! Ca làm đã được đăng. | Deposit held! The shift has been posted. |
| `shiftForm.draft.section.intro` | Bản nháp là biểu mẫu đã lưu - chưa được đăng, người lao động không thấy. Tiếp tục chỉnh sửa rồi giữ cọc để đăng ca. | A draft is a saved form - it is not posted and workers cannot see it. Keep editing, then hold the deposit to post the shift. |
| `deposit.insufficient.title` | Số dư ví không đủ để giữ cọc | Not enough wallet balance to hold the deposit |
| `deposit.insufficient.body` | Ví không đủ để giữ cọc ca này; bản nháp vẫn được giữ. Bạn có muốn nạp thêm tiền không? | Your wallet does not have enough to hold this shift’s deposit; the draft is kept. Would you like to top up? |
| `deposit.insufficient.required` | Cần giữ cọc | Deposit needed |
| `deposit.insufficient.balance` | Số dư hiện tại | Current balance |
| `deposit.insufficient.draftNote` | Ca làm đang ở dạng nháp, chưa được công bố và người lao động chưa thấy. Bạn có thể nạp tiền rồi xác nhận lại mà không cần nhập lại. | The shift is a draft: it is not published and workers cannot see it. You can top up and confirm again without re-entering anything. |
| `deposit.insufficient.topUpNow` | Nạp tiền ngay | Top up now |
| `posting.readiness.checklist.workplaceProof` | Ảnh mặt tiền / nơi làm việc đã được duyệt trên hồ sơ | Storefront / workplace photo approved on your profile |
| `posting.readiness.depositLocked` | Hệ thống chỉ mở bước giữ cọc khi bạn đã hoàn tất các yêu cầu trên. | The deposit step opens only after you meet the requirements above. |
| `posting.readiness.individualNote` | Với tài khoản cá nhân thuê ngắn hạn, hệ thống yêu cầu giữ cọc 100% tiền công. | For individual accounts hiring short-term, a deposit of 100% of wages is required. |
| `deposit.trust.title` | Cọc 100% tiền công | Deposit 100% of wages |
| `deposit.trust.ratio` | Bạn cần thanh toán trước 100% tổng tiền công trước khi đăng ca. Cấp độ tin cậy ảnh hưởng đến độ ưu tiên hiển thị và phí dịch vụ trong tương lai. | You pay 100% of the total wages up front before posting the shift. Your trust level affects listing priority and future service fees. |
| `shifts.deposit.title` | Giữ cọc trước | Deposit first |
| `shifts.deposit.description` | Nhà tuyển dụng cần thanh toán trước toàn bộ tiền công vào ví doanh nghiệp trước khi ca được đăng công khai. | Employers pay the full wages into the business wallet before the shift is posted publicly. |
| `deposit.breakdown.fullWage` | Tổng tiền lương | Total wages |
| `deposit.breakdown.ratio` | Tỷ lệ cọc | Deposit ratio |
| `shifts.deposit.amount` | Số dư tuyển dụng cần đảm bảo | Hiring balance to secure |
| `deposit.confirmPaid` | Mô phỏng giữ cọc | Simulate deposit |
| `shifts.new.subtitle.real` | Điền thông tin ca làm. Số tiền cần giữ cọc được tính tự động và hiện ngay dưới form. | Fill in the shift details. The deposit amount is calculated automatically and shown right below the form. |
| `shifts.new.subtitle` | Hoàn thành thông tin ca làm. Hệ thống sẽ tự động tính tiền cọc dựa trên độ uy tín nhà tuyển dụng. | Fill in the shift details. The deposit is calculated automatically from your employer trust level. |
| `apply.outcome.viewWallet` | Xem ví | View wallet |
| `apply.outcome.paid.real` | Tiền công {amount} đã được trả vào ví của bạn. | Wages of {amount} have been paid into your wallet. |
| `apply.outcome.paid.demo` | Tiền công {amount} đã được ghi vào ví mô phỏng của bạn. | Wages of {amount} have been recorded in your simulated wallet. |
| `dispute.dialog.intro` | Vui lòng cung cấp đầy đủ thông tin để quản trị viên có thể xem xét khiếu nại của bạn. Tiền công sẽ được giữ lại cho đến khi có kết luận. | Please give complete information so an administrator can review your complaint. The wages are held until there is a decision. |
| `dispute.dialog.evidenceDescription.placeholder` | Ví dụ: ảnh khu vực còn rác, ghi âm cuộc gọi, log hệ thống. | For example: a photo of the area still full of rubbish, a call recording, system logs. |
| `dispute.dialog.evidenceFile.placeholder` | Ví dụ: photo-2025-01-15.jpg | For example: photo-2025-01-15.jpg |
| `dispute.response.dialog.reason.placeholder` | Ví dụ: Tôi đã làm đầy đủ thời gian và bàn giao cho quản lý ca lúc 22:05. | For example: I worked the full time and handed over to the shift manager at 22:05. |
| `dispute.response.dialog.evidenceDescription.placeholder` | Ví dụ: ảnh checklist sau ca, tin nhắn bàn giao với quản lý ca… | For example: a photo of the checklist after the shift, handover messages with the shift manager… |
| `reject.dialog.reasonPlaceholder` | Ví dụ: Không phù hợp kinh nghiệm, đã đủ người, lịch không khớp... | For example: experience not a match, already fully staffed, schedule does not fit... |
| `error.wage.invalid` | Lương phải là số dương. | Pay must be a positive number. |
| `shiftForm.customJobType.placeholder` | Ví dụ: Hỗ trợ chuyển nhà | For example: Help with moving house |
| `form.hourlyWage.hint` | Ví dụ: 35000 sẽ hiển thị thành 35.000. Hệ thống sẽ đọc thành chữ bên dưới. | For example: 35000 is shown as 35.000. The amount is also spelled out below. |
| `form.workplaceNotes.placeholder` | Ví dụ: Vào cổng phía sau, có chỗ để xe miễn phí. | For example: Use the back gate; free parking available. |
| `shiftForm.depositSummary.wage` | Tiền công | Wages |
| `shiftForm.depositSummary.feeFree` | Phí dịch vụ | Service fee |
| `shiftForm.depositSummary.fee` | Phí dịch vụ 10% | 10% service fee |
| `shiftForm.depositSummary.feeFreeValue` | Miễn phí (đợt đến hết {date}) | Free (offer until {date}) |
| `shiftForm.depositSummary.total` | Tổng giữ từ ví | Total held from wallet |
| `shiftForm.depositSummary.feeFreeTooFar` | Đợt miễn phí dịch vụ chỉ áp dụng cho ca làm đến hết {date}. Ca này vẫn tính phí 10%. | The free-service offer only covers shifts up to {date}. This shift is still charged the 10% fee. |
| `shiftForm.depositSummary.note` | Ca được đăng ngay sau khi giữ đủ số tiền này. Phần không dùng (vị trí trống, vắng mặt, ca huỷ) được hoàn về ví. | The shift is posted as soon as this amount is held. Anything unused (empty positions, no-shows, cancelled shifts) is refunded to your wallet. |
| `btn.deposit` | Mô phỏng giữ cọc | Simulate deposit |
| `evidence.examples.checklist.title` | Ví dụ checklist | Checklist examples |
| `evidence.examples.photo.title` | Ví dụ ảnh bàn giao | Handover photo examples |
| `form.workplaceSection.intro` | Ảnh giúp người lao động nhận biết nơi làm việc thật trước khi nhận ca. Trong bản MVP, bạn chỉ cần điền tên file mô phỏng (ví dụ: "mat-tien-quan-pho-ha.jpg"). | A photo helps workers recognise the real workplace before taking the shift. In the MVP you only need to enter a simulated file name (for example: "mat-tien-quan-pho-ha.jpg"). |
| `landing.hero.featured.wageLabel` | Tiền công | Pay |
| `nav.userMenu.employer.payments` | Thanh toán & đảm bảo | Payments & guarantees |
| `deposit.promo.use` | Trả phí bằng tiền thưởng | Pay the fee with bonus credit |
| `deposit.promo.cash` | Trừ từ số dư ví | Deduct from wallet balance |
| `wallet.topUp.reviewClosed` | Quản trị viên đã kiểm tra giao dịch của đơn này và không cộng vào ví. Xem ghi chú trong ví; đừng chuyển khoản lại cho đơn này. | An administrator checked this order’s transaction and did not credit it to your wallet. See the note in your wallet; do not transfer again for this order. |
| `employer.confirm.panel.intro` | Người lao động đã check-out. Bạn có thể xác nhận hoàn thành để trả tiền công, hoặc khiếu nại nếu phát hiện vấn đề. | The worker has checked out. Confirm completion to pay the wages, or file a complaint if you find a problem. |
| `employer.confirm.countdown.warning` | Nếu bạn không xác nhận hoặc khiếu nại trong 12 giờ, hệ thống sẽ tự động trả tiền công. | If you do not confirm or file a complaint within 12 hours, the system pays the wages automatically. |
| `shifts.detail.paymentEvidence.title` | Quy trình thanh toán & bằng chứng | Payment & evidence process |
| `shifts.detail.paymentEvidence.intro` | Sau khi bạn hoàn thành ca, nhà tuyển dụng sẽ xác nhận và tiền công được chuyển cho bạn. Mỗi ca có thể yêu cầu mức bằng chứng khác nhau tuỳ độ rủi ro công việc - không phải ca nào cũng cần ảnh bàn giao. | After you finish the shift, the employer confirms it and your wages are paid to you. Each shift may ask for a different evidence level depending on how risky the work is - not every shift needs a handover photo. |
| `shifts.detail.paymentEvidence.required.body` | Hãy chuẩn bị thực hiện đầy đủ checklist và đính kèm ảnh bàn giao khi check-out để được thanh toán nhanh. | Be ready to complete the full checklist and attach a handover photo at check-out to get paid quickly. |
| `help.paymentEvidence.description` | Việc nhẹ chỉ cần checklist; việc có tiền mặt hay kho hàng cần thêm ảnh bàn giao và ghi chú. Đừng chụp khách hàng, giấy tờ cá nhân hay hoá đơn nhạy cảm. | Light work needs only the checklist; work involving cash or stock also needs a handover photo and note. Do not photograph customers, personal documents or sensitive receipts. |
| `shifts.detail.paymentEvidence.autoReleaseRule` | Nếu nhà tuyển dụng không thao tác trong 12 giờ, hệ thống sẽ tự động trả tiền công. | If the employer does nothing within 12 hours, the system pays your wages automatically. |
| `admin.profile.employer.disputedPayments` | Hiện có {count} thanh toán đang tranh chấp. | {count} payments are currently in dispute. |
| `review.report.modal.reasonPlaceholder` | Ví dụ: Nội dung sai sự thật, xúc phạm, spam... | For example: false, offensive, spam... |
| `workerDeposit.exempt.IDENTITY` | Bạn được miễn cọc khi ứng tuyển vì đã xác thực CCCD. | You do not need an application deposit because your ID card is verified. |
| `workerDeposit.exempt.COMPLETED_SHIFTS` | Bạn được miễn cọc khi ứng tuyển vì đã làm đủ {n} ca trong {days} ngày. | You do not need an application deposit because you completed {n} shifts in {days} days. |
| `workerDeposit.apply.required` | Ứng tuyển ca này cần đặt cọc {amount}. | Applying to this shift needs a deposit of {amount}. |
| `workerDeposit.apply.rules` | Bạn nhận lại đủ khi làm xong ca, bị từ chối, hoặc huỷ trước giờ bắt đầu. Nếu vắng mặt không báo, tiền cọc chuyển cho nhà tuyển dụng. | You get it all back when you finish the shift, are rejected, or cancel before the start time. If you do not show up without notice, the deposit goes to the employer. |
| `workerDeposit.blocked` | Bạn cần đặt cọc khi ứng tuyển tới ngày {date} vì có lần vắng mặt gần đây. | You need to pay a deposit when applying until {date} because of a recent no-show. |
| `workerDeposit.apply.limit` | Bạn đang giữ {open}/{max} khoản cọc, đã đạt tối đa. | You are holding {open}/{max} deposits, the maximum. |
| `workerDeposit.apply.balance` | Số dư ví: {balance}. | Wallet balance: {balance}. |
| `workerDeposit.apply.insufficient` | Ví chưa đủ tiền cọc. | Your wallet does not have enough for the deposit. |
| `workerDeposit.apply.topUp` | Nạp tiền vào ví | Top up your wallet |
| `workerDeposit.apply.verify` | Xác thực CCCD để được miễn cọc | Verify your ID card to skip the deposit |
| `workerDeposit.confirm.title` | Đặt cọc để ứng tuyển | Pay a deposit to apply |
| `workerDeposit.confirm.body` | {amount} sẽ được giữ từ ví của bạn. Bạn nhận lại đủ khi làm xong ca, bị từ chối, hoặc huỷ trước giờ bắt đầu. | {amount} will be held from your wallet. You get it all back when you finish the shift, are rejected, or cancel before the start time. |
| `workerDeposit.confirm.noShow` | Nếu vắng mặt không báo, tiền cọc chuyển cho nhà tuyển dụng (bạn có 72 giờ để khiếu nại). | If you do not show up without notice, the deposit goes to the employer (you have 72 hours to dispute it). |
| `workerDeposit.confirm.submit` | Đặt cọc và ứng tuyển | Pay deposit and apply |
| `workerDeposit.contest.refunded` | Tiền cọc {amount} đã hoàn về ví của bạn. | Your deposit of {amount} has been refunded to your wallet. |
| `workerDeposit.contest.title` | Tiền cọc {amount} đang được giữ | Your deposit of {amount} is on hold |
| `workerDeposit.contest.reviewPending` | Khoản cọc đang chờ quản trị viên xem xét trước khi chuyển. Nếu bạn có đến, gửi khiếu nại để quản trị viên xét. | The deposit is waiting for an administrator’s review before it is transferred. If you did show up, send a dispute for the administrator to consider. |
| `workerDeposit.contest.pending` | Bạn đã khiếu nại. Quản trị viên đang xem xét, tiền cọc vẫn được giữ tới khi có quyết định. | You sent a dispute. An administrator is reviewing it; the deposit stays on hold until there is a decision. |
| `workerDeposit.contest.expired` | Đã hết hạn khiếu nại. Tiền cọc sẽ chuyển cho nhà tuyển dụng. | The dispute deadline has passed. The deposit will go to the employer. |
| `workerDeposit.contest.body` | Bạn bị đánh vắng mặt ở ca này. Nếu bạn có đến, gửi khiếu nại trước {deadline}. Quá hạn, tiền cọc chuyển cho nhà tuyển dụng. | You were marked absent for this shift. If you did show up, send a dispute before {deadline}. After that, the deposit goes to the employer. |
| `workerDeposit.contest.placeholder` | Ví dụ: Tôi có đến lúc 8:05, đã gặp quản lý ca. | For example: I arrived at 8:05 and met the shift manager. |
| `workerDeposit.contest.forfeited` | Tiền cọc {amount} đã chuyển cho nhà tuyển dụng. | Your deposit of {amount} has gone to the employer. |
| `workerDeposit.status.needs` | Mỗi lần ứng tuyển, bạn đặt cọc {pct}% tiền công ca (tối đa {max}). Tiền cọc được hoàn lại khi bạn làm xong ca. | Each time you apply, you pay a deposit of {pct}% of the shift’s wages (up to {max}). It is refunded when you finish the shift. |
| `workerDeposit.status.howToExempt` | Xác thực CCCD hoặc làm đủ {n} ca trong {days} ngày để không phải cọc (đã làm {done}/{n}). | Verify your ID card or complete {n} shifts in {days} days to skip the deposit (done {done}/{n}). |
| `workerDeposit.status.title` | Cọc khi ứng tuyển | Application deposit |
| (câu) | Ảnh mặt tiền | Storefront photo |
| (câu) | Không cần giấy phép kinh doanh. Bạn có thể xác minh bằng danh tính người thuê, địa điểm làm việc và giữ cọc 100% tiền công. | No business licence needed. You can verify with the hirer’s identity and the workplace, and deposit 100% of wages. |
| (câu) | Hộ kinh doanh: nộp CCCD đại diện + giấy phép hộ kinh doanh + ảnh mặt tiền. | Household business: submit the representative’s ID card + household business licence + storefront photo. |
| (câu) | Cần ảnh địa điểm cho ca này hoặc ảnh mặt tiền/nơi làm việc đã được duyệt trên hồ sơ. | You need a location photo for this shift or an approved storefront/workplace photo on your profile. |
| (câu) | Bạn bấm "Xác nhận hoàn thành" cho từng người: tiền công vào ví người đó ngay. | You tap "Confirm completion" for each person: their wages go into their wallet straight away. |
| (câu) | Cấp độ tin cậy (Mới / Đã xác minh / Tin cậy cao) sẽ ảnh hưởng đến hiển thị, ưu tiên và phí dịch vụ trong tương lai, nhưng không làm giảm tỷ lệ cọc. | Trust levels (New / Verified / Highly trusted) will affect visibility, priority and service fees in the future, but do not lower the deposit ratio. |
| (câu) | Cấp độ tin cậy và tỷ lệ giữ tiền ca làm | Trust levels and the share of shift money held |
| (câu) | Khi bạn huỷ ca đúng quy định (trước 6 giờ và chưa có người ứng tuyển), tiền được hoàn về ví. | When you cancel a shift within the rules (more than 6 hours ahead and no applicants yet), the money is refunded to your wallet. |
| (câu) | Khi bạn xác nhận hoàn thành ca, hệ thống chuyển khoản tiền ca được giữ thành tiền công cho người lao động. | When you confirm a shift is completed, the held shift money becomes the worker’s wages. |
| (câu) | Khi nào tiền được trả | When the money is paid |
| (câu) | Khi nào tiền được trả hoặc hoàn | When the money is paid or refunded |
| (câu) | Khi xảy ra tranh chấp, quản trị viên quyết định trả hoặc hoàn khoản tiền ca được giữ dựa trên bằng chứng. | If there is a dispute, an administrator decides from the evidence whether the held shift money is paid out or refunded. |
| (câu) | Mọi giao dịch tiền tệ trên CaLẻ hiện tại là mô phỏng. Khi phiên bản chính thức ra mắt, chúng tôi sẽ thông báo rõ về cổng thanh toán hỗ trợ và các điều khoản tài chính áp dụng. | All money transactions on CaLẻ are currently simulated. When the official version launches, we will announce the supported payment gateway and the financial terms that apply. |
| (câu) | Mục tiêu là bảo vệ tiền công cho người lao động ngay cả khi nhà tuyển dụng không liên hệ được. | The goal is to protect workers’ wages even if the employer cannot be reached. |
| (câu) | Nhà tuyển dụng giữ cọc tiền công trước; tiền chỉ trả cho người lao động khi ca hoàn thành. Trong MVP/demo không có giao dịch thật. | Employers deposit the wages up front; the money is paid to workers only when the shift is completed. The MVP/demo has no real transactions. |
| (câu) | Nạp tiền vào ví bằng chuyển khoản (PayOS). Khi đăng ca, hệ thống giữ cọc tiền công cùng phí dịch vụ 10% từ ví của bạn; tiền công chỉ được trả cho người lao động khi ca hoàn thành. | Top up your wallet by bank transfer (PayOS). When you post a shift, the wages plus the 10% service fee are held from your wallet; the wages are paid to workers only when the shift is completed. |
| (câu) | Số dư ví rút về tài khoản ngân hàng bất cứ lúc nào. | You can withdraw your wallet balance to your bank account at any time. |
| (câu) | Trong giai đoạn dùng thử, mọi nhà tuyển dụng đều giữ trước 100% tiền công của ca, không phụ thuộc cấp độ tin cậy. | During the trial, every employer deposits 100% of a shift’s wages up front, whatever their trust level. |
| (câu) | Trước 6 giờ: huỷ tự do, hoàn 100% khoản tiền ca được giữ. | More than 6 hours ahead: cancel freely and get 100% of the held shift money back. |
| (câu) | Tổng khoản tiền ca được giữ = mức theo giờ × số giờ × số vị trí. Toàn bộ khoản này được giữ trong ví cho đến khi ca hoàn thành hoặc được hoàn theo quy định huỷ. | Total held shift money = hourly rate × hours × positions. The whole amount stays held in the wallet until the shift is completed or refunded under the cancellation rules. |
| (câu) | Vị trí không có người làm, người lao động bị đánh dấu vắng mặt, hoặc ca bị huỷ: phần cọc tương ứng (kể cả phí) được hoàn về ví của bạn. | Unfilled positions, workers marked absent, or a cancelled shift: the matching part of the deposit (including the fee) is refunded to your wallet. |
| (câu) | Ví dụ: Doanh nghiệp đã được đăng ký chính thức nên cần chuyển sang loại Doanh nghiệp. | For example: the business is now officially registered, so it should move to the Business type. |
| (câu) | Khi xác nhận hoàn thành ca, bạn chấm 1–5 sao và viết nhận xét ngắn. Trong bản demo, phải đánh giá thì tiền công (mô phỏng) mới được trả. | When you confirm a shift is completed, you give 1–5 stars and a short comment. In the demo, the (simulated) wages are paid only after you review. |
| (câu) | Sau khi ca được xác nhận hoàn thành, bạn có 14 ngày để chấm 1–5 sao cho từng người trong trang quản lý ca. Đánh giá không ảnh hưởng tiền công, và người lao động cũng có thể đánh giá lại bạn. | Once a shift is confirmed as completed, you have 14 days to give each person 1–5 stars on the shift management page. Reviews do not affect wages, and workers can review you too. |
| (câu) | Vui lòng chọn loại tài khoản nhà tuyển dụng trước khi đăng ca. Loại tài khoản giúp xác định giấy tờ cần xác minh, mức cọc và quy tắc an toàn cho người lao động. | Please choose your employer account type before posting shifts. It determines which documents need verifying, the deposit level and the safety rules for workers. |
| (câu) | Vui lòng chọn ngày giờ mới trước khi giữ cọc. | Please choose a new date and time before holding the deposit. |
| (câu) | Trong bản MVP, tài liệu là mô phỏng — không có upload thật. Quản trị viên là người duy nhất xem tài liệu đầy đủ; nhà tuyển dụng chỉ thấy huy hiệu và số đăng ký dạng rút gọn. | In the MVP, documents are simulated — nothing is really uploaded. Only administrators see the full document; employers see just the badge and a shortened document number. |
| (câu) | Khoản cần giữ cọc | Amount to hold |
| (câu) | Máy chủ tính lại chính xác số tiền khi giữ cọc. | The server recalculates the exact amount when holding the deposit. |
| (câu) | Nạp phần còn thiếu bằng QR chuyển khoản | Top up the shortfall with a bank transfer QR code |
| (câu) | Nạp phần còn thiếu để giữ cọc | Top up the shortfall to hold the deposit |
| (câu) | Nạp {amount} qua QR | Top up {amount} by QR |
| (câu) | Phí dịch vụ vừa thay đổi — số tiền cần giữ là {amount}. Bấm xác nhận lại để đăng ca. | The service fee just changed — the amount to hold is now {amount}. Tap confirm again to post the shift. |
| (câu) | Số dư sau khi giữ cọc | Balance after the deposit |
| (câu) | Số dư ví | Wallet balance |
| (câu) | Ví của bạn (để giữ cọc ca này) | Your wallet (to hold this shift’s deposit) |
| (câu) | Ví không đủ để giữ cọc. Cần thêm | Your wallet does not have enough to hold the deposit. You need |
| (câu) | Xác nhận đăng ca — giữ cọc từ ví | Confirm posting — hold the deposit from your wallet |
| (câu) | Xác nhận đăng ca — giữ cọc {amount} | Confirm posting — hold {amount} |
| (câu) | Chưa nhận được xác nhận thanh toán. Nếu vừa chuyển khoản, đợi vài giây rồi bấm kiểm tra lại. | No payment confirmation yet. If you just made the transfer, wait a few seconds and tap check again. |
| (câu) | Không tạo được mã QR. Dùng nút mở trang thanh toán bên dưới. | Could not create the QR code. Use the button below to open the payment page. |
| (câu) | MÔ PHỎNG — KHÔNG CÓ GIAO DỊCH TIỀN THẬT | SIMULATION — NO REAL MONEY IS MOVED |
| (câu) | Mã QR chuyển khoản | Bank transfer QR code |
| (câu) | Mở trang thanh toán PayOS | Open the PayOS payment page |
| (câu) | Nạp vào | Top up to |
| (câu) | Quét mã QR bằng app ngân hàng để chuyển khoản. Giữ nguyên số tiền và nội dung chuyển khoản. Sau khi chuyển xong, bấm "Tôi đã chuyển khoản". | Scan the QR code with your banking app to transfer. Do not change the amount or the transfer description. When you are done, tap "I have transferred". |
| (câu) | Số tiền nạp | Top-up amount |
| (câu) | Tôi đã chuyển khoản | I have transferred |
| (câu) | Tôi đã chuyển khoản (mô phỏng) | I have transferred (simulated) |
| (câu) | Ví của bạn | Your wallet |
| (câu) | Đây là luồng mô phỏng: bấm "Tôi đã chuyển khoản (mô phỏng)" để cộng số dư ví ngay, không có tiền thật. | This is a simulated flow: tap "I have transferred (simulated)" to add to your wallet balance straight away, with no real money. |
