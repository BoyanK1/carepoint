"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const doctors = [
  {
    id: "1",
    name: "Dr. Elena Markova",
    specialty: "Cardiology",
    city: "Sofia",
    hospital: "Central Heart Clinic",
  },
  {
    id: "2",
    name: "Dr. Petar Ivanov",
    specialty: "Dermatology",
    city: "Plovdiv",
    hospital: "Skin Health Studio",
  },
  {
    id: "3",
    name: "Dr. Maria Stoyanova",
    specialty: "Pediatrics",
    city: "Varna",
    hospital: "Blue Bay Pediatrics",
  },
  {
    id: "4",
    name: "Dr. Georgi Petrov",
    specialty: "Orthopedics",
    city: "Sofia",
    hospital: "OrthoCare Center",
  },
];

export default function DoctorsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");

  const filtered = useMemo(() => {
    return doctors.filter((doctor) => {
      const matchesQuery =
        doctor.name.toLowerCase().includes(query.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(query.toLowerCase());
      const matchesSpecialty = specialty
        ? doctor.specialty.toLowerCase().includes(specialty.toLowerCase())
        : true;
      const matchesCity = city
        ? doctor.city.toLowerCase().includes(city.toLowerCase())
        : true;
      return matchesQuery && matchesSpecialty && matchesCity;
    });
  }, [query, specialty, city]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Doctor search
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Find the right specialist
        </h1>
        <p className="text-slate-600">
          Search by name, specialty, or city to book the appointment you need.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
            placeholder="Dr. Name or specialty"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Specialty
          <input
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
            placeholder="Cardiology, Dermatology..."
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          City / Region
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
            placeholder="Sofia, Plovdiv..."
          />
        </label>
      </section>

      <section className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            No doctors match your filters yet. Try a different search.
          </div>
        ) : (
          filtered.map((doctor) => (
            <div
              key={doctor.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {doctor.name}
                </p>
                <p className="text-sm text-slate-600">
                  {doctor.specialty} · {doctor.city}
                </p>
                <p className="text-xs text-slate-500">{doctor.hospital}</p>
              </div>
              <button
                onClick={() => {
                  if (!session) {
                    router.push("/auth");
                    return;
                  }
                }}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {session ? "Request appointment" : "Sign in to request"}
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
