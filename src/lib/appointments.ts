export interface AvailabilityRow {
  doctor_profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  is_active?: boolean;
}

export interface AppointmentWindow {
  starts_at: string;
  ends_at: string | null;
  status: string;
}

export interface TimeSlot {
  startsAt: string;
  endsAt: string;
}

function parseTime(value: string) {
  const [hours = "0", minutes = "0", seconds = "0"] = value.split(":");
  return {
    hours: Number(hours),
    minutes: Number(minutes),
    seconds: Number(seconds),
  };
}

function toUtcForDay(day: Date, time: string) {
  const parsed = parseTime(time);
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      parsed.hours,
      parsed.minutes,
      parsed.seconds
    )
  );
}

function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
) {
  return startA < endB && startB < endA;
}

export function getAvailableSlots(
  availability: AvailabilityRow[],
  appointments: AppointmentWindow[],
  options?: {
    fromDate?: Date;
    daysAhead?: number;
    maxSlots?: number;
  }
) {
  const fromDate = options?.fromDate ?? new Date();
  const daysAhead = options?.daysAhead ?? 21;
  const maxSlots = options?.maxSlots ?? 80;
  const activeAvailability = availability.filter((item) => item.is_active !== false);
  const blocked = appointments
    .filter((item) => item.status === "scheduled" || item.status === "confirmed")
    .map((item) => {
      const start = new Date(item.starts_at);
      const end = item.ends_at
        ? new Date(item.ends_at)
        : new Date(start.getTime() + 30 * 60 * 1000);
      return { start, end };
    });

  const slots: TimeSlot[] = [];

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const day = new Date(
      Date.UTC(
        fromDate.getUTCFullYear(),
        fromDate.getUTCMonth(),
        fromDate.getUTCDate() + offset,
        0,
        0,
        0,
        0
      )
    );
    const dayOfWeek = day.getUTCDay();
    const dayAvailability = activeAvailability.filter(
      (item) => item.day_of_week === dayOfWeek
    );

    for (const row of dayAvailability) {
      const windowStart = toUtcForDay(day, row.start_time);
      const windowEnd = toUtcForDay(day, row.end_time);
      const slotMs = row.slot_minutes * 60 * 1000;

      for (
        let slotStart = new Date(windowStart.getTime());
        slotStart.getTime() + slotMs <= windowEnd.getTime();
        slotStart = new Date(slotStart.getTime() + slotMs)
      ) {
        if (slotStart <= fromDate) {
          continue;
        }

        const slotEnd = new Date(slotStart.getTime() + slotMs);
        const isBlocked = blocked.some((item) =>
          overlaps(slotStart, slotEnd, item.start, item.end)
        );
        if (isBlocked) {
          continue;
        }

        slots.push({
          startsAt: slotStart.toISOString(),
          endsAt: slotEnd.toISOString(),
        });

        if (slots.length >= maxSlots) {
          return slots;
        }
      }
    }
  }

  return slots;
}

export function isSlotAligned(
  slotStart: Date,
  availability: AvailabilityRow
) {
  const expectedDay = slotStart.getUTCDay();
  if (expectedDay !== availability.day_of_week) {
    return false;
  }

  const { hours: startHour, minutes: startMinute } = parseTime(availability.start_time);
  const { hours: endHour, minutes: endMinute } = parseTime(availability.end_time);
  const slotMinutesTotal = slotStart.getUTCHours() * 60 + slotStart.getUTCMinutes();
  const windowStartTotal = startHour * 60 + startMinute;
  const windowEndTotal = endHour * 60 + endMinute;
  if (slotMinutesTotal < windowStartTotal || slotMinutesTotal >= windowEndTotal) {
    return false;
  }

  return (slotMinutesTotal - windowStartTotal) % availability.slot_minutes === 0;
}
