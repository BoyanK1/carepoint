import { getServerTranslations } from "@/lib/i18n-server";

export default async function FaqPage() {
  const t = await getServerTranslations();

  const items = [
    {
      question: t.faqQ1,
      answer: t.faqA1,
    },
    {
      question: t.faqQ2,
      answer: t.faqA2,
    },
    {
      question: t.faqQ3,
      answer: t.faqA3,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.faqBadge}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">{t.faqTitle}</h1>
        <p className="text-slate-600">{t.faqSubtitle}</p>
      </header>

      <section className="grid gap-4">
        {items.map((item) => (
          <div
            key={item.question}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">{item.question}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
