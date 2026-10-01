/**
 * Bản tiếng Anh của cẩm nang (VI/EN, 01/10). Khoá = `id` bài trong
 * `handbookArticles.ts`. Mỗi bài có CÙNG số mục `content` với bản Việt; ảnh
 * (`imageUrl`) lấy từ bản Việt theo thứ tự mục, ở đây chỉ có chữ.
 * Thiếu bài / thiếu mục → trang hiện bản Việt. Test: handbookByRole.test.ts.
 * ⚠️ Bản dịch do AI viết — nhờ người đọc lại trước khi quảng bá.
 */

import type { HandbookArticleSection } from './handbookArticles';

export type HandbookArticleSectionEn = Omit<HandbookArticleSection, 'imageUrl'>;

export interface HandbookArticleEn {
  title: string;
  excerpt: string;
  imageAlt: string;
  content: HandbookArticleSectionEn[];
}

export const handbookArticlesEn: Record<string, HandbookArticleEn> = {
  'evidence-levels': {
    title: 'Evidence at check-out: the 5 levels and how to prepare',
    excerpt:
      'Every shift has an evidence level chosen by the employer when posting it. Knowing it in advance helps you check out quickly and get paid on time.',
    imageAlt: 'Handover evidence at the end of a shift',
    content: [
      {
        paragraphs: [
          'When your shift ends, you check out on CaLẻ. Depending on the evidence level the employer set for the shift, you may need to tick a checklist, enter a handover photo name or write a handover note.',
          'Each shift shows its level on the shift page, under "Payment & evidence process". Check it before you apply so you can prepare.',
        ],
      },
      {
        heading: '1. No evidence needed',
        paragraphs: ['Tap check-out and you are done. Just tell the employer when the work is finished.'],
      },
      {
        heading: '2. Completion checklist only',
        paragraphs: [
          'You must tick every checklist item (did the work as described, told the employer the result) before you can submit your check-out.',
        ],
      },
      {
        heading: '3. Handover photo optional',
        paragraphs: [
          'A photo is not required. It is still worth photographing your work area at handover: if there is a dispute later, it is your evidence.',
        ],
      },
      {
        heading: '4. Handover photo required',
        paragraphs: [
          'You must enter the handover photo file name before you can check out. Common for jobs with goods or property to hand over.',
        ],
        note: 'CaLẻ does not upload photos to the server yet: you enter the file name of the photo you took and keep the photo on your phone in case an administrator needs to check it.',
      },
      {
        heading: '5. Checklist + handover note required',
        paragraphs: [
          'The strictest level, used for higher-risk jobs such as cashier or security. You must tick the whole checklist and write a handover note (up to 1,000 characters): what you handed over, to whom, and anything left unfinished.',
        ],
      },
      {
        heading: 'After you check out',
        bullets: [
          'When the employer confirms completion, your pay goes into your wallet.',
          'If the employer does nothing, the system confirms automatically and pays you 24 hours after the shift ends.',
          'If the employer raises a dispute, your pay is held while an administrator reviews it; you can respond and send more evidence.',
        ],
        note: 'Do not photograph customers’ faces without permission. Do not photograph personal documents, invoices with sensitive details or private areas of the shop.',
      },
    ],
  },

  '1': {
    title: 'Your first shift: 5 things to prepare before you go',
    excerpt:
      'Your first job will feel new. With the practical steps below, you can walk into your first shift with confidence, impress the manager and build a strong start for future work.',
    imageAlt: 'Preparing clothes and things to bring before work',
    content: [
      {
        paragraphs: [
          'You scrolled through CaLẻ, tapped apply and got the "Approved" notice from the shop! You are probably feeling a mix of joy at the extra income and nerves about what tomorrow will be like.',
          'With short hourly jobs, businesses expect you to catch on fast and help right away, especially at peak times. Looking lost or unprepared slows everyone down and directly affects your reputation score in the system. So how do you make your first shift a great start?',
        ],
      },
      {
        heading: '1. Read the job description carefully',
        paragraphs: [
          'A common mistake for first-timers is looking only at the pay and hours and skipping the details. Open the app again and go through every line. What colour uniform does the shop want? Do you need an apron or a small notebook?',
          'Many restaurants ask waiting staff to wear a white collared shirt, dark trousers and closed shoes. Turning up in a collarless T-shirt or flip-flops can get you turned away on the spot. Following the dress code strictly is the clearest sign that you are professional.',
        ],
        imageCaption: 'Preparing well before the shift helps you finish your first one with confidence.',
      },
      {
        heading: '2. Plan your journey in advance',
        paragraphs: [
          'The golden rule of service work: "On time means 15 minutes early". That buffer lets you catch your breath, park, change into uniform and get to know the place.',
          'To avoid being late, check the route on a map the night before. Work out the distance, think about traffic jams at that hour and add at least 20 minutes for surprises. Never start looking for the way just before you leave.',
        ],
      },
      {
        heading: '3. Communicate and be ready to learn',
        paragraphs: [
          'When you arrive, find the manager or shift lead and let them know you are there. A clear greeting such as "Hello, I’m [your name], I took the 6 pm shift through the app" makes a good impression straight away.',
          'While working, do not be afraid to ask if you are unsure about something. A shop would rather spend 1 minute showing you how to sort the rubbish than 10 minutes fixing a mistake. Keep a small notebook to jot down table numbers or the service routine.',
        ],
      },
      {
        heading: '4. Respect the workplace culture',
        paragraphs: [
          'Every business, big or small, has its own way of working. Some value speed and a lively buzz; others want quiet, care and attention to detail. Even if you are only there for a few hours, watching and adjusting to the people around you is a very important skill.',
        ],
      },
      {
        heading: '5. Finish the job properly',
        paragraphs: [
          'A good shift is good from start to finish. Before leaving, make sure you have done everything you were given and cleaned your area. Hand over to the next shift (if any) and report to the manager before you go.',
          'Care in the last minutes is what earns you a full 5-star rating in the system.',
          'Remember, the goal of every shift is for the employer to be happy and want you back: do the work you agreed to, stay friendly, and if something comes up, let them know early through the app instead of silently not showing up.',
        ],
      },
      {
        heading: 'Final word',
        note: 'Professionalism does not come by itself; it is built shift by shift. With a serious attitude, willingness to learn and good preparation, your first shift will be a good memory and a solid step for your profile.',
      },
    ],
  },

  '2': {
    title: 'No experience yet? Which jobs to start with',
    excerpt:
      'No reviews on your profile yet? Short-shift work always has good roles that need no special skills, so you can build income and experience easily.',
    imageAlt: 'A student working at a wedding event',
    content: [
      {
        paragraphs: [
          'You have just set up your account and filled in everything, but "Work experience" is still blank. You may hesitate when you see posts asking for "POS experience", "barista skills" or "English communication".',
          'Do not worry! Short-term work exists to cover urgent staffing needs at peak times. At those moments, businesses need people who are fit, hard-working and serious more than people with complex skills. Here are the best groups of jobs to start with.',
        ],
      },
      {
        heading: '1. Helping at wedding venues / weekend events',
        paragraphs: [
          'This is one of the best options for newcomers. At weekends, conference and wedding centres run at full capacity. They always need many temporary staff to carry food, set up tables and chairs, or clean the hall after the event.',
          'The work is split into very simple steps. You will not need to memorise complex menus or talk at length with guests. Instead, you work in a team led by a team leader. All you need is care and the stamina to keep moving for several hours.',
        ],
        imageCaption: 'General jobs such as serving and events are a great first step for newcomers.',
      },
      {
        heading: '2. Warehouse helper / stock sorting',
        paragraphs: [
          'During holidays and big sales, the volume of goods shoots up. Roles such as unloading, sorting products, labelling and restocking shelves keep opening.',
          'The big advantage is that you hardly deal with customer pressure. You work with products and the warehouse. The repetitive nature means newcomers are not overwhelmed, and you build patience and attention to detail.',
        ],
      },
      {
        heading: '3. Cleaning / dishwashing at peak times',
        paragraphs: [
          'Many young people avoid this kind of job because it looks hard and dirty. But if you get past that, it is one of the easiest jobs to get and pays relatively well. Restaurants are always short of dishwashing staff from 7 pm to 10 pm.',
          'The work is independent with clear instructions (for example, a 3-step wash and dry routine), and when the shift ends you can leave straight away without complicated reports or handovers.',
        ],
      },
      {
        heading: 'Advice for newcomers',
        note: 'Do not be shy about starting with simple manual work. What you gain early on is not just pay but 5-star ratings from employers. A record of 10 excellent warehouse shifts will count heavily when you later apply for sales or higher-level service roles.',
      },
    ],
  },

  '3': {
    title: 'Build a trustworthy profile: the key to always getting shifts',
    excerpt:
      'Your online profile is your face. When hiring moves this fast, a professional-looking profile helps you stand out from dozens of other applicants.',
    imageAlt: 'A worker’s profile as shown on the platform',
    content: [
      {
        paragraphs: [
          'You keep applying but your shifts say "Rejected" or sit at "Awaiting review"? The problem may not be your experience but how you present yourself in your Profile.',
          'In short-term hiring, speed is everything. A manager who urgently needs someone for tonight has no time to read a 3-page PDF CV. They glance at your profile in the app for about 5 seconds before deciding. How do you win them over in those 5 seconds?',
        ],
      },
      {
        heading: '1. Profile photo: clear, friendly and professional',
        paragraphs: [
          'Your photo is the first thing an employer sees. You do not need a suit or a studio portrait. But landscape photos, pet photos or dark selfies that hide half your face count against you.',
          'A good photo: wear a collared T-shirt or a light shirt. Choose a spot with good natural light and a plain background. Look straight at the camera and smile slightly. A bright, trustworthy face is a great ticket into service jobs.',
        ],
        imageCaption: 'A tidy, clear profile catches an employer’s eye straight away.',
      },
      {
        heading: '2. Make your introduction count',
        paragraphs: [
          'The introduction is not the place for your life story. Write it as a sharp elevator pitch, 3–4 sentences at most.',
          '**A formula that works:** [Your current situation] + [Your strengths] + [When you are free].',
          '**Good example:** "I’m a third-year student, fit, hard-working and a fast learner. I can handle pressure in a busy restaurant. I’m usually free on weekday evenings from 6 to 10 pm."',
          'In 3 sentences you have given the owner everything they need to judge whether you fit.',
        ],
      },
      {
        heading: '3. Protect your reputation score and completion history',
        paragraphs: [
          'Job platforms always show the most reliable applicants first. That reliability is built entirely on your work history.',
          'Each 5-star review with praise from a previous manager, such as "Polite, quick, kept everything clean", weighs a hundred times more than anything you write about yourself. Treat every job as a chance to add these bricks of trust.',
        ],
      },
      {
        heading: 'Warning: cancellation history',
        note: 'Cancelling at the last minute, or worse, not showing up at all without a word, is the biggest mistake. The system records these on your public profile. An account with a high cancellation rate will find it very hard to be approved anywhere else.',
      },
    ],
  },

  '4': {
    title: 'Reading a job post: spot safe work and avoid scams',
    excerpt:
      'Not every job offer is transparent. Learn to read job posts carefully to protect your time, effort and money.',
    imageAlt: 'A worker carefully reading a job post',
    content: [
      {
        paragraphs: [
          'Part-time and side-job work is always busy, but it is also fertile ground for scams that take advantage of workers, especially students. Offers like "easy work, high pay" or "earn millions from home" still appear every day.',
          'Spotting an untrustworthy post is not hard if you know the basic rules and keep a cool head.',
        ],
      },
      {
        heading: '1. Signs of a proper job post',
        paragraphs: [
          'A serious employer who really needs staff will try to make everything clear to save time for both sides. A trustworthy post includes:',
          '- **Who they are:** a clear business name with an exact address down to the street number (e.g. "ABC Café, 123 XYZ Street, District 1").',
          '- **Measurable job details:** clear start and end times (e.g. 18:00 – 22:30) and pay per hour or per shift.',
          '- **A real job description:** the specific tasks you will do, not vague words like "odd jobs" or "we will discuss when you arrive".',
        ],
        imageCaption: 'Stay alert and check the shop’s details before you accept a shift.',
      },
      {
        heading: '2. Red flags',
        paragraphs: [
          'If you see any of the following, stop immediately and report the post:',
          '- **Asking you to pay:** whether it is called a booking fee, registration fee, uniform deposit or account fee. Under labour law, employers may not take money from job seekers in any form.',
          '- **Unrealistic pay:** two or three times the usual rate for simple general work. There is no such thing as a free lunch.',
          '- **Refusing to use the platform:** the employer asks you to chat privately on Zalo/Telegram and pay you by personal bank transfer instead of through the platform. Once you leave the platform, you lose all protection if you are not paid.',
        ],
      },
      {
        heading: '3. Protect yourself with ratings',
        paragraphs: [
          'On professional job platforms, workers are not the only ones being rated. You can check a shop’s reputation through the number of shifts it has completed and the scores previous staff gave it.',
          'Prefer employers with a good track record in the system; this cuts the risk far below looking for random jobs on social media.',
        ],
      },
    ],
  },

  '5': {
    title: 'The balancing act: working part-time without hurting your studies',
    excerpt:
      'How do you make the most of flexible shifts while keeping your grades high? It all comes down to time management.',
    imageAlt: 'A student comparing a class timetable with a work schedule',
    content: [
      {
        paragraphs: [
          'For most students, part-time work is not only about covering living costs; it is also a great way to build soft skills and widen your network. But the line between "working part-time" and "neglecting your studies" is thin.',
          'Many students get stuck in fixed shifts, burn out and see their grades drop. With flexible shift-based work, you can take back control of your time.',
        ],
      },
      {
        heading: '1. The power of flexibility',
        paragraphs: [
          'The key feature of short shifts is freedom. You are not forced to sign up for a fixed schedule for a whole month. Midterms this week? Focus fully on revision. More free time next week? Take 3–4 shifts to make up the income.',
          'This flexibility lets you fit work into the gaps in your timetable instead of giving up study time.',
        ],
        imageCaption: 'A sensible schedule lets students earn and keep their grades.',
      },
      {
        heading: '2. Keep travel short',
        paragraphs: [
          'Do not let an extra 5.000đ per hour blind you if the job is 15 km from home. City traffic, jams and pollution will drain your energy fast.',
          'Set a search radius of at most 5 km around where you live or study. The 30 minutes you save each day can go to rest or revision.',
        ],
      },
      {
        heading: '3. Set time limits (time-boxing)',
        paragraphs: [
          'Give yourself a strict rule: no more than 20 hours of part-time work a week. Beyond that, your body does not have enough time to recover.',
          'The best split is to put long shifts (6–8 hours) on free weekends. On weekdays, only take short evening shifts (3–4 hours) and make sure they end before 22:30 so your sleep is not affected.',
        ],
      },
      {
        heading: 'Conclusion',
        paragraphs: [
          'Part-time work is there to support your life, not to replace your main job of studying. A smart student uses part-time work as a tool for growth and never lets it become a burden.',
        ],
      },
    ],
  },

  '6': {
    title: 'Clear earnings: how pay and allowances work',
    excerpt:
      'How can you be sure you get paid fairly for your work? Let’s break down what makes up the income of a shift.',
    imageAlt: 'A summary of pay and allowances in the app',
    content: [
      {
        paragraphs: [
          'Being clear about money is the basis of any good working relationship. When you take a short job, the most important thing is to be able to work out exactly how much you will take home before you even arrive.',
        ],
      },
      {
        heading: '1. Base pay',
        paragraphs: [
          'Most part-time shifts are paid by the hour. The core formula is: **[Hourly rate] × [Hours worked]**.',
          'Example: you take a shift from 18:00 to 22:00 (4 hours) at 30.000đ per hour. Your base pay is 120.000đ. The hourly rate must be shown clearly on the post and in the system, and must not change after you have accepted the job.',
        ],
        imageCaption: 'Knowing how hourly pay and allowances work helps you protect your rights.',
      },
      {
        heading: '2. Allowances and extra costs',
        paragraphs: [
          'Depending on the job and the shop, you may get benefits on top of base pay. Check whether the job description includes:',
          '- **Meal allowance:** usually if your shift is longer than 6 hours or covers a main mealtime (e.g. 10:00 to 15:00).',
          '- **Night / attendance allowance:** jobs ending after 22:00 often add a travel allowance for fuel.',
          '- **Overtime:** on busy holidays, the manager may ask you to stay 30 minutes to 1 hour longer. You can say no if you are busy, but if you agree, settle clearly whether that time is paid.',
        ],
      },
      {
        heading: '3. How pay works on CaLẻ',
        paragraphs: [
          'The employer has already held the pay for the shift on CaLẻ when posting it, so you do not need to chase cash or wait for a private transfer. After you check out, the employer confirms completion and the pay goes into your CaLẻ wallet; if they do nothing, the system confirms and pays you 24 hours after the shift ends.',
          'From your wallet, you withdraw to your bank account via PayOS (minimum 2.000đ). Do not accept "off-app" payment instead of the money held on CaLẻ: in a dispute, CaLẻ can only protect money that went through the system.',
        ],
      },
      {
        heading: 'When checking your pay',
        note: 'Pay on CaLẻ is based on the hours of the posted shift. If you are asked to stay longer, ask first how the extra time will be paid. If your pay does not match the posted shift, file a dispute on the shift page for an administrator to review.',
      },
    ],
  },

  '7': {
    title: 'Hiring fast: writing posts that attract applicants straight away',
    excerpt:
      'Is your shop overloaded and in need of staff right now? Learn to write a better job post to attract the right people for the right job in the shortest time.',
    imageAlt: 'The new shift form for employers',
    content: [
      {
        paragraphs: [
          'Sudden staff shortages at peak times are a constant problem in food & beverage and retail. When it happens, your only goal is to find help right away.',
          'Many managers rush a careless post with missing details, then nobody applies, or worse, they hire someone who cannot do the job. Here is the structure of a post that really attracts people.',
        ],
      },
      {
        heading: '1. Title: urgent and to the point',
        paragraphs: [
          'Among dozens of open shifts, your title must grab attention at once. Avoid fancy or vague titles. Use: **[Urgency] + [Role] + [Time/Place]**.',
          'For example, instead of "ABC Milk Tea is hiring", write "URGENT: 2 waiting staff tonight (6–10 pm) in Binh Thanh District". Urgency and a clear time push people nearby to apply right away.',
        ],
        imageCaption: 'A clear post with transparent pay is a magnet for workers.',
      },
      {
        heading: '2. Pay: direct and attractive enough',
        paragraphs: [
          'Income is the number one motivation for short-term workers. Phrases like "Pay negotiable" or "Depends on ability" in temporary job posts are a fatal mistake; applicants skip them immediately.',
          'Give the exact figure: "30.000đ/hour", plus any extras, e.g. "1 free meal", "20k fuel allowance". Sometimes a simple snack is enough to make your post stand out from competitors.',
          'Pay should also be fair for the workload and the area: night shifts, weekend shifts and heavy work deserve matching pay. Paying below the going rate may save a few tens of thousands, but usually brings fewer applicants and makes those who accept more likely to drop out.',
        ],
      },
      {
        heading: '3. Job description: honest, no exaggeration',
        paragraphs: [
          'For temporary work, applicants need to know exactly what they will physically do. Skip the big words. List the specific tasks as bullet points.',
          '- "Tasks: run food to tables and clear tables after guests leave. No order-taking."',
          '- "Requirements: black trousers, a dark T-shirt and trainers. Be quick and follow the team leader’s directions."',
          'An honest description filters out people afraid of hard work and keeps those who are really ready.',
        ],
      },
      {
        heading: 'Conclusion',
        paragraphs: [
          'Clarity is the strongest magnet in general hiring. When you put all the information openly on the table, the most suitable workers will come to you and help you get through your staffing crunch.',
        ],
      },
    ],
  },

  '8': {
    title: 'Reviewing applicants: choosing the right person for a very short shift',
    excerpt:
      'Facing dozens of applications, making a quick and accurate decision means knowing which signs show a worker’s ability.',
    imageAlt: 'A shop owner reviewing the list of applicants',
    content: [
      {
        paragraphs: [
          'Your post attracted 15 applicants, but you only need 2. The problem is that the shift starts in 3 hours and there is no time to call and interview each one.',
          'In on-demand work, quickly screening profiles using the indicators in the system is vital for a smooth-running shop.',
        ],
      },
      {
        heading: '1. Look at the reputation score and completion history',
        paragraphs: [
          'This is the most important filter. An applicant rated 4.8/5 with 20 completed shifts at different restaurants is a solid guarantee of their attitude. Skim the comments from previous employers.',
          'Pay special attention to no-shows. If a profile has taken jobs and then not turned up without notice, consider rejecting it straight away to avoid being left short-staffed.',
        ],
        imageCaption: 'A quick look at reputation and experience saves owners time.',
      },
      {
        heading: '2. Judge professionalism by how they prepare',
        paragraphs: [
          'You do not need someone with qualifications, but you do need someone serious. It shows in how they look after their profile. A clear photo, neat clothes and a to-the-point introduction are good signs.',
          'A profile that clearly states the area they live in, their free hours and a verified phone number shows someone proactive and easy to reach. For an urgent shift, a person who lives nearby and is free at exactly that time is usually the safer choice.',
        ],
      },
      {
        heading: '3. Give newcomers a chance',
        paragraphs: [
          'Do not rush to reject brand-new profiles with no experience. Every expert was once a beginner. For jobs that need no special skills, such as loading goods, washing dishes or running food, enthusiasm and stamina matter more than experience.',
          'Many young people starting their first job are very committed. Giving them their first chance not only gets you a hard worker but also builds loyalty, so they want to come back and work for you again.',
        ],
      },
    ],
  },

  '9': {
    title: 'A culture of reviews: the key to a reliable workforce',
    excerpt:
      'Spending 2 minutes reviewing staff after each shift not only helps the community grow but is also how you keep good people coming back to your business.',
    imageAlt: 'The screen for rating and reviewing after a shift',
    content: [
      {
        paragraphs: [
          'After closing up, counting the takings and cleaning, many managers skip writing a review because they are exhausted. "The job is done and they are paid, that is enough" is an outdated way of thinking.',
          'In the gig economy, two-way reviews are the rules that shape how everyone behaves.',
        ],
      },
      {
        heading: '1. A tool for keeping good staff',
        paragraphs: [
          'Everyone wants to be recognised. When a student does a good job, giving them 5 stars with a comment like "Great work, quick and tidy. I’ll call you again when we’re busy!" means a lot to them.',
          'That goodwill makes them choose your shop first whenever you post a new shift, even turning down other jobs to come back to a "good boss".',
        ],
        imageCaption: 'A 5-star review after each shift is the best way to build a trusted community.',
      },
      {
        heading: '2. Build a network of reliable workers',
        paragraphs: [
          'Every good review you leave is saved on that person’s profile. Over time you build your own pool of "regulars": the next time you post a shift, you can easily spot the profiles of people who did well for you and approve them first.',
          'Bringing back people who already know the job cuts out training from scratch and keeps your shop running efficiently.',
        ],
      },
      {
        heading: '3. Be responsible to other businesses',
        paragraphs: [
          'On the other hand, if a worker was late, lazy or broke the rules, leave honest but polite feedback. Do not hesitate to give a low score if it is deserved. This warns other businesses and is a valuable lesson for the worker to reflect on and improve.',
        ],
      },
    ],
  },

  '10': {
    title: 'No-show crisis: handling sudden gaps in your shift',
    excerpt:
      'A worker cancelling just before the shift is every manager’s worst nightmare. Prepare backup plans so your business keeps running smoothly.',
    imageAlt: 'A manager looking for a replacement when a worker cancels',
    content: [
      {
        paragraphs: [
          'It is 17:30, just 30 minutes before the dinner rush. Suddenly your phone buzzes: the worker you approved writes, "Sorry, my bike broke down, I can’t make it".',
          'Anger and panic are natural, but they will not fill the gap. Instead of losing your temper, start your crisis routine right away.',
        ],
      },
      {
        heading: '1. Act now: post a shift fast',
        paragraphs: [
          'Do not waste time arguing with the person who cancelled. When a worker cancels, that spot reopens and the shift stays visible for others to apply. If it is too close to the start (shifts cannot be edited within 24 hours of starting), post an extra shift for the missing work with more attractive pay.',
          'An urgent shift paying about 10.000đ/hour more than usual quickly attracts workers who are free nearby. The difference is well worth it to save a busy evening instead of leaving guests waiting and complaining about poor service.',
        ],
        imageCaption: 'Always have a backup plan and handle sudden cancellations calmly.',
      },
      {
        heading: '2. Deal with the no-show properly',
        paragraphs: [
          'Only once everything is sorted and the rush is over should you deal with the problem. If an approved worker did not come and did not tell you, mark them "Absent" on the shift management page (allowed from 15 minutes after the shift starts).',
          'A no-show without notice costs the worker 20 reputation points; below 50 they temporarily cannot apply for new shifts. The pay for the absent spot is refunded to your wallet. Workers can dispute if they think the mark is wrong, so mark honestly.',
        ],
      },
      {
        heading: '3. Prevent it in the first place',
        paragraphs: [
          'A good manager does not let the crisis happen. When you post a shift, add the on-site contact and phone number so workers can warn you early if something comes up instead of silently not showing. The clearer the description (clothes, arrival time, tasks), the less likely people are to drop out.',
          'Also, keep good relations with people who have worked hard for you: review them well after the shift and approve them first when they apply again. For an important shift, hiring one extra person is a good backup: unfilled spots are refunded to your wallet.',
        ],
      },
    ],
  },

  'employer-evidence-levels': {
    title: 'Choosing the evidence level when posting a shift',
    excerpt:
      'The evidence level decides what workers must submit when checking out. The right level gives you something to check against without making the job harder.',
    imageAlt: 'An employer choosing the evidence level when posting a shift',
    content: [
      {
        paragraphs: [
          'When you post a shift, the "Evidence after the shift" section lets you choose one of 5 levels. This is what workers must submit when they check out. The system suggests a level based on the job type; you can keep it or change it.',
        ],
      },
      {
        heading: 'How the system suggests a level',
        bullets: [
          'Low-risk jobs (flyer distribution, event support): Completion checklist only.',
          'Medium-risk jobs (waiting staff, barista, warehouse): Handover photo optional.',
          'High-risk jobs (cashier, security): Checklist + handover note required. For these jobs, the system does not allow a lower level.',
        ],
      },
      {
        heading: 'The 5 levels and when to use them',
        bullets: [
          'No evidence needed: simple work with nothing to hand over.',
          'Completion checklist only: the worker confirms they did the work as described and told you the result.',
          'Handover photo optional: photos are encouraged but not required. Suits most shifts.',
          'Handover photo required: there are goods, property or an area to check after the shift.',
          'Checklist + handover note required: cash, valuable property or a multi-step handover is involved.',
        ],
      },
      {
        heading: 'Tips for useful evidence',
        bullets: [
          'The check-out checklist is a standard template (did the work as described, reported the result…). So put the tasks and handover criteria clearly in the shift description.',
          'Do not ask for photos showing customers or personal documents.',
          'For now, the handover photo is a file name the worker enters; the real photo stays on their phone. In a dispute, the administrator may ask both sides to send more.',
        ],
      },
      {
        heading: 'After the worker checks out',
        paragraphs: [
          'Confirm completion to pay the worker, or raise a dispute if something is wrong. If you do nothing, the system confirms automatically and pays 24 hours after the shift ends. During a dispute, the pay is held until an administrator resolves it.',
        ],
      },
    ],
  },

  'employer-deposit-fee': {
    title: 'Money held when posting, service fees and refunds',
    excerpt:
      'When you post a shift, CaLẻ holds the pay plus the service fee from your wallet. This article explains where the money goes, when workers are paid and when you get money back.',
    imageAlt: 'Money held, service fees and refunds for employers',
    content: [
      {
        heading: '1. Top up your wallet',
        paragraphs: [
          'You top up your wallet with a PayOS QR code, scanned with your banking app. The money arrives as soon as PayOS confirms it was received.',
          'Transfer the exact amount on the QR code. If you send a different amount, pay an expired code or pay twice, the transfer is marked "needs review". An administrator checks it, then credits your wallet or arranges a refund; the result appears in your wallet and in your notifications.',
        ],
      },
      {
        heading: '2. Posting: pay + service fee are held',
        paragraphs: [
          'When you tap Post, the system holds from your wallet the total pay for the shift (hourly rate × hours × people needed) plus a 10% service fee. Example: 200.000đ of pay holds 220.000đ.',
          'The shift only becomes visible to workers once the full amount is held. If your wallet is short, top up before posting.',
        ],
        bullets: [
          'During a fee-free period (if CaLẻ is running one), eligible shifts have no fee.',
          'Top-up bonus money (if there is a promotion) can only pay service fees and cannot be withdrawn.',
        ],
      },
      {
        heading: '3. After the shift: paying the workers',
        bullets: [
          'When you confirm completion, the pay goes into the worker’s wallet and the service fee is charged for that part of the shift.',
          'If you do not confirm, the system settles about 24 hours after the shift ends: workers who checked in are paid, those who did not check in are marked absent.',
          'If there is a dispute, the money for that part is held until an administrator resolves it.',
        ],
      },
      {
        heading: '4. When money comes back to your wallet',
        paragraphs: [
          'Unfilled spots, absent workers, cancelled or expired shifts: the pay and service fee for that part are refunded to your wallet. The 10% fee is only charged on the part of the shift that was actually worked.',
        ],
      },
      {
        heading: '5. Editing and cancelling shifts',
        bullets: [
          'Shifts cannot be edited within 24 hours of the start.',
          'Shifts cannot be cancelled within 6 hours of the start if someone has applied or been approved.',
          'When you cancel, the money held is refunded to your wallet. Workers have arranged their schedule around your shift, so tell them early and give a clear reason.',
        ],
      },
      {
        heading: '6. Withdrawing',
        paragraphs: [
          'You withdraw your balance to a bank account via PayOS, minimum 2.000đ. Top-up bonus money cannot be withdrawn. Double-check the bank and account number: money sent to the wrong account cannot be recovered.',
        ],
        note: 'Top-ups, money held, pay and withdrawals on CaLẻ are real money through PayOS. When contacting support, include the top-up order code (#…) from your wallet history.',
      },
    ],
  },
};
