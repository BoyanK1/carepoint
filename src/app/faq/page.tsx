export default function FaqPage() {
  const items = [
    {
      question: "How do I book an appointment?",
      answer:
        "Search for a doctor by specialty or city, then request an appointment directly.",
    },
    {
      question: "How are doctors verified?",
      answer:
        "Doctors submit a medical license, which is reviewed by the CarePoint admin team.",
    },
    {
      question: "Why do admins need MFA?",
      answer:
        "Admin actions require a one-time email code to keep approvals secure.",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          FAQ
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Answers to common questions
        </h1>
        <p className="text-slate-600">
          Quick guidance for patients and doctors using CarePoint.
        </p>
      </header>

      <section className="grid gap-4">
        {items.map((item) => (
          <div
            key={item.question}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {item.question}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
