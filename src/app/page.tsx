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
            "CarePoint събира на едно място търсенето на лекари, свободните графици, резервациите, известията и историята на прегледите. Пациентите намират подходящ специалист по град и специалност, лекарите управляват собственото си време, а администраторите потвърждават профилите и следят критичните действия в системата.",
          heroPoints: [
            "Търсене по име, специалност и град",
            "Записване на час само в реално свободни слотове",
            "График, който лекарят управлява сам",
            "Известия, история и защитени административни действия",
          ],
          snapshotLabel: "Какво има в платформата",
          snapshotTitle: "CarePoint не е само форма за резервация.",
          snapshotBody:
            "Началната логика на приложението е изградена около реални роли и реални процеси в медицинска среда.",
          stats: [
            { value: "3", label: "основни роли" },
            { value: "24ч", label: "филтър за бърз запис" },
            { value: "MFA", label: "за админ действия" },
            { value: "RLS", label: "защита на данните" },
          ],
          whyLabel: "Защо CarePoint",
          whyTitle: "По-подредено преживяване за пациенти, лекари и администратори",
          whyCards: [
            {
              title: "По-малко объркване при записване",
              body: "Свободните и заетите слотове се показват ясно, а логиката на системата не допуска конфликтни активни резервации в един и същи слот.",
            },
            {
              title: "Проверени лекарски профили",
              body: "Лекарите кандидатстват с документи, а административният панел позволява преглед, одобрение или отказ преди профилът да стане публичен.",
            },
            {
              title: "Полезно и след самото записване",
              body: "Потребителят не губи контекста след резервацията, защото има история, известия, статус на прегледа, календарен експорт и детайли за часа.",
            },
            {
              title: "Подходящо за представяне и доразвитие",
              body: "Системата вече обединява ключовите модули на един реален продукт и може да се надгражда с плащания, телемедицина и по-богати справки.",
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
          rolesLabel: "Роли в системата",
          rolesTitle: "Всяка роля има отделен смисъл и отделни инструменти",
          roles: [
            {
              title: "Пациент",
              body: "Търси лекари, разглежда профили, запазва часове, следи историята си, получава известия и оставя мнение след приключен преглед.",
              href: "/doctors",
              cta: "Към лекарите",
            },
            {
              title: "Лекар",
              body: "Управлява седмичния си график, вижда записаните посещения, отказва часове при нужда и следи основни данни за активността си.",
              href: "/doctor/apply",
              cta: "Кандидатствай",
            },
            {
              title: "Администратор",
              body: "Проверява кандидатури, работи с MFA защита, следи одитен журнал и поддържа доверието в платформата.",
              href: "/admin",
              cta: "Админ панел",
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
          securityTitle: "Платформата е изградена не само за демо, а и с реални защитни механизми",
          securityBody:
            "CarePoint използва удостоверяване, ролеви проверки, ограничения върху чувствителни действия и защита на данните на няколко нива. Това е важно, защото приложението работи с профили, резервации, бележки и административни решения.",
          securityItems: [
            "многофакторна автентикация за админ действия",
            "защитени маршрути и контрол на ролите",
            "валидиране на слотове и защита от конфликтни записи",
            "ограничаване на опити за вход и записване",
            "криптиране на чувствителни текстови полета",
            "журнал на критичните административни действия",
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
            "CarePoint brings doctor discovery, open schedules, bookings, notifications, and appointment history into one place. Patients can find the right specialist by city and specialty, doctors can manage their own availability, and admins can verify profiles and monitor sensitive actions.",
          heroPoints: [
            "Search by name, specialty, and city",
            "Book only genuinely available time slots",
            "Doctor-managed schedules instead of fixed hours",
            "Notifications, history, and protected admin workflows",
          ],
          snapshotLabel: "What is inside",
          snapshotTitle: "CarePoint is more than a simple booking form.",
          snapshotBody:
            "The product is structured around real roles and real workflows from a medical appointment environment.",
          stats: [
            { value: "3", label: "core roles" },
            { value: "24h", label: "urgent availability filter" },
            { value: "MFA", label: "for admin actions" },
            { value: "RLS", label: "data protection" },
          ],
          whyLabel: "Why CarePoint",
          whyTitle: "A more organized experience for patients, doctors, and admins",
          whyCards: [
            {
              title: "Less confusion during booking",
              body: "Open and booked slots are shown clearly, and the system prevents conflicting active reservations in the same time window.",
            },
            {
              title: "Verified doctor profiles",
              body: "Doctors apply with documents, and the admin panel reviews and approves them before profiles become public.",
            },
            {
              title: "Useful after the booking too",
              body: "The user keeps context after reserving a visit through notifications, history, appointment status, calendar export, and detail pages.",
            },
            {
              title: "Ready for presentation and growth",
              body: "The system already combines the key modules of a real product and can grow with payments, telemedicine, and richer reporting.",
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
          rolesLabel: "Roles in the system",
          rolesTitle: "Each role has a distinct purpose and distinct tools",
          roles: [
            {
              title: "Patient",
              body: "Searches doctors, reviews profiles, books visits, tracks history, receives notifications, and leaves reviews after completed care.",
              href: "/doctors",
              cta: "Browse doctors",
            },
            {
              title: "Doctor",
              body: "Manages weekly availability, sees booked visits, rejects appointments when needed, and follows core activity metrics.",
              href: "/doctor/apply",
              cta: "Apply now",
            },
            {
              title: "Admin",
              body: "Reviews doctor applications, works behind MFA protection, checks the audit log, and preserves trust in the platform.",
              href: "/admin",
              cta: "Admin panel",
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
          securityTitle: "The platform is built for more than a visual demo",
          securityBody:
            "CarePoint uses authentication, role checks, limits on sensitive actions, and layered data protection. That matters because the app handles profiles, bookings, notes, and admin decisions.",
          securityItems: [
            "multi-factor authentication for admin actions",
            "protected routes and role-aware access control",
            "slot validation and conflict prevention",
            "rate limiting for sign-in and booking flows",
            "encryption for sensitive text fields",
            "audit logging for critical admin actions",
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
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-28 rounded-full bg-gradient-to-r from-cyan-100 via-sky-50 to-transparent blur-3xl" />
            <div className="relative">
              <p className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                {content.eyebrow}
              </p>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {content.heroTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
                {content.heroBody}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {content.heroPoints.map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"
                  >
                    {point}
                  </div>
                ))}
              </div>

              <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
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

          <div className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              {content.snapshotLabel}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {content.snapshotTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {content.snapshotBody}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {content.stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
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
          {content.whyCards.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
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
            {content.rolesLabel}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {content.rolesTitle}
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {content.roles.map((role) => (
            <article
              key={role.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-slate-900">{role.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{role.body}</p>
              <Link
                href={role.href}
                className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                {role.cta}
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
            {content.features.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700"
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
            {content.securityItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
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
