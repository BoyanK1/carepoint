"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function PrivacyPage() {
  const { lang } = useLanguage();

  const content =
    lang === "bg"
      ? {
          badge: "Политика за поверителност",
          title: "Как CarePoint обработва лични данни",
          subtitle:
            "Тази страница описва какви данни могат да бъдат събирани в CarePoint, защо се използват и какви права имат потребителите.",
          updated: "Последна актуализация: 23 април 2026 г.",
          sections: [
            {
              title: "1. Какво представлява CarePoint",
              body: [
                "CarePoint е уеб приложение за записване и управление на медицински прегледи, разработено като дипломна разработка. Платформата е предназначена за демонстрация на функционалности като регистрация, преглед на лекарски профили, записване на часове, известия и управление на график.",
                "Проектът не е предназначен за реакция при спешни медицински случаи и не следва да се използва като заместител на директен контакт с лекар, спешен център или официална медицинска институция.",
              ],
            },
            {
              title: "2. Какви данни могат да се обработват",
              body: [
                "В зависимост от начина на използване на приложението CarePoint може да обработва данни като име, имейл адрес, град, профилна снимка, роля в платформата, история на записани часове, известия и технически данни, свързани със сесията и сигурността.",
                "При кандидатстване на лекар може да се обработват допълнителни данни като специалност, град, документ за медицинска правоспособност и информация, необходима за потвърждение на профила.",
                "При записване на преглед потребителят може да въведе бележка или причина за посещението. Подобна информация може да съдържа чувствителни данни и поради това следва да се въвежда само когато е действително необходима.",
              ],
            },
            {
              title: "3. За какви цели се използват данните",
              body: [
                "Личните данни се използват за създаване и поддържане на потребителски профил, вход в системата, управление на записани часове, преглед на история, изпращане на известия, защита на акаунта и нормална работа на платформата.",
                "Данните на лекарите се използват и за преглед на кандидатури, потвърждаване на самоличност и визуализация на публичен профил в платформата след одобрение.",
                "Част от информацията се използва и за сигурност, включително ограничаване на злоупотреби, логове за критични действия и защита на административни процеси.",
              ],
            },
            {
              title: "4. Правно основание",
              body: [
                "За основните функционалности на платформата обработването на данни е необходимо за предоставяне на услугата, като например вход в акаунт, записване на час и поддържане на история на потребителя.",
                "Когато потребителят доброволно изпраща допълнителна информация чрез форма, обратна връзка или кандидатура, обработването може да се основава и на неговото действие и информирано предоставяне на съответните данни.",
              ],
            },
            {
              title: "5. Къде се съхраняват данните",
              body: [
                "CarePoint използва външни услуги за техническа работа на платформата, включително Supabase за база данни и удостоверяване, Vercel за хостинг и Resend за определени имейл съобщения.",
                "Достъпът до данни е ограничен според ролята на потребителя, а част от чувствителните текстови полета се съхраняват с допълнителна защита.",
              ],
            },
            {
              title: "6. Колко време се пазят данните",
              body: [
                "Данните се пазят само доколкото са необходими за работата на приложението, за демонстрационни цели, за сигурност или за изпълнение на легитимни административни нужди на проекта.",
                "Тъй като CarePoint е академична разработка, при прекратяване на използването на проекта данните следва да бъдат изтрити, а средата да бъде затворена или анонимизирана, когато това е приложимо.",
              ],
            },
            {
              title: "7. Права на потребителите",
              body: [
                "Потребителите имат право да поискат информация за това какви данни се обработват за тях, както и право на корекция, ограничаване, изтриване или възражение, когато това е приложимо според действащото право.",
                "При въпроси, свързани с обработване на лични данни в рамките на проекта, може да се използва посоченият по-долу имейл за контакт.",
              ],
            },
            {
              title: "8. Контакт",
              body: [
                "Контакт за въпроси относно проекта и обработването на лични данни: fenabg47@gmail.com",
                "Ако проектът бъде използван извън академична или демонстрационна среда, тази политика следва да бъде прегледана и адаптирана спрямо реалната експлоатация и приложимите законови изисквания.",
              ],
            },
          ],
        }
      : {
          badge: "Privacy Policy",
          title: "How CarePoint handles personal data",
          subtitle:
            "This page explains what kinds of data may be collected in CarePoint, why they are used, and what rights users have.",
          updated: "Last updated: April 23, 2026",
          sections: [
            {
              title: "1. What CarePoint is",
              body: [
                "CarePoint is a web application for booking and managing medical appointments, developed as a diploma project. The platform is intended to demonstrate flows such as registration, doctor discovery, appointment booking, notifications, and schedule management.",
                "The project is not intended for emergency medical use and should not replace direct contact with a doctor, emergency service, or official healthcare institution.",
              ],
            },
            {
              title: "2. What data may be processed",
              body: [
                "Depending on how the platform is used, CarePoint may process data such as name, email address, city, profile photo, platform role, appointment history, notifications, and technical session or security-related data.",
                "When a doctor applies to join the platform, additional data may be processed, including specialty, city, license file, and information required to verify the professional profile.",
                "When booking an appointment, a user may add a note or reason for the visit. That information can contain sensitive details, so it should only be provided when genuinely necessary.",
              ],
            },
            {
              title: "3. Why the data is used",
              body: [
                "Personal data is used to create and maintain user accounts, allow sign-in, manage appointments, display appointment history, send notifications, protect accounts, and keep the platform functioning correctly.",
                "Doctor data is also used to review applications, verify identity, and publish a public profile within the platform after approval.",
                "Some information is also used for security purposes, including abuse prevention, logging of sensitive actions, and protection of administrative workflows.",
              ],
            },
            {
              title: "4. Legal basis",
              body: [
                "For the main platform features, personal data is processed because it is necessary to provide the service, such as account access, appointment booking, and user history.",
                "When a user voluntarily submits additional information through forms, feedback, or an application flow, processing may also rely on that user action and the informed submission of the relevant data.",
              ],
            },
            {
              title: "5. Where data is stored",
              body: [
                "CarePoint uses external technical services to operate the platform, including Supabase for database and authentication, Vercel for hosting, and Resend for certain email messages.",
                "Access to data is limited according to user role, and some sensitive text fields are stored with additional protection.",
              ],
            },
            {
              title: "6. How long data is kept",
              body: [
                "Data is kept only as long as needed for the functioning of the application, demonstration purposes, security needs, or legitimate administrative needs of the project.",
                "Because CarePoint is an academic project, once the project is no longer being used, data should be deleted and the environment should be closed or anonymised where appropriate.",
              ],
            },
            {
              title: "7. User rights",
              body: [
                "Users may request information about what data is processed about them and may also have rights to correction, restriction, deletion, or objection where applicable under data protection law.",
                "Questions related to personal data processing within the project can be sent to the contact email listed below.",
              ],
            },
            {
              title: "8. Contact",
              body: [
                "Contact for project and data-processing questions: fenabg47@gmail.com",
                "If the project is ever used beyond an academic or demonstration context, this policy should be reviewed and updated to reflect the real operating model and applicable legal requirements.",
              ],
            },
          ],
        };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {content.badge}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {content.title}
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-slate-600">
          {content.subtitle}
        </p>
        <p className="text-sm font-medium text-slate-500">{content.updated}</p>
      </header>

      <section className="grid gap-4">
        {content.sections.map((section) => (
          <article
            key={section.title}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
