"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

export default function Home() {
  const { data: session } = useSession();
  const { t, lang } = useLanguage();

  const content =
    lang === "bg"
      ? {
          eyebrow: "Платформа за записване и управление на медицински прегледи",
          heroTitle: "Повече яснота, по-малко хаос при запазването на часове.",
          heroBody:
            "CarePoint събира на едно място търсенето на лекари, свободните графици, резервациите, известията и историята на прегледите. Платформата е създадена да направи записването на медицински преглед бързо, ясно и удобно, без излишно лутане между телефони, чатове и ръчни списъци.",
          heroPoints: [
            "Търсене по име, специалност и град",
            "Записване на час само в реално свободни слотове",
            "График, който лекарят управлява сам",
            "Известия, история и по-добра организация след записа",
          ],
          snapshotLabel: "Какво има в платформата",
          snapshotTitle: "CarePoint не е само форма за резервация.",
          snapshotBody:
            "Продуктът е изграден около реални нужди на хора, които искат бързо да намерят специалист, да запазят удобен час и да не губят контекст след това.",
          stats: [
            { value: "24ч", label: "филтър за бърз запис" },
            { value: "1 място", label: "за лекари, часове и история" },
            { value: "100%", label: "валидирани слотове" },
            { value: "Защитено", label: "съхранение на чувствителни данни" },
          ],
          whyLabel: "Защо CarePoint",
          whyTitle: "По-подредено преживяване от първото търсене до самия преглед",
          whyCards: [
            {
              title: "По-малко объркване при записване",
              body: "Свободните и заетите слотове се показват ясно, а логиката на системата не допуска конфликтни активни резервации в един и същи слот.",
            },
            {
              title: "По-лесен избор на правилния специалист",
              body: "Профилите, специалностите, градовете и отзивите помагат на потребителя да стигне по-бързо до правилния лекар за конкретната нужда.",
            },
            {
              title: "Полезно и след самото записване",
              body: "Потребителят не губи контекста след резервацията, защото има история, известия, статус на прегледа, календарен експорт и детайли за часа.",
            },
            {
              title: "Изградено като реален дигитален продукт",
              body: "Платформата вече покрива основния поток по намиране на лекар, записване, проследяване и обратна връзка и е готова за пазарно доразвитие.",
            },
          ],
          stepsLabel: "Как работи",
          stepsTitle: "Основният поток е направен да бъде лесен за следване",
          steps: [
            {
              step: "01",
              title: "Откриваш подходящ лекар",
              body: "Пациентът използва търсене, филтри и сортиране, за да стигне бързо до правилния специалист според нуждата си.",
            },
            {
              step: "02",
              title: "Запазваш реален свободен час",
              body: "Платформата работи с графика на конкретния лекар и позволява записване само в валиден и свободен слот.",
            },
            {
              step: "03",
              title: "Следиш прегледа след това",
              body: "Резервацията остава достъпна в таблото, историята и известията, така че потребителят да не губи информация след записа.",
            },
          ],
          useCasesLabel: "Създадено за реална употреба",
          useCasesTitle: "Каква стойност дава платформата в ежедневната употреба",
          useCases: [
            {
              title: "По-бързо намиране на лекар",
              body: "Потребителят достига до правилния специалист по-бързо чрез филтри, отзиви и ясна визуализация на свободните слотове.",
              href: "/doctors",
              cta: "Към лекарите",
            },
            {
              title: "По-малко пропусната информация",
              body: "След запазването на час потребителят има достъп до история, детайли за прегледа, известия и календарен експорт на срещата.",
              href: "/appointments",
              cta: "Виж прегледите",
            },
            {
              title: "По-добро доверие в услугата",
              body: "Профилите, отзивите, сигурната автентикация и защитата на данните създават усещане за надежден продукт, готов за реални потребители.",
              href: "/faq",
              cta: "Научи повече",
            },
          ],
          featuresLabel: "Основни възможности",
          featuresTitle: "Какво можеш да правиш в CarePoint",
          features: [
            "Търсене на лекари по специалност, име и град",
            "Бързо филтриране на наличност до следващите 24 часа",
            "Записване на час с валидиран слот и минимална бележка",
            "Пренасрочване, отказ и история на прегледите",
            "Управление на график от страна на лекаря",
            "Известия, любими лекари и обратна връзка",
          ],
          securityLabel: "Сигурност и надеждност",
          securityTitle: "Платформата е изградена като продукт, а не само като демо интерфейс",
          securityBody:
            "CarePoint използва сигурна автентикация, валидиране на критичните действия и защита на данните на няколко нива. Това е важно, защото приложението работи с профили, резервации, бележки и чувствителна потребителска информация.",
          securityItems: [
            "защитени сесии и контролиран достъп",
            "валидиране на слотове и защита от конфликтни записи",
            "ограничаване на опити за вход и записване",
            "криптиране на чувствителни текстови полета",
            "по-надеждно съхранение на потребителски данни",
          ],
          footerCtaTitle: "Започни сега или разгледай платформата като гост",
          footerCtaBody:
            "Ако вече имаш акаунт, можеш да отидеш директно в таблото. Ако още нямаш, първо разгледай лекарите или си създай профил и тествай пълния поток.",
          footerSecondary: "Или отвори често задаваните въпроси",
          footerSecondaryButton: "Виж FAQ",
        }
      : {
          eyebrow: "Web platform for booking and managing medical appointments",
          heroTitle: "More clarity, less friction when booking care.",
          heroBody:
            "CarePoint brings doctor discovery, open schedules, bookings, notifications, and appointment history into one place. The platform is built to make medical booking feel fast, clear, and dependable instead of scattered across calls, chats, and manual lists.",
          heroPoints: [
            "Search by name, specialty, and city",
            "Book only genuinely available time slots",
            "Doctor-managed schedules instead of fixed hours",
            "Notifications, history, and better follow-through after booking",
          ],
          snapshotLabel: "What is inside",
          snapshotTitle: "CarePoint is more than a simple booking form.",
          snapshotBody:
            "The product is structured around what people actually need: find the right specialist fast, book a suitable visit, and keep track of everything afterward.",
          stats: [
            { value: "24h", label: "near-term availability filter" },
            { value: "1 place", label: "for doctors, bookings, and history" },
            { value: "100%", label: "validated booking slots" },
            { value: "Secure", label: "handling of sensitive data" },
          ],
          whyLabel: "Why CarePoint",
          whyTitle: "A smoother experience from the first search to the actual visit",
          whyCards: [
            {
              title: "Less confusion during booking",
              body: "Open and booked slots are shown clearly, and the system prevents conflicting active reservations in the same time window.",
            },
            {
              title: "Easier doctor selection",
              body: "Profiles, specialties, cities, and reviews help people reach the right specialist faster for the exact type of care they need.",
            },
            {
              title: "Useful after the booking too",
              body: "The user keeps context after reserving a visit through notifications, history, appointment status, calendar export, and detail pages.",
            },
            {
              title: "Built like a real digital product",
              body: "The platform already covers the core flow of discovery, booking, follow-up, and feedback and is ready for market-facing growth.",
            },
          ],
          stepsLabel: "How it works",
          stepsTitle: "The main flow is designed to stay simple",
          steps: [
            {
              step: "01",
              title: "Find the right doctor",
              body: "The patient uses search, filters, and sorting to quickly reach the right specialist for the needed type of care.",
            },
            {
              step: "02",
              title: "Book a real available time",
              body: "The platform reads the doctor schedule and allows booking only inside valid, open slots.",
            },
            {
              step: "03",
              title: "Track the appointment afterward",
              body: "The reservation remains visible in the dashboard, history, and notifications so the user never loses context.",
            },
          ],
          useCasesLabel: "Built for real-world use",
          useCasesTitle: "What value the platform delivers in day-to-day use",
          useCases: [
            {
              title: "Faster doctor discovery",
              body: "People reach the right specialist faster with filters, reviews, and clear visibility into open appointment slots.",
              href: "/doctors",
              cta: "Browse doctors",
            },
            {
              title: "Less missed information",
              body: "After booking, the user still has access to appointment details, notifications, history, and a calendar export for the visit.",
              href: "/appointments",
              cta: "View appointments",
            },
            {
              title: "More trust in the service",
              body: "Profiles, reviews, secure sign-in, and protected data handling make the product feel dependable and ready for real users.",
              href: "/faq",
              cta: "Learn more",
            },
          ],
          featuresLabel: "Key capabilities",
          featuresTitle: "What you can do in CarePoint",
          features: [
            "Search doctors by specialty, name, and city",
            "Filter for availability within the next 24 hours",
            "Book appointments with validated slots and a required note",
            "Reschedule, cancel, and review appointment history",
            "Let doctors manage their own schedule",
            "Use notifications, favorites, and feedback tools",
          ],
          securityLabel: "Security and reliability",
          securityTitle: "The platform is built like a product, not just a visual demo",
          securityBody:
            "CarePoint uses secure authentication, booking validation, and layered data protection. That matters because the app handles profiles, reservations, notes, and other sensitive user information.",
          securityItems: [
            "protected sessions and controlled access",
            "slot validation and conflict prevention",
            "rate limiting for sign-in and booking flows",
            "encryption for sensitive text fields",
            "safer handling of user data",
          ],
          footerCtaTitle: "Start now or explore the platform as a guest",
          footerCtaBody:
            "If you already have an account, go straight to your dashboard. If not, browse doctors first or create an account and test the full booking flow.",
          footerSecondary: "Or open the frequently asked questions",
          footerSecondaryButton: "Open FAQ",
        };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:gap-12 lg:py-16">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-4 sm:gap-8 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-28 rounded-full bg-gradient-to-r from-cyan-100 via-sky-50 to-transparent blur-3xl" />
            <div className="relative">
              <p className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 sm:text-[11px] sm:tracking-[0.18em]">
                {content.eyebrow}
              </p>
              <h1 className="mt-4 max-w-3xl text-[2.35rem] font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {content.heroTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-slate-600 sm:text-lg">
                {content.heroBody}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {content.heroPoints.map((point, index) => (
                  <div
                    key={point}
                    className={`rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700 ${
                      index > 1 ? "hidden sm:block" : ""
                    }`}
                  >
                    {point}
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
                {session?.user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="rounded-full bg-slate-900 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {t("homeCtaDashboard")}
                    </Link>
                    <Link
                      href="/doctors"
                      className="rounded-full border border-slate-200 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      {t("homeCtaBrowse")}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth"
                      className="rounded-full bg-slate-900 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {t("homeCtaCreate")}
                    </Link>
                    <Link
                      href="/doctors"
                      className="rounded-full border border-slate-200 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      {t("homeCtaExplore")}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-4 text-white shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              {content.snapshotLabel}
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              {content.snapshotTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {content.snapshotBody}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {content.stats.map((item, index) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${
                    index > 1 ? "hidden sm:block" : ""
                  }`}
                >
                  <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-200">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                {lang === "bg" ? "Бърз вход към платформата" : "Quick entry into the platform"}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Link
                  href="/doctors"
                  className="rounded-full bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  {t("homeQuickButton")}
                </Link>
                <Link
                  href="/feedback"
                  className="rounded-full border border-white/15 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {lang === "bg" ? "Изпрати мнение" : "Send feedback"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {content.whyLabel}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {content.whyTitle}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {content.whyCards.map((item, index) => (
            <article
              key={item.title}
              className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
                index > 1 ? "hidden md:block" : ""
              }`}
            >
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {content.stepsLabel}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {content.stepsTitle}
          </h2>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {content.steps.map((item) => (
            <article
              key={item.step}
              className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {item.step}
              </p>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {content.useCasesLabel}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {content.useCasesTitle}
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {content.useCases.map((item, index) => (
            <article
              key={item.title}
              className={`rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm ${
                index > 1 ? "hidden lg:block" : ""
              }`}
            >
              <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
              <Link
                href={item.href}
                className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                {item.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {content.featuresLabel}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {content.featuresTitle}
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {content.features.map((item, index) => (
              <div
                key={item}
                className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700 ${
                  index > 3 ? "hidden sm:block" : ""
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-100 p-5 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {content.securityLabel}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {content.securityTitle}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            {content.securityBody}
          </p>
          <div className="mt-6 grid gap-3">
            {content.securityItems.map((item, index) => (
              <div
                key={item}
                className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm ${
                  index > 2 ? "hidden sm:block" : ""
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {content.footerCtaTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {content.footerCtaBody}
            </p>
          </div>
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                {t("homeCtaDashboard")}
              </Link>
            ) : (
              <Link
                href="/auth"
                className="rounded-full bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                {t("homeCtaCreate")}
              </Link>
            )}
            <Link
              href="/doctors"
              className="rounded-full border border-white/20 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t("homeCtaExplore")}
            </Link>
            <Link
              href="/faq"
              className="rounded-full border border-white/10 px-5 py-2.5 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              {content.footerSecondaryButton}
            </Link>
          </div>
        </div>
        <p className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-400">
          {content.footerSecondary}
        </p>
      </section>
    </div>
  );
}
